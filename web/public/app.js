/**
 * Tela de login e cadastro (entrada). MÃ³dulos em /app/*.js.
 */
import { API_BASE } from './app/constants.js';
import { apiBaseEl, emailInput, rememberMe } from './app/dom.js';
import { remembered } from './app/session.js';
import { clearFieldErrors, clearMessages } from './app/messages.js';
import { setLoginButtonState, updateSessionUI } from './app/login.js';
import { initForgot } from './app/forgot.js';
import { initEventsLogin } from './app/events-login.js';
import { initEventsRegister } from './app/events-register.js';

initEventsLogin();

initForgot();

if (apiBaseEl) apiBaseEl.textContent = API_BASE;

initEventsRegister();

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
