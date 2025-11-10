function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  const details = err.details;
  res.status(status).json({ error: message, ...(details ? { details } : {}) });
}

module.exports = { errorHandler };

