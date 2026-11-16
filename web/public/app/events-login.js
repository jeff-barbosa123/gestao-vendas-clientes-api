/**
 * Eventos do login: envio, campos, mostrar senha, logout e ações.
 */
import { authState } from './constants.js';
import {
  actions,
  emailError,
  emailInput,
  loginBtn,
  loginForm,
  loginSubtitle,
  logoutBtn,
  passwordCapsLock,
  passwordError,
  passwordInput,
  registerModal,
  rememberMe,
  responseOutput,
  togglePasswordBtn,
} from './dom.js';
import { clearSession, saveRememberedEmail, saveSession } from './session.js';
import { apiRequest, applyBackendFieldErrors, normalizeApiError } from './api.js';
import {
  clearFieldErrors,
  clearMessages,
  setFieldError,
  setStatus,
  showAlert,
  showLoginError,
  showSuccess,
} from './messages.js';
import {
  addLoginRipple,
  handleEmailBlur,
  handleFieldInput,
  handlePasswordBlur,
  isLocked,
  setLoginButtonState,
  updatePasswordToggle,
  updateSessionUI,
  validateEmail,
  validatePassword,
} from './login.js';

export function initEventsLogin() {
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
}
