/**
 * Eventos de fechamento e confirmação dos modais.
 */
import {
  cancelBackBtn,
  cancelClose,
  cancelCloseBtn,
  cancelConfirmBtn,
  cancelModal,
  detailsClose,
  detailsCloseBtn,
  detailsModal,
  detailsPdfBtn,
  editClose,
  editCloseBtn,
  editModal,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, showMessage, toggleModal } from './core.js';
import { openPdf } from './pdf.js';
import { loadSales } from './list.js';

export function initEventsModals() {
  [editClose, editCloseBtn].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => toggleModal(editModal, false));
  });

  [detailsClose, detailsCloseBtn].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => toggleModal(detailsModal, false));
  });

  if (detailsModal) {
    detailsModal.addEventListener('click', (event) => {
      const closeBtn = event.target.closest('.modal-close-btn');
      if (closeBtn) toggleModal(detailsModal, false);
    });
  }

  if (detailsPdfBtn) {
    detailsPdfBtn.addEventListener('click', () => openPdf(state.currentDetails));
  }

  [cancelClose, cancelCloseBtn, cancelBackBtn].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => {
      state.pendingCancelId = null;
      toggleModal(cancelModal, false);
    });
  });

  if (cancelConfirmBtn) {
    cancelConfirmBtn.addEventListener('click', async () => {
      if (!state.pendingCancelId) return;
      cancelConfirmBtn.disabled = true;
      try {
        await apiRequest(`/api/sales/${state.pendingCancelId}/cancel`, null, { method: 'POST' });
        showMessage('Venda cancelada.', 'is-success');
        toggleModal(cancelModal, false);
        await loadSales(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        state.pendingCancelId = null;
        cancelConfirmBtn.disabled = false;
      }
    });
  }
}
