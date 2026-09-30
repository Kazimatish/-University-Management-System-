# University Student Management Portal

A full-stack portal for a university or college with three roles: **Student**, **Teacher** and **Admin**.
Built with Node.js, Express and MySQL. Passwords are hashed with bcrypt, sessions use a JWT in an httpOnly cookie, and every API route checks the user's role on the server.

> Status: working test project. See the roadmap below for what is not built yet.

## Live demo

**Link:** https://ums-796f3.containers.snapdeploy.app
(The first load can take 10 to 30 seconds, because the free host sleeps when idle.)

| Role    | ID              | Password     |
|---------|-----------------|--------------|
| Student | `STU-2026-0001` | `NO4MADKS#1` |
| Teacher | `TCH-2026-0001` | `9_yDgbWb#1` |

Select the matching account type on the login page. These are demo accounts with test data only, so please do not enter real personal information. The Admin dashboard is not public.

## Features

**Login**
- Login page is the first screen, with Student / Teacher / Admin account types
- Show/hide password, and forgot password (ID + registered email check, then set a new password)
- Sign out clears the session and blocks back-button access

**Student**
- Profile, subject-wise attendance with progress bars, and date-wise history
- Fee challans (printable), assignments with submission and grades, and results with GPA
- Semester applications (leave, withdrawal, freeze, rechecking, etc.) with status

**Teacher**
- Sees only students in their own subjects
- Marks attendance, creates and deletes assignments, and grades submissions with feedback
- Enters final subject marks

**Admin**
- Registers students and teachers (auto-generated IDs and one-time temporary passwords)
- Searches, deactivates, resets passwords, and deletes (with a confirmation dialog)
- Manages subjects, issues fee challans, marks them paid, and approves or rejects applications
- Audit log of admin actions and dashboard statistics

## Tech stack

Node.js, Express, MySQL (or MariaDB via XAMPP), bcryptjs, jsonwebtoken, helmet, express-rate-limit, and a plain HTML/CSS/JavaScript frontend.

## Project structure

```
student-management-system/
├── backend/
│   ├── server.js          API routes, auth, role checks
│   ├── seed.js            development demo accounts
│   ├── setup-db.js        creates the tables in the database set in .env
│   └── config/db.js       MySQL connection (supports SSL for online databases)
├── database/
│   └── schema.sql         database tables
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── Dockerfile
├── .dockerignore
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
   DB_PORT=3306
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

Run `npm run seed` only once. Local seed accounts use the password `Demo@12345`, for local testing only.

## Run locally (Mac / Linux)

```
npm install
mysql -u root -p < database/schema.sql
cp .env.example .env      # then edit .env
npm run seed
npm start
```

## Using an online MySQL database (for example TiDB Cloud)

1. Create a free cluster and note the host, port (usually 4000), username and password.
2. Set these in `.env`:
```
   DB_HOST=your-host
   DB_PORT=4000
   DB_USER=your-username
   DB_PASSWORD=your-password
   DB_NAME=sms
   DB_SSL=true
```
   `DB_SSL=true` is required, because online databases refuse insecure connections.
3. Create a database named `sms`, then create the tables from your own computer:
```
   node backend/setup-db.js
```
4. Create the first accounts once (change the demo passwords afterward):
```
   npm run seed
```

## Environment variables

| Variable      | Description |
|---------------|-------------|
| `DB_HOST`     | Database host |
| `DB_PORT`     | Database port (3306 locally, 4000 for TiDB) |
| `DB_USER`     | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME`     | Database name (`sms`) |
| `DB_SSL`      | `true` for online databases |
| `JWT_SECRET`  | Long random string used to sign login tokens |
| `NODE_ENV`    | `development` or `production` |
| `PORT`        | Server port (set by the host in most cloud platforms) |

Never commit your real `.env` file. It is listed in `.gitignore`.

## API overview

| Area    | Routes |
|---------|--------|
| Auth    | `POST /api/login`, `POST /api/logout`, `GET /api/me`, `POST /api/forgot`, `POST /api/reset` |
| Student | `GET /api/student/data`, `POST /api/student/submit/:id`, `POST /api/student/applications` |
| Teacher | `GET /api/teacher/data`, `POST /api/teacher/attendance`, `POST /api/teacher/assignments`, `DELETE /api/teacher/assignments/:id`, `GET /api/teacher/submissions/:id`, `POST /api/teacher/grade`, `POST /api/teacher/results` |
| Admin   | `GET /api/admin/data`, `POST /api/admin/students`, `POST /api/admin/teachers`, `POST /api/admin/subjects`, `POST /api/admin/challans`, `PATCH /api/admin/challans/:id`, `PATCH /api/admin/applications/:id`, `PATCH /api/admin/users/:id/active`, `POST /api/admin/users/:id/reset`, `DELETE /api/admin/users/:id` |

## Security

- Passwords are hashed with bcrypt, and never stored or shown in plain text
- JWT in an httpOnly, SameSite=Strict cookie (no localStorage), which also reduces CSRF risk
- Role checks on the server for every protected route, and teachers are limited to their own subjects
- Parameterized SQL queries, escaped output in the UI, rate-limited login, and helmet security headers
- No-cache headers, so the back button cannot reopen a dashboard after sign out
- Forgot password issues a 15-minute one-time token. In production it must be emailed (OTP or link) instead of returned by the API

## Deployment (free option: SnapDeploy + TiDB Cloud)

1. Create a free MySQL-compatible database on TiDB Cloud and create the tables (see "Using an online MySQL database").
2. Push the project to GitHub (never push `.env`).
3. On [SnapDeploy](https://snapdeploy.dev), create a new app from your GitHub repo:
   - Branch: `main`, Start Command: `npm start`, Port: leave on auto-detect
   - When asked about MySQL, choose "I'm using an external / hosted MySQL"
   - Add these environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`, a new `JWT_SECRET`, and `NODE_ENV=production`
   - Do not set `PORT`, because the host manages it
4. Deploy, then open the link shown on the container card.

Notes for the free plan: the container sleeps after 15 minutes idle, so the first request after a quiet period is slow. Free limits apply to deploys per day and running hours per month.

Other hosts such as Render or Railway also work with the same variables. Serve over HTTPS, use a new `JWT_SECRET`, and change every demo password before sharing a link.

## Roadmap (not built yet)

- Quizzes (create, attempt, publish)
- In-app notifications
- Editing student and teacher records, and class/section assignment
- Pagination and more filters
- Reports and settings pages
- Email-based password reset
- Splitting `server.js` into routes, controllers and models

## Screenshots

_Add screenshots of the login page and each dashboard here._

## License

For learning and portfolio use.
