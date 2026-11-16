/**
 * Eventos de navegação (voltar/cancelar) e do modal de exclusão.
 */
import { DELETE_FLAG } from './constants.js';
import {
  backBtn,
  cancelEditBtn,
  deleteBtn,
  deleteCancel,
  deleteClose,
  deleteCloseBtn,
  deleteConfirm,
  deleteModal,
  saveBtn,
} from './dom.js';
import { state } from './state.js';
import {
  apiRequest,
  closeDeleteModal,
  navigateToClientList,
  showMessage,
  toggleDeleteModal,
} from './core.js';

export function initEventsModals() {
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
