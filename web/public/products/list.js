/**
 * Listagem de produtos: filtros, ordenação, paginação, tabela e carga.
 */
import { PAGE_SIZE } from './constants.js';
import {
  filterPriceMax,
  filterPriceMin,
  filterStatus,
  filterType,
  nameHeader,
  nextPage,
  pageInfo,
  pageJumpBtn,
  pageJumpInput,
  pageList,
  pagination,
  prevPage,
  priceHeader,
  productsTotal,
  searchInput,
  tableBody,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, escapeHtml } from './core.js';
import { formatPrice, parsePrice } from './money.js';

function updateSortLabel() {
  if (!nameHeader) return;
  if (state.sortField === 'name') {
    nameHeader.textContent = state.sortAsc ? 'Nome A-Z' : 'Nome Z-A';
    nameHeader.setAttribute('aria-sort', state.sortAsc ? 'ascending' : 'descending');
  } else {
    nameHeader.textContent = 'Nome';
    nameHeader.setAttribute('aria-sort', 'none');
  }
  if (priceHeader) {
    priceHeader.setAttribute('aria-sort', state.sortField === 'price' ? (state.sortAsc ? 'ascending' : 'descending') : 'none');
  }
}

export function getFilteredItems() {
  const query = String(searchInput ? searchInput.value : '').toLowerCase();
  const typeValue = String(filterType ? filterType.value : '').toLowerCase();
  const statusValue = String(filterStatus ? filterStatus.value : '').toUpperCase();
  const minPrice = parsePrice(filterPriceMin ? filterPriceMin.value : null);
  const maxPrice = parsePrice(filterPriceMax ? filterPriceMax.value : null);
  const baseList = state.productsCache.slice().sort((a, b) => {
    if (state.sortField === 'price') {
      const aPrice = Number(a.price ?? a.precoVenda ?? 0);
      const bPrice = Number(b.price ?? b.precoVenda ?? 0);
      const order = aPrice - bPrice;
      return state.sortAsc ? order : -order;
    }
    const aName = String(a.name || '');
    const bName = String(b.name || '');
    const order = aName.localeCompare(bName, 'pt-BR', { sensitivity: 'base' });
    return state.sortAsc ? order : -order;
  });
  return baseList.filter((product) => {
    const name = String(product.name || '').toLowerCase();
    const description = String(product.description || '').toLowerCase();
    const matchesQuery = !query || name.includes(query) || description.includes(query);
    if (!matchesQuery) return false;

    if (statusValue) {
      const status = String(product.status || product.status_produto || 'ATIVO').toUpperCase();
      if (status !== statusValue) return false;
    }

    if (typeValue) {
      const typeRaw = (product.productType || product.product_type || '').toString().toLowerCase();
      const hasRecipe = Boolean(product.fichaTecnicaId || product.ficha_tecnica_id);
      const inferred = typeRaw ? typeRaw : hasRecipe ? 'produced' : 'resale';
      if (inferred !== typeValue) return false;
    }

    const priceValue = Number(product.price ?? product.precoVenda ?? 0);
    if (minPrice != null && priceValue < minPrice) return false;
    if (maxPrice != null && priceValue > maxPrice) return false;

    return true;
  });
}

