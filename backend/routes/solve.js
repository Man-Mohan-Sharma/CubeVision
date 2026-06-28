const express = require('express');
const { CubeValidator } = require('../validator/cubeValidator');
const { KociembaSolver } = require('../solver/kociembaSolver');
const SolveHistory = require('../models/SolveHistory');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();
const validator = new CubeValidator();
const solver = new KociembaSolver();

router.post('/', optionalAuth, async (req, res) => {
  try {
    const { cube_state, source = 'unknown' } = req.body;
    if (!cube_state || typeof cube_state !== 'string') {
      return res.status(400).json({ success: false, error: 'cube_state is required (54-char string)' });
    }

    const state = cube_state.toUpperCase().trim();
    const val = validator.validate(state);
    if (!val.isValid) {
      return res.json({ success: false, message: 'Invalid cube state', cube_state: state, error: val.errors.join('; ') });
    }

    const result = solver.solve(state);
    if (!result.success) {
      return res.json({ success: false, message: 'Solver failed', cube_state: state, error: result.error });
    }

    const record = {
      user_id: req.user?._id || null,
      cube_state: state,
      solution: result.solution,
      moves: result.moves,
      move_count: result.move_count,
      execution_time_ms: result.execution_time_ms,
      source: ['photo', 'manual', 'edited'].includes(source) ? source : 'unknown',
    };

    SolveHistory.create(record).catch(e => console.warn('History save failed:', e.message));

    return res.json({
      success: true,
      message: `Solved in ${result.move_count} moves`,
      saved_to_account: Boolean(req.user),
      cube_state: state,
      solution: result.solution,
      moves: result.moves,
      move_count: result.move_count,
      execution_time_ms: result.execution_time_ms,
      algorithm: result.algorithm,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { cube_state } = req.body;
    if (!cube_state) return res.status(400).json({ is_valid: false, errors: ['cube_state required'] });
    const val = validator.validate(cube_state.toUpperCase().trim());
    res.json({
      is_valid: val.isValid,
      errors: val.errors,
      warnings: val.warnings,
      color_counts: val.colorCounts,
      checks_passed: val.checksPassed || [],
    });
  } catch (err) {
    res.status(500).json({ is_valid: false, errors: [err.message] });
  }
});

module.exports = router;
