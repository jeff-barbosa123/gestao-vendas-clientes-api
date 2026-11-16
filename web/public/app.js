/**
 * Tela de login e cadastro (entrada). MÃ³dulos em /app/*.js.
 */
import { API_BASE, authState } from './app/constants.js';
import {
  actions,
  apiBaseEl,
  emailError,
  emailInput,
  forgotClose,
  forgotCloseBtn,
  forgotEmail,
  forgotEmailError,
  forgotForm,
  forgotLink,
  forgotModal,
  forgotMsg,
  forgotSubmit,
  loginBtn,
  loginForm,
  loginSubtitle,
  loginUser,
  logoutBtn,
  passwordCapsLock,
  passwordError,
  passwordInput,
  passwordStrength,
  registerAvatar,
  registerCancel,
  registerClose,
  registerCloseBtn,
  registerEmail,
  registerEmailError,
  registerEmailStatus,
  registerModal,
  registerName,
  registerNameError,
  registerNameStatus,
  registerOpen,
  registerPassword,
  registerPasswordError,
  registerPasswordStatus,
  registerSubmit,
  registerTogglePassword,
  rememberMe,
  responseOutput,
  sessionStatus,
  sessionToken,
  sessionUser,
  togglePasswordBtn,
} from './app/dom.js';
import { clearSession, remembered, saveRememberedEmail, saveSession } from './app/session.js';
import { apiRequest, applyBackendFieldErrors, normalizeApiError } from './app/api.js';
import {
  clearFieldErrors,
  clearMessages,
  hasFieldErrors,
  setFieldError,
  setFieldSuccess,
  setStatus,
  showAlert,
  showLoginError,
  showRegisterError,
  showRegisterSuccess,
  showSuccess,
} from './app/messages.js';

if (passwordInput && passwordCapsLock) {
  passwordInput.addEventListener('keydown', (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      passwordCapsLock.style.display = 'inline';
    } else {
      passwordCapsLock.style.display = 'none';
    }
  });
  passwordInput.addEventListener('blur', () => {
    passwordCapsLock.style.display = 'none';
  });
}

function openForgotModal() {
  if (forgotModal) {
    forgotModal.style.display = 'flex';
    forgotModal.classList.add('is-active');
    forgotModal.setAttribute('aria-hidden', 'false');
    if (forgotEmail) forgotEmail.value = '';
    if (forgotEmailError) { forgotEmailError.textContent = ''; forgotEmailError.hidden = true; }
    if (forgotMsg) forgotMsg.textContent = '';
    setTimeout(() => { forgotEmail && forgotEmail.focus(); }, 100);
  }
}

function closeForgotModal() {
  if (forgotModal) {
    forgotModal.style.display = 'none';
    forgotModal.classList.remove('is-active');
    forgotModal.setAttribute('aria-hidden', 'true');
  }
}

if (forgotLink) forgotLink.addEventListener('click', openForgotModal);

if (forgotClose) forgotClose.addEventListener('click', closeForgotModal);

if (forgotCloseBtn) forgotCloseBtn.addEventListener('click', closeForgotModal);

if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (forgotEmailError) { forgotEmailError.textContent = ''; forgotEmailError.hidden = true; }
    if (forgotMsg) forgotMsg.textContent = '';
    const email = forgotEmail.value.trim();
    if (!email) {
      if (forgotEmailError) { forgotEmailError.textContent = 'Informe o e-mail.'; forgotEmailError.hidden = false; }
      return;
    }
    if (!validateEmail(email)) {
      if (forgotEmailError) {
        forgotEmailError.textContent = 'Digite um e-mail v\u00e1lido.';
        forgotEmailError.hidden = false;
      }
      return;
    }
    forgotSubmit.disabled = true;
    forgotSubmit.classList.add('is-loading');
    try {
      await apiRequest('/api/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      if (forgotMsg) forgotMsg.textContent = 'Se o e-mail estiver cadastrado, voc\u00ea receber\u00e1 um link para redefinir a senha.';
    } catch (err) {
      if (forgotMsg) forgotMsg.textContent = 'Erro ao solicitar recupera\u00e7\u00e3o. Tente novamente.';
    } finally {
      forgotSubmit.disabled = false;
      forgotSubmit.classList.remove('is-loading');
    }
  });
}

if (forgotModal) {
  forgotModal.addEventListener('mousedown', (e) => {
    if (e.target === forgotModal) closeForgotModal();
  });
}

