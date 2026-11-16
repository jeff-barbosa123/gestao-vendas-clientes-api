/**
 * Tela de edição de cliente (entrada). MÃ³dulos em /client-edit/*.js.
 */
import { params } from './client-edit/constants.js';
import { form } from './client-edit/dom.js';
import { state } from './client-edit/state.js';
import { ensureAuthOrRedirect } from './client-edit/core.js';
import { initLoad } from './client-edit/load.js';
import { initEventsForm } from './client-edit/events-form.js';
import { initEventsFields } from './client-edit/events-fields.js';
import { initEventsModals } from './client-edit/events-modals.js';

// Auth via cookie HttpOnly
ensureAuthOrRedirect();

state.customerId = params.get('id');

function bootstrap() {
  if (!state.customerId) {
    // Se não houver ID, redirecionar para a lista de clientes
    console.warn('[CLIENT-EDIT] ID do cliente não fornecido. Redirecionando para /clients.html');
    window.location.href = '/clients.html';
    return;
  }

  if (window.UnsavedChangesGuard && form) {
    state.unsavedGuard = new window.UnsavedChangesGuard('#edit-form');
  }

  initLoad();

  initEventsModals();

  initEventsForm();

  initEventsFields();
}

bootstrap();
