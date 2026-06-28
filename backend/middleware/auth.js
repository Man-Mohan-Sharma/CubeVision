const User = require('../models/User');
const { verifyJwt } = require('../utils/jwt');

function getToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

async function attachUser(req, res, next, required) {
  try {
    const token = getToken(req);
    if (!token) {
      if (required) return res.status(401).json({ success: false, message: 'Login required.' });
      return next();
    }

    const payload = verifyJwt(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, message: 'User no longer exists. Please log in again.' });

    req.user = user;
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message || 'Invalid token.' });
  }
}

function requireAuth(req, res, next) {
  return attachUser(req, res, next, true);
}

function optionalAuth(req, res, next) {
  return attachUser(req, res, next, false);
}

module.exports = { requireAuth, optionalAuth };
