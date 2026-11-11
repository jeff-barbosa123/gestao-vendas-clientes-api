const path = require('path');
const express = require('express');
const { URL } = require('url');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const isProd = process.env.NODE_ENV === 'production';
const API_BASE = isProd ? (process.env.API_BASE || 'http://localhost:3000') : 'http://localhost:3000';
const API_ORIGIN = (() => {
  if (!API_BASE || !API_BASE.startsWith('http')) return null;
  try {
    const parsed = new URL(API_BASE);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_err) {
    return null;
  }
})();

// Proxy /api/* requests to backend API (http://localhost:3000) in development.
// This makes the browser see the API as same-origin (localhost:4000),
// allowing SameSite=lax cookies to work without HTTPS.
app.use('/api', (req, res) => {
  try {
    const target = new URL(API_BASE);
    const isHttps = target.protocol === 'https:';
    const httpLib = isHttps ? require('https') : require('http');
    const hopByHopHeaders = new Set([
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
    ]);
    const filteredHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!hopByHopHeaders.has(String(key).toLowerCase())) {
        filteredHeaders[key] = value;
      }
    }
    // Ensure Host header matches target; avoid leaking frontend origin
    filteredHeaders.host = target.host;
    // Remove Origin/Referer to avoid CORS complications (same-origin via proxy)
    delete filteredHeaders.origin;
    delete filteredHeaders.referer;

    const options = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      method: req.method,
      path: req.originalUrl, // includes /api/*
      headers: filteredHeaders,
    };

    const proxyReq = httpLib.request(options, (proxyRes) => {
      // Forward status and headers (including Set-Cookie) transparently
      const resHeaders = {};
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (!hopByHopHeaders.has(String(key).toLowerCase())) {
          resHeaders[key] = value;
        }
      }
      res.writeHead(proxyRes.statusCode || 500, resHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.status(502).json({ error: 'BAD_GATEWAY', message: err.message });
    });

    if (req.readable) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  } catch (err) {
    res.status(500).json({ error: 'PROXY_ERROR', message: err.message });
  }
});

app.disable('x-powered-by');
app.use('/static', express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: function(res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: function(res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}));

app.use((req, res, next) => {
  const fixedSources = ["'self'", 'https://servicodados.ibge.gov.br', 'https://cdn.jsdelivr.net', 'http://localhost:3000'];
  if (API_ORIGIN) {
    fixedSources.push(API_ORIGIN);
  }
  const connectSources = Array.from(new Set(fixedSources.filter(Boolean)));
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      "script-src 'self' https://cdn.jsdelivr.net",
      "img-src 'self' data:",
      `connect-src ${connectSources.join(' ')}`,
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`window.APP_CONFIG = { API_BASE: "${API_BASE}" };`);
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/clients.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'clients.html'));
});

app.get('/clients', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'clients.html'));
});

app.get('/products.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/product-edit.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product-edit.html'));
});

app.get('/sales.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sales.html'));
});

app.get('/reports.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

app.get('/simulacao.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simulacao.html'));
});

app.get('/recipes.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'recipes.html'));
});

app.get('/recipe-edit.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'recipe-edit.html'));
});

app.get('/vinculos.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vinculos.html'));
});

app.get('/client-edit.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client-edit.html'));
});

app.get('/profile.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Web app listening on http://localhost:${PORT}`);
});
