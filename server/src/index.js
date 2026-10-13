require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { migrate } = require('./db');
const { requireAuth } = require('./auth');

migrate();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'attendify-api' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/summary', require('./routes/summary'));

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
// central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Attendify API listening on http://localhost:${PORT}`));
}

module.exports = app;
