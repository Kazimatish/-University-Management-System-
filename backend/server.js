require('dotenv').config();
const express = require('express'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'),
  cookieParser = require('cookie-parser'), helmet = require('helmet'), rateLimit = require('express-rate-limit'),
  crypto = require('crypto'), path = require('path'), db = require('./config/db');

const app = express();
app.use(helmet(), express.json({ limit: '100kb' }), cookieParser());
// Never cache API/pages: prevents back-button access after sign out
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------- helpers ----------
const h = f => (q, s) => f(q, s).catch(e => { console.error(e); s.status(500).json({ error: 'Something went wrong. Please try again.' }); });
const auth = (...roles) => (req, res, next) => {
  try {
    const u = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    if (roles.length && !roles.includes(u.role)) return res.status(403).json({ error: 'This account does not have permission to access this dashboard.' });
    req.user = u; next();
  } catch { res.status(401).json({ error: 'Please sign in.' }); }
};
const audit = (uid, action) => db.query('INSERT INTO audit_logs(admin_id,action) VALUES(?,?)', [uid, action]);
const nextId = async (prefix, role) => {
  const [[r]] = await db.query('SELECT COUNT(*) c FROM users WHERE role=?', [role]);
  return `${prefix}-${new Date().getFullYear()}-${String(r.c + 1).padStart(4, '0')}`;
};
const tempPw = () => crypto.randomBytes(6).toString('base64url') + '#1';
const str = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const strongPw = p => typeof p === 'string' && p.length >= 8;

// ---------- auth ----------
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.post('/api/login', limiter, h(async (req, res) => {
  const { id, password, role } = req.body;
  const [[u]] = await db.query('SELECT * FROM users WHERE login_id=? AND active=1', [str(id, 30)]);
  if (!u || u.role !== role || !(await bcrypt.compare(str(password, 100), u.password_hash)))
    return res.status(401).json({ error: 'Invalid ID or password.' });
  const token = jwt.sign({ id: u.id, role: u.role, login: u.login_id }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 3600e3 });
  res.json({ role: u.role });
}));
app.post('/api/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
app.get('/api/me', auth(), h(async (req, res) => {
  const t = { student: 'students', teacher: 'teachers' }[req.user.role];
  const [[p]] = t ? await db.query(`SELECT * FROM ${t} WHERE user_id=?`, [req.user.id]) : [[{ name: 'Administrator' }]];
  res.json({ role: req.user.role, login: req.user.login, ...p });
}));

// Forgot password: verify ID + email, issue a one-time token (in production, email it as OTP/link instead of returning it)
app.post('/api/forgot', limiter, h(async (req, res) => {
  const [[u]] = await db.query('SELECT id FROM users WHERE login_id=? AND email=? AND active=1', [str(req.body.id, 30), str(req.body.email, 120)]);
  if (!u) return res.status(400).json({ error: 'Email does not match the registered account.' });
  const token = crypto.randomBytes(24).toString('hex');
  await db.query('DELETE FROM reset_tokens WHERE user_id=?', [u.id]);
  await db.query('INSERT INTO reset_tokens VALUES(?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE))', [u.id, crypto.createHash('sha256').update(token).digest('hex')]);
  res.json({ token });
}));
app.post('/api/reset', limiter, h(async (req, res) => {
  if (!strongPw(req.body.password)) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const hash = crypto.createHash('sha256').update(str(req.body.token, 100)).digest('hex');
  const [[t]] = await db.query('SELECT user_id FROM reset_tokens WHERE token_hash=? AND expires>NOW()', [hash]);
  if (!t) return res.status(400).json({ error: 'Reset link expired. Please verify again.' });
  await db.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(req.body.password, 12), t.user_id]);
  await db.query('DELETE FROM reset_tokens WHERE user_id=?', [t.user_id]);
  res.json({ ok: true });
}));

