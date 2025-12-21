const { logError } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;

  // Mensagens claras e previsíveis
  let message = err.message || 'Erro interno do servidor';
  let code = err.code;

  // Tratamento de payload muito grande (DoS)
  if (!code && err.type === 'entity.too.large') {
    code = 'PAYLOAD_TOO_LARGE';
    message = 'O arquivo ou dado enviado é muito grande.';
  }

  // Códigos semânticos padrão por status, caso não venha do erro
  if (!code) {
    const defaultCodes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      422: 'UNPROCESSABLE_ENTITY',
    };
    code = defaultCodes[status] || 'INTERNAL_ERROR';
  }

  const details = Array.isArray(err.details) ? err.details : err.details ? [err.details] : [];

  const payload = {
    success: false,
    code,
    message,
    error: message, // compatibilidade com clientes que já esperam "error"
    errors: details,
  };

  // registra falhas reais
  logError({
    event: "ERROR_RESPONSE",
    message,
    requestId: req.requestId,
    status,
    code,
    path: req.originalUrl,
    userId: req.user ? req.user.id : undefined,
  });

  res.status(status).json(payload);
}

module.exports = { errorHandler };
