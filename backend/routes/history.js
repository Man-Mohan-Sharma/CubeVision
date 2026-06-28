const express = require('express');
const mongoose = require('mongoose');
const SolveHistory = require('../models/SolveHistory');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, +req.query.page || 1);
    const perPage = Math.min(100, +req.query.per_page || 20);
    const search = req.query.search || '';
    const minM = req.query.min_moves != null && req.query.min_moves !== '' ? +req.query.min_moves : null;
    const maxM = req.query.max_moves != null && req.query.max_moves !== '' ? +req.query.max_moves : null;

    const query = { user_id: req.user._id };
    if (search) query.cube_state = { $regex: search, $options: 'i' };
    if (minM != null || maxM != null) {
      query.move_count = {};
      if (minM != null) query.move_count.$gte = minM;
      if (maxM != null) query.move_count.$lte = maxM;
    }

    const total = await SolveHistory.countDocuments(query);
    const records = await SolveHistory.find(query).sort({ date: -1 }).skip((page - 1) * perPage).limit(perPage).lean();

    res.json({
      success: true,
      records: records.map(r => ({
        id: r._id.toString(),
        date: r.date,
        cube_state: r.cube_state,
        solution: r.solution,
        moves: r.moves || r.solution.split(' '),
        move_count: r.move_count,
        execution_time_ms: r.execution_time_ms,
        is_valid: r.is_valid,
        algorithm: r.algorithm,
        source: r.source || 'unknown',
        face_colors: r.face_colors || null,
      })),
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: `Invalid ID: ${id}` });
    }
    const del = await SolveHistory.findOneAndDelete({ _id: id, user_id: req.user._id });
    if (!del) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Deleted', deleted_id: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
