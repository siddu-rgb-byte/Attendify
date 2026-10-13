# Attendify 🎓

**Smart Student Attendance & Eligibility Calculator** — a full-stack web app built from the
`Attendify_Abstract_and_System_Flow.docx` specification.

Students track subject-wise attendance, see eligibility against a target (default 75%),
get "attend N more classes to reach target" / "you can miss M classes" guidance,
warnings for low attendance, and attendance history charts.

## Tech Stack (per spec)

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React 18 + Vite + Tailwind CSS      |
| Charts     | Recharts                            |
| Backend    | Node.js + Express.js (REST + JWT)   |
| Database   | SQLite (better-sqlite3)*            |
| Auth       | JWT (bcrypt password hashing)       |

\* The spec suggests PostgreSQL; the DB layer is isolated in `server/src/db.js`, so
swapping to Postgres (`pg`/Prisma) touches only that file. SQLite keeps the demo
zero-config and runnable anywhere.

## Project Structure

```
attendify/
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── pages/          # Login, Register, Dashboard, Subjects, SubjectDetail
│       ├── lib/api.js      # fetch wrapper with JWT
│       └── App.jsx         # router + auth context
└── server/                 # Express API
    └── src/
        ├── db.js           # schema, migrations, attendance math
        ├── seed.js         # demo data
        ├── auth.js         # JWT sign/verify middleware
        └── routes/         # /api/auth, /api/subjects, /api/summary
```

## Quick Start

```bash
# 1. Backend (terminal 1)
cd server
npm install
npm run seed        # create schema + demo data (demo@attendify.app / demo1234)
npm run dev         # API on http://localhost:4000

# 2. Frontend (terminal 2)
cd client
npm install
npm run dev         # App on http://localhost:5173 (proxies /api -> :4000)
```

Open http://localhost:5173 and sign in with `demo@attendify.app` / `demo1234`,
or register a new account.

### Environment variables (`server/.env`, see `.env.example`)

| Variable     | Default                       | Purpose                    |
| ------------ | ----------------------------- | -------------------------- |
| `PORT`       | `4000`                        | API port                   |
| `JWT_SECRET` | dev fallback (change in prod) | Token signing secret       |
| `DB_PATH`    | `./attendify.db`              | SQLite database file       |

## API Reference

| Method | Endpoint                          | Auth | Description                                          |
| ------ | --------------------------------- | ---- | ---------------------------------------------------- |
| POST   | `/api/auth/register`              | –    | Create account → `{ token, user }`                   |
| POST   | `/api/auth/login`                 | –    | Sign in → `{ token, user }`                          |
| GET    | `/api/auth/me`                    | ✅   | Current user                                         |
| GET    | `/api/subjects`                   | ✅   | Subjects with latest attendance + eligibility math   |
| POST   | `/api/subjects`                   | ✅   | Add subject `{ name, code?, target_percent? }`       |
| PUT    | `/api/subjects/:id`               | ✅   | Update subject                                       |
| DELETE | `/api/subjects/:id`               | ✅   | Delete subject (cascades records)                    |
| POST   | `/api/subjects/:id/records`       | ✅   | Add attendance record `{ total_classes, attended_classes }` |
| GET    | `/api/subjects/:id/records`       | ✅   | Attendance history                                   |
| GET    | `/api/summary`                    | ✅   | Dashboard: overall %, per-subject, warnings          |

## Spec Coverage

| Spec module                     | Where implemented                                        |
| ------------------------------- | -------------------------------------------------------- |
| Login / Registration (JWT)      | `server/src/routes/auth.js`, `client/src/pages/Login|Register` |
| Subject Management              | `server/src/routes/subjects.js`, `client/src/pages/Subjects` |
| Attendance Entry                | `POST /subjects/:id/records`, `SubjectDetail` form        |
| Attendance Calculator (%/target)| `calcMetrics()` in `server/src/db.js`                     |
| Eligibility Calculator          | `eligible` + warnings in `/api/summary`                   |
| Classes required / can-miss math| `classesRequiredToReachTarget`, `classesCanMiss`          |
| Dashboard + charts + warnings   | `client/src/pages/Dashboard.jsx` (Recharts bar + pie)     |
| History                         | records table + line chart in `SubjectDetail`             |

## Attendance Math

- `percentage = attended / total × 100`
- Classes needed to reach target (attending all): smallest `n` with
  `(attended + n) / (total + n) ≥ target/100`
- Classes that can be missed while staying eligible: largest `m` with
  `attended / (total + m) ≥ target/100`

## Going to PostgreSQL

Replace `better-sqlite3` in `server/src/db.js` with `pg` (or Prisma). The SQL is
already standard (INTEGER/TEXT/REAL columns, datetime defaults); the three queries
in `subjects.js`/`summary.js` need no logic changes.
