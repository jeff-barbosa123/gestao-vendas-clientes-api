/**
 * Infraestrutura da tela: URL, autenticação, CSRF, mensagens, erros e modal de exclusão.
 */
import { API_BASE, CSRF_COOKIE_NAME } from './constants.js';
import { deleteBtn, deleteConfirm, deleteModal, messageBox } from './dom.js';
import { state } from './state.js';
import { buildUrl, apiRequest } from '../shared/http.js';
import { setFieldError, clearFieldError } from '../shared/form-errors.js';
import { ensureAuthOrRedirect } from '../shared/auth.js';
export { ensureAuthOrRedirect };
export { setFieldError, clearFieldError, apiRequest };





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



export function toggleDeleteModal(isOpen) {
  if (!deleteModal) return;
  deleteModal.classList.toggle('is-active', isOpen);
  deleteModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen) {
    deleteConfirm && deleteConfirm.focus();
  } else {
    deleteBtn && deleteBtn.focus();
  }
}
