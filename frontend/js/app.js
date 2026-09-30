/* University Portal frontend. All data comes from the backend API; cookie session is httpOnly (no localStorage). */
const $ = s => document.querySelector(s), app = $('#app');
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let me, D, tab, role = 'student', q = '';

async function api(url, method = 'GET', body) {
  const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401 && me) return location.replace('/'); throw new Error(j.error || 'Something went wrong. Please try again.'); }
  return j;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3500); }
const confirmBox = msg => new Promise(ok => {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="card"><p>${e(msg)}</p><button class="sec" id="c1">Cancel</button> <button class="bad" id="c2">Confirm</button></div>`;
  document.body.append(m); m.querySelector('#c1').onclick = () => { m.remove(); ok(false); }; m.querySelector('#c2').onclick = () => { m.remove(); ok(true); };
});
const tbl = (h, rows) => rows.length ? `<table><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>` : '<p>Nothing here yet.</p>';
const tag = s => `<span class="tag ${e(s)}">${e(s)}</span>`;
const bar = p => `<div class="bar"><i style="width:${Math.min(100, p)}%;background:${p < 75 ? 'var(--bad)' : 'var(--ok)'}"></i></div>`;
const grade = m => m >= 85 ? ['A', 4] : m >= 80 ? ['A-', 3.7] : m >= 75 ? ['B+', 3.3] : m >= 70 ? ['B', 3] : m >= 65 ? ['B-', 2.7] : m >= 60 ? ['C+', 2.3] : m >= 50 ? ['C', 2] : ['F', 0];
const field = (n, l, t = 'text', extra = '') => `<label>${l}</label><input name="${n}" type="${t}" ${extra}>`;
const opts = (arr, v, l) => arr.map(x => `<option value="${e(x[v])}">${e(x[l])}</option>`).join('');
const today = () => new Date().toISOString().slice(0, 10);

// ---------------- login ----------------
function loginView(msg = '') {
  me = null;
  app.innerHTML = `<div class="login"><div class="logo">🎓</div><h1>University Portal</h1><p>Welcome back. Please sign in.</p>
  <label>Select Account Type</label><div class="roles">${['student', 'teacher', 'admin'].map(r => `<button data-act="role" data-r="${r}" class="${r === role ? 'on' : ''}">${r[0].toUpperCase() + r.slice(1)}</button>`).join('')}</div>
  <form data-form="login"><label>ID / Username</label><input name="id" required autocomplete="username">
  <label>Password</label><div class="pw"><input name="password" type="password" required autocomplete="current-password"><button type="button" class="sec" data-act="showpw">Show</button></div>
  <p style="color:var(--bad)">${e(msg)}</p><button style="width:100%">Login</button></form>
  <p><a href="#" data-act="forgot">Forgot Password?</a></p></div>`;
}
function forgotView() {
  app.innerHTML = `<div class="login"><h2>Forgot Password</h2><form data-form="forgot">${field('id', 'Student/Teacher ID', 'text', 'required')}${field('email', 'Registered Email', 'email', 'required')}<br><button>Verify</button> <button type="button" class="sec" data-act="home">Back</button></form></div>`;
}

// ---------------- shell ----------------
function shell(tabs, sub) {
  app.innerHTML = `<div class="top"><div><b>Welcome, ${e(me.name)}</b><small>${sub}</small></div><div><button class="sec" data-act="profile">Profile</button><button class="bad" data-act="logout">Sign Out</button></div></div>
  ${tabs ? `<nav>${tabs.map(t => `<button data-act="tab" data-t="${t}" class="${t === tab ? 'on' : ''}">${t}</button>`).join('')}</nav>` : ''}<main id="main"></main>`;
}
const stat = (n, v) => `<div class="stat"><b>${e(v)}</b>${n}</div>`;
const search = () => `<input placeholder="Search…" value="${e(q)}" data-act="search" style="max-width:280px;margin-bottom:.6rem">`;
const match = (o, ...k) => !q || k.some(x => String(o[x] ?? '').toLowerCase().includes(q.toLowerCase()));

// ---------------- student ----------------
async function studentView() {
  D = await api('/student/data'); const p = D.profile;
  shell(null, `Student ID: ${e(p.login_id)} · Program: ${e(p.program)} · Semester: ${p.semester}`);
  const tot = D.attendance.reduce((a, x) => a + x.total, 0), att = D.attendance.reduce((a, x) => a + +x.attended, 0), overall = tot ? att / tot * 100 : 0;
  const cr = D.results.reduce((a, r) => a + r.credit_hours, 0), gpa = cr ? D.results.reduce((a, r) => a + grade(r.marks)[1] * r.credit_hours, 0) / cr : 0;
  const pendA = D.assignments.filter(a => !a.submitted).length, pendF = D.challans.filter(c => !c.paid).length;
  $('#main').innerHTML = `<div class="stats">${stat('Attendance', overall.toFixed(1) + '%')}${stat('GPA', gpa.toFixed(2))}${stat('Pending Assignments', pendA)}${stat('Pending Fees', pendF)}${stat('Applications', D.applications.length)}</div>
  <div class="card"><h3>1. Student Information</h3>${tbl(['Field', 'Value'], [['Name', e(p.name)], ['Guardian', e(p.guardian)], ['Email', e(p.email)], ['Phone', e(p.phone)], ['DOB', e(p.dob)], ['Gender', e(p.gender)], ['Department', e(p.department)], ['Section', e(p.section)], ['Address', e(p.address)], ['Admitted', e(p.admitted)]])}</div>
  <div class="card"><h3>2. Attendance</h3>${tbl(['Subject', 'Total', 'Attended', 'Absent', '%', ''], D.attendance.map(a => { const pc = a.attended / a.total * 100; return [e(a.subject), a.total, a.attended, a.total - a.attended, pc.toFixed(1) + '%', bar(pc)]; }))}
  <details><summary>Date-wise history</summary>${tbl(['Date', 'Subject', 'Status'], D.history.map(h => [e(h.date), e(h.subject), h.present ? 'Present' : 'Absent']))}</details></div>
  <div class="card printable" id="fee"><h3>3. Fee Challan</h3>${D.challans.length ? D.challans.map(c => { const t = c.tuition + c.exam_fee + c.other, st = c.paid ? 'Paid' : (c.due_date < today() ? 'Overdue' : 'Pending');
    return `<div style="border:1px dashed #999;padding:.6rem;margin-bottom:.6rem"><b>${e(c.challan_no)}</b> ${tag(st)}<br>${e(p.name)} · ${e(p.login_id)} · ${e(p.program)} · Sem ${p.semester}<br>
    ${e(c.fee_type)} — Tuition ${c.tuition}, Exam ${c.exam_fee}, Other ${c.other}. <b>Total ${t}</b> · Due ${e(c.due_date)}<br><button data-act="print" data-el="fee">Print / Download PDF</button></div>`; }).join('') : '<p>No challans issued.</p>'}</div>
  <div class="card"><h3>4. Assignments &amp; Quizzes</h3>${search()}${D.assignments.filter(a => match(a, 'title', 'subject')).map(a => `<div style="border-bottom:1px solid #e6ebf4;padding:.5rem 0"><b>${e(a.title)}</b> — ${e(a.subject)}<br>Teacher: ${e(a.teacher)} · Due ${e(a.due_date)} · Marks ${a.total_marks}<br>${e(a.description)}<br>
    ${a.submitted ? tag(a.marks != null ? 'Approved' : 'Pending') + ` Score: ${a.marks ?? 'awaiting'}${a.marks != null ? '/' + a.total_marks : ''} ${e(a.feedback || '')}` : ''}
    <form data-form="submit" data-id="${a.id}"><textarea name="content" placeholder="Your answer / link" required></textarea><button>${a.submitted ? 'Resubmit' : 'Submit'}</button></form></div>`).join('') || '<p>No assignments.</p>'}<small>Quizzes: not included in this build.</small></div>
  <div class="card printable" id="res"><h3>5. Results</h3>${tbl(['Subject', 'Credits', 'Marks', 'Grade', 'GPA'], D.results.map(r => [e(r.subject), r.credit_hours, r.marks, grade(r.marks)[0], grade(r.marks)[1]]))}<p><b>Semester GPA: ${gpa.toFixed(2)}</b> · CGPA: ${gpa.toFixed(2)}</p><button data-act="print" data-el="res">Print / Download PDF</button></div>
  <div class="card"><h3>6. Semester Applications</h3><form data-form="app"><label>Application Type</label><select name="type">${['Leave', 'Course Withdrawal', 'Course Registration', 'Semester Freeze', 'Fee', 'Exam', 'Rechecking', 'Other'].map(x => `<option>${x}</option>`).join('')}</select>
  ${field('subject', 'Subject')}<label>Description</label><textarea name="description" required></textarea><br><button>Submit</button></form>${tbl(['Type', 'Subject', 'Status'], D.applications.map(a => [e(a.type), e(a.subject), tag(a.status)]))}</div>`;
}

// ---------------- teacher ----------------
async function teacherView() {
  D = await api('/teacher/data');
  shell(['Students', 'Attendance', 'Assignments', 'Marks'], `Teacher ID: ${e(me.login)} · Department: ${e(me.department)}`);
  const m = $('#main'), sel = `<option value="">Select subject</option>${opts(D.subjects, 'id', 'name')}`;
  m.innerHTML = `<div class="stats">${stat('Assigned Students', new Set(D.students.map(s => s.user_id)).size)}${stat('Subjects', D.subjects.length)}${stat('Assignments', D.assignments.length)}</div>`;
  if (tab === 'Students') m.innerHTML += `<div class="card">${search()}<select data-act="filt" style="max-width:200px">${sel}</select>${tbl(['ID', 'Name', 'Program', 'Sem', 'Section', 'Email'], D.students.filter(s => match(s, 'login_id', 'name') && (!D.f || s.subject_id == D.f)).map(s => [e(s.login_id), e(s.name), e(s.program), s.semester, e(s.section), e(s.email)]))}</div>`;
  if (tab === 'Attendance') m.innerHTML += `<div class="card"><h3>Mark Attendance</h3><form data-form="att"><div class="row"><select name="subject_id" data-act="attsub" required>${sel}</select><input type="date" name="date" value="${today()}" required></div><div id="roster"></div><button>Mark Attendance</button></form></div>`;
  if (tab === 'Assignments') m.innerHTML += `<div class="card"><h3>Create Assignment</h3><form data-form="newassign"><select name="subject_id" required>${sel}</select>${field('title', 'Title', 'text', 'required')}<label>Description</label><textarea name="description"></textarea>${field('due_date', 'Due Date', 'date', 'required')}${field('total_marks', 'Total Marks', 'number', 'required')}<br><button>Create Assignment</button></form></div>
  <div class="card"><h3>My Assignments</h3>${tbl(['Title', 'Subject', 'Due', 'Submitted', ''], D.assignments.map(a => [e(a.title), e(a.subject), e(a.due_date), a.submissions, `<button data-act="subs" data-id="${a.id}">Grade</button> <button class="bad" data-act="delassign" data-id="${a.id}">Delete</button>`]))}<div id="subs"></div></div>`;
  if (tab === 'Marks') m.innerHTML += `<div class="card"><h3>Enter Final Marks</h3><form data-form="mark"><select name="subject_id" required>${sel}</select><select name="student_id" required>${opts(D.students, 'user_id', 'name')}</select>${field('marks', 'Marks (0-100)', 'number', 'min=0 max=100 required')}<br><button>Save Marks</button></form></div>`;
}

// ---------------- admin ----------------
async function adminView() {
  D = await api('/admin/data'); const s = D.stats;
  shell(['Overview', 'Students', 'Teachers', 'Subjects', 'Fees', 'Applications', 'Audit Log'], 'Administrator');
  const m = $('#main'), stuForm = (k, extra) => `<form data-form="new${k}">${field('name', 'Name', 'text', 'required')}${field('email', 'Email', 'email', 'required')}${extra}<br><button>Create</button></form>`;
  const act = u => `<button class="sec" data-act="reset" data-id="${u.user_id}">Reset PW</button> <button class="sec" data-act="toggle" data-id="${u.user_id}" data-v="${u.active ? 0 : 1}">${u.active ? 'Deactivate' : 'Activate'}</button> <button class="bad" data-act="deluser" data-id="${u.user_id}">Delete</button>`;
  if (tab === 'Overview') m.innerHTML = `<div class="stats">${stat('Total Students', s.students)}${stat('Total Teachers', s.teachers)}${stat('Subjects', s.subjects)}${stat('Pending Applications', s.pendingApps)}${stat('Pending Fees', s.pendingFees)}${stat('Assignments', s.assignments)}</div>`;
  if (tab === 'Students') m.innerHTML = `<div class="card"><h3>Register Student</h3>${stuForm('student', ['guardian:Guardian', 'phone:Phone', 'dob:Date of Birth:date', 'gender:Gender', 'program:Program', 'department:Department', 'semester:Semester:number', 'section:Section', 'address:Address'].map(x => { const [n, l, t] = x.split(':'); return field(n, l, t || 'text'); }).join(''))}</div>
  <div class="card"><h3>Students</h3>${search()}${tbl(['ID', 'Name', 'Program', 'Sem', 'Active', 'Actions'], D.students.filter(x => match(x, 'login_id', 'name')).map(x => [e(x.login_id), e(x.name), e(x.program), x.semester, x.active ? 'Yes' : 'No', act(x)]))}</div>`;
  if (tab === 'Teachers') m.innerHTML = `<div class="card"><h3>Register Teacher</h3>${stuForm('teacher', field('department', 'Department'))}</div><div class="card"><h3>Teachers</h3>${search()}${tbl(['ID', 'Name', 'Dept', 'Active', 'Actions'], D.teachers.filter(x => match(x, 'login_id', 'name')).map(x => [e(x.login_id), e(x.name), e(x.department), x.active ? 'Yes' : 'No', act(x)]))}</div>`;
  if (tab === 'Subjects') m.innerHTML = `<div class="card"><h3>Add Subject</h3><form data-form="newsubject">${field('code', 'Code', 'text', 'required')}${field('name', 'Name', 'text', 'required')}${field('credit_hours', 'Credit Hours', 'number')}${field('semester', 'Semester', 'number')}<label>Teacher</label><select name="teacher_id"><option value="">Unassigned</option>${opts(D.teachers, 'user_id', 'name')}</select><br><button>Add</button></form></div><div class="card">${tbl(['Code', 'Name', 'Credits', 'Sem', 'Teacher'], D.subjects.map(x => [e(x.code), e(x.name), x.credit_hours, x.semester, e(x.teacher)]))}</div>`;
  if (tab === 'Fees') m.innerHTML = `<div class="card"><h3>Issue Challan</h3><form data-form="newchallan"><select name="student_id" required>${opts(D.students, 'user_id', 'name')}</select>${field('tuition', 'Tuition', 'number')}${field('exam_fee', 'Exam Fee', 'number')}${field('other', 'Other', 'number')}${field('due_date', 'Due Date', 'date', 'required')}<br><button>Issue</button></form></div><div class="card">${tbl(['No', 'Student', 'Total', 'Due', 'Status', ''], D.challans.map(c => [e(c.challan_no), e(c.student), c.tuition + c.exam_fee + c.other, e(c.due_date), tag(c.paid ? 'Paid' : 'Pending'), c.paid ? '' : `<button data-act="paid" data-id="${c.id}">Mark Paid</button>`]))}</div>`;
  if (tab === 'Applications') m.innerHTML = `<div class="card">${tbl(['Student', 'Type', 'Description', 'Status', ''], D.applications.map(a => [e(a.student), e(a.type), e(a.description), tag(a.status), a.status === 'Pending' ? `<button data-act="appr" data-id="${a.id}" data-v="Approved">Approve</button> <button class="bad" data-act="appr" data-id="${a.id}" data-v="Rejected">Reject</button>` : '']))}</div>`;
  if (tab === 'Audit Log') m.innerHTML = `<div class="card">${tbl(['When', 'Action'], D.audit.map(a => [e(a.at), e(a.action)]))}</div>`;
}

// ---------------- routing / events ----------------
async function route() {
  try { me = await api('/me'); } catch { return loginView(); }
  tab = { student: null, teacher: 'Students', admin: 'Overview' }[me.role];
  ({ student: studentView, teacher: teacherView, admin: adminView })[me.role]();
}
const refresh = () => ({ student: studentView, teacher: teacherView, admin: adminView })[me.role]();
const run = async (fn, ok) => { try { await fn(); if (ok) toast(ok); } catch (x) { toast(x.message); } };

const ACT = {
  role: el => { role = el.dataset.r; loginView(); },
  showpw: el => { const i = el.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; el.textContent = i.type === 'password' ? 'Show' : 'Hide'; },
  forgot: forgotView, home: () => loginView(),
  logout: async () => { await api('/logout', 'POST'); me = null; location.replace('/'); },
  tab: el => { tab = el.dataset.t; q = ''; refresh(); },
  print: el => { const t = document.getElementById(el.dataset.el); t.classList.add('printing'); print(); t.classList.remove('printing'); },
  profile: () => toast(`${me.name} · ${me.login}`),
  attsub: async el => { const st = D.students.filter(s => s.subject_id == el.value); $('#roster').innerHTML = tbl(['ID', 'Name', 'Present', 'Absent'], st.map(s => [e(s.login_id), e(s.name), `<input type="radio" name="p${s.user_id}" value="1" checked>`, `<input type="radio" name="p${s.user_id}" value="0">`])); },
  filt: el => { D.f = el.value; refresh(); },
  subs: async el => { const r = await api('/teacher/submissions/' + el.dataset.id); $('#subs').innerHTML = tbl(['Student', 'Answer', 'Status', 'Grade'], r.map(x => [e(x.login_id), e(x.content), x.late ? 'Late' : 'Submitted', `<form data-form="grade" data-id="${x.id}"><input name="marks" type="number" max="${x.total_marks}" value="${x.marks ?? ''}" required style="width:70px"><input name="feedback" placeholder="Feedback" value="${e(x.feedback)}"><button>Save Marks</button></form>`])); },
  delassign: el => run(async () => { if (await confirmBox('Delete this assignment?')) { await api('/teacher/assignments/' + el.dataset.id, 'DELETE'); refresh(); } }),
  reset: el => run(async () => { if (await confirmBox('Reset this user\'s password?')) { const r = await api(`/admin/users/${el.dataset.id}/reset`, 'POST'); alert('New temporary password (shown once): ' + r.password); } }),
  toggle: el => run(async () => { await api(`/admin/users/${el.dataset.id}/active`, 'PATCH', { active: +el.dataset.v }); refresh(); }),
  deluser: el => run(async () => { if (await confirmBox('Are you sure you want to delete this user?')) { await api('/admin/users/' + el.dataset.id, 'DELETE'); refresh(); } }),
  paid: el => run(async () => { await api('/admin/challans/' + el.dataset.id, 'PATCH'); refresh(); }),
  appr: el => run(async () => { await api('/admin/applications/' + el.dataset.id, 'PATCH', { status: el.dataset.v }); refresh(); })
};
document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (el && !['search', 'attsub', 'filt'].includes(el.dataset.act)) { ev.preventDefault(); ACT[el.dataset.act](el); } });
document.addEventListener('change', ev => { const el = ev.target.closest('[data-act]'); if (el && ['attsub', 'filt'].includes(el.dataset.act)) ACT[el.dataset.act](el); });
document.addEventListener('input', ev => { if (ev.target.dataset.act === 'search') { q = ev.target.value; const pos = ev.target.selectionStart; refresh().then(() => { const i = $('[data-act=search]'); i?.focus(); i?.setSelectionRange(pos, pos); }); } });

const FORM = {
  login: async o => { try { await api('/login', 'POST', { ...o, role }); route(); } catch (x) { loginView(x.message); } },
  forgot: async o => { const r = await api('/forgot', 'POST', o); app.innerHTML = `<div class="login"><h2>Verification successful</h2><form data-form="reset"><input type="hidden" name="token" value="${e(r.token)}">${field('password', 'Create New Password', 'password', 'minlength=8 required')}${field('confirm', 'Confirm New Password', 'password', 'required')}<br><button>Reset Password</button></form></div>`; },
  reset: async o => { if (o.password !== o.confirm) throw new Error('Passwords do not match.'); await api('/reset', 'POST', o); loginView(); toast('Password reset successfully. You can now login with your new password.'); },
  submit: (o, f) => api('/student/submit/' + f.dataset.id, 'POST', o).then(refresh),
  app: o => api('/student/applications', 'POST', o).then(refresh),
  att: async (o, f) => { const records = D.students.filter(s => s.subject_id == o.subject_id).map(s => ({ student_id: s.user_id, present: o['p' + s.user_id] === '1' })); await api('/teacher/attendance', 'POST', { subject_id: o.subject_id, date: o.date, records }); },
  newassign: o => api('/teacher/assignments', 'POST', o).then(refresh),
  grade: (o, f) => api('/teacher/grade', 'POST', { ...o, submission_id: f.dataset.id }),
  mark: o => api('/teacher/results', 'POST', o),
  newstudent: async o => { const r = await api('/admin/students', 'POST', o); alert(`Student created.\nID: ${r.login_id}\nTemporary password (shown once): ${r.password}`); refresh(); },
  newteacher: async o => { const r = await api('/admin/teachers', 'POST', o); alert(`Teacher created.\nID: ${r.login_id}\nTemporary password (shown once): ${r.password}`); refresh(); },
  newsubject: o => api('/admin/subjects', 'POST', o).then(refresh),
  newchallan: o => api('/admin/challans', 'POST', o).then(refresh)
};
document.addEventListener('submit', ev => { const f = ev.target.closest('form[data-form]'); if (!f) return; ev.preventDefault(); run(() => FORM[f.dataset.form](Object.fromEntries(new FormData(f)), f), f.dataset.form === 'login' ? '' : 'Saved.'); });
addEventListener('pageshow', ev => { if (ev.persisted) location.reload(); }); // block bfcache back-button access after sign out
route();

