/**
 * Helpers HTTP compartilhados: montagem de URL e requisicao a API.
 */
import { API_BASE } from './config.js';

export function buildUrl(path) {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`;
  }
  return `${base}${normalizedPath}`;
}

export function apiRequest(path, _tokenIgnored, options = {}) {
  return window.SGVC.api.request(path, { ...options, messageFromServer: true });
}
