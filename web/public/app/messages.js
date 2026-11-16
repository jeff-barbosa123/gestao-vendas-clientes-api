/**
 * Mensagens, alertas e estados de erro/sucesso dos campos.
 */
import {
  alertBox,
  emailError,
  emailInput,
  loginError,
  loginErrorText,
  loginSuccess,
  loginSuccessText,
  passwordError,
  passwordInput,
  registerError,
  registerSuccess,
  responseStatus,
  successBox,
} from './dom.js';

export function setStatus(message, type = 'is-light') {
  if (!responseStatus) return;
  responseStatus.className = `tag ${type}`;
  responseStatus.textContent = message;
}

export function showAlert(message) {
  alertBox.textContent = message;
  alertBox.hidden = false;
  alertBox.focus();
}

export function showSuccess(message) {
  if (loginSuccess && loginSuccessText) {
    loginSuccessText.textContent = message;
    loginSuccess.hidden = false;
    return;
  }
  successBox.textContent = message;
  successBox.hidden = false;
  successBox.focus();
}

export function clearMessages() {
  alertBox.hidden = true;
  successBox.hidden = true;
  alertBox.textContent = '';
  successBox.textContent = '';
  if (loginError) loginError.hidden = true;
  if (loginErrorText) loginErrorText.textContent = '';
  if (loginSuccess) loginSuccess.hidden = true;
  if (loginSuccessText) loginSuccessText.textContent = '';
}

export function showLoginError(message) {
  if (!loginError || !loginErrorText) return;
  if (!message) {
    loginErrorText.innerHTML = '';
    loginError.hidden = true;
    return;
  }
  // Mensagens especiais com \u00edcones e dicas
  let html = '';
  if (/bloquead[oa]/i.test(message)) {
    html = '<strong>Usu\u00e1rio bloqueado.</strong>\n<br>Entre em contato com o administrador para desbloqueio.';
  } else if (/expirad[oa]/i.test(message)) {
    html = '<strong>Senha expirada.</strong>\n<br>Redefina sua senha usando "Esqueci minha senha".';
  } else if (/muitas tentativas|aguarde|excedidas|429|423/i.test(message)) {
    html = '<strong>Muitas tentativas.</strong>\n<br>Aguarde alguns minutos antes de tentar novamente.';
  } else if (/inv[a\u00e1]lid[oa]s?|incorret[oa]s?|errad[oa]s?|credenciais/i.test(message)) {
    html = '<strong>E-mail ou senha incorretos.</strong>';
  } else if (/conectar|servidor|network/i.test(message)) {
    html = '<strong>N\u00e3o foi poss\u00edvel conectar ao servidor.</strong>\n<br>Verifique sua conex\u00e3o e tente novamente.';
  } else if (/interno|erro na api|api error|500/i.test(message)) {
    html = '<strong>Erro interno do sistema.</strong>\n<br>Tente novamente mais tarde.';
  } else {
    html = message;
  }
  loginErrorText.innerHTML = html;
  loginError.hidden = false;
  loginError.focus();
}

export function showRegisterError(message) {
  if (!registerError) return;
  registerError.textContent = message || '';
  registerError.hidden = !message;
}

export function showRegisterSuccess(message) {
  if (!registerSuccess) return;
  registerSuccess.textContent = message || '';
  registerSuccess.hidden = !message;
}

export function setFieldError(input, message, errorEl) {
  if (!input) return;
  input.classList.add('is-danger');
  input.classList.remove('is-success');
  input.setAttribute('aria-invalid', 'true');
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
  }
}

export function clearFieldErrors() {
  [emailInput, passwordInput].forEach((input) => {
    input.classList.remove('is-danger');
    input.classList.remove('is-success');
    input.removeAttribute('aria-invalid');
  });
  if (emailError) {
    emailError.textContent = '';
    emailError.hidden = true;
  }
  if (passwordError) {
    passwordError.textContent = '';
    passwordError.hidden = true;
  }
}

export function hasFieldErrors() {
  const emailInvalid = emailInput && emailInput.classList.contains('is-danger');
  const passwordInvalid = passwordInput && passwordInput.classList.contains('is-danger');
  return Boolean(emailInvalid || passwordInvalid);
}

export function setFieldSuccess(input, errorEl) {
  if (!input) return;
  input.classList.remove('is-danger');
  input.classList.add('is-success');
  input.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}
