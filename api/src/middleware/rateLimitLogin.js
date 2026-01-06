const { failedAttempts } = require('../models/db');

const MESSAGE = 'Acesso temporariamente bloqueado';

module.exports = (req, res, next) => {
  const email = typeof (req.body || {}).email === 'string' ? req.body.email.toLowerCase() : null;

  if (!email) return next();

  const entry = failedAttempts.get(email);
  if (entry && entry.blockedUntil && Date.now() < entry.blockedUntil) {
    return res.status(423).json({ message: MESSAGE, error: true });
  }

  next();
};
