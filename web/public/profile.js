(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

  const profileMessage = document.getElementById('profile-message');
  const passwordMessage = document.getElementById('password-message');
  const passwordForm = document.getElementById('password-form');
  const profileForm = document.getElementById('profile-form');
  const profileNameInput = document.getElementById('profile-name-input');
  const profileEmailInput = document.getElementById('profile-email-input');
  const profileNameError = document.getElementById('profile-name-error');
  const profileEmailError = document.getElementById('profile-email-error');
  const profileFormMessage = document.getElementById('profile-form-message');
  const profileSubmit = document.getElementById('profile-submit');
  const profileLogout = document.getElementById('profile-logout');
  const currentPassword = document.getElementById('current-password');
  const newPassword = document.getElementById('new-password');
  const confirmPassword = document.getElementById('confirm-password');
  const currentPasswordError = document.getElementById('current-password-error');
  const newPasswordError = document.getElementById('new-password-error');
  const confirmPasswordError = document.getElementById('confirm-password-error');
  const passwordSubmit = document.getElementById('password-submit');

  const profileStatus = document.getElementById('profile-status');
  const profileLastLogin = document.getElementById('profile-last-login');

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`;
    }
    return `${base}${normalizedPath}`;
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

  if (newPassword) {
    newPassword.addEventListener('input', () => {
      const value = newPassword.value || '';
      const rules = updateRulesUI('profile-password-rules', 'profile-password-meter', value);
      if (passwordSubmit) {
        passwordSubmit.disabled = !(rules && rules.count === 5);
      }
    });
    // Estado inicial
    const initial = newPassword.value || '';
    const initRules = updateRulesUI('profile-password-rules', 'profile-password-meter', initial);
    if (passwordSubmit) passwordSubmit.disabled = !(initRules && initRules.count === 5);
  }

  // Auth via cookie HttpOnly (token não deve existir no browser storage)
  const session = { token: null };

  async function ensureAuthOrRedirect() {
    try {
      const user = await window.apiGetMe();
      if (!user) {
        window.location.href = '/index.html';
        return null;
      }
      return user;
    } catch (_err) {
      if (_err && _err.name === 'AbortError') {
        return null;
      }
      window.location.href = '/index.html';
      return null;
    }
  }

  function showMessage(element, text, isError = false) {
    if (!element) return;
    element.textContent = text || '';
    element.classList.toggle('is-error', Boolean(isError));
    element.hidden = !text;
  }

  function setFieldError(input, errorEl, message) {
    if (input) input.classList.add('is-danger');
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
    }
  }

  function clearFieldError(input, errorEl) {
    if (input) input.classList.remove('is-danger');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  async function apiRequest(path, _tokenIgnored, options = {}) {
    const url = buildUrl(path);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      const message = data && (data.message || data.error) ? data.message || data.error : 'Erro na requisicao.';
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }
    return data;
  }

  async function loadProfile() {
    await ensureAuthOrRedirect();
    showMessage(profileMessage, 'Carregando dados do perfil...');
    try {
      const data = await apiRequest('/api/auth/me', null);
      const user = data && data.user ? data.user : {};
      if (profileNameInput) profileNameInput.value = user.name || '';
      if (profileEmailInput) profileEmailInput.value = user.email || '';
      if (profileStatus) profileStatus.textContent = user.statusUsuario || '-';
      if (profileLastLogin) profileLastLogin.textContent = formatDateTime(user.dataUltimoLogin);
      showMessage(profileMessage, '');
    } catch (err) {
      showMessage(profileMessage, err.message || 'Erro ao carregar perfil.', true);
    }
  }

  function validatePasswordForm() {
    clearFieldError(currentPassword, currentPasswordError);
    clearFieldError(newPassword, newPasswordError);
    clearFieldError(confirmPassword, confirmPasswordError);
    showMessage(passwordMessage, '');

    const current = currentPassword ? currentPassword.value.trim() : '';
    const next = newPassword ? newPassword.value.trim() : '';
    const confirm = confirmPassword ? confirmPassword.value.trim() : '';

    if (!current) {
      setFieldError(currentPassword, currentPasswordError, 'Informe a senha atual.');
      return null;
    }
    if (!next || next.length < 8) {
      setFieldError(newPassword, newPasswordError, 'A nova senha deve ter pelo menos 8 caracteres.');
      return null;
    }
    // Mesma regra da API: maiúscula, minúscula, número e caractere especial
    if (!(/[A-Z]/.test(next) && /[a-z]/.test(next) && /\d/.test(next) && /[^a-zA-Z0-9]/.test(next))) {
      setFieldError(
        newPassword,
        newPasswordError,
        'Senha muito fraca. Use letra mai\u00fascula, min\u00fascula, n\u00famero e caractere especial.'
      );
      return null;
    }
    if (next !== confirm) {
      setFieldError(confirmPassword, confirmPasswordError, 'As senhas n\u00e3o conferem.');
      return null;
    }
    if (current === next) {
      setFieldError(newPassword, newPasswordError, 'A nova senha deve ser diferente da atual.');
      return null;
    }
    return { current, next };
  }

  function validateProfileForm() {
    clearFieldError(profileNameInput, profileNameError);
    clearFieldError(profileEmailInput, profileEmailError);
    showMessage(profileFormMessage, '');

    const name = profileNameInput ? profileNameInput.value.trim() : '';
    const email = profileEmailInput ? profileEmailInput.value.trim() : '';

    if (!name) {
      setFieldError(profileNameInput, profileNameError, 'Informe o nome.');
      return null;
    }
    if (!email) {
      setFieldError(profileEmailInput, profileEmailError, 'Informe o e-mail.');
      return null;
    }
    return { name, email };
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = validatePasswordForm();
      if (!payload) return;
      await ensureAuthOrRedirect();

      if (passwordSubmit) {
        passwordSubmit.disabled = true;
        passwordSubmit.classList.add('is-loading');
      }
      try {
        await apiRequest('/api/auth/change-password', null, {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: payload.current,
            newPassword: payload.next,
          }),
        });
        showMessage(passwordMessage, 'Senha atualizada com sucesso.');
        if (currentPassword) currentPassword.value = '';
        if (newPassword) newPassword.value = '';
        if (confirmPassword) confirmPassword.value = '';
      } catch (err) {
        showMessage(passwordMessage, err.message || 'Erro ao atualizar senha.', true);
      } finally {
        if (passwordSubmit) {
          passwordSubmit.disabled = false;
          passwordSubmit.classList.remove('is-loading');
        }
      }
    });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = validateProfileForm();
      if (!payload) return;
      await ensureAuthOrRedirect();

      if (profileSubmit) {
        profileSubmit.disabled = true;
        profileSubmit.classList.add('is-loading');
      }
      try {
        const data = await apiRequest('/api/auth/me', null, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showMessage(profileFormMessage, 'Dados atualizados com sucesso.');
        sessionStorage.setItem('sgvc.profileUpdated', 'true');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 800);
      } catch (err) {
        showMessage(profileFormMessage, err.message || 'Erro ao atualizar dados.', true);
      } finally {
        if (profileSubmit) {
          profileSubmit.disabled = false;
          profileSubmit.classList.remove('is-loading');
        }
      }
    });
  }

  const profileBackDashboard = document.getElementById('profile-back-dashboard');
  if (profileBackDashboard) {
    profileBackDashboard.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (profileLogout) {
    profileLogout.addEventListener('click', () => {
      const shouldLogout = window.confirm('Deseja sair da sua conta agora?');
      if (!shouldLogout) return;
      apiRequest('/api/auth/logout', { method: 'POST', skipAuth: true })
        .catch((_err) => {})
        .finally(() => {
          window.location.href = '/index.html';
        });
    });
  }

  loadProfile();
})();
