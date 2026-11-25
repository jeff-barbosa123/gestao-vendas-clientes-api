/**
 * Infraestrutura: URL, autenticação, requisições, mensagens e formatação.
 */
import { API_BASE } from './constants.js';
import { dashboardMessage, emptyEls } from './dom.js';
import { state } from './state.js';

// FORMATAÇÃO
export const money = (v) =>
  Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export function showDashboardMessage(text, type = 'is-danger', onRetry = null) {
  if (!dashboardMessage) return;
  dashboardMessage.textContent = '';
  if (text) {
    const message = document.createElement('span');
    message.textContent = text;
    dashboardMessage.appendChild(message);
  }
  if (text && onRetry) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.id = 'dashboard-retry';
    retry.className = 'button is-light is-small dashboard-message-retry';
    retry.textContent = 'Tentar novamente';
    retry.addEventListener('click', onRetry);
    dashboardMessage.appendChild(retry);
  }
  dashboardMessage.classList.remove('is-danger', 'is-success', 'is-hidden');
  dashboardMessage.classList.add(type);
  dashboardMessage.hidden = !text;
}

export function clearDashboardMessage() {
  if (!dashboardMessage) return;
  dashboardMessage.textContent = '';
  dashboardMessage.classList.add('is-hidden');
  dashboardMessage.hidden = true;
}

export function toggleEmpty(key, isEmpty) {
  const el = emptyEls[key];
  if (!el) return;
  el.classList.toggle('is-hidden', !isEmpty);
}

export async function ensureAuthenticated() {
  // Auth é validado no backend via cookie HttpOnly
  try {
    const me = await fetchJson('/api/auth/me', null, {}, { method: 'GET', skipAuth: true });
    return me && me.user ? me.user : (me && me.data && me.data.user ? me.data.user : me);
  } catch (err) {
    // Ignora erros causados por navegação que abortam requisições pendentes
    if (err && err.name === 'AbortError') {
      return null;
    }
    if (err && (err.status === 401 || err.status === 403)) {
      // Evita redirecionar para login se o usuário está navegando para outra página
      if (!state.isNavigating) {
        window.location.href = '/';
      }
      return null;
    }
    // Falha de conexão ou do servidor não é sessão expirada: quem chamou mostra o erro.
    throw err;
  }
}

function buildUrl(path) {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`;
  }
  return `${base}${normalizedPath}`;
}

export function isLocalhostHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/**
 * Normaliza erro da API para mensagem amigável
 */
export function normalizeError(err) {
  return window.SGVC.utils.normalizeError(err);
}

export function fetchJson(path, _tokenIgnored, query = {}, options = {}) {
  return window.SGVC.api.request(path, { ...options, query });
}

export function handleAuthFailure(err) {
  // Ignora aborts (ex.: navegação troca de página e cancela a requisição atual)
  if (err && err.name === 'AbortError') return true;
  if (!err || (err.status !== 401 && err.status !== 403)) return false;
  // Evita redirecionar para login se o usuário está navegando para outra página
  if (!state.isNavigating) {
    window.location.href = '/';
  }
  return true;
}
