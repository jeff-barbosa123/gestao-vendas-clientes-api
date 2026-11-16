/**
 * Recuperação de senha: modal e envio.
 */
import {
  forgotClose,
  forgotCloseBtn,
  forgotEmail,
  forgotEmailError,
  forgotForm,
  forgotLink,
  forgotModal,
  forgotMsg,
  forgotSubmit,
} from './dom.js';
import { apiRequest } from './api.js';
import { validateEmail } from './login.js';

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

export function initForgot() {
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
}
