const router = require('express').Router();
const { db, calcMetrics } = require('../db');
const { requireAuth } = require('../auth');

router.use(requireAuth);

/** Latest record per subject + computed eligibility metrics. */
function subjectWithMetrics(s) {
  const latest = db
    .prepare('SELECT * FROM attendance_records WHERE subject_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
    .get(s.id);
  const metrics = latest ? calcMetrics(latest.total_classes, latest.attended_classes, s.target_percent) : null;
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    target_percent: s.target_percent,
    created_at: s.created_at,
    latest: latest
      ? {
          total_classes: latest.total_classes,
          attended_classes: latest.attended_classes,
          percentage: metrics.percentage,
          eligible: metrics.eligible,
          classes_required_to_reach_target: metrics.classesRequiredToReachTarget,
          classes_can_miss: metrics.classesCanMiss,
          recorded_at: latest.recorded_at,
        }
      : null,
  };
}

// GET /api/subjects  -> list with metrics
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM subjects WHERE user_id = ? ORDER BY name').all(req.user.id);
  res.json({ subjects: rows.map(subjectWithMetrics) });
});

// POST /api/subjects
router.post('/', (req, res) => {
  const { name, code, target_percent } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Subject name is required' });
  const target = target_percent == null ? 75 : Number(target_percent);
  if (!(target > 0 && target < 100)) {
    return res.status(400).json({ error: 'target_percent must be between 0 and 100 (exclusive)' });
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO subjects (user_id, name, code, target_percent) VALUES (?, ?, ?, ?)')
    .run(req.user.id, String(name).trim(), code ? String(code).trim() : null, target);
  const s = db.prepare('SELECT * FROM subjects WHERE id = ?').get(lastInsertRowid);
  res.status(201).json({ subject: subjectWithMetrics(s) });
});

// PUT /api/subjects/:id
router.put('/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM subjects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!s) return res.status(404).json({ error: 'Subject not found' });
  const { name, code, target_percent } = req.body || {};
  const next = {
    name: name != null ? String(name).trim() : s.name,
    code: code !== undefined ? (code ? String(code).trim() : null) : s.code,
    target_percent: target_percent != null ? Number(target_percent) : s.target_percent,
  };
  if (!(next.target_percent > 0 && next.target_percent < 100)) {
    return res.status(400).json({ error: 'target_percent must be between 0 and 100 (exclusive)' });
  }
  db.prepare('UPDATE subjects SET name = ?, code = ?, target_percent = ? WHERE id = ?')
    .run(next.name, next.code, next.target_percent, s.id);
  const updated = db.prepare('SELECT * FROM subjects WHERE id = ?').get(s.id);
  res.json({ subject: subjectWithMetrics(updated) });
});

// DELETE /api/subjects/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Subject not found' });
  res.json({ ok: true });
});

// POST /api/subjects/:id/records  { total_classes, attended_classes, note }
router.post('/:id/records', (req, res) => {
  const s = db.prepare('SELECT * FROM subjects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!s) return res.status(404).json({ error: 'Subject not found' });

  const total = Number(req.body?.total_classes);
  const attended = Number(req.body?.attended_classes);
  if (!Number.isInteger(total) || !Number.isInteger(attended) || total < 0 || attended < 0 || attended > total) {
    return res.status(400).json({
      error: 'total_classes and attended_classes must be integers with 0 <= attended <= total',
    });
  }
  let metrics;
  try {
    metrics = calcMetrics(total, attended, s.target_percent);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO attendance_records (subject_id, user_id, total_classes, attended_classes, percentage, note)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(s.id, req.user.id, total, attended, metrics.percentage, req.body?.note || null);
  const record = db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(lastInsertRowid);
  res.status(201).json({
    record: {
      ...record,
      eligible: metrics.eligible,
      classes_required_to_reach_target: metrics.classesRequiredToReachTarget,
      classes_can_miss: metrics.classesCanMiss,
    },
    subject: subjectWithMetrics(s),
  });
});

// GET /api/subjects/:id/records -> history
router.get('/:id/records', (req, res) => {
  const s = db.prepare('SELECT id FROM subjects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!s) return res.status(404).json({ error: 'Subject not found' });
  const records = db
    .prepare('SELECT * FROM attendance_records WHERE subject_id = ? ORDER BY recorded_at DESC, id DESC')
    .all(s.id);
  res.json({ records });
});

module.exports = router;
