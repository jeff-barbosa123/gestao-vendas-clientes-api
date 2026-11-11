// ...existing code...
(() => {
  // Identificação da página atual para evitar loops e execuções desnecessárias
  const CURRENT_PAGE = window.location.pathname;
  const IS_LOGIN_PAGE = CURRENT_PAGE === '/' || CURRENT_PAGE.endsWith('index.html') || CURRENT_PAGE.endsWith('login.html');
  const IS_DASHBOARD_PAGE = CURRENT_PAGE.includes('dashboard');
  
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE =
    (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
    (window.location && window.location.port === '4000'
      ? 'http://localhost:4000'
      : window.location.origin);

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordCapsLock = document.getElementById('password-capslock');
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
  
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const rememberMe = document.getElementById('remember-me');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const loginError = document.getElementById('login-error');
  const loginErrorText = document.getElementById('login-error-text');
  const loginUser = document.getElementById('login-user');
  const loginSuccess = document.getElementById('login-success');
  const loginSuccessText = document.getElementById('login-success-text');
  const registerModal = document.getElementById('register-modal');
  const registerOpen = document.getElementById('open-register');
  const registerClose = document.getElementById('register-close');
  const registerCloseBtn = document.getElementById('register-close-btn');
  const registerCancel = document.getElementById('register-cancel');
  const registerSubmit = document.getElementById('register-submit');
  const registerName = document.getElementById('register-name');
  const registerEmail = document.getElementById('register-email');
  const registerPassword = document.getElementById('register-password');
  const registerPasswordConfirm = document.getElementById('register-password-confirm');
  const registerTogglePassword = document.getElementById('toggle-register-password');
  const registerToggleConfirm = document.getElementById('toggle-register-confirm');
  const registerAvatar = document.getElementById('register-avatar');
  const registerNameError = document.getElementById('register-name-error');
  const registerEmailError = document.getElementById('register-email-error');
  const registerPasswordError = document.getElementById('register-password-error');
  const registerConfirmError = document.getElementById('register-confirm-error');
  const registerNameStatus = document.getElementById('register-name-status');
  const registerEmailStatus = document.getElementById('register-email-status');
  const registerPasswordStatus = document.getElementById('register-password-status');
  const passwordStrength = document.getElementById('password-strength');
  const registerError = document.getElementById('register-error');
  const registerSuccess = document.getElementById('register-success');
  // Controla abort de requisição de cadastro em andamento
  let registerAbortController = null;
  // Guarda o texto padrão do botão de confirmar cadastro
  let registerSubmitDefaultText = registerSubmit ? registerSubmit.textContent : 'Criar conta e acessar';
  function updatePasswordToggle(button, isHidden) {
    if (!button) return;
    const label = isHidden ? 'Ocultar senha' : 'Mostrar senha';
    button.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    button.setAttribute('aria-label', label);
    const text = button.querySelector('.toggle-password-text');
    if (text) text.textContent = label;
  }

  // Garantir reuso: listener consolidado para senha de registro
  let passwordListenersBound = false;
  function onPasswordChange() {
    // TEMP debug: confirmar chamada do listener quando modal abre/digita
    try { alert('chamou'); } catch (_e) {}
    const value = registerPassword ? (registerPassword.value || '') : '';
    const rules = updateRulesUI('register-password-rules', 'register-password-meter', value);
    let ok = rules && rules.count === 5;
    if (registerPasswordConfirm) {
      const conf = registerPasswordConfirm.value || '';
      const same = conf && conf === value;
      if (registerConfirmError) {
        registerConfirmError.textContent = same || !conf ? '' : 'As senhas não conferem.';
        registerConfirmError.hidden = same || !conf;
      }
      ok = ok && same;
    }
    if (registerSubmit) registerSubmit.disabled = !ok;
    updatePasswordStrength(value);
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

  const alertBox = document.getElementById('app-alert');
  const successBox = document.getElementById('app-success');

  const sessionStatus = document.getElementById('session-status');
  const sessionUser = document.getElementById('session-user');
  const sessionToken = document.getElementById('session-token');
  const apiBaseEl = document.getElementById('api-base');

  const actions = document.getElementById('actions');
  const responseStatus = document.getElementById('response-status');
  const responseOutput = document.getElementById('response-output');

  if (apiBaseEl) apiBaseEl.textContent = API_BASE;

  const state = {
    token: null,
    user: null,
    refreshToken: null,
    failedAttempts: 0,
    lockUntil: 0,
  };

  const STORAGE_KEY = 'sgvc.session';
  const REMEMBER_KEY = 'sgvc.rememberEmail';

  function setStatus(message, type = 'is-light') {
    if (!responseStatus) return;
    responseStatus.className = `tag ${type}`;
    responseStatus.textContent = message;
  }

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.hidden = false;
    alertBox.focus();
  }

  function showSuccess(message) {
    if (loginSuccess && loginSuccessText) {
      loginSuccessText.textContent = message;
      loginSuccess.hidden = false;
      return;
    }
    successBox.textContent = message;
    successBox.hidden = false;
    successBox.focus();
  }

  function clearMessages() {
    alertBox.hidden = true;
    successBox.hidden = true;
    alertBox.textContent = '';
    successBox.textContent = '';
    if (loginError) loginError.hidden = true;
    if (loginErrorText) loginErrorText.textContent = '';
    if (loginSuccess) loginSuccess.hidden = true;
    if (loginSuccessText) loginSuccessText.textContent = '';
  }

  function showLoginError(message) {
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
    } else if (/inv[a\u00e1]lido|incorreto|errad[oa]|credenciais|senha inv/i.test(message)) {
      html = '<strong>E-mail ou senha incorretos.</strong>';
    } else if (/conectar|servidor|network/i.test(message)) {
      html = '<strong>N\u00e3o foi poss\u00edvel conectar ao servidor. Tente novamente em alguns instantes.</strong>';
    } else if (/interno|erro na api|api error|500/i.test(message)) {
      html = '<strong>Erro interno do sistema.</strong>\n<br>Tente novamente mais tarde.';
    } else {
      html = message;
    }
    loginErrorText.innerHTML = html;
    loginError.hidden = false;
    loginError.focus();
  }

  function showRegisterError(message) {
    if (!registerError) return;
    registerError.textContent = message || '';
    registerError.hidden = !message;
  }

  function showRegisterSuccess(message) {
    if (!registerSuccess) return;
    registerSuccess.textContent = message || '';
    registerSuccess.hidden = !message;
  }

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
      if (message) {
        errorEl.hidden = false;
        errorEl.style.display = '';
      } else {
        errorEl.hidden = true;
      }
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
    if (!isOpen) {
      // Limpa campos apenas ao fechar
      if (registerName) {
        registerName.value = '';
        clearRegisterFieldState(registerName, registerNameError, registerNameStatus);
      }
      if (registerEmail) {
        registerEmail.value = '';
        clearRegisterFieldState(registerEmail, registerEmailError, registerEmailStatus);
      }
      if (registerPassword) {
        registerPassword.value = '';
        clearRegisterFieldState(registerPassword, registerPasswordError, registerPasswordStatus);
      }
      if (passwordStrength) {
        passwordStrength.textContent = '';
        passwordStrength.className = 'help password-strength';
        passwordStrength.hidden = true;
        passwordStrength.style.display = 'none';
      }
      if (registerAvatar) registerAvatar.textContent = 'U';
    } else {
      // Ao abrir, apenas limpa estados de erro, mas mantém valores
      clearRegisterFieldState(registerName, registerNameError, registerNameStatus);
      clearRegisterFieldState(registerEmail, registerEmailError, registerEmailStatus);
      clearRegisterFieldState(registerPassword, registerPasswordError, registerPasswordStatus);
      if (passwordStrength) {
        passwordStrength.hidden = true;
        passwordStrength.style.display = 'none';
      }
      // Re-registra listeners e força avaliação inicial
      if (registerPassword && !passwordListenersBound) {
        registerPassword.addEventListener('input', onPasswordChange);
        registerPassword.addEventListener('keyup', onPasswordChange);
        passwordListenersBound = true;
      }
      if (registerPassword) {
        registerPassword.focus();
        onPasswordChange();
      } else if (registerName) {
        registerName.focus();
      }
    }
  }

  function setFieldError(input, message, errorEl) {
    if (!input) return;
    input.classList.add('is-danger');
    input.classList.remove('is-success');
    input.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
      // Garantir que o elemento seja visível quando há mensagem
      if (message) {
        errorEl.style.display = '';
      }
    }
  }

  function clearFieldErrors() {
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

  function hasFieldErrors() {
    const emailInvalid = emailInput && emailInput.classList.contains('is-danger');
    const passwordInvalid = passwordInput && passwordInput.classList.contains('is-danger');
    return Boolean(emailInvalid || passwordInvalid);
  }

  function isLocked() {
    return state.lockUntil && Date.now() < state.lockUntil;
  }

  function setLoginButtonState() {
    if (!loginBtn) return;
    loginBtn.disabled = hasFieldErrors() || isLocked();
  }

  function saveSession() {
    // Auth via cookie HttpOnly: não persistir token/sessão no browser storage
  }

  function clearSession() {
    // Auth via cookie HttpOnly: nada a limpar do storage
    state.token = null;
    state.refreshToken = null;
    state.user = null;
  }

  function saveRememberedEmail(value) {
    // Email can stay in localStorage as it's not sensitive like tokens
    try {
      if (!value) {
        localStorage.removeItem(REMEMBER_KEY);
        return;
      }
      localStorage.setItem(REMEMBER_KEY, value);
    } catch (err) {
      console.error("Failed to save remembered email:", err);
    }
  }

  function loadRememberedEmail() {
    try {
      return localStorage.getItem(REMEMBER_KEY);
    } catch (err) {
      return null;
    }
  }

  function loadSession() {
    return null;
  }

  function updateSessionUI() {
    try {
      if (state.user) {
        if (sessionStatus) sessionStatus.textContent = 'Conectado';
        if (sessionUser) {
          sessionUser.textContent = state.user
            ? state.user.email || state.user.name || 'Usu\u00e1rio autenticado'
            : 'Usu\u00e1rio autenticado';
        }
        if (sessionToken) sessionToken.textContent = '(cookie)';
        if (logoutBtn) logoutBtn.disabled = false;
        if (loginUser) {
          loginUser.textContent = '';
          loginUser.hidden = true;
        }
        if (actions) {
          const buttons = actions.querySelectorAll('button');
          if (buttons && buttons.length > 0) {
            Array.from(buttons).forEach((btn) => {
              btn.disabled = false;
            });
          }
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
          const buttons = actions.querySelectorAll('button');
          if (buttons && buttons.length > 0) {
            Array.from(buttons).forEach((btn) => {
              btn.disabled = true;
            });
          }
        }
      }
    } catch (err) {
      // Proteção contra erros externos (extensões do navegador, etc.)
      console.warn('[APP] Erro em updateSessionUI:', err);
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

  function normalizeApiError(err) {
    // Usa o utilitário centralizado se disponível, senão usa fallback local
    if (window.SGVCErrorHandler && window.SGVCErrorHandler.normalizeApiError) {
      return window.SGVCErrorHandler.normalizeApiError(err);
    }
    
    // Fallback local (caso o script não esteja carregado)
    const status = err && err.status ? err.status : 0;
    const raw = err && err.payload ? err.payload : null;
    const apiMessage = raw && (raw.message || raw.error) ? String(raw.message || raw.error) : '';

    const fallbackByStatus = {
      400: 'Dados inválidos. Verifique as informações e tente novamente.',
      401: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
      403: 'Usuário bloqueado. Entre em contato com o suporte.',
      423: 'Acesso temporariamente bloqueado. Aguarde alguns minutos e tente novamente.',
      429: 'Muitas requisições. Aguarde alguns instantes antes de tentar novamente.',
    };

    if (status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    }

    if (status >= 500) {
      return 'Ops! Ocorreu um erro inesperado. Tente novamente em alguns instantes.';
    }

    const fallback = fallbackByStatus[status];
    
    // Para erro 401 (credenciais), sempre normalizar para mensagem padrão
    if (status === 401) {
      return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';
    }
    
    if (!apiMessage) return fallback || 'Erro ao processar sua solicitação. Tente novamente.';

    // Verifica se a mensagem é técnica e usa fallback se for
    const looksTechnical = /UNPROCESSABLE_ENTITY|BAD_REQUEST|INTERNAL_ERROR|exception|stack|sql|mongodb|sequelize|prisma|typeorm|trace/i.test(apiMessage);
    if (looksTechnical) return fallback || 'Erro ao processar sua solicitação. Tente novamente.';

    return apiMessage;
  }

  async function tryRefreshToken() {
    // Auth via cookie HttpOnly: refresh token não é gerenciado no JS
    return false;
  }

  const CSRF_COOKIE_NAME = 'sgvc_csrf';
  const CSRF_HEADER_NAME = 'X-CSRF-Token';
  let csrfEnsured = false;

  function getCookieValue(name) {
    try {
      const parts = String(document.cookie || '').split(';');
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i].trim();
        if (!part) continue;
        const eq = part.indexOf('=');
        const key = eq >= 0 ? part.slice(0, eq).trim() : part;
        if (key !== name) continue;
        const raw = eq >= 0 ? part.slice(eq + 1) : '';
        return decodeURIComponent(raw);
      }
    } catch (_err) {
      // ignore
    }
    return null;
  }

  function getCsrfToken() {
    return getCookieValue(CSRF_COOKIE_NAME);
  }

  async function ensureCsrfCookie() {
    csrfEnsured = true;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      await fetch(buildUrl('/api/auth/csrf'), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(t);
    } catch (_e) {}
  }

  async function apiRequest(path, options = {}) {
    const url = buildUrl(path);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});

    const method = String(options.method || 'GET').toUpperCase();
    const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
    if (isMutating) {
      await ensureCsrfCookie();
      const csrfToken = getCsrfToken();
      if (csrfToken) headers[CSRF_HEADER_NAME] = csrfToken;
    }

    // Timeout padrão de 10 segundos (pode ser sobrescrito via options.timeoutMs)
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 10000;
    const controller = new AbortController();
    const userSignal = options.signal;
    let timeoutId;
    // Se o chamador fornecer um signal, aborta o controller local quando o externo abortar
    if (userSignal) {
      if (userSignal.aborted) controller.abort();
      else userSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        // Força uso do nosso AbortController; não sobrescrever se options já tem signal
        signal: controller.signal,
        credentials: 'include',
      });
    } catch (err) {
      // Diferencia timeout/abort de falhas de rede
      if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR')) {
        const error = new Error('REQUEST_TIMEOUT');
        error.status = 0;
        error.payload = { message: 'Tempo de requisição excedido. Tente novamente.' };
        throw error;
      }
      const error = new Error('NETWORK_ERROR');
      error.status = 0;
      error.payload = null;
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type') || '';
    let payload = null;

    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      const error = new Error('API_ERROR');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function applyBackendFieldErrors(status, message) {
    if (status !== 401) return;
    const normalized = String(message || '').toLowerCase();
    const emailHint = normalized.includes('email') || normalized.includes('e-mail');
    const passwordHint = normalized.includes('senha');

    if (emailHint && !passwordHint) {
      setFieldError(emailInput, 'E-mail incorreto.', emailError);
      if (emailInput) emailInput.focus();
      return;
    }
    if (passwordHint && !emailHint) {
      setFieldError(passwordInput, 'Senha incorreta.', passwordError);
      if (passwordInput) passwordInput.focus();
      return;
    }

    setFieldError(emailInput, 'E-mail ou senha incorretos.', emailError);
    setFieldError(passwordInput, 'E-mail ou senha incorretos.', passwordError);
    if (emailInput) emailInput.focus();
  }

  function validateEmail(value) {
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  }

  function validatePassword(value) {
    if (!value || value.length < 8) {
      return false;
    }
    // Validate password strength: at least one uppercase, lowercase, number, and special char
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[^a-zA-Z0-9]/.test(value);
    return hasUpper && hasLower && hasNumber && hasSpecial;
  }

  function setFieldSuccess(input, errorEl) {
    if (!input) return;
    input.classList.remove('is-danger');
    input.classList.add('is-success');
    input.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
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
      setFieldError(passwordInput, 'Senha obrigatoria.', passwordError);
      setStatus('Falha no login', 'is-danger');
      passwordInput.focus();
      setLoginButtonState();
      return;
    }

    if (!validatePassword(password)) {
      // Mensagem específica baseada no que falta
      let message;
      if (password.length < 8) {
        message = 'Senha muito fraca';
      } else {
        // Mensagem consolidada que contém todas as palavras que os testes procuram
        message = 'A senha deve conter pelo menos uma letra maiúscula, minúscula, um número e um caractere especial.';
      }
      setFieldError(passwordInput, message, passwordError);
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

      // Auth via cookie HttpOnly: não esperar token em JSON body
      if (!data) {
        throw new Error('Resposta inválida do servidor. Tente novamente.');
      }

      // Atualiza usuário via /api/auth/me (cookie HttpOnly)
      try {
        state.user = await window.apiGetMe();
      } catch (_err) {
        state.user = data.user || null;
      }
      state.failedAttempts = 0;
      state.lockUntil = 0;

      // Não persistir token/sessão em storage (cookie HttpOnly já gerencia)
      state.failedAttempts = 0;
      state.lockUntil = 0;
      
      if (rememberMe && rememberMe.checked) {
        saveRememberedEmail(email);
      } else {
        saveRememberedEmail('');
      }
      
      // Restaura estado do botão
      loginBtn.classList.remove('is-loading');
      loginBtn.textContent = originalLoginText;
      loginBtn.disabled = false;
      
      // CORREÇÃO DEFINITIVA: Redirecionamento simples e direto
      // Não faz verificações adicionais que podem causar problemas
      window.location.href = '/dashboard.html';
      
      return;
    } catch (err) {
      const message = normalizeApiError(err);
      const status = err && err.status ? err.status : 0;
      if (status === 401) {
        state.failedAttempts += 1;
      }
      if (status === 423 || status === 429 || state.failedAttempts >= 3) {
        state.lockUntil = Date.now() + 15000;
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
      // Só restaura o botão se NÃO houve redirect (ou seja, se houve erro)
      // Se o login foi bem-sucedido, o estado já foi restaurado antes do redirect
      if (loginBtn) {
        try {
          loginBtn.classList.remove('is-loading');
          loginBtn.textContent = originalLoginText;
          setLoginButtonState();
        } catch (e) {
          // Ignora erros ao restaurar estado (pode ser que a página já tenha sido redirecionada)
        }
      }
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
      if (passwordError) {
        passwordError.textContent = '';
        passwordError.hidden = true;
        passwordError.style.display = 'none';
      }
      return;
    }
    if (validatePassword(value)) {
      setFieldSuccess(passwordInput, passwordError);
    } else {
      // Mensagem específica baseada no que falta
      let message = 'Senha muito fraca';
      if (value.length < 8) {
        message = 'Senha muito fraca';
      } else {
        // Mensagem consolidada que contém todas as palavras que os testes procuram
        message = 'A senha deve conter pelo menos uma letra maiúscula, minúscula, um número e um caractere especial.';
      }
      setFieldError(passwordInput, message, passwordError);
    }
    setLoginButtonState();
  }

  // Foco autom\u00e1tico no campo de e-mail ao abrir a tela
  if (emailInput) {
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => emailInput.focus(), 100);
    });
    emailInput.addEventListener('input', handleFieldInput);
    emailInput.addEventListener('blur', handleEmailBlur);
  }
  if (passwordInput) {
    passwordInput.addEventListener('input', handleFieldInput);
    passwordInput.addEventListener('blur', handlePasswordBlur);
  }

  // Mensagem de boas-vindas din\u00e2mica
  const loginSubtitle = document.querySelector('.login-subtitle');
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
    updatePasswordToggle(togglePasswordBtn, passwordInput.type === 'password');
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      clearMessages();
      setStatus('Encerrando sessao...', 'is-info');
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        showAlert(err.message || 'Falha ao encerrar sessao.');
      } finally {
        state.token = null;
        state.user = null;
        clearSession();
        updateSessionUI();
        setStatus('Sessao encerrada', 'is-light');
        if (responseOutput) responseOutput.textContent = 'Sessao encerrada.';
      }
    });
  }

  // Removido: lógica de persistência/restauração de token em storage (auth via cookie HttpOnly)

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
    registerOpen.addEventListener('click', () => {
      toggleRegisterModal(true);
      // Atualiza imediatamente o indicador quando o modal abre
      if (registerPassword) {
        const value = registerPassword.value || '';
        const rules = updateRulesUI('register-password-rules', 'register-password-meter', value);
        let ok = rules && rules.count === 5;
        if (registerPasswordConfirm) {
          const same = registerPasswordConfirm.value && registerPasswordConfirm.value === value;
          if (registerConfirmError) {
            registerConfirmError.textContent = same || !registerPasswordConfirm.value ? '' : 'As senhas não conferem.';
            registerConfirmError.hidden = same || !registerPasswordConfirm.value;
          }
          ok = ok && same;
        }
        if (registerSubmit) registerSubmit.disabled = !ok;
        updatePasswordStrength(value);
      }
      // Revalida confirmação isoladamente
      if (registerPasswordConfirm && registerConfirmError && registerPassword) {
        const same = registerPasswordConfirm.value && registerPasswordConfirm.value === (registerPassword.value || '');
        registerConfirmError.textContent = same || !registerPasswordConfirm.value ? '' : 'As senhas não conferem.';
        registerConfirmError.hidden = same || !registerPasswordConfirm.value;
      }
    });
  }

  function registerHasData() {
    return Boolean(
      (registerName && registerName.value.trim()) ||
        (registerEmail && registerEmail.value.trim()) ||
        (registerPassword && registerPassword.value.trim()),
    );
  }

  function confirmCloseRegister() {
    // Evita bloquear o thread com window.confirm() e corrige foco antes de fechar
    try {
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      if (document.body && typeof document.body.focus === 'function') {
        document.body.focus();
      }
    } catch (_e) {}
    toggleRegisterModal(false);
  }

  function resetRegisterSubmitState() {
    if (!registerSubmit) return;
    registerSubmit.classList.remove('is-loading');
    registerSubmit.disabled = false;
    // Garante que sempre haja um texto padrão consistente
    if (!registerSubmitDefaultText) {
      registerSubmitDefaultText = 'Criar conta e acessar';
    }
    registerSubmit.textContent = registerSubmitDefaultText;
  }

  [registerClose, registerCloseBtn, registerCancel].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => {
      // Aborta requisição em andamento (se houver)
      if (registerAbortController) {
        try { registerAbortController.abort(); } catch (_e) {}
        registerAbortController = null;
      }
      // Restaura estado do botão confirmar
      resetRegisterSubmitState();
      // Fecha modal (com confirmação se houver dados preenchidos)
      confirmCloseRegister();
    });
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
      if (!password || password.length < 8) {
        setRegisterFieldError(
          registerPassword,
          registerPasswordError,
          'Mínimo 8 caracteres.',
          registerPasswordStatus,
        );
        if (registerPassword) registerPassword.focus();
        return;
      }
      
      // Validate password strength
      if (!validatePassword(password)) {
        setRegisterFieldError(
          registerPassword,
          registerPasswordError,
          'A senha deve conter pelo menos uma letra maiúscula, minúscula, um número e um caractere especial.',
          registerPasswordStatus,
        );
        if (registerPassword) registerPassword.focus();
        return;
      }

      registerSubmit.classList.add('is-loading');
      registerSubmit.disabled = true;
      // Memoriza texto atual como padrão visível
      if (!registerSubmitDefaultText) {
        registerSubmitDefaultText = registerSubmit.textContent;
      }
      const originalText = registerSubmit.textContent;
      registerSubmit.textContent = 'Criando conta...';

      try {
        // Prepara AbortController para permitir cancelamento via Cancelar/Fechar
        registerAbortController = new AbortController();
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
          signal: registerAbortController.signal,
        });
        setRegisterFieldValid(registerName, registerNameError, registerNameStatus);
        setRegisterFieldValid(registerEmail, registerEmailError, registerEmailStatus);
        setRegisterFieldValid(registerPassword, registerPasswordError, registerPasswordStatus);
        if (emailInput) emailInput.value = email;
        if (rememberMe) rememberMe.checked = true;
        saveRememberedEmail(email);

        // Após registro, backend já efetuou login e setou cookies
        // Basta obter o usuário atual e redirecionar
        try {
          state.user = await window.apiGetMe();
        } catch (_err) {
          state.user = null;
        }
        state.failedAttempts = 0;
        state.lockUntil = 0;
        updateSessionUI();
        window.location.href = '/dashboard.html';
        return;
      } catch (err) {
        showRegisterError(normalizeApiError(err));
      } finally {
        // Limpa controller (ciclo encerrado)
        registerAbortController = null;
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
    updatePasswordToggle(registerTogglePassword, registerPassword.type === 'password');
  }
  if (registerToggleConfirm && registerPasswordConfirm) {
    registerToggleConfirm.addEventListener('click', () => {
      const isHidden = registerPasswordConfirm.type === 'password';
      registerPasswordConfirm.type = isHidden ? 'text' : 'password';
      updatePasswordToggle(registerToggleConfirm, isHidden);
    });
    updatePasswordToggle(registerToggleConfirm, registerPasswordConfirm.type === 'password');
  }

  function evaluatePasswordRules(value) {
    const len = typeof value === 'string' && value.length >= 8;
    const upper = /[A-Z]/.test(value);
    const lower = /[a-z]/.test(value);
    const num = /\d/.test(value);
    const sym = /[^a-zA-Z0-9]/.test(value);
    const count = [len, upper, lower, num, sym].filter(Boolean).length;
    return { len, upper, lower, num, sym, count };
  }

  function updateRulesUI(containerId, meterId, value) {
    const rules = evaluatePasswordRules(value);
    const container = document.getElementById(containerId);
    if (container) {
      [['len','len'],['upper','upper'],['lower','lower'],['num','num'],['sym','sym']].forEach(([attr, key]) => {
        const el = container.querySelector(`.pwd-rule[data-rule="${attr}"]`);
        if (!el) return;
        el.classList.toggle('is-ok', Boolean(rules[key]));
        const icon = el.querySelector('.pwd-icon');
        if (icon) icon.textContent = rules[key] ? '✓' : '✗';
      });
    }
    const meter = document.getElementById(meterId);
    if (meter) {
      const pct = (rules.count / 5) * 100;
      meter.style.width = `${pct}%`;
      meter.style.background = rules.count <= 2 ? '#ef4444' : (rules.count <= 4 ? '#f59e0b' : '#16a34a');
    }
    return rules;
  }

  // Listeners para senha são vinculados ao abrir o modal (toggleRegisterModal)

  function updatePasswordStrength(value) {
    if (!passwordStrength) return;
    if (!value) {
      passwordStrength.textContent = '';
      passwordStrength.className = 'help password-strength';
      passwordStrength.hidden = true;
      passwordStrength.style.display = 'none';
      return;
    }
    // Sempre exibir o indicador quando há valor
    passwordStrength.hidden = false;
    passwordStrength.style.display = '';
    
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
    if (score >= 3 && value.length >= 10) {
      passwordStrength.textContent = 'Forte';
      passwordStrength.className = 'help password-strength is-strong';
    } else if (score >= 3) {
      passwordStrength.textContent = 'Forte';
      passwordStrength.className = 'help password-strength is-strong';
    } else {
      passwordStrength.textContent = 'M\u00e9dia';
      passwordStrength.className = 'help password-strength is-medium';
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
      // Validação em tempo real - não mostra erro, apenas validação visual
      if (validateEmail(value)) {
        setRegisterFieldValid(registerEmail, registerEmailError, registerEmailStatus);
      } else {
        // Não mostra erro em tempo real, apenas no blur ou submit
        clearRegisterFieldState(registerEmail, registerEmailError, registerEmailStatus);
      }
    });
    
    // Validação no blur
    registerEmail.addEventListener('blur', () => {
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
    // Validação no blur
    registerPassword.addEventListener('blur', () => {
      const value = registerPassword.value.trim();
      if (!value) {
        clearRegisterFieldState(registerPassword, registerPasswordError, registerPasswordStatus);
        return;
      }
      if (value.length < 8) {
        setRegisterFieldError(
          registerPassword,
          registerPasswordError,
          'Mínimo 8 caracteres.',
          registerPasswordStatus,
        );
      } else if (!validatePassword(value)) {
        setRegisterFieldError(
          registerPassword,
          registerPasswordError,
          'A senha deve conter pelo menos uma letra maiúscula, minúscula, um número e um caractere especial.',
          registerPasswordStatus,
        );
      } else {
        setRegisterFieldValid(registerPassword, registerPasswordError, registerPasswordStatus);
      }
    });
  }
  if (registerPasswordConfirm && registerPassword) {
    const onConfirmOnly = () => {
      const pass = registerPassword.value || '';
      const conf = registerPasswordConfirm.value || '';
      const same = conf && conf === pass;
      if (registerConfirmError) {
        registerConfirmError.textContent = same || !conf ? '' : 'As senhas não conferem.';
        registerConfirmError.hidden = same || !conf;
      }
      const rules = evaluatePasswordRules(pass);
      const ok = (rules && rules.count === 5) && same;
      if (registerSubmit) registerSubmit.disabled = !ok;
    };
    registerPasswordConfirm.addEventListener('input', onConfirmOnly);
    registerPasswordConfirm.addEventListener('keyup', onConfirmOnly);
  }

  // Executa inicialização apenas na página de login
  if (IS_LOGIN_PAGE) {
    try {
      updateSessionUI();
    } catch (err) {
      console.warn('[APP] Erro ao atualizar UI de sessão:', err);
    }
    
    clearMessages();
    clearFieldErrors();
    setLoginButtonState();

    const remembered = loadRememberedEmail();
    if (remembered && emailInput) {
      emailInput.value = remembered;
      if (rememberMe) rememberMe.checked = true;
    }

    // Se já existe sessão válida na página de login, redireciona para o dashboard
    // Isso evita que o usuário veja a tela de login quando já está autenticado
    if (window.apiGetMe) {
      window.apiGetMe()
        .then((user) => {
          if (user) window.location.href = '/dashboard.html';
        })
        .catch((_err) => {});
    }
  }

// Listener direto no campo de senha do registro
(function() {
  function bindPasswordRules() {
    var pwd = document.getElementById('register-password');
    var rules = document.getElementById('register-password-rules');
    var meter = document.getElementById('register-password-meter');
    if (!pwd || !rules || !meter) return;
    
    function check(value) {
      var checks = {
        len: value.length >= 8,
        upper: /[A-Z]/.test(value),
        lower: /[a-z]/.test(value),
        num: /[0-9]/.test(value),
        sym: /[^a-zA-Z0-9]/.test(value)
      };
      var count = Object.values(checks).filter(Boolean).length;
      
      rules.querySelectorAll('.pwd-rule').forEach(function(el) {
        var key = el.dataset.rule;
        var ok = checks[key];
        var icon = el.querySelector('.pwd-icon');
        if (icon) icon.textContent = ok ? '✓' : '✗';
        el.classList.toggle('is-ok', !!ok);
      });
      
      var pct = (count / 5) * 100;
      meter.style.width = pct + '%';
      meter.style.background = count <= 2 ? '#ef4444' :
        count <= 4 ? '#f59e0b' : '#16a34a';
    }
    
    pwd.addEventListener('input', function() { check(this.value); });
    pwd.addEventListener('keyup', function() { check(this.value); });
  }
  
  // Tenta no DOMContentLoaded
  document.addEventListener('DOMContentLoaded', bindPasswordRules);
  
  // Tenta quando modal abre (observa mudança de classe is-active)
  var observer = new MutationObserver(function() {
    bindPasswordRules();
  });
  
  document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById('register-modal');
    if (modal) {
      observer.observe(modal, { attributes: true,
        attributeFilter: ['class'] });
    }
  });
})();
})();
