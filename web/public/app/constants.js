/**
 * Constantes da tela de login (chaves de armazenamento, limites e estado de autenticação).
 */
// Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
export const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

export const authState = {
  token: null,
  user: null,
  refreshToken: null,
  failedAttempts: 0,
  lockUntil: 0,
};

const STORAGE_KEY = 'sgvc.session';

export const REMEMBER_KEY = 'sgvc.rememberEmail';

export const CSRF_COOKIE_NAME = 'sgvc_csrf';

export const CSRF_HEADER_NAME = 'X-CSRF-Token';
