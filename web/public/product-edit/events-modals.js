/**
 * Eventos de navegação e do modal de exclusão.
 */
import { DELETE_FLAG, productId } from './constants.js';
import {
  backBtn,
  deleteBtn,
  deleteCancel,
  deleteCloseBtn,
  deleteConfirm,
  deleteModal,
} from './dom.js';
import { apiRequest, showMessage, toggleDeleteModal } from './core.js';

export function initEventsModals() {
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/products.html';
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
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
    deleteConfirm.addEventListener('click', async () => {
      deleteConfirm.classList.add('is-loading');
      deleteConfirm.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}`, null, {
          method: 'DELETE',
        });
        sessionStorage.setItem(DELETE_FLAG, 'true');
        showMessage('Produto removido com sucesso.', 'is-success');
        setTimeout(() => {
          window.location.href = '/products.html';
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
}