function updatePasswordToggle(button, isVisible) {
  if (!button) return;
  const label = isVisible ? 'Ocultar senha' : 'Mostrar senha';
  button.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
  button.setAttribute('aria-label', label);
  const text = button.querySelector('.toggle-password-text');
  if (text) text.textContent = label;
}

  // Ripple effect no bot\u00e3o de login (no submit)
  function addLoginRipple(e) {
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

if (apiBaseEl) apiBaseEl.textContent = API_BASE;

function setRegisterFieldError(input, errorEl, message, statusEl) {
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

function setRegisterFieldValid(input, errorEl, statusEl) {
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

function clearRegisterFieldState(input, errorEl, statusEl) {
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

function toggleRegisterModal(isOpen) {
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

function isLocked() {
  return authState.lockUntil && Date.now() < authState.lockUntil;
}

function setLoginButtonState() {
  if (!loginBtn) return;
  loginBtn.disabled = hasFieldErrors() || isLocked();
}

function updateSessionUI() {
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

function validateEmail(value) {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value);
}

function validatePassword(value) {
  return value.length >= 3;
}

if (loginForm) loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessages();
  clearFieldErrors();
  setStatus('Autenticando...', 'is-info');
    addLoginRipple(event);

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email) {
    setFieldError(emailInput, 'E-mail obrigat\u00f3rio.', emailError);
    setStatus('Falha no login', 'is-danger');
    emailInput.focus();
    setLoginButtonState();
    return;
  }

  if (!validateEmail(email)) {
    setFieldError(emailInput, 'Formato de e-mail inv\u00e1lido.', emailError);
    setStatus('Falha no login', 'is-danger');
    emailInput.focus();
    setLoginButtonState();
    return;
  }

  if (!password) {
    setFieldError(passwordInput, 'Senha obrigatória.', passwordError);
    setStatus('Falha no login', 'is-danger');
    passwordInput.focus();
    setLoginButtonState();
    return;
  }

  if (!validatePassword(password)) {
    setFieldError(passwordInput, 'Senha muito curta.', passwordError);
    setStatus('Falha no login', 'is-danger');
    passwordInput.focus();
    setLoginButtonState();
    return;
  }

  if (isLocked()) {
    showLoginError('Muitas tentativas. Aguarde alguns segundos antes de tentar novamente.');
    setStatus('Falha no login', 'is-danger');
    setLoginButtonState();
    return;
  }

  loginBtn.classList.add('is-loading');
  loginBtn.disabled = true;
  const originalLoginText = loginBtn.textContent;
  loginBtn.textContent = 'Entrando...';

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Auth via cookie HttpOnly: backend não deve retornar token no body
    authState.user = data.user || null;
    authState.failedAttempts = 0;
    authState.lockUntil = 0;
    saveSession();
    if (rememberMe && rememberMe.checked) {
      saveRememberedEmail(email);
    } else {
      saveRememberedEmail('');
    }
    updateSessionUI();
    showSuccess('Login realizado com sucesso.');
    setStatus('Login OK', 'is-success');
    if (responseOutput) {
      responseOutput.textContent = JSON.stringify(data, null, 2);
    }
    window.location.href = '/dashboard.html';
  } catch (err) {
    const message = normalizeApiError(err);
    const status = err && err.status ? err.status : 0;
    if (status === 401) {
      authState.failedAttempts += 1;
    }
    if (status === 423 || status === 429 || authState.failedAttempts >= 3) {
      authState.lockUntil = Date.now() + 15000;
      showLoginError('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
      setTimeout(() => {
        setLoginButtonState();
      }, 15000);
    } else if (status === 403) {
      showLoginError('Usu\u00e1rio bloqueado. Entre em contato com o administrador.');
    } else if (status === 410) {
      showLoginError('Senha expirada. Redefina sua senha.');
    } else {
      showLoginError(message);
    }
    applyBackendFieldErrors(status, message);
    setStatus('Falha no login', 'is-danger');
    if (responseOutput) {
      responseOutput.textContent = err.payload
        ? JSON.stringify(err.payload, null, 2)
        : String(message || err);
    }
  } finally {
    loginBtn.classList.remove('is-loading');
    loginBtn.textContent = originalLoginText;
    setLoginButtonState();
  }
});

function handleFieldInput() {
  clearMessages();
  clearFieldErrors();
  setLoginButtonState();
}

function handleEmailBlur() {
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

function handlePasswordBlur() {
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

// Foco autom\u00e1tico no campo de e-mail ao abrir a tela
if (emailInput) {
  window.addEventListener('DOMContentLoaded', () => {
    // Só foca o e-mail se a pessoa ainda não estiver em outro campo
    // (antes roubava o foco de quem já digitava no cadastro)
    setTimeout(() => {
      const active = document.activeElement;
      const busy = active && active !== document.body && active !== document.documentElement;
      const modalOpen = registerModal && registerModal.classList.contains('is-active');
      if (!busy && !modalOpen) emailInput.focus();
    }, 100);
  });
  emailInput.addEventListener('input', handleFieldInput);
  emailInput.addEventListener('blur', handleEmailBlur);
}

if (passwordInput) {
  passwordInput.addEventListener('input', handleFieldInput);
  passwordInput.addEventListener('blur', handlePasswordBlur);
}

if (loginSubtitle) {
  const hour = new Date().getHours();
  let msg = 'Acesse sua conta';
  if (hour >= 5 && hour < 12) msg = 'Bom dia! Fa\u00e7a login para come\u00e7ar.';
  else if (hour >= 12 && hour < 18) msg = 'Boa tarde! Fa\u00e7a login para continuar.';
  else msg = 'Boa noite! Fa\u00e7a login para acessar.';
  loginSubtitle.textContent = msg;
}

// Login com Enter em qualquer campo
if (loginForm) {
  loginForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loginBtn && loginBtn.click();
    }
  });
}

if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    updatePasswordToggle(togglePasswordBtn, isHidden);
  });
  updatePasswordToggle(togglePasswordBtn, passwordInput.type === 'text');
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    clearMessages();
    setStatus('Encerrando sessão...', 'is-info');
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      showAlert(err.message || 'Falha ao encerrar sessão.');
    } finally {
      authState.token = null;
      authState.user = null;
      clearSession();
      updateSessionUI();
      setStatus('Sessão encerrada', 'is-light');
      if (responseOutput) responseOutput.textContent = 'Sessão encerrada.';
    }
  });
}

