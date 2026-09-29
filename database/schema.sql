CREATE DATABASE IF NOT EXISTS sms; USE sms;
CREATE TABLE users(id INT AUTO_INCREMENT PRIMARY KEY, login_id VARCHAR(30) UNIQUE NOT NULL, email VARCHAR(120) NOT NULL,
 password_hash VARCHAR(100) NOT NULL, role ENUM('student','teacher','admin') NOT NULL, active TINYINT DEFAULT 1);
CREATE TABLE students(user_id INT PRIMARY KEY, name VARCHAR(100), guardian VARCHAR(100), phone VARCHAR(20), dob DATE, gender VARCHAR(10),
 program VARCHAR(80), department VARCHAR(80), semester INT, section VARCHAR(10), address TEXT, admitted DATE DEFAULT (CURRENT_DATE),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE teachers(user_id INT PRIMARY KEY, name VARCHAR(100), department VARCHAR(80), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE subjects(id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(20) UNIQUE, name VARCHAR(100), credit_hours INT DEFAULT 3,
 semester INT, teacher_id INT NULL, FOREIGN KEY(teacher_id) REFERENCES teachers(user_id) ON DELETE SET NULL);
CREATE TABLE enrollments(student_id INT, subject_id INT, PRIMARY KEY(student_id,subject_id),
 FOREIGN KEY(student_id) REFERENCES students(user_id) ON DELETE CASCADE, FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE);
CREATE TABLE attendance(id INT AUTO_INCREMENT PRIMARY KEY, subject_id INT, student_id INT, date DATE, present TINYINT,
 UNIQUE(subject_id,student_id,date), FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE, FOREIGN KEY(student_id) REFERENCES students(user_id) ON DELETE CASCADE);
CREATE TABLE assignments(id INT AUTO_INCREMENT PRIMARY KEY, subject_id INT, title VARCHAR(150), description TEXT, due_date DATE, total_marks INT,
 FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE);
CREATE TABLE submissions(id INT AUTO_INCREMENT PRIMARY KEY, assignment_id INT, student_id INT, content TEXT, marks INT NULL, feedback TEXT NULL,
 submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(assignment_id,student_id),
 FOREIGN KEY(assignment_id) REFERENCES assignments(id) ON DELETE CASCADE, FOREIGN KEY(student_id) REFERENCES students(user_id) ON DELETE CASCADE);
CREATE TABLE results(student_id INT, subject_id INT, marks INT, PRIMARY KEY(student_id,subject_id),
 FOREIGN KEY(student_id) REFERENCES students(user_id) ON DELETE CASCADE, FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE);
CREATE TABLE fee_challans(id INT AUTO_INCREMENT PRIMARY KEY, student_id INT, challan_no VARCHAR(30) UNIQUE, fee_type VARCHAR(50) DEFAULT 'Semester Fee',
 tuition INT, exam_fee INT, other INT, due_date DATE, paid TINYINT DEFAULT 0, FOREIGN KEY(student_id) REFERENCES students(user_id) ON DELETE CASCADE);
CREATE TABLE applications(id INT AUTO_INCREMENT PRIMARY KEY, student_id INT, type VARCHAR(50), subject VARCHAR(100), description TEXT,
 status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(student_id) REFERENCES students(user_id) ON DELETE CASCADE);
CREATE TABLE reset_tokens(user_id INT, token_hash CHAR(64), expires DATETIME, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE audit_logs(id INT AUTO_INCREMENT PRIMARY KEY, admin_id INT, action VARCHAR(255), at DATETIME DEFAULT CURRENT_TIMESTAMP);
