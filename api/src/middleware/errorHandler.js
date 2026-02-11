const { logError } = require("../utils/logger");
const { translateError } = require("../utils/errorMessages");
const { t } = require("../utils/i18n");

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;

  // Mensagens claras e previsíveis (em produção, sempre amigáveis)
  let originalMessage = err.message || 'Erro interno do servidor';
  let code = err.code;

  // Tratamento de payload muito grande (DoS)
  if (!code && err.type === 'entity.too.large') {
    code = 'PAYLOAD_TOO_LARGE';
  }

  // Códigos semânticos padrão por status, caso não venha do erro
  if (!code) {
    const       defaultCodes = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        413: 'PAYLOAD_TOO_LARGE',
        422: 'UNPROCESSABLE_ENTITY',
        423: 'ACCESS_BLOCKED',
        500: 'INTERNAL_ERROR',
        503: 'DATABASE_ERROR',
      };
    code = defaultCodes[status] || 'INTERNAL_ERROR';
  }

  // Em produção, sempre retorna mensagens amigáveis
  // Em desenvolvimento, pode retornar mensagens originais para debug
  const isProduction = process.env.NODE_ENV === 'production';
  const locale = req.locale || 'pt-BR';
  
  // Tratamento especial para erros de banco de dados
  if (err.code === 'DATABASE_ERROR' || originalMessage.includes('DATABASE_URL') || originalMessage.includes('banco de dados')) {
    code = 'DATABASE_ERROR';
    originalMessage = 'Erro ao conectar com o banco de dados. Verifique se o DATABASE_URL está configurado e o PostgreSQL está rodando.';
  }
  
  // Tenta tradução i18n primeiro, depois fallback para translateError
  let message = originalMessage;
  
  // Em desenvolvimento, mostra mensagem original (pode ter detalhes úteis)
  if (!isProduction) {
    // Se já tem código DATABASE_ERROR ou mensagem sobre banco, mantém mensagem detalhada
    if (code === 'DATABASE_ERROR' || originalMessage.includes('DATABASE_URL') || originalMessage.includes('banco de dados')) {
      message = originalMessage;
    } else {
      // Para outros erros em desenvolvimento, pode mostrar mensagem original ou traduzida
      const i18nKey = `error.${code?.toLowerCase()}`;
      const i18nMessage = t(i18nKey, {}, locale);
      
      if (i18nMessage !== i18nKey) {
        message = i18nMessage;
      } else {
        message = translateError(originalMessage, code, status);
      }
    }
  } else {
    // Em produção, sempre traduz
    const i18nKey = `error.${code?.toLowerCase()}`;
    const i18nMessage = t(i18nKey, {}, locale);
    
    if (i18nMessage !== i18nKey) {
      message = i18nMessage;
    } else {
      message = translateError(originalMessage, code, status);
    }
  }

  const details = Array.isArray(err.details) ? err.details : err.details ? [err.details] : [];

  const errorValue = err.error === true ? true : message;
  const payload = {
    success: false,
    code,
    message,
    error: errorValue,
    errors: details,
  };

  // Registra a mensagem original (técnica) nos logs, mas retorna mensagem amigável ao usuário
  logError({
    event: "ERROR_RESPONSE",
    message: originalMessage, // Mensagem original para logs
    friendlyMessage: isProduction ? message : undefined, // Mensagem amigável apenas em produção
    requestId: req.requestId,
    status,
    code,
    path: req.originalUrl,
    userId: req.user ? req.user.id : undefined,
    stack: isProduction ? undefined : err.stack, // Stack apenas em desenvolvimento
  });

  // Registra erro para analytics (não bloqueia resposta)
  if (status >= 400) {
    const { logErrorForAnalytics } = require('../models/errorAnalytics');
    logErrorForAnalytics({
      code,
      status,
      message: originalMessage,
      path: req.originalUrl,
      method: req.method,
      userId: req.user ? req.user.id : undefined,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      stack: err.stack,
    }).catch(() => {
      // Ignora erros no analytics para não quebrar a resposta
    });
  }

  res.status(status).json(payload);
}

module.exports = { errorHandler };