function updatePagination(total) {
  if (!pagination) return;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  pagination.hidden = totalPages <= 1;
  if (pageInfo) {
    const start = total === 0 ? 0 : (state.currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(state.currentPage * PAGE_SIZE, total);
    pageInfo.textContent = `Mostrando ${start}-${end} de ${total} produtos`;
  }
  if (pageList) {
    pageList.innerHTML = '';
    const maxButtons = 5;
    let start = Math.max(1, state.currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    if (start > 1) {
      const first = document.createElement('button');
      first.className = 'button is-light is-small';
      first.textContent = '1';
      first.setAttribute('aria-label', 'P\u00e1gina 1');
      first.addEventListener('click', () => {
        state.currentPage = 1;
        renderPage();
      });
      pageList.appendChild(first);
      if (start > 2) {
        const dots = document.createElement('span');
        dots.className = 'products-page-ellipsis';
        dots.textContent = '...';
        pageList.appendChild(dots);
      }
    }
    for (let page = start; page <= end; page += 1) {
      const btn = document.createElement('button');
      btn.className = 'button is-light is-small';
      btn.textContent = String(page);
      btn.setAttribute('aria-label', `P\u00e1gina ${page}`);
      if (page === state.currentPage) {
        btn.classList.add('is-link');
        btn.setAttribute('aria-current', 'page');
      }
      btn.addEventListener('click', () => {
        state.currentPage = page;
        renderPage();
      });
      pageList.appendChild(btn);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) {
        const dots = document.createElement('span');
        dots.className = 'products-page-ellipsis';
        dots.textContent = '...';
        pageList.appendChild(dots);
      }
      const last = document.createElement('button');
      last.className = 'button is-light is-small';
      last.textContent = String(totalPages);
      last.setAttribute('aria-label', `P\u00e1gina ${totalPages}`);
      last.addEventListener('click', () => {
        state.currentPage = totalPages;
        renderPage();
      });
      pageList.appendChild(last);
    }
  }
  if (prevPage) prevPage.disabled = state.currentPage === 1;
  if (nextPage) nextPage.disabled = state.currentPage === totalPages;
  if (pageJumpInput) {
    pageJumpInput.value = String(state.currentPage);
    pageJumpInput.max = String(totalPages);
    pageJumpInput.disabled = totalPages <= 1;
  }
  if (pageJumpBtn) pageJumpBtn.disabled = totalPages <= 1;
}

function renderTable(items) {
  tableBody.innerHTML = '';
  if (!items || !items.length) {
    tableBody.innerHTML =
      '<tr class="products-empty"><td colspan="7">Nenhum produto encontrado. Tente buscar por outro nome.</td></tr>';
    return;
  }
  items.forEach((product) => {
    const row = document.createElement('tr');
    row.classList.add('products-row');
    const safeName = product.name || 'Sem nome';
    const status = (product.status || product.status_produto || 'ATIVO').toUpperCase();
    const statusClass = status === 'INATIVO' ? 'products-status is-inactive' : 'products-status';
    const priceValue = product.price ?? product.precoVenda ?? 0;
    const typeValue = (product.productType || product.product_type || '').toString().toLowerCase();
    const hasRecipe = Boolean(product.fichaTecnicaId || product.ficha_tecnica_id);
    const isProduced = typeValue === 'produced' ? true : typeValue === 'resale' ? false : hasRecipe;
    const typeClass = isProduced ? 'products-type is-produced' : 'products-type is-resale';
    const typeLabel = isProduced ? 'Produzido' : 'Revenda';
    const recipeName = Array.isArray(state.recipesCache) && state.recipesCache.length > 0
      ? (state.recipesCache.find((recipe) => recipe && recipe.id === (product.fichaTecnicaId || product.ficha_tecnica_id))?.name || '-')
      : '-';
    row.innerHTML = `
        <td>
          <button
            class="products-name-link"
            type="button"
            data-id="${product.id}"
            aria-label="Editar produto ${escapeHtml(safeName)}"
          >
            ${escapeHtml(safeName)}
          </button>
        </td>
        <td>${escapeHtml(product.description || '-')}</td>
        <td><span class="${typeClass}">${typeLabel}</span></td>
        <td>${escapeHtml(recipeName)}</td>
        <td class="has-text-right">R$ ${formatPrice(priceValue)}</td>
        <td><span class="${statusClass}">${escapeHtml(status)}</span></td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-edit-id="${product.id}">Editar</button>
        </td>
      `;
    tableBody.appendChild(row);
  });
}

export function renderPage() {
  const filtered = getFilteredItems();
  const total = filtered.length;
  if (productsTotal) {
    productsTotal.textContent = `(${total})`;
  }
  updatePagination(total);
  updateSortLabel();
  const start = (state.currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  renderTable(pageItems);
}

export async function loadProducts(token) {
  try {
    const data = await apiRequest('/api/products', token);
    state.productsCache = Array.isArray(data) ? data : (data && data.items && Array.isArray(data.items) ? data.items : []);
    state.currentPage = 1;
    renderPage();
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return;
    }
    // Em caso de erro, garante que productsCache seja um array vazio
    state.productsCache = [];
    if (err && (err.status === 401 || err.status === 403)) {
      // Erro de autenticação - redireciona para login
      window.location.href = '/';
      return;
    }
    // Para outros erros, renderiza página vazia
    state.currentPage = 1;
    renderPage();
    throw err; // Re-lança para tratamento pelo chamador
  }
}

export function goToPage(targetPage) {
  const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / PAGE_SIZE));
  const next = Math.min(Math.max(1, targetPage), totalPages);
  if (next !== state.currentPage) {
    state.currentPage = next;
    renderPage();
  }
}
