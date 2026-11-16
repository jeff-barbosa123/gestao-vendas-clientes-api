/**
 * Sessão local e e-mail lembrado.
 */
import { REMEMBER_KEY, authState } from './constants.js';

export function saveSession() {
  // Auth via cookie HttpOnly: não persistir token/sessão no browser storage
}

export function clearSession() {
  // Auth via cookie HttpOnly: nada a limpar do storage
  authState.token = null;
  authState.refreshToken = null;
  authState.user = null;
}

export function saveRememberedEmail(value) {
  if (!value) {
    localStorage.removeItem(REMEMBER_KEY);
    return;
  }
  localStorage.setItem(REMEMBER_KEY, value);
}

function loadRememberedEmail() {
  return localStorage.getItem(REMEMBER_KEY);
}

function loadSession() {
  return null;
}

export const remembered = loadRememberedEmail();
