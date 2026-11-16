/**
 * Tela de clientes (entrada). MÃ³dulos em /clients/*.js.
 */
import { createPhone } from './clients/dom.js';
import { state } from './clients/state.js';
import { handleAuthFailure, normalizeError, requireAuth, showMessage } from './clients/core.js';
import { handlePostNavigationFlags, initList, loadCustomers } from './clients/list.js';
import {
  getCreateSnapshot,
  initForm,
  prioritizeFormTabOrder,
  updateCreateButtonState,
  updateWhatsAppLink,
} from './clients/form.js';
import { initFormSubmit } from './clients/form-submit.js';
import { initExport } from './clients/export.js';

updateWhatsAppLink(createPhone ? createPhone.value : '');

state.createInitialState = getCreateSnapshot();

prioritizeFormTabOrder();

updateCreateButtonState(false, state.createInitialState);

initList();

requireAuth()
  .then((user) => {
    if (!user) return;
    return loadCustomers(null).then(handlePostNavigationFlags);
  })
  .catch((err) => {
    if (handleAuthFailure(err)) return;
    const friendlyMessage = normalizeError(err);
    showMessage(friendlyMessage, 'is-danger');
  });

initFormSubmit();

initForm();

initExport();

// Garantir que a navegação por teclado priorize o formulário
prioritizeFormTabOrder();
