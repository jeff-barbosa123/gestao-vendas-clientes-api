const { failedAttempts } = require('../models/db');

const BLOCK_DURATION_MS = Number(process.env.LOGIN_BLOCK_MS || 15 * 60 * 1000);
const MESSAGE = 'Acesso temporariamente bloqueado';

module.exports = (req, res, next) => {
  const email = typeof (req.body || {}).email === 'string' ? req.body.email.toLowerCase() : null;

  if (!email) return next();

  const entry = failedAttempts.get(email);
  if (entry && entry.blockedUntil && Date.now() < entry.blockedUntil) {
    return res.status(423).json({ error: MESSAGE });
  }

  next();
};
