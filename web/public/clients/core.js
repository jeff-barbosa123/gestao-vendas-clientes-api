/**
 * Infraestrutura da tela: URL, autenticaÃ§Ã£o, mensagens e helpers de campo.
 */
import { API_BASE, SEVERITY_CLASSES } from './constants.js';
import { messageBox } from './dom.js';
import { state } from './state.js';

export async function requireAuth() {
  if (!window.apiGetMe) {
    window.location.href = '/';
    return null;
  }
  try {
    const me = await window.apiGetMe({ force: true });
    return me && me.user ? me.user : me;
  } catch (_err) {
    if (_err && _err.name === 'AbortError') {
      return null;
    }
    window.location.href = '/';
    return null;
  }
}

export function showMessage(text, type) {
  if (!messageBox) return;
  messageBox.textContent = text || '';
  SEVERITY_CLASSES.forEach((cls) => messageBox.classList.remove(cls));
  if (type) messageBox.classList.add(type);
  if (state.messageTimer) {
    clearTimeout(state.messageTimer);
    state.messageTimer = null;
  }
  if (text) {
    messageBox.hidden = false;
    messageBox.focus();
    const timeout = type === 'is-danger' ? 6500 : 4500;
    state.messageTimer = setTimeout(() => {
      messageBox.hidden = true;
      messageBox.textContent = '';
      messageBox.classList.remove('is-success', 'is-danger');
    }, timeout);
  } else {
    messageBox.hidden = true;
  }
}

export function buildUrl(path) {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Se base já termina com /api e path começa com /api, remove uma das duplicatas
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`; // Remove /api do início do path
  }
  // Se base não termina com /api mas path começa com /api/, usa direto
  if (normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath}`;
  }
  // Se path não começa com /api, adiciona /api
  if (!normalizedPath.startsWith('/api')) {
    return `${base}/api${normalizedPath}`;
  }
  return `${base}${normalizedPath}`;
}

export function apiRequest(path, _tokenIgnored, options = {}) {
  return window.SGVC.api.request(path, options);
}

export function handleAuthFailure(err) {
  if (!err || (err.status !== 401 && err.status !== 403)) return false;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch (_e) {
    // Ignora erros ao limpar storage
  }
  window.location.href = '/';
  return true;
}

/**
 * Normaliza erro da API para mensagem amigável
 */
export function normalizeError(err) {
  if (window.SGVCErrorHandler && window.SGVCErrorHandler.normalizeApiError) {
    return window.SGVCErrorHandler.normalizeApiError(err);
  }
  return err && err.message ? err.message : 'Erro ao processar solicitação. Tente novamente.';
}

export async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('request_failed');
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function setFieldError(input, errorEl, message) {
  if (!input) return;
  input.classList.add('is-danger');
  input.setAttribute('aria-invalid', 'true');
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
  }
}

export function clearFieldError(input, errorEl) {
  if (!input) return;
  input.classList.remove('is-danger');
  input.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}
