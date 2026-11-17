/**
 * Eventos do cadastro: abrir/fechar, ESC, envio e campos.
 */
import { authState } from './constants.js';
import {
  emailInput,
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
} from './dom.js';
import { saveRememberedEmail, saveSession } from './session.js';
import { apiRequest, normalizeApiError } from './api.js';
import { showRegisterError, showRegisterSuccess } from './messages.js';
import { updatePasswordToggle, updateSessionUI, validateEmail } from './login.js';
import {
  clearRegisterFieldState,
  confirmCloseRegister,
  registerPasswordProblem,
  setRegisterFieldError,
  setRegisterFieldValid,
  toggleRegisterModal,
  updatePasswordStrength,
} from './register.js';

export function initEventsRegister() {
  if (registerOpen) {
    registerOpen.addEventListener('click', () => toggleRegisterModal(true));
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
      const usernameInput = document.getElementById('register-username');
      const usernameError = document.getElementById('register-username-error');
      const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
      if (usernameError) {
        usernameError.hidden = true;
        usernameError.textContent = '';
      }

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
      if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
        if (usernameError) {
          usernameError.textContent = 'Usu\u00e1rio inv\u00e1lido: use 3 a 30 caracteres (letras, n\u00fameros, ponto, h\u00edfen ou sublinhado).';
          usernameError.hidden = false;
        }
        if (usernameInput) usernameInput.focus();
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
          body: JSON.stringify(username ? { name, email, password, username } : { name, email, password }),
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
}
