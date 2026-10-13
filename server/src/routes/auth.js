const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { signToken, requireAuth } = require('../auth');

router.post('/register', (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password || password.length < 6) {
    return res.status(400).json({ error: 'email, name and password (min 6 chars) are required' });
  }
  const normalized = String(email).toLowerCase().trim();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(normalized, name.trim(), hash);
  const user = { id: lastInsertRowid, email: normalized, name: name.trim() };
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const user = { id: row.id, email: row.email, name: row.name };
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
