/**
 * Infraestrutura da tela: URL, autenticação, mensagens, erros e helpers de campo.
 */
import { API_BASE } from './constants.js';
import { messageBox } from './dom.js';
import { state } from './state.js';
import { apiRequest } from '../shared/http.js';
import { setFieldError, clearFieldError } from '../shared/form-errors.js';
import { ensureAuthOrRedirect } from '../shared/auth.js';
export { apiRequest, setFieldError, clearFieldError, ensureAuthOrRedirect };

export function escapeHtml(value) {
  return window.SGVC.utils.escapeHtml(value);
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







// Event listeners dos botões principais
export function handleAuthFailure(err) {
  if (!err || (err.status !== 401 && err.status !== 403)) return false;
  window.location.href = '/';
  return true;
}

export function normalizeError(err) {
  if (window.SGVCErrorHandler && window.SGVCErrorHandler.normalizeApiError) {
    return window.SGVCErrorHandler.normalizeApiError(err);
  }
  return err && err.message ? err.message : 'Erro ao processar solicitação. Tente novamente.';
}
