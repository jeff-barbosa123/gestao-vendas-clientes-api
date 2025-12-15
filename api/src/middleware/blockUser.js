module.exports = (req, res, next) => {
  const blockedEmail = (process.env.BLOCKED_USER_EMAIL || 'bloqueado@teste.com').toLowerCase();
  const email = (req.body.email || '').toLowerCase();

  if (email === blockedEmail) {
    return res.status(403).json({ error: 'Usu\u00e1rio bloqueado' });
  }

  next();
};
