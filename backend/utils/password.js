const crypto = require('crypto');

const KEY_LEN = 64;
const SALT_LEN = 16;

function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const [algo, salt, expectedHex] = storedHash.split('$');
  if (algo !== 'scrypt' || !salt || !expectedHex) return false;

  const actual = crypto.scryptSync(password, salt, KEY_LEN);
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
