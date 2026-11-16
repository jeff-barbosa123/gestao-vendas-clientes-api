/**
 * Infraestrutura da tela: URL, autenticação, mensagens, modais e helpers de campo.
 */
import { API_BASE } from './constants.js';
import { messageBox, summaryBox } from './dom.js';
import { state } from './state.js';

function buildUrl(path) {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`;
  }
  return `${base}${normalizedPath}`;
}

async function requireAuth() {
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
  messageBox.classList.remove('is-success', 'is-danger', 'is-warning');
  if (type) messageBox.classList.add(type);
  messageBox.hidden = !text;
  if (state.messageTimer) {
    clearTimeout(state.messageTimer);
    state.messageTimer = null;
  }
  if (text) {
    const timeout = type === 'is-danger' || type === 'is-warning' ? 6500 : 4500;
    state.messageTimer = setTimeout(() => {
      messageBox.hidden = true;
      messageBox.textContent = '';
      messageBox.classList.remove('is-success', 'is-danger', 'is-warning');
    }, timeout);
  }
}

export function showSummary(text) {
  if (!summaryBox) return;
  summaryBox.textContent = text || '';
  summaryBox.hidden = !text;
}

export function setInlineMessage(el, text, type) {
  if (!el) return;
  el.textContent = text || '';
  el.hidden = !text;
  el.classList.remove('is-warning', 'is-success');
  if (type) el.classList.add(type);
}

export function apiRequest(path, _tokenIgnored, options = {}) {
  return window.SGVC.api.request(path, { ...options, messageFromServer: true });
}

export function setFieldError(el, message) {
  if (!el) return;
  el.textContent = message || '';
  el.hidden = !message;
}

export function toggleModal(modal, isOpen) {
  if (!modal) return;
  modal.classList.toggle('is-active', isOpen);
  modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

// Auth: valida sessão via /api/auth/me (cookie HttpOnly)
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
