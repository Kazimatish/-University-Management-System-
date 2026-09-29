// DEVELOPMENT-ONLY demo accounts. Change/remove before production.
const db=require('./config/db'),bcrypt=require('bcryptjs');
(async()=>{const pw=await bcrypt.hash('Demo@12345',12);
const add=async(id,role,email)=>(await db.query('INSERT IGNORE INTO users(login_id,email,password_hash,role) VALUES(?,?,?,?)',[id,email,pw,role]))[0].insertId;
await add('ADMIN-001','admin','admin@example.com');
const t=await add('TCH-2026-0001','teacher','teacher@example.com');
await db.query('INSERT IGNORE INTO teachers VALUES(?,?,?)',[t,'Ahmed Khan','Computer Science']);
const s=await add('STU-2026-0001','student','student@example.com');
await db.query('INSERT IGNORE INTO students(user_id,name,guardian,phone,program,department,semester,section,address) VALUES(?,?,?,?,?,?,?,?,?)',[s,'Ali Raza','Raza Khan','0300-0000000','BSCS','Computer Science',3,'A','Islamabad']);
await db.query("INSERT IGNORE INTO subjects(id,code,name,credit_hours,semester,teacher_id) VALUES(1,'CS201','Programming',3,3,?),(2,'CS202','Database',3,3,?)",[t,t]);
await db.query('INSERT IGNORE INTO enrollments VALUES(?,1),(?,2)',[s,s]);
console.log('Seeded. Demo password for all: Demo@12345 (dev only)');process.exit()})();
