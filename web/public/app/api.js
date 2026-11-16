/**
 * Cliente de API da tela: CSRF, refresh de token e erros do backend.
 */
import { API_BASE, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './constants.js';
import { emailError, emailInput, passwordError, passwordInput } from './dom.js';
import { state } from './state.js';
import { setFieldError } from './messages.js';

function buildUrl(path) {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`;
  }
  return `${base}${normalizedPath}`;
}

export function normalizeApiError(err) {
  const status = err && err.status ? err.status : 0;
  const raw = err && err.payload ? err.payload : null;
  const apiMessage = raw && (raw.message || raw.error) ? String(raw.message || raw.error) : '';

  const fallbackByStatus = {
    400: 'Preencha e-mail e senha corretamente.',
    401: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
    403: 'Usu\u00e1rio bloqueado. Entre em contato.',
    423: 'Muitas tentativas. Tente novamente mais tarde.',
    429: 'Muitas tentativas. Aguarde alguns minutos.',
  };

  if (status === 0) {
    return 'N\u00e3o foi poss\u00edvel conectar ao servidor. Tente novamente em alguns instantes.';
  }

  if (status >= 500) {
    return 'Erro interno. Tente novamente mais tarde.';
  }

  const fallback = fallbackByStatus[status];
  if (!apiMessage) return fallback || 'Erro na API. Tente novamente.';

  const looksTechnical = /exception|stack|sql|mongodb|sequelize|prisma|typeorm|trace/i.test(apiMessage);
  if (looksTechnical) return fallback || 'Erro na API. Tente novamente.';

  return apiMessage;
}

async function tryRefreshToken() {
  // Auth via cookie HttpOnly: refresh token não é gerenciado no JS
  return false;
}

function getCookieValue(name) {
  try {
    const parts = String(document.cookie || '').split(';');
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i].trim();
      if (!part) continue;
      const eq = part.indexOf('=');
      const key = eq >= 0 ? part.slice(0, eq).trim() : part;
      if (key !== name) continue;
      const raw = eq >= 0 ? part.slice(eq + 1) : '';
      return decodeURIComponent(raw);
    }
  } catch (_err) {
    // ignore
  }
  return null;
}

function getCsrfToken() {
  return getCookieValue(CSRF_COOKIE_NAME);
}

async function ensureCsrfCookie() {
  if (state.csrfEnsured) return;
  state.csrfEnsured = true;
  try {
    await fetch(buildUrl('/api/auth/csrf'), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
    });
  } catch (_err) {
    // ignore
  }
}

export async function apiRequest(path, options = {}) {
  const url = buildUrl(path);
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});

  // Auth via cookie HttpOnly (não usar Authorization: Bearer no frontend)

  const method = String(options.method || 'GET').toUpperCase();
  const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (isMutating) {
    await ensureCsrfCookie();
    const csrfToken = getCsrfToken();
    if (csrfToken) headers[CSRF_HEADER_NAME] = csrfToken;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    const error = new Error('NETWORK_ERROR');
    error.status = 0;
    error.payload = null;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const error = new Error('API_ERROR');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function applyBackendFieldErrors(status, message) {
  if (status !== 401) return;
  const normalized = String(message || '').toLowerCase();
  const emailHint = normalized.includes('email') || normalized.includes('e-mail');
  const passwordHint = normalized.includes('senha');

  if (emailHint && !passwordHint) {
    setFieldError(emailInput, 'E-mail incorreto.', emailError);
    if (emailInput) emailInput.focus();
    return;
  }
  if (passwordHint && !emailHint) {
    setFieldError(passwordInput, 'Senha incorreta.', passwordError);
    if (passwordInput) passwordInput.focus();
    return;
  }

  setFieldError(emailInput, 'E-mail ou senha incorretos.', emailError);
  setFieldError(passwordInput, 'E-mail ou senha incorretos.', passwordError);
  if (emailInput) emailInput.focus();
}
