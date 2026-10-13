const router = require('express').Router();
const { db, calcMetrics } = require('../db');
const { requireAuth } = require('../auth');

router.use(requireAuth);

/** GET /api/summary -> overall attendance + warnings (dashboard data) */
router.get('/', (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects WHERE user_id = ? ORDER BY name').all(req.user.id);
  const latestStmt = db
    .prepare('SELECT * FROM attendance_records WHERE subject_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1');

  let sumTotal = 0, sumAttended = 0;
  const perSubject = [];
  for (const s of subjects) {
    const latest = latestStmt.get(s.id);
    if (latest) {
      sumTotal += latest.total_classes;
      sumAttended += latest.attended_classes;
    }
    const m = latest ? calcMetrics(latest.total_classes, latest.attended_classes, s.target_percent) : null;
    perSubject.push({
      id: s.id,
      name: s.name,
      code: s.code,
      target_percent: s.target_percent,
      total_classes: latest?.total_classes ?? 0,
      attended_classes: latest?.attended_classes ?? 0,
      percentage: m ? m.percentage : 0,
      eligible: m ? m.eligible : false,
      classes_required_to_reach_target: m ? m.classesRequiredToReachTarget : 0,
      classes_can_miss: m ? m.classesCanMiss : 0,
    });
  }

  const overallPercentage = sumTotal === 0 ? 0 : Math.round((sumAttended / sumTotal) * 10000) / 100;
  res.json({
    overall: {
      total_classes: sumTotal,
      attended_classes: sumAttended,
      percentage: overallPercentage,
      subject_count: subjects.length,
      eligible_count: perSubject.filter((p) => p.total_classes > 0 && p.eligible).length,
      low_attendance_count: perSubject.filter((p) => p.total_classes > 0 && !p.eligible).length,
    },
    warnings: perSubject.filter((p) => p.total_classes > 0 && !p.eligible),
    subjects: perSubject,
  });
});

module.exports = router;
