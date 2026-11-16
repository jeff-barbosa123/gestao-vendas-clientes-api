/**
 * Cadastro: modal, estado dos campos e força da senha.
 */
import {
  passwordStrength,
  registerAvatar,
  registerEmail,
  registerEmailError,
  registerEmailStatus,
  registerModal,
  registerName,
  registerNameError,
  registerNameStatus,
  registerPassword,
  registerPasswordError,
  registerPasswordStatus,
} from './dom.js';
import { showRegisterError, showRegisterSuccess } from './messages.js';

export function setRegisterFieldError(input, errorEl, message, statusEl) {
  if (!input) return;
  input.classList.remove('is-valid');
  input.classList.add('is-danger');
  input.setAttribute('aria-invalid', 'true');
  if (input.value.trim()) {
    input.classList.add('is-filled');
  }
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
  }
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.hidden = true;
  }
}

export function setRegisterFieldValid(input, errorEl, statusEl) {
  if (!input) return;
  input.classList.remove('is-danger');
  input.classList.add('is-valid');
  input.removeAttribute('aria-invalid');
  input.classList.add('is-filled');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
  if (statusEl) {
    statusEl.textContent = 'OK';
    statusEl.hidden = false;
  }
}

export function clearRegisterFieldState(input, errorEl, statusEl) {
  if (!input) return;
  input.classList.remove('is-danger', 'is-valid');
  input.classList.remove('is-filled');
  input.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.hidden = true;
  }
}

export function toggleRegisterModal(isOpen) {
  if (!registerModal) return;
  registerModal.classList.toggle('is-active', isOpen);
  registerModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  showRegisterError('');
  showRegisterSuccess('');
  clearRegisterFieldState(registerName, registerNameError, registerNameStatus);
  clearRegisterFieldState(registerEmail, registerEmailError, registerEmailStatus);
  clearRegisterFieldState(registerPassword, registerPasswordError, registerPasswordStatus);
  if (passwordStrength) {
    passwordStrength.textContent = '';
    passwordStrength.className = 'help password-strength';
  }
  if (registerAvatar) registerAvatar.textContent = 'U';
  if (!isOpen) {
    // Fechar descarta o que foi digitado (a pessoa já confirmou)
    [registerName, registerEmail, registerPassword, document.getElementById('register-password-confirm')]
      .forEach((input) => { if (input) input.value = ''; });
    if (registerPassword) registerPassword.dispatchEvent(new Event('input'));
  }
  if (isOpen && registerName) registerName.focus();
}

function registerHasData() {
  return Boolean(
    (registerName && registerName.value.trim()) ||
      (registerEmail && registerEmail.value.trim()) ||
      (registerPassword && registerPassword.value.trim()),
  );
}

export function confirmCloseRegister() {
  if (!registerHasData()) {
    toggleRegisterModal(false);
    return;
  }
  const shouldClose = window.confirm('Voc\u00ea tem dados preenchidos. Deseja fechar mesmo assim?');
  if (shouldClose) toggleRegisterModal(false);
}

// Mesma regra da API (authService): 8+ caracteres com maiúscula, minúscula, número e especial
export function registerPasswordProblem(value) {
  if (!value || value.length < 8) return 'M\u00ednimo 8 caracteres.';
  const ok = /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^a-zA-Z0-9]/.test(value);
  return ok ? '' : 'Senha muito fraca. Use letra mai\u00fascula, min\u00fascula, n\u00famero e caractere especial.';
}

export function updatePasswordStrength(value) {
  if (!passwordStrength) return;
  if (!value) {
    passwordStrength.textContent = '';
    passwordStrength.className = 'help password-strength';
    return;
  }
  if (value.length < 8) {
    passwordStrength.textContent = 'Fraca';
    passwordStrength.className = 'help password-strength is-weak';
    return;
  }
  const hasNumber = /\d/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasSymbol = /[^a-zA-Z0-9]/.test(value);
  const score = [hasNumber, hasUpper, hasLower, hasSymbol].filter(Boolean).length;
  // Forte = atende todas as regras da API; Média = falta uma; Fraca = falta mais de uma
  if (score === 4) {
    passwordStrength.textContent = 'Forte';
    passwordStrength.className = 'help password-strength is-strong';
  } else if (score === 3) {
    passwordStrength.textContent = 'M\u00e9dia';
    passwordStrength.className = 'help password-strength is-medium';
  } else {
    passwordStrength.textContent = 'Fraca';
    passwordStrength.className = 'help password-strength is-weak';
  }
}
