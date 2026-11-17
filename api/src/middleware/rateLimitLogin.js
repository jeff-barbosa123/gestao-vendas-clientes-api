const { failedAttempts } = require('../models/db');

const MESSAGE = 'Acesso temporariamente bloqueado';

module.exports = (req, res, next) => {
  const body = req.body || {};
  const raw = body.identifier !== undefined ? body.identifier : body.email;
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : null;

  if (!email) return next();

  const entry = failedAttempts.get(email);
  if (entry && entry.blockedUntil && Date.now() < entry.blockedUntil) {
    return res.status(423).json({ message: MESSAGE, error: true });
  }

  next();
};
