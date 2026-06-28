const express = require('express');
const SolveHistory = require('../models/SolveHistory');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const userQuery = { user_id: req.user._id };
    const total = await SolveHistory.countDocuments(userQuery);
    if (!total) {
      return res.json({ total_solves: 0, avg_moves: 0, min_moves: 0, max_moves: 0, avg_time_ms: 0, fastest_time_ms: 0, solves_today: 0, solves_this_week: 0, solves_this_month: 0 });
    }

    const agg = await SolveHistory.aggregate([
      { $match: userQuery },
      { $group: { _id: null, avg_moves: { $avg: '$move_count' }, min_moves: { $min: '$move_count' }, max_moves: { $max: '$move_count' }, avg_time: { $avg: '$execution_time_ms' }, min_time: { $min: '$execution_time_ms' } } },
    ]);

    const s = agg[0] || {}, now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const week = new Date(now); week.setDate(now.getDate() - 7);
    const month = new Date(now); month.setDate(now.getDate() - 30);

    const [tc, wc, mc] = await Promise.all([
      SolveHistory.countDocuments({ ...userQuery, date: { $gte: today } }),
      SolveHistory.countDocuments({ ...userQuery, date: { $gte: week } }),
      SolveHistory.countDocuments({ ...userQuery, date: { $gte: month } }),
    ]);

    res.json({
      total_solves: total,
      avg_moves: Math.round((s.avg_moves || 0) * 10) / 10,
      min_moves: s.min_moves || 0,
      max_moves: s.max_moves || 0,
      avg_time_ms: Math.round((s.avg_time || 0) * 10) / 10,
      fastest_time_ms: Math.round((s.min_time || 0) * 10) / 10,
      solves_today: tc,
      solves_this_week: wc,
      solves_this_month: mc,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
