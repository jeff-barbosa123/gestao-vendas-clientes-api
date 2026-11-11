const crypto = require('crypto');

const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'sgvc_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

function cookieOptions(req) {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https';

  return {
    httpOnly: false, // double-submit: frontend precisa ler
    secure,
    sameSite: 'strict',
    path: '/',
  };
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Garante cookie CSRF em requests "safe" (GET/HEAD/OPTIONS).
 * Para double-submit cookie: o browser envia o cookie e o frontend reenvia o mesmo valor no header.
 */
function ensureCsrfCookie(req, res, next) {
  if (!req.cookies) {
    const err = new Error('CSRF_MISCONFIGURED_NO_COOKIE_PARSER');
    err.status = 500;
    return next(err);
  }

  const method = String(req.method || '').toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  if (!isSafe) return next();

  const existing = req.cookies[CSRF_COOKIE_NAME];
  if (existing) {
    req.csrfToken = existing;
    return next();
  }

  const token = generateToken();
  res.cookie(CSRF_COOKIE_NAME, token, cookieOptions(req));
  req.csrfToken = token;
  return next();
}

/**
 * Valida CSRF para métodos mutáveis.
 * Exige que `X-CSRF-Token` === cookie `sgvc_csrf` (double-submit).
 */
function csrfProtect(req, res, next) {
  if (!req.cookies) {
    const err = new Error('CSRF_MISCONFIGURED_NO_COOKIE_PARSER');
    err.status = 500;
    return next(err);
  }

  const method = String(req.method || '').toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  if (isSafe) return next();

  // Rotas públicas que normalmente são chamadas sem CSRF prévio (login/registro/reset)
  const path = String(req.originalUrl || req.url || '');
  const isAuthPublic =
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/auth/forgot') ||
    path.startsWith('/api/auth/reset');
  if (isAuthPublic) return next();

  // CSRF só se aplica quando o navegador envia o cookie de sessão (auth por cookie).
  // Sem cookie de sessão não há o que forjar: clientes de API (Swagger, Postman, testes)
  // usam "Authorization: Bearer" e requisições sem login seguem para o authenticate (401).
  const hasSessionCookie = Boolean(req.cookies.sgvc_token || req.cookies.sgvc_refresh);
  if (!hasSessionCookie) return next();

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || String(headerToken) !== String(cookieToken)) {
    return res.status(403).json({ error: 'CSRF_INVALID' });
  }

  next();
}

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  ensureCsrfCookie,
  csrfProtect,
};

