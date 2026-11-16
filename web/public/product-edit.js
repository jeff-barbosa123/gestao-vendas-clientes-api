/**
 * Tela de edição de produto (entrada). MÃ³dulos em /product-edit/*.js.
 */
import { DELETE_FLAG, productId } from './product-edit/constants.js';
import {
  backBtn,
  deleteBtn,
  deleteCancel,
  deleteCloseBtn,
  deleteConfirm,
  deleteModal,
} from './product-edit/dom.js';
import {
  apiRequest,
  ensureAuthOrRedirect,
  showMessage,
  toggleDeleteModal,
} from './product-edit/core.js';
import { loadRecipes } from './product-edit/recipes.js';
import { initLoad } from './product-edit/load.js';
import { initEventsForm } from './product-edit/events-form.js';
import { initEventsFields } from './product-edit/events-fields.js';
import { initEventsRecipe } from './product-edit/events-recipe.js';

// Auth via cookie HttpOnly
ensureAuthOrRedirect();

function bootstrap() {
  if (!productId) {
    window.location.href = '/products.html';
    return;
  }

  loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));

  initLoad();

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/products.html';
    });
  }

  initEventsForm();

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

  initEventsRecipe();

  initEventsFields();
}

bootstrap();
