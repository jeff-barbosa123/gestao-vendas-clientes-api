/**
 * Cliente HTTP centralizado para requisições à API
 * Integra com error-handler.js para mensagens amigáveis
 */

(() => {
  // Preferir same-origin por padrão (evita apontar para localhost em produção)
  const API_BASE =
    (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
    (window.location && window.location.port === '4000'
      ? 'http://localhost:4000'
      : window.location.origin);
  const REQUEST_TIMEOUT_MS =
    Number(window.APP_CONFIG && window.APP_CONFIG.REQUEST_TIMEOUT_MS) || 10000;
  // Auth agora é via cookie HttpOnly (token não deve existir no browser storage)

  /**
   * Constrói URL completa da API
   */
  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`;
    }
    return `${base}${normalizedPath}`;
  }

  let cachedMe = null;
  let cachedMeAt = 0;
  const ME_TTL_MS = 30_000;

  const CSRF_COOKIE_NAME = 'sgvc_csrf';
  const CSRF_HEADER_NAME = 'X-CSRF-Token';
  let csrfEnsured = false;

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
    if (csrfEnsured) return;
    csrfEnsured = true;
    // "Safe" endpoint: garante cookie CSRF via middleware
    try {
      await fetch(buildUrl('/api/auth/csrf'), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
    } catch (_err) {
      // Se falhar, deixa a requisição mutável seguir e o backend retornará 403/CSRF_INVALID
    }
  }

  async function getMe(options = {}) {
    const now = Date.now();
    if (!options.force && cachedMe && now - cachedMeAt < ME_TTL_MS) return cachedMe;
    const me = await apiRequest('/api/auth/me', { method: 'GET', skipAuth: true });
    cachedMe = me;
    cachedMeAt = now;
    return me;
  }

  /**
   * Faz requisição HTTP à API com tratamento de erros
   * @param {string} path - Caminho da rota (ex: '/api/customers')
   * @param {string|object} tokenOrOptions - Token JWT ou objeto de opções
   * @param {object} options - Opções da requisição (method, body, headers, etc)
   */
  async function apiRequest(path, tokenOrOptions = null, options = {}) {
    // Back-compat: assinatura antiga apiRequest(path, token, options) ainda funciona,
    // mas o token é ignorado (auth via cookie HttpOnly).
    const requestOptions =
      tokenOrOptions && typeof tokenOrOptions === 'object' ? tokenOrOptions : options;

    const url = buildUrl(path);
    const headers = {
      'Content-Type': 'application/json',
      ...(requestOptions.headers || {}),
    };

    const method = String(requestOptions.method || 'GET').toUpperCase();
    const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
    if (isMutating) {
      await ensureCsrfCookie();
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers[CSRF_HEADER_NAME] = csrfToken;
      }
    }

    let response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      response = await fetch(url, {
        ...requestOptions,
        headers,
        cache: 'no-store',
        credentials: 'include',
        signal: controller.signal,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        const timeoutError = new Error('REQUEST_TIMEOUT');
        timeoutError.status = 0;
        timeoutError.payload = null;
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }
      // Erro de rede/conexão
      const networkError = new Error('NETWORK_ERROR');
      networkError.status = 0;
      networkError.payload = null;
      networkError.name = 'NetworkError';
      throw networkError;
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type') || '';
    let payload = null;

    try {
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        payload = await response.text();
      }
    } catch (err) {
      // Erro ao parsear resposta
      const parseError = new Error('INVALID_RESPONSE');
      parseError.status = response.status;
      parseError.payload = null;
      throw parseError;
    }

    if (!response.ok) {
      // Cria erro estruturado para o error-handler processar
      const apiError = new Error('API_ERROR');
      apiError.status = response.status;
      apiError.payload = payload;
      throw apiError;
    }

    return payload;
  }

  // Expõe função globalmente
  window.apiRequest = apiRequest;
  window.apiGetMe = getMe;
  window.apiGetCsrfToken = getCsrfToken;
})();
