function rateLimit(options = {}) {
  // Defaults by environment: relaxed in development, strict in production
  const env = process.env.NODE_ENV || 'development';
  const isDev = env !== 'production';
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? (isDev ? 100 : 5);
  const message = options.message ?? 'Muitas requisicoes, tente novamente mais tarde';

  const hits = new Map();
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

  // Limpeza periódica das entradas expiradas (evita vazamento de memória).
  // unref(): o timer não impede o processo de encerrar (testes, SIGTERM do container).
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now - entry.windowStart > windowMs) {
        hits.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  if (typeof cleanupInterval.unref === 'function') cleanupInterval.unref();

  // Permite desligar o rate limit em testes automatizados / ambientes controlados
  if (String(process.env.DISABLE_RATE_LIMIT).toLowerCase() === 'true') {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : null;
    const key = forwardedIp || req.ip || 'global';
    const now = Date.now();
    let entry = hits.get(key);

    // Clean up expired entry if exists
    if (entry && now - entry.windowStart > windowMs) {
      hits.delete(key);
      entry = null;
    }

    if (!entry) {
      entry = { count: 0, windowStart: now };
    }

    entry.count += 1;
    hits.set(key, entry);

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (entry.count > max) {
      return res.status(429).json({ 
        success: false, 
        message,
        retryAfter: resetTime,
      });
    }

    next();
  };
}

module.exports = { rateLimit };
