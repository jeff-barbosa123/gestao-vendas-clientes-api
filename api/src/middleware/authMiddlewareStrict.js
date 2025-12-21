const jwt = require('jsonwebtoken');
const { tokenStore } = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_PREVIOUS_SECRET = process.env.JWT_PREVIOUS_SECRET;

const MSG_TOKEN_MISSING = 'Token inválido ou ausente';

function verifyWithRotation(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (JWT_PREVIOUS_SECRET) {
      return jwt.verify(token, JWT_PREVIOUS_SECRET);
    }
    throw err;
  }
}

function authenticateStrict(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    const err = new Error(MSG_TOKEN_MISSING);
    err.status = 401;
    return next(err);
  }

  try {
    const payload = verifyWithRotation(token);
    const entry = tokenStore.get(payload.jti);
    if (!entry || entry.revoked) {
      const err = new Error(MSG_TOKEN_MISSING);
      err.status = 401;
      return next(err);
    }
    req.user = { id: entry.userId, email: entry.email };
    req.auth = { jti: payload.jti };
    next();
  } catch (_err) {
    const err = new Error(MSG_TOKEN_MISSING);
    err.status = 401;
    return next(err);
  }
}

module.exports = { authenticateStrict };
