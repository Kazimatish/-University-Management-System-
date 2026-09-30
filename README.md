# University Student Management Portal

A full-stack portal for a university or college with three roles: **Student**, **Teacher** and **Admin**.
Built with Node.js, Express and MySQL. Passwords are hashed with bcrypt, sessions use a JWT in an httpOnly cookie, and every API route checks the user's role on the server.

> Status: working test project. See the roadmap below for what is not built yet.

## Features

**Login**
- Login page is the first screen, with Student / Teacher / Admin account types
- Show/hide password, forgot password (ID + registered email check, then set a new password)
- Sign out clears the session and blocks back-button access

**Student**
- Profile, subject-wise attendance with progress bars and date-wise history
- Fee challans (printable), assignments with submission and grades, results with GPA
- Semester applications (leave, withdrawal, freeze, rechecking, etc.) with status

**Teacher**
- See only students in their own subjects
- Mark attendance, create/delete assignments, grade submissions with feedback
- Enter final subject marks

**Admin**
- Register students and teachers (auto-generated IDs and one-time temporary passwords)
- Search, deactivate, reset password, delete (with confirmation dialog)
- Manage subjects, issue fee challans, mark them paid, approve or reject applications
- Audit log of admin actions and dashboard statistics

## Tech stack

Node.js, Express, MySQL (or MariaDB via XAMPP), bcryptjs, jsonwebtoken, helmet, express-rate-limit, plain HTML/CSS/JavaScript frontend.

## Project structure

```
student-management-system/
├── backend/
│   ├── server.js          API routes, auth, role checks
│   ├── seed.js            development demo accounts
│   └── config/db.js       MySQL connection
├── database/
│   └── schema.sql         database tables
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── .env.example
├── package.json
└── README.md
```

## Run locally (Windows + XAMPP)

**Requirements:** [Node.js LTS](https://nodejs.org) and [XAMPP](https://www.apachefriends.org)

1. **Start MySQL** in the XAMPP Control Panel (Apache is not needed).
2. **Create the database:** open http://localhost/phpmyadmin, click **Import**, choose `database/schema.sql`, and click **Import**. A database named `sms` with 13 tables appears.
3. **Create your `.env` file:**
```
   copy .env.example .env
```
   Open `.env` and set:
```
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=sms
   JWT_SECRET=use_a_long_random_string
   NODE_ENV=development
```
   The XAMPP default MySQL root password is empty.
4. **Install, seed and start:**
```
   npm install
   npm run seed
   npm start
```
   If PowerShell blocks scripts, use `npm.cmd install`, `npm.cmd run seed` and `npm.cmd start`.
5. **Open** http://localhost:3000 (do not open `index.html` directly as a file).

Run `npm run seed` only once.

## Run locally (Mac / Linux)

```
npm install
mysql -u root -p < database/schema.sql
cp .env.example .env      # then edit .env
npm run seed
npm start
```

## Demo credentials (development only)

| Role    | ID              | Password     | Email               |
|---------|-----------------|--------------|---------------------|
| Admin   | `ADMIN-001`     | `Demo@12345` | admin@example.com   |
| Teacher | `TCH-2026-0001` | `Demo@12345` | teacher@example.com |
| Student | `STU-2026-0001` | `Demo@12345` | student@example.com |

Select the matching account type on the login page. These accounts are for local testing only. Never deploy them to a real server.

## API overview

| Area    | Routes |
|---------|--------|
| Auth    | `POST /api/login`, `POST /api/logout`, `GET /api/me`, `POST /api/forgot`, `POST /api/reset` |
| Student | `GET /api/student/data`, `POST /api/student/submit/:id`, `POST /api/student/applications` |
| Teacher | `GET /api/teacher/data`, `POST /api/teacher/attendance`, `POST /api/teacher/assignments`, `DELETE /api/teacher/assignments/:id`, `GET /api/teacher/submissions/:id`, `POST /api/teacher/grade`, `POST /api/teacher/results` |
| Admin   | `GET /api/admin/data`, `POST /api/admin/students`, `POST /api/admin/teachers`, `POST /api/admin/subjects`, `POST /api/admin/challans`, `PATCH /api/admin/challans/:id`, `PATCH /api/admin/applications/:id`, `PATCH /api/admin/users/:id/active`, `POST /api/admin/users/:id/reset`, `DELETE /api/admin/users/:id` |

## Security

- Passwords hashed with bcrypt, never stored or shown in plain text
- JWT in an httpOnly, SameSite=Strict cookie (no localStorage), which also reduces CSRF risk
- Role checks on the server for every protected route, and teachers are limited to their own subjects
- Parameterized SQL queries, escaped output in the UI, rate-limited login, helmet security headers
- No-cache headers so the back button cannot reopen a dashboard after sign out
- Forgot password issues a 15-minute one-time token. In production it must be emailed (OTP/link) instead of returned by the API

## Deployment

1. Use a host such as Render or Railway with a managed MySQL database.
2. Set the variables from `.env.example` in the host's settings, with `NODE_ENV=production` and a new random `JWT_SECRET`.
3. Import `database/schema.sql` once. Do **not** run the seed script.
4. Serve over HTTPS (required for the secure cookie).
5. Send the password-reset token by email instead of returning it from `/api/forgot`.

GitHub Pages cannot host this project, because it needs the Node.js server and a database.

## Roadmap (not built yet)

- Quizzes (create, attempt, publish)
- In-app notifications
- Editing student and teacher records, class/section assignment
- Pagination and more filters
- Reports and settings pages
- Email-based password reset
- Splitting `server.js` into routes, controllers and models

## Screenshots

_Add screenshots of the login page and each dashboard here._

## License

For learning and portfolio use.
