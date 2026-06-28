const express = require('express');
const User = require('../models/User');
const SolveHistory = require('../models/SolveHistory');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signJwt } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createToken(user) {
  return signJwt({ sub: user._id.toString(), email: user.email, name: user.name });
}

router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Enter a valid email.' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'An account already exists with this email.' });

    const user = await User.create({ name, email, password_hash: hashPassword(password) });
    const token = createToken(user);
    return res.status(201).json({ success: true, token, user: user.toSafeJSON() });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, message: 'An account already exists with this email.' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    const user = await User.findOne({ email }).select('+password_hash');
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    user.last_login_at = new Date();
    await user.save();

    const token = createToken(user);
    return res.json({ success: true, token, user: user.toSafeJSON() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const [stats] = await SolveHistory.aggregate([
      { $match: { user_id: req.user._id } },
      { $group: { _id: null, solve_count: { $sum: 1 }, avg_moves: { $avg: '$move_count' }, best_moves: { $min: '$move_count' } } },
    ]);

    return res.json({
      success: true,
      user: req.user.toSafeJSON(),
      stats: {
        solve_count: stats?.solve_count || 0,
        avg_moves: stats?.avg_moves ? Math.round(stats.avg_moves * 10) / 10 : 0,
        best_moves: stats?.best_moves ?? 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logout', (_req, res) => {
  // JWT logout is client-side: remove token from localStorage/session storage.
  res.json({ success: true, message: 'Logged out.' });
});

module.exports = router;
