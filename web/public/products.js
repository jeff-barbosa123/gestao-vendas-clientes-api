/**
 * Tela de produtos (entrada). MÃ³dulos em /products/*.js.
 */
import { DELETE_FLAG, UPDATED_FLAG } from './products/constants.js';
import { ensureAuthOrRedirect, showMessage } from './products/core.js';
import { loadRecipes } from './products/recipes.js';
import { loadProducts } from './products/list.js';
import { initEventsForm } from './products/events-form.js';
import { initEventsList } from './products/events-list.js';

ensureAuthOrRedirect().then((user) => {
  if (!user) return;

  const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
  if (deletedFlag) {
    sessionStorage.removeItem(DELETE_FLAG);
    showMessage('Produto removido com sucesso.', 'is-success');
  }

  const updatedFlag = sessionStorage.getItem(UPDATED_FLAG);
  if (updatedFlag) {
    sessionStorage.removeItem(UPDATED_FLAG);
    showMessage('Produto atualizado.', 'is-success');
  }

  loadProducts(null).catch((err) => {
    if (err && err.name === 'AbortError') {
      return;
    }
    if (err && (err.status === 401 || err.status === 403)) {
      window.location.href = '/';
      return;
    }
    showMessage(err && err.message ? err.message : 'Erro ao carregar produtos.', 'is-danger');
  });
  loadRecipes(null).catch((err) => {
    if (err && err.name === 'AbortError') {
      return;
    }
    if (err && (err.status === 401 || err.status === 403)) {
      window.location.href = '/';
      return;
    }
    showMessage(err && err.message ? err.message : 'Erro ao carregar fichas técnicas.', 'is-danger');
  });
});

// carregamento inicial agora ocorre no gate de auth (ensureAuthOrRedirect)

window.addEventListener('pageshow', (event) => {
  const flag = sessionStorage.getItem(UPDATED_FLAG);
  if (flag) {
    sessionStorage.removeItem(UPDATED_FLAG);
    showMessage('Produto atualizado.', 'is-success');
    loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
    return;
  }
  if (event.persisted) {
    loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
  }
});

initEventsList();

initEventsForm();
