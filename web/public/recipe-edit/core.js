/**
 * Infraestrutura da tela: URL, autenticação, mensagens e helpers de campo.
 */
import { API_BASE } from './constants.js';
import { messageBox } from './dom.js';
import { state } from './state.js';

function buildUrl(path) {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`;
  }
  return `${base}${normalizedPath}`;
}

export async function ensureAuthOrRedirect() {
  try {
    const user = await window.apiGetMe();
    if (!user) {
      window.location.href = '/';
      return null;
    }
    return user;
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
  messageBox.classList.remove('is-success', 'is-danger');
  if (type) messageBox.classList.add(type);
  messageBox.hidden = !text;
  if (state.messageTimer) {
    clearTimeout(state.messageTimer);
    state.messageTimer = null;
  }
  if (text) {
    const timeout = type === 'is-danger' ? 6500 : 4500;
    state.messageTimer = setTimeout(() => {
      messageBox.hidden = true;
      messageBox.textContent = '';
      messageBox.classList.remove('is-success', 'is-danger');
    }, timeout);
  }
}

export function apiRequest(path, _tokenIgnored, options = {}) {
  return window.SGVC.api.request(path, { ...options, messageFromServer: true });
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
