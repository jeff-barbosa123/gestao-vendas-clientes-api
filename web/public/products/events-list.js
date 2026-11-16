/**
 * Eventos da listagem: busca, filtros, ordenação, paginação, tabela e botões.
 */
import { PAGE_SIZE } from './constants.js';
import {
  backBtn,
  filterClear,
  filterPriceMax,
  filterPriceMin,
  filterStatus,
  filterType,
  nameHeader,
  nextPage,
  pageJumpBtn,
  pageJumpInput,
  prevPage,
  priceHeader,
  refreshBtn,
  searchInput,
  tableBody,
} from './dom.js';
import { state } from './state.js';
import { ensureAuthOrRedirect, handleAuthFailure, normalizeError, showMessage } from './core.js';
import { bindCurrencyInput } from './money.js';
import { loadRecipes } from './recipes.js';
import { getFilteredItems, goToPage, loadProducts, renderPage } from './list.js';

export function initEventsList() {
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (tableBody) {
    tableBody.addEventListener('click', (event) => {
      const btn = event.target.closest('.products-name-link');
      const editBtn = event.target.closest('button[data-edit-id]');
      const id = (btn && btn.dataset.id) || (editBtn && editBtn.dataset.editId);
      if (!id) return;
      window.location.href = `/product-edit.html?id=${encodeURIComponent(id)}`;
    });
  }

  [filterType, filterStatus, filterPriceMin, filterPriceMax].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => {
      state.currentPage = 1;
      renderPage();
    });
    el.addEventListener('change', () => {
      state.currentPage = 1;
      renderPage();
    });
  });

  if (prevPage) {
    prevPage.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
        renderPage();
      }
    });
  }

  if (nextPage) {
    nextPage.addEventListener('click', () => {
      const totalPages = Math.ceil(getFilteredItems().length / PAGE_SIZE);
      if (state.currentPage < totalPages) {
        state.currentPage += 1;
        renderPage();
      }
    });
  }

  if (pageJumpBtn) {
    pageJumpBtn.addEventListener('click', () => {
      if (!pageJumpInput) return;
      const value = Number(pageJumpInput.value);
      if (Number.isFinite(value)) {
        goToPage(Math.trunc(value));
      }
    });
  }

  if (pageJumpInput) {
    pageJumpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = Number(pageJumpInput.value);
        if (Number.isFinite(value)) {
          goToPage(Math.trunc(value));
        }
      }
    });
  }

  if (filterPriceMin) {
    bindCurrencyInput(filterPriceMin, renderPage);
  }

  if (filterPriceMax) {
    bindCurrencyInput(filterPriceMax, renderPage);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showMessage('');
      refreshBtn.classList.add('is-loading');
      refreshBtn.disabled = true;
      ensureAuthOrRedirect()
        .then((user) => {
          if (!user) return Promise.resolve();
          return Promise.all([loadProducts(null), loadRecipes(null)]);
        })
        .catch((err) => {
        if (handleAuthFailure(err)) return;
        const friendlyMessage = normalizeError(err);
        showMessage(friendlyMessage || 'Erro ao atualizar produtos. Tente novamente.', 'is-danger');
      })
        .finally(() => {
        refreshBtn.classList.remove('is-loading');
        refreshBtn.disabled = false;
      });
    });
  }

  if (searchInput) {
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.currentPage = 1;
        renderPage();
      }, 300);
    });
  }

  if (nameHeader) {
    nameHeader.addEventListener('click', () => {
      if (state.sortField !== 'name') {
        state.sortField = 'name';
        state.sortAsc = true;
      } else {
        state.sortAsc = !state.sortAsc;
      }
      state.currentPage = 1;
      renderPage();
    });
  }

  if (priceHeader) {
    priceHeader.addEventListener('click', () => {
      if (state.sortField !== 'price') {
        state.sortField = 'price';
        state.sortAsc = false;
      } else {
        state.sortAsc = !state.sortAsc;
      }
      state.currentPage = 1;
      renderPage();
    });
  }

  if (filterClear) {
    filterClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (filterType) filterType.value = '';
      if (filterStatus) filterStatus.value = '';
      if (filterPriceMin) filterPriceMin.value = '';
      if (filterPriceMax) filterPriceMax.value = '';
      state.currentPage = 1;
      renderPage();
    });
  }
}
