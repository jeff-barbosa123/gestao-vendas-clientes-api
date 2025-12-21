function rateLimit({ windowMs = 60_000, max = 5, message = 'Muitas requisicoes, tente novamente mais tarde' } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : null;
    const key = forwardedIp || req.ip || 'global';
    const now = Date.now();
    const entry = hits.get(key) || { count: 0, windowStart: now };

    if (now - entry.windowStart > windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }

    next();
  };
}

module.exports = { rateLimit };
