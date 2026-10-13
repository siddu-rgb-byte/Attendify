/**
 * Attendify - Database layer (SQLite via better-sqlite3)
 * Schema + migration + seed. Swap the file for Postgres in production
 * (see README "Going to PostgreSQL").
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'attendify.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  code           TEXT,
  target_percent REAL NOT NULL DEFAULT 75,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id       INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_classes    INTEGER NOT NULL CHECK (total_classes >= 0),
  attended_classes INTEGER NOT NULL CHECK (attended_classes >= 0 AND attended_classes <= total_classes),
  percentage       REAL NOT NULL,
  note             TEXT,
  recorded_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_records_subject ON attendance_records(subject_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_subjects_user   ON subjects(user_id);
`;

function migrate() {
  db.exec(SCHEMA);
}

/** Attendance math shared by API and tests. */
function calcMetrics(total, attended, target = 75) {
  if (total < 0 || attended < 0 || attended > total) {
    throw new Error('Invalid attendance numbers');
  }
  const percentage = total === 0 ? 0 : (attended / total) * 100;
  let eligible = percentage >= target;
  let classesRequiredToReachTarget = 0; // attend N more, all present
  let classesCanMiss = 0;              // skip N more, stay eligible

  if (total === 0) {
    // Nothing conducted yet: nothing to compute.
  } else if (!eligible) {
    // (attended + n) / (total + n) * 100 >= target
    // n >= (target*total - 100*attended) / (100 - target)
    const need = (target * total - 100 * attended) / (100 - target);
    classesRequiredToReachTarget = Math.max(0, Math.ceil(need));
    // Re-check edge: if target=100 handled by formula (division by zero avoided since target<100 enforced)
  } else {
    // attended / (total + m) * 100 >= target
    // m <= (100*attended - target*total) / target
    const can = (100 * attended - target * total) / target;
    classesCanMiss = Math.max(0, Math.floor(can));
  }
  return {
    percentage: Math.round(percentage * 100) / 100,
    eligible,
    classesRequiredToReachTarget,
    classesCanMiss,
  };
}

function seed() {
  const { seedDemo } = require('./seed');
  seedDemo(db);
}

if (require.main === module) {
  migrate();
  if (process.argv.includes('--seed')) seed();
  console.log(`DB ready at ${DB_PATH}`);
}

module.exports = { db, migrate, seed, calcMetrics, DB_PATH };
