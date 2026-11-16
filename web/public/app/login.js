/**
 * Login: validações, bloqueio por tentativas, estado do botão e feedback dos campos.
 */
import { authState } from './constants.js';
import {
  actions,
  emailError,
  emailInput,
  loginBtn,
  loginUser,
  logoutBtn,
  passwordError,
  passwordInput,
  sessionStatus,
  sessionToken,
  sessionUser,
} from './dom.js';
import {
  clearFieldErrors,
  clearMessages,
  hasFieldErrors,
  setFieldError,
  setFieldSuccess,
} from './messages.js';

export function updatePasswordToggle(button, isVisible) {
  if (!button) return;
  const label = isVisible ? 'Ocultar senha' : 'Mostrar senha';
  button.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
  button.setAttribute('aria-label', label);
  const text = button.querySelector('.toggle-password-text');
  if (text) text.textContent = label;
}

  // Ripple effect no bot\u00e3o de login (no submit)
  export function addLoginRipple(e) {
    if (!loginBtn) return;
    const btn = loginBtn;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple-effect';
    // Se for evento de mouse, centralizar no clique; sen\u00e3o, centralizar no bot\u00e3o
    if (e && e.clientX && e.clientY) {
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    } else {
      ripple.style.left = (rect.width / 2 - size / 2) + 'px';
      ripple.style.top = (rect.height / 2 - size / 2) + 'px';
    }
    ripple.style.width = ripple.style.height = size + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

export function isLocked() {
  return authState.lockUntil && Date.now() < authState.lockUntil;
}

export function setLoginButtonState() {
  if (!loginBtn) return;
  loginBtn.disabled = hasFieldErrors() || isLocked();
}

export function updateSessionUI() {
  if (authState.user) {
    if (sessionStatus) sessionStatus.textContent = 'Conectado';
    if (sessionUser) {
      sessionUser.textContent = authState.user
        ? authState.user.email || authState.user.name || 'Usu\u00e1rio autenticado'
        : 'Usu\u00e1rio autenticado';
    }
    if (sessionToken) sessionToken.textContent = '(cookie)';
    if (logoutBtn) logoutBtn.disabled = false;
    if (loginUser) {
      loginUser.textContent = '';
      loginUser.hidden = true;
    }
    if (actions) {
      Array.from(actions.querySelectorAll('button')).forEach((btn) => {
        btn.disabled = false;
      });
    }
  } else {
    if (sessionStatus) sessionStatus.textContent = 'Desconectado';
    if (sessionUser) sessionUser.textContent = '-';
    if (sessionToken) sessionToken.textContent = '-';
    if (logoutBtn) logoutBtn.disabled = true;
    if (loginUser) {
      loginUser.textContent = '';
      loginUser.hidden = true;
    }
    if (actions) {
      Array.from(actions.querySelectorAll('button')).forEach((btn) => {
        btn.disabled = true;
      });
    }
  }
}

export function validateEmail(value) {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value);
}

export function validatePassword(value) {
  return value.length >= 3;
}

export function handleFieldInput() {
  clearMessages();
  clearFieldErrors();
  setLoginButtonState();
}

export function handleEmailBlur() {
  if (!emailInput) return;
  const value = emailInput.value.trim();
  if (!value) {
    emailInput.classList.remove('is-success');
    return;
  }
  if (validateEmail(value)) {
    setFieldSuccess(emailInput, emailError);
  } else {
    setFieldError(emailInput, 'Formato de e-mail inv\u00e1lido.', emailError);
  }
  setLoginButtonState();
}

export function handlePasswordBlur() {
  if (!passwordInput) return;
  const value = passwordInput.value.trim();
  if (!value) {
    passwordInput.classList.remove('is-success');
    return;
  }
  if (validatePassword(value)) {
    setFieldSuccess(passwordInput, passwordError);
  } else {
    setFieldError(passwordInput, 'Senha muito curta.', passwordError);
  }
  setLoginButtonState();
}
