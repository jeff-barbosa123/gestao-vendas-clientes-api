(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;
  const form = document.getElementById("reset-form");
  const newPassword = document.getElementById("new-password");
  const confirmPassword = document.getElementById("confirm-password");
  const confirmError = document.getElementById("confirm-error");
  const newPasswordError = document.getElementById("new-password-error");
  const submitBtn = document.getElementById("reset-submit");
  const errorBox = document.getElementById("reset-error");
  const errorText = document.getElementById("reset-error-text");
  const successBox = document.getElementById("reset-success");
  const successText = document.getElementById("reset-success-text");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  function showError(message) {
    if (!errorBox || !errorText) return;
    errorText.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    if (!errorBox || !errorText) return;
    errorText.textContent = "";
    errorBox.hidden = true;
  }

  function showSuccess(message) {
    if (!successBox || !successText) return;
    successText.textContent = message;
    successBox.hidden = false;
  }

  function clearSuccess() {
    if (!successBox || !successText) return;
    successText.textContent = "";
    successBox.hidden = true;
  }

  function validatePassword(value) {
    if (!value || typeof value !== "string" || value.trim().length < 8) {
      return false;
    }
    // Validação de força de senha: pelo menos uma maiúscula, minúscula, número e caractere especial
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[^a-zA-Z0-9]/.test(value);
    return hasUpper && hasLower && hasNumber && hasSpecial;
  }

  function getPasswordValidationError(value) {
    if (!value || typeof value !== "string") {
      return "Senha é obrigatória.";
    }
    const trimmed = value.trim();
    if (trimmed.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres.";
    }
    const hasUpper = /[A-Z]/.test(trimmed);
    const hasLower = /[a-z]/.test(trimmed);
    const hasNumber = /\d/.test(trimmed);
    const hasSpecial = /[^a-zA-Z0-9]/.test(trimmed);
    
    // Verificar se falta algum requisito e retornar mensagem consolidada
    const missing = [];
    if (!hasUpper) missing.push('maiúscula');
    if (!hasLower) missing.push('minúscula');
    if (!hasNumber) missing.push('número');
    if (!hasSpecial) missing.push('caractere especial');
    
    if (missing.length > 0) {
      // Mensagem consolidada que o teste espera
      return "Use pelo menos 8 caracteres incluindo letra maiúscula, minúscula, número e caractere especial.";
    }
    
    return null;
  }

  async function apiRequest(path, payload) {
    const url = API_BASE.replace(/\/$/, "") + path;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      const message = data && (data.message || data.error) ? data.message || data.error : "Erro na solicitacao.";
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }
    return data;
  }

  // Validação em tempo real da senha
  if (newPassword) {
    newPassword.addEventListener('input', () => {
      const password = newPassword.value.trim();
      if (!password) {
        newPassword.classList.remove('is-danger', 'is-success');
        if (newPasswordError) {
          newPasswordError.textContent = '';
          newPasswordError.hidden = true;
        }
        return;
      }
      const error = getPasswordValidationError(password);
      if (error) {
        newPassword.classList.remove('is-success');
        newPassword.classList.add('is-danger');
        if (newPasswordError) {
          newPasswordError.textContent = error;
          newPasswordError.hidden = false;
        }
      } else {
        newPassword.classList.remove('is-danger');
        newPassword.classList.add('is-success');
        if (newPasswordError) {
          newPasswordError.textContent = '';
          newPasswordError.hidden = true;
        }
      }
    });
    
    newPassword.addEventListener('blur', () => {
      const password = newPassword.value.trim();
      if (password) {
        const error = getPasswordValidationError(password);
        if (error) {
          newPassword.classList.remove('is-success');
          newPassword.classList.add('is-danger');
          if (newPasswordError) {
            newPasswordError.textContent = error;
            newPasswordError.hidden = false;
            newPasswordError.style.display = '';
          }
        } else {
          newPassword.classList.remove('is-danger');
          newPassword.classList.add('is-success');
          if (newPasswordError) {
            newPasswordError.textContent = '';
            newPasswordError.hidden = true;
          }
        }
        if (!error && confirmPassword && confirmPassword.value.trim()) {
          // Revalida confirmação se ambas estão preenchidas
          if (password !== confirmPassword.value.trim()) {
            if (confirmError) {
              confirmError.textContent = "As senhas n\u00e3o conferem.";
              confirmError.hidden = false;
            }
            confirmPassword.classList.add("is-danger");
          } else {
            if (confirmError) confirmError.hidden = true;
            confirmPassword.classList.remove("is-danger");
            confirmPassword.classList.add("is-success");
          }
        }
      }
    });
  }

  // Validação em tempo real da confirmação
  if (confirmPassword && newPassword) {
    confirmPassword.addEventListener('input', () => {
      const password = newPassword.value.trim();
      const confirm = confirmPassword.value.trim();
      if (!confirm) {
        confirmPassword.classList.remove('is-danger', 'is-success');
        if (confirmError) {
          confirmError.textContent = '';
          confirmError.hidden = true;
        }
        return;
      }
      if (password !== confirm) {
        confirmPassword.classList.remove('is-success');
        confirmPassword.classList.add('is-danger');
        if (confirmError) {
          confirmError.textContent = "As senhas n\u00e3o conferem.";
          confirmError.hidden = false;
        }
      } else {
        confirmPassword.classList.remove('is-danger');
        confirmPassword.classList.add('is-success');
        if (confirmError) {
          confirmError.textContent = '';
          confirmError.hidden = true;
        }
      }
    });
  }

  if (!token) {
    showError("Token inv\u00e1lido ou ausente. Solicite a recupera\u00e7\u00e3o novamente.");
    if (submitBtn) submitBtn.disabled = true;
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearError();
      clearSuccess();
      if (confirmError) confirmError.hidden = true;

      const password = newPassword ? newPassword.value.trim() : "";
      const confirm = confirmPassword ? confirmPassword.value.trim() : "";

      // Validação de senha com feedback detalhado
      const passwordError = getPasswordValidationError(password);
      if (passwordError) {
        showError(passwordError);
        if (newPassword) {
          newPassword.classList.add("is-danger");
          newPassword.classList.remove("is-success");
          newPassword.focus();
        }
        if (newPasswordError) {
          newPasswordError.textContent = passwordError;
          newPasswordError.hidden = false;
        }
        return;
      }
      
      if (password !== confirm) {
        if (confirmError) {
          confirmError.textContent = "As senhas n\u00e3o conferem.";
          confirmError.hidden = false;
        }
        if (confirmPassword) {
          confirmPassword.classList.add("is-danger");
          confirmPassword.classList.remove("is-success");
          confirmPassword.focus();
        }
        return;
      }
      
      // Limpa erros visuais se tudo está válido
      if (newPassword) {
        newPassword.classList.remove("is-danger");
        newPassword.classList.add("is-success");
      }
      if (confirmPassword) {
        confirmPassword.classList.remove("is-danger");
        confirmPassword.classList.add("is-success");
      }
      if (confirmError) confirmError.hidden = true;
      if (newPasswordError) newPasswordError.hidden = true;
      if (!token) {
        showError("Token inv\u00e1lido ou ausente.");
        return;
      }

      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Atualizando...";

      try {
        await apiRequest("/api/auth/reset", { token, password });
        showSuccess("Senha atualizada. Voc\u00ea j\u00e1 pode fazer login.");
        if (newPassword) newPassword.value = "";
        if (confirmPassword) confirmPassword.value = "";
        setTimeout(() => {
          window.location.href = "/index.html";
        }, 2000);
      } catch (err) {
        showError(err.message || "Erro ao redefinir senha.");
      } finally {
        submitBtn.classList.remove("is-loading");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
})();