if (actions) actions.addEventListener('click', async (event) => {
  const btn = event.target.closest('button[data-path]');
  if (!btn) return;

  clearMessages();
  setStatus('Consultando API...', 'is-info');

  const path = btn.dataset.path;
  const method = btn.dataset.method || 'GET';

  try {
    const data = await apiRequest(path, { method });
    if (responseOutput) responseOutput.textContent = JSON.stringify(data, null, 2);
    setStatus('Sucesso', 'is-success');
  } catch (err) {
    showAlert(err.message || 'Erro na requisicao.');
    setStatus('Falha', 'is-danger');
    if (responseOutput) {
      responseOutput.textContent = err.payload
        ? JSON.stringify(err.payload, null, 2)
        : String(err.message || err);
    }
  }
});

if (registerOpen) {
  registerOpen.addEventListener('click', () => toggleRegisterModal(true));
}

function registerHasData() {
  return Boolean(
    (registerName && registerName.value.trim()) ||
      (registerEmail && registerEmail.value.trim()) ||
      (registerPassword && registerPassword.value.trim()),
  );
}

function confirmCloseRegister() {
  if (!registerHasData()) {
    toggleRegisterModal(false);
    return;
  }
  const shouldClose = window.confirm('Voc\u00ea tem dados preenchidos. Deseja fechar mesmo assim?');
  if (shouldClose) toggleRegisterModal(false);
}

[registerClose, registerCloseBtn, registerCancel].forEach((el) => {
  if (!el) return;
  el.addEventListener('click', () => confirmCloseRegister());
});

document.addEventListener('keydown', (event) => {
  if (registerModal && registerModal.classList.contains('is-active')) {
    if (event.key === 'Escape') {
      confirmCloseRegister();
    }
    if (event.key === 'Enter' && registerSubmit && !registerSubmit.disabled) {
      event.preventDefault();
      registerSubmit.click();
    }
  }
});

