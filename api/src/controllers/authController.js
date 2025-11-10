const jwt = require('jsonwebtoken');
const { login, logout } = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const result = login(email, password);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function logoutHandler(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(204).end();
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      logout(payload.jti);
    } catch (e) {
      // ignore
    }
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { login: loginHandler, logout: logoutHandler };

