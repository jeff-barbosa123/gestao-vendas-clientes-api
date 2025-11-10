const jwt = require('jsonwebtoken');
const { tokenStore } = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const INACTIVITY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Token ausente' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const entry = tokenStore.get(payload.jti);
    if (!entry || entry.revoked) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    const now = Date.now();
    if (now - entry.lastActivity > INACTIVITY_WINDOW_MS) {
      entry.revoked = true;
      return res.status(401).json({ error: 'Sessão expirada por inatividade' });
    }
    // update last activity
    entry.lastActivity = now;
    req.user = { id: entry.userId, email: entry.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { authenticate };