if (registerSubmit) {
  registerSubmit.addEventListener('click', async () => {
    showRegisterError('');
    showRegisterSuccess('');
    const name = registerName ? registerName.value.trim() : '';
    const email = registerEmail ? registerEmail.value.trim() : '';
    const password = registerPassword ? registerPassword.value.trim() : '';

    if (!name) {
      setRegisterFieldError(registerName, registerNameError, 'Informe o nome.', registerNameStatus);
      if (registerName) registerName.focus();
      return;
    }
    if (!email || !validateEmail(email)) {
      setRegisterFieldError(registerEmail, registerEmailError, 'Digite um e-mail v\u00e1lido.', registerEmailStatus);
      if (registerEmail) registerEmail.focus();
      return;
    }
    const passwordProblem = registerPasswordProblem(password);
    if (passwordProblem) {
      setRegisterFieldError(
        registerPassword,
        registerPasswordError,
        passwordProblem,
        registerPasswordStatus,
      );
      if (registerPassword) registerPassword.focus();
      return;
    }

    registerSubmit.classList.add('is-loading');
    registerSubmit.disabled = true;
    const originalText = registerSubmit.textContent;
    registerSubmit.textContent = 'Criando conta...';

    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setRegisterFieldValid(registerName, registerNameError, registerNameStatus);
      setRegisterFieldValid(registerEmail, registerEmailError, registerEmailStatus);
      setRegisterFieldValid(registerPassword, registerPasswordError, registerPasswordStatus);
      if (emailInput) emailInput.value = email;
      if (rememberMe) rememberMe.checked = true;
      saveRememberedEmail(email);

      const loginData = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Auth via cookie HttpOnly: backend não deve retornar token no body
      authState.user = loginData.user || null;
      authState.failedAttempts = 0;
      authState.lockUntil = 0;
      saveSession();
      updateSessionUI();
      window.location.href = '/dashboard.html';
      return;
    } catch (err) {
      showRegisterError(normalizeApiError(err));
    } finally {
      registerSubmit.classList.remove('is-loading');
      registerSubmit.disabled = false;
      registerSubmit.textContent = originalText;
    }
  });
}

if (registerTogglePassword && registerPassword) {
  registerTogglePassword.addEventListener('click', () => {
    const isHidden = registerPassword.type === 'password';
    registerPassword.type = isHidden ? 'text' : 'password';
    updatePasswordToggle(registerTogglePassword, isHidden);
  });
  updatePasswordToggle(registerTogglePassword, registerPassword.type === 'text');
}

// Mesma regra da API (authService): 8+ caracteres com maiúscula, minúscula, número e especial
function registerPasswordProblem(value) {
  if (!value || value.length < 8) return 'M\u00ednimo 8 caracteres.';
  const ok = /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^a-zA-Z0-9]/.test(value);
  return ok ? '' : 'Senha muito fraca. Use letra mai\u00fascula, min\u00fascula, n\u00famero e caractere especial.';
}

function updatePasswordStrength(value) {
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

if (registerName) {
  registerName.addEventListener('input', () => {
    if (registerAvatar) {
      const initial = registerName.value.trim().charAt(0) || 'U';
      registerAvatar.textContent = initial.toUpperCase();
    }
    if (!registerName.value.trim()) {
      clearRegisterFieldState(registerName, registerNameError, registerNameStatus);
      return;
    }
    setRegisterFieldValid(registerName, registerNameError, registerNameStatus);
  });
}

if (registerEmail) {
  registerEmail.addEventListener('input', () => {
    const value = registerEmail.value.trim();
    if (!value) {
      clearRegisterFieldState(registerEmail, registerEmailError, registerEmailStatus);
      return;
    }
    if (validateEmail(value)) {
      setRegisterFieldValid(registerEmail, registerEmailError, registerEmailStatus);
    } else {
      setRegisterFieldError(registerEmail, registerEmailError, 'Digite um e-mail v\u00e1lido.', registerEmailStatus);
    }
  });
}

if (registerPassword) {
  registerPassword.addEventListener('input', () => {
    const value = registerPassword.value;
    updatePasswordStrength(value);
    if (!value) {
      clearRegisterFieldState(registerPassword, registerPasswordError, registerPasswordStatus);
      return;
    }
    const problem = registerPasswordProblem(value);
    if (!problem) {
      setRegisterFieldValid(registerPassword, registerPasswordError, registerPasswordStatus);
    } else {
      setRegisterFieldError(registerPassword, registerPasswordError, problem, registerPasswordStatus);
    }
  });
}

updateSessionUI();

clearMessages();

clearFieldErrors();

setLoginButtonState();

if (remembered && emailInput) {
  emailInput.value = remembered;
  if (rememberMe) rememberMe.checked = true;
}

if (window.apiGetMe) {
  window.apiGetMe()
    .then((user) => {
      if (user) window.location.href = '/dashboard.html';
    })
    .catch((_err) => {});
}
