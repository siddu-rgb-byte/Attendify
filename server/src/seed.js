/** Demo seed: creates demo@attendify.app / demo1234 with 5 subjects + records. */
const bcrypt = require('bcryptjs');

function percentage(total, attended) {
  return total === 0 ? 0 : Math.round((attended / total) * 10000) / 100;
}

function seedDemo(db) {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@attendify.app');
  if (exists) {
    console.log('Seed skipped: demo user already exists.');
    return;
  }
  const hash = bcrypt.hashSync('demo1234', 10);
  const { lastInsertRowid: uid } = db
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run('demo@attendify.app', 'Demo Student', hash);

  const subjects = [
    { name: 'Data Structures',   code: 'CS201', target: 75, weeks: [[40, 32], [45, 37]] },
    { name: 'DBMS',              code: 'CS202', target: 75, weeks: [[40, 38], [45, 42]] },
    { name: 'Operating Systems', code: 'CS203', target: 75, weeks: [[36, 24], [42, 28]] },
    { name: 'Discrete Maths',    code: 'MA204', target: 70, weeks: [[30, 28], [34, 32]] },
    { name: 'Web Technologies',  code: 'CS205', target: 75, weeks: [[25, 25], [28, 28]] },
  ];
  const insSub = db.prepare('INSERT INTO subjects (user_id, name, code, target_percent) VALUES (?, ?, ?, ?)');
  const insRec = db.prepare(`INSERT INTO attendance_records
    (subject_id, user_id, total_classes, attended_classes, percentage, recorded_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))`);

  for (const s of subjects) {
    const { lastInsertRowid: sid } = insSub.run(uid, s.name, s.code, s.target);
    let offset = -s.weeks.length * 7;
    for (const [total, attended] of s.weeks) {
      insRec.run(sid, uid, total, attended, percentage(total, attended), `${offset} days`);
      offset += 7;
    }
  }
  console.log('Seeded demo user: demo@attendify.app / demo1234');
}

module.exports = { seedDemo };
