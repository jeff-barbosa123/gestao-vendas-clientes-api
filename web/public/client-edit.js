/**
 * Tela de edição de cliente (entrada). MÃ³dulos em /client-edit/*.js.
 */
import { DELETE_FLAG, params } from './client-edit/constants.js';
import {
  backBtn,
  cancelEditBtn,
  deleteBtn,
  deleteCancel,
  deleteClose,
  deleteCloseBtn,
  deleteConfirm,
  deleteModal,
  form,
  saveBtn,
} from './client-edit/dom.js';
import { state } from './client-edit/state.js';
import {
  apiRequest,
  closeDeleteModal,
  ensureAuthOrRedirect,
  navigateToClientList,
  showMessage,
  toggleDeleteModal,
} from './client-edit/core.js';
import { initLoad } from './client-edit/load.js';
import { initEventsForm } from './client-edit/events-form.js';
import { initEventsFields } from './client-edit/events-fields.js';

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

  if (backBtn) {
    backBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateToClientList();
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateToClientList();
    });
  }

  initEventsForm();

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      toggleDeleteModal(true);
    });
  }

  [deleteCloseBtn, deleteCancel].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => toggleDeleteModal(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal && deleteModal.classList.contains('is-active')) {
      event.preventDefault();
      toggleDeleteModal(false);
    }
  });

  if (deleteConfirm) {
    deleteConfirm.addEventListener('click', async (event) => {
      event.preventDefault();
      deleteConfirm.classList.add('is-loading');
      deleteConfirm.disabled = true;
      try {
        await apiRequest(`/api/customers/${state.customerId}`, null, {
          method: 'DELETE',
        });
        sessionStorage.setItem(DELETE_FLAG, 'true');
        showMessage('Cliente removido com sucesso.', 'is-success');
        setTimeout(() => {
          navigateToClientList();
        }, 500);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        deleteConfirm.classList.remove('is-loading');
        deleteConfirm.disabled = false;
        toggleDeleteModal(false);
      }
    });
  }

  initEventsFields();

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/clients.html';
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      if (saveBtn && !saveBtn.disabled) {
        const shouldCancel = window.confirm('Você tem alterações não salvas. Deseja realmente cancelar?');
        if (!shouldCancel) return;
      }
      window.location.href = '/clients.html';
    });
  }

  if (deleteClose) {
    deleteClose.addEventListener('click', closeDeleteModal);
  }

  if (deleteCloseBtn) {
    deleteCloseBtn.addEventListener('click', closeDeleteModal);
  }

  if (deleteCancel) {
    deleteCancel.addEventListener('click', closeDeleteModal);
  }

  // Fechar modal com ESC
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal && deleteModal.classList.contains('is-active')) {
      closeDeleteModal();
    }
  });
}

bootstrap();