// ---------- student ----------
const S = auth('student');
app.get('/api/student/data', S, h(async (req, res) => {
  const id = req.user.id;
  const [[profile]] = await db.query('SELECT s.*,u.login_id,u.email FROM students s JOIN users u ON u.id=s.user_id WHERE user_id=?', [id]);
  const [attendance] = await db.query(`SELECT sub.name subject,COUNT(*) total,SUM(a.present) attended FROM attendance a JOIN subjects sub ON sub.id=a.subject_id WHERE a.student_id=? GROUP BY sub.id`, [id]);
  const [history] = await db.query(`SELECT sub.name subject,a.date,a.present FROM attendance a JOIN subjects sub ON sub.id=a.subject_id WHERE a.student_id=? ORDER BY a.date DESC LIMIT 100`, [id]);
  const [assignments] = await db.query(`SELECT a.id,a.title,a.description,a.due_date,a.total_marks,s.name subject,t.name teacher,sb.marks,sb.feedback,sb.id submitted
    FROM assignments a JOIN subjects s ON s.id=a.subject_id JOIN enrollments e ON e.subject_id=s.id AND e.student_id=?
    LEFT JOIN teachers t ON t.user_id=s.teacher_id LEFT JOIN submissions sb ON sb.assignment_id=a.id AND sb.student_id=? ORDER BY a.due_date`, [id, id]);
  const [results] = await db.query('SELECT s.name subject,s.credit_hours,r.marks FROM results r JOIN subjects s ON s.id=r.subject_id WHERE r.student_id=?', [id]);
  const [challans] = await db.query('SELECT * FROM fee_challans WHERE student_id=? ORDER BY due_date DESC', [id]);
  const [applications] = await db.query('SELECT * FROM applications WHERE student_id=? ORDER BY id DESC', [id]);
  res.json({ profile, attendance, history, assignments, results, challans, applications });
}));
app.post('/api/student/submit/:aid', S, h(async (req, res) => {
  const [[ok]] = await db.query(`SELECT a.id FROM assignments a JOIN enrollments e ON e.subject_id=a.subject_id WHERE a.id=? AND e.student_id=?`, [req.params.aid, req.user.id]);
  if (!ok) return res.status(404).json({ error: 'Assignment not found.' });
  await db.query('INSERT INTO submissions(assignment_id,student_id,content) VALUES(?,?,?) ON DUPLICATE KEY UPDATE content=VALUES(content),submitted_at=NOW()', [ok.id, req.user.id, str(req.body.content, 5000)]);
  res.json({ ok: true });
}));
app.post('/api/student/applications', S, h(async (req, res) => {
  const b = req.body;
  await db.query('INSERT INTO applications(student_id,type,subject,description) VALUES(?,?,?,?)', [req.user.id, str(b.type, 50), str(b.subject, 100), str(b.description, 2000)]);
  res.json({ ok: true });
}));

