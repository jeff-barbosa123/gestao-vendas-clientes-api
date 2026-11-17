/**
 * Infraestrutura da tela: URL, autenticação, mensagens e helpers de campo.
 */
import { API_BASE } from './constants.js';
import { messageBox } from './dom.js';
import { state } from './state.js';
import { buildUrl, apiRequest } from '../shared/http.js';
import { setFieldError, clearFieldError } from '../shared/form-errors.js';
import { ensureAuthOrRedirect } from '../shared/auth.js';
export { ensureAuthOrRedirect };
export { buildUrl, apiRequest, setFieldError, clearFieldError };





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






