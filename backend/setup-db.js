// One-time helper: creates the tables from database/schema.sql in the database set in .env
const db = require('./config/db'), fs = require('fs'), path = require('path');
(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8')
    .replace('DEFAULT (CURRENT_DATE)', 'DEFAULT NULL');
  const statements = sql.split(';').map(s => s.trim())
    .filter(s => s && !/^(CREATE DATABASE|USE)\s/i.test(s));
  for (const s of statements) {
    try { await db.query(s); console.log('OK:', s.slice(0, 45)); }
    catch (e) { console.log('FAILED:', s.slice(0, 45), '-', e.message); }
  }
  process.exit();
})();