// ---------- teacher (all queries scoped to the teacher's own subjects) ----------
const T = auth('teacher');
const ownsSubject = async (tid, sid) => (await db.query('SELECT id FROM subjects WHERE id=? AND teacher_id=?', [sid, tid]))[0].length > 0;
app.get('/api/teacher/data', T, h(async (req, res) => {
  const id = req.user.id;
  const [subjects] = await db.query('SELECT * FROM subjects WHERE teacher_id=?', [id]);
  const [students] = await db.query(`SELECT DISTINCT st.user_id,u.login_id,st.name,st.program,st.semester,st.section,u.email,e.subject_id FROM enrollments e
    JOIN subjects s ON s.id=e.subject_id AND s.teacher_id=? JOIN students st ON st.user_id=e.student_id JOIN users u ON u.id=st.user_id`, [id]);
  const [assignments] = await db.query(`SELECT a.*,s.name subject,(SELECT COUNT(*) FROM submissions WHERE assignment_id=a.id) submissions FROM assignments a JOIN subjects s ON s.id=a.subject_id WHERE s.teacher_id=?`, [id]);
  res.json({ subjects, students, assignments });
}));
app.post('/api/teacher/attendance', T, h(async (req, res) => {
  const { subject_id, date, records } = req.body;
  if (!(await ownsSubject(req.user.id, subject_id)) || !/^\d{4}-\d\d-\d\d$/.test(date)) return res.status(403).json({ error: 'This subject is not assigned to you.' });
  for (const r of records) await db.query(`INSERT INTO attendance(subject_id,student_id,date,present) SELECT ?,?,?,? FROM enrollments WHERE student_id=? AND subject_id=?
    ON DUPLICATE KEY UPDATE present=VALUES(present)`, [subject_id, r.student_id, date, r.present ? 1 : 0, r.student_id, subject_id]);
  res.json({ ok: true });
}));
app.post('/api/teacher/assignments', T, h(async (req, res) => {
  const b = req.body;
  if (!(await ownsSubject(req.user.id, b.subject_id))) return res.status(403).json({ error: 'This subject is not assigned to you.' });
  await db.query('INSERT INTO assignments(subject_id,title,description,due_date,total_marks) VALUES(?,?,?,?,?)', [b.subject_id, str(b.title, 150), str(b.description, 3000), b.due_date, parseInt(b.total_marks) || 10]);
  res.json({ ok: true });
}));
app.delete('/api/teacher/assignments/:id', T, h(async (req, res) => {
  await db.query('DELETE a FROM assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.id=? AND s.teacher_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));
app.get('/api/teacher/submissions/:aid', T, h(async (req, res) => {
  const [rows] = await db.query(`SELECT sb.id,st.name,u.login_id,sb.content,sb.marks,sb.feedback,sb.submitted_at,a.total_marks,(sb.submitted_at>a.due_date+INTERVAL 1 DAY) late
    FROM submissions sb JOIN assignments a ON a.id=sb.assignment_id JOIN subjects s ON s.id=a.subject_id AND s.teacher_id=? JOIN students st ON st.user_id=sb.student_id JOIN users u ON u.id=st.user_id WHERE a.id=?`, [req.user.id, req.params.aid]);
  res.json(rows);
}));
app.post('/api/teacher/grade', T, h(async (req, res) => {
  const [r] = await db.query(`UPDATE submissions sb JOIN assignments a ON a.id=sb.assignment_id JOIN subjects s ON s.id=a.subject_id
    SET sb.marks=?,sb.feedback=? WHERE sb.id=? AND s.teacher_id=? AND ?<=a.total_marks`, [parseInt(req.body.marks), str(req.body.feedback, 1000), req.body.submission_id, req.user.id, parseInt(req.body.marks)]);
  if (!r.affectedRows) return res.status(400).json({ error: 'Invalid marks or submission.' });
  res.json({ ok: true });
}));
app.post('/api/teacher/results', T, h(async (req, res) => {
  const { subject_id, student_id, marks } = req.body;
  if (!(await ownsSubject(req.user.id, subject_id)) || marks < 0 || marks > 100) return res.status(400).json({ error: 'Invalid request.' });
  await db.query('INSERT INTO results SELECT ?,?,? FROM enrollments WHERE student_id=? AND subject_id=? ON DUPLICATE KEY UPDATE marks=VALUES(marks)', [student_id, subject_id, marks, student_id, subject_id]);
  res.json({ ok: true });
}));

// ---------- admin ----------
const A = auth('admin');
app.get('/api/admin/data', A, h(async (req, res) => {
  const q = async s => (await db.query(s))[0];
  res.json({
    students: await q('SELECT st.*,u.login_id,u.email,u.active FROM students st JOIN users u ON u.id=st.user_id ORDER BY u.id DESC'),
    teachers: await q('SELECT t.*,u.login_id,u.email,u.active FROM teachers t JOIN users u ON u.id=t.user_id ORDER BY u.id DESC'),
    subjects: await q('SELECT s.*,t.name teacher FROM subjects s LEFT JOIN teachers t ON t.user_id=s.teacher_id'),
    applications: await q('SELECT a.*,st.name student FROM applications a JOIN students st ON st.user_id=a.student_id ORDER BY a.id DESC'),
    challans: await q('SELECT f.*,st.name student FROM fee_challans f JOIN students st ON st.user_id=f.student_id ORDER BY f.id DESC'),
    audit: await q('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20'),
    stats: (await q(`SELECT (SELECT COUNT(*) FROM students) students,(SELECT COUNT(*) FROM teachers) teachers,(SELECT COUNT(*) FROM subjects) subjects,
      (SELECT COUNT(*) FROM applications WHERE status='Pending') pendingApps,(SELECT COUNT(*) FROM fee_challans WHERE paid=0) pendingFees,(SELECT COUNT(*) FROM assignments) assignments`))[0]
  });
}));
async function createUser(req, res, role) {
  const b = req.body, email = str(b.email, 120), name = str(b.name, 100);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Name and a valid email are required.' });
  const login = await nextId(role === 'student' ? 'STU' : 'TCH', role), pw = tempPw();
  const [u] = await db.query('INSERT INTO users(login_id,email,password_hash,role) VALUES(?,?,?,?)', [login, email, await bcrypt.hash(pw, 12), role]);
  if (role === 'student') {
    await db.query('INSERT INTO students(user_id,name,guardian,phone,dob,gender,program,department,semester,section,address) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [u.insertId, name, str(b.guardian), str(b.phone, 20), b.dob || null, str(b.gender, 10), str(b.program, 80), str(b.department, 80), parseInt(b.semester) || 1, str(b.section, 10), str(b.address, 500)]);
    await db.query('INSERT INTO enrollments SELECT ?,id FROM subjects WHERE semester=?', [u.insertId, parseInt(b.semester) || 1]);
  } else await db.query('INSERT INTO teachers VALUES(?,?,?)', [u.insertId, name, str(b.department, 80)]);
  await audit(req.user.id, `Created ${role} ${login}`);
  res.json({ login_id: login, password: pw }); // shown once to admin
}
app.post('/api/admin/students', A, h((q, s) => createUser(q, s, 'student')));
app.post('/api/admin/teachers', A, h((q, s) => createUser(q, s, 'teacher')));
app.patch('/api/admin/users/:id/active', A, h(async (req, res) => {
  await db.query('UPDATE users SET active=? WHERE id=? AND role<>"admin"', [req.body.active ? 1 : 0, req.params.id]);
  await audit(req.user.id, `Set user ${req.params.id} active=${req.body.active}`); res.json({ ok: true });
}));
app.delete('/api/admin/users/:id', A, h(async (req, res) => {
  await db.query('DELETE FROM users WHERE id=? AND role<>"admin"', [req.params.id]);
  await audit(req.user.id, `Deleted user ${req.params.id}`); res.json({ ok: true });
}));
app.post('/api/admin/users/:id/reset', A, h(async (req, res) => {
  const pw = tempPw();
  await db.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(pw, 12), req.params.id]);
  await audit(req.user.id, `Reset password user ${req.params.id}`); res.json({ password: pw });
}));
app.post('/api/admin/subjects', A, h(async (req, res) => {
  const b = req.body;
  await db.query('INSERT INTO subjects(code,name,credit_hours,semester,teacher_id) VALUES(?,?,?,?,?)', [str(b.code, 20), str(b.name, 100), parseInt(b.credit_hours) || 3, parseInt(b.semester) || 1, b.teacher_id || null]);
  await audit(req.user.id, `Created subject ${b.code}`); res.json({ ok: true });
}));
app.post('/api/admin/challans', A, h(async (req, res) => {
  const b = req.body, no = 'CH-' + Date.now().toString(36).toUpperCase();
  await db.query('INSERT INTO fee_challans(student_id,challan_no,tuition,exam_fee,other,due_date) VALUES(?,?,?,?,?,?)', [b.student_id, no, +b.tuition || 0, +b.exam_fee || 0, +b.other || 0, b.due_date]);
  await audit(req.user.id, `Issued challan ${no}`); res.json({ ok: true });
}));
app.patch('/api/admin/challans/:id', A, h(async (req, res) => {
  await db.query('UPDATE fee_challans SET paid=1 WHERE id=?', [req.params.id]); await audit(req.user.id, `Challan ${req.params.id} marked paid`); res.json({ ok: true });
}));
app.patch('/api/admin/applications/:id', A, h(async (req, res) => {
  if (!['Approved', 'Rejected'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
  await db.query('UPDATE applications SET status=? WHERE id=?', [req.body.status, req.params.id]); await audit(req.user.id, `Application ${req.params.id} ${req.body.status}`); res.json({ ok: true });
}));

app.listen(process.env.PORT || 3000, () => console.log('Running on http://localhost:' + (process.env.PORT || 3000)));
