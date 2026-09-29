# University Student Management Portal
Node.js + Express + MySQL, JWT in an httpOnly cookie, bcrypt passwords, role-based API authorization.

## Run locally
1. `npm install`
2. Create the DB: `mysql -u root -p < database/schema.sql`
3. `cp .env.example .env` and set DB credentials and a long random `JWT_SECRET`
4. `npm run seed` (dev demo data) then `npm start` -> http://localhost:3000
The backend serves the `frontend/` folder, so there is nothing separate to run.

## Demo credentials (DEVELOPMENT ONLY, delete before production)
| Role | ID | Password |
|---|---|---|
| Admin | ADMIN-001 | Demo@12345 |
| Teacher | TCH-2026-0001 | Demo@12345 |
| Student | STU-2026-0001 | Demo@12345 |
Demo emails: admin@example.com, teacher@example.com, student@example.com

## API summary
- Auth: POST /api/login, /api/logout, GET /api/me, POST /api/forgot, /api/reset
- Student: GET /api/student/data, POST /api/student/submit/:id, /api/student/applications
- Teacher: GET /api/teacher/data, POST /attendance, /assignments, /grade, /results, GET /submissions/:id, DELETE /assignments/:id
- Admin: GET /api/admin/data, POST /students, /teachers, /subjects, /challans, PATCH /users/:id/active, /challans/:id, /applications/:id, POST /users/:id/reset, DELETE /users/:id

## Security notes
Parameterized SQL everywhere; output escaped in the UI; SameSite=Strict cookie + JSON-only API (CSRF); rate-limited login; helmet headers; no-store caching so the back button can't reopen dashboards after sign out.
Forgot password verifies ID + email, then issues a 15-minute one-time token. In production, email that token/OTP instead of returning it from the API (see `/api/forgot`).

## Deploy
Use a VPS or PaaS (Render, Railway, etc.) with a managed MySQL. Set the env vars from `.env.example`, `NODE_ENV=production`, serve over HTTPS (needed for the secure cookie), run `schema.sql` once, and do NOT run the seed script.
