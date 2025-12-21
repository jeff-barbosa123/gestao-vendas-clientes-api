const { randomUUID } = require("crypto");
const { logInfo } = require("../utils/logger");

function requestLogger(req, res, next) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - startedAt);
    const durationMs = Math.round(durationNs / 1e6 * 100) / 100; // 2 casas

    logInfo({
      event: 'HTTP_REQUEST',
      message: 'HTTP request finalizado',
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      userId: req.user ? req.user.id : undefined,
      ip: req.ip,
    });
  });

  next();
}

module.exports = { requestLogger };
