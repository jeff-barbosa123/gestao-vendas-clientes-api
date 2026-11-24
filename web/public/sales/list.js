/**
 * Listagem de vendas: tabela, paginação, filtros e carga.
 */
import { PAGE_SIZE, SALES_FILTER_KEY, storedFilters } from './constants.js';
import {
  backBtn,
  filterClear,
  filterPeriod,
  filterStatus,
  filterTotalMax,
  filterTotalMin,
  nextPage,
  pageInfo,
  pageJumpBtn,
  pageJumpInput,
  pageList,
  pagination,
  prevPage,
  refreshBtn,
  salesTotal,
  searchInput,
  tableBody,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, ensureAuthOrRedirect, showMessage, showSummary } from './core.js';
import { escapeHtml, formatDateDisplay, formatPrice } from './formatters.js';
import { getSaleDate, isWithinPeriod, normalizeStatus, parseFilterMoney } from './parsers.js';
import { loadCustomers, loadProducts } from './catalog.js';

function updatePagination(total) {
  if (!pagination) return;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  pagination.hidden = totalPages <= 1;
  if (pageInfo) {
    const start = total === 0 ? 0 : (state.currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(state.currentPage * PAGE_SIZE, total);
    pageInfo.textContent = `Mostrando ${start}-${end} de ${total} vendas`;
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
        dots.className = 'sales-page-ellipsis';
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
        dots.className = 'sales-page-ellipsis';
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

function renderTable(itemsList) {
  tableBody.innerHTML = '';
  if (!itemsList || !itemsList.length) {
    tableBody.innerHTML = window.SGVC.emptyRow(6, {
      cls: 'sales-empty',
      hasData: state.salesCache.length > 0,
      none: 'Nenhuma venda registrada ainda.',
      hint: 'Registre a primeira venda no formulário acima ou pelo Caixa/PDV.',
      filtered: 'Nenhuma venda encontrada para esta busca ou filtro.',
      cta: { label: 'Registrar primeira venda', focus: '#create-customer' },
      clear: '#search-input',
      click: '#filter-clear',
    });
    return;
  }
  itemsList.forEach((sale) => {
    const row = document.createElement('tr');
    row.classList.add('sales-row');
    const statusData = normalizeStatus(sale.statusVenda || sale.status_venda || sale.status || 'ATIVA');
    const statusClass = statusData.key === 'CANCELADA' ? 'sales-status is-canceled' : 'sales-status';
    const total = sale.total || sale.valorTotal || 0;
    const canCancel = statusData.key !== 'CANCELADA';
    const customerName =
      sale.customerName ||
      sale.customer_name ||
      sale.clienteNome ||
      sale.cliente_nome ||
      '-';
    row.innerHTML = `
        <td>
          <button class="sales-customer-link" type="button" data-view-id="${sale.id}">
            ${escapeHtml(customerName)}
          </button>
        </td>
        <td>${escapeHtml(formatDateDisplay(sale.date || sale.dataVenda))}</td>
        <td class="has-text-right">R$ ${formatPrice(total)}</td>
        <td><span class="${statusClass}">${escapeHtml(statusData.label)}</span></td>
        <td class="has-text-right"><span class="sales-items">${(sale.items || sale.produtos || []).length}</span></td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-view-id="${sale.id}" title="Ver detalhes da venda">Detalhes</button>
          <button class="button is-light is-small" data-edit-id="${sale.id}" title="Alterar dados da venda">Editar</button>
          ${
            canCancel
              ? `<button class="button is-light is-small" data-cancel-id="${sale.id}" title="Cancelar venda">Cancelar</button>`
              : ''
          }
        </td>
      `;
    tableBody.appendChild(row);
  });
}

function renderPage() {
  const query = String(searchInput.value || '').toLowerCase();
  const statusFilter = filterStatus ? filterStatus.value : '';
  const periodFilter = filterPeriod ? filterPeriod.value : '';
  const minTotal = parseFilterMoney(filterTotalMin ? filterTotalMin.value : '');
  const maxTotal = parseFilterMoney(filterTotalMax ? filterTotalMax.value : '');
  const normalizedQuery = query.trim();
  state.filteredSales = state.salesCache.filter((sale) => {
    const name = String(
      sale.customerName || sale.customer_name || sale.clienteNome || sale.cliente_nome || ''
    ).toLowerCase();
    const statusData = normalizeStatus(sale.status || sale.statusVenda || sale.status_venda || '');
    const statusKey = statusData.key;
    const statusLabel = statusData.label.toLowerCase();
    const total = Number(sale.total || sale.valorTotal || 0);
    const date = getSaleDate(sale);

    if (normalizedQuery) {
      if (!name.includes(normalizedQuery) && !statusLabel.includes(normalizedQuery)) {
        return false;
      }
    }
    if (statusFilter && statusKey !== statusFilter) return false;
    if (!isWithinPeriod(date, periodFilter)) return false;
    if (minTotal != null && total < minTotal) return false;
    if (maxTotal != null && total > maxTotal) return false;
    return true;
  });
  const total = state.filteredSales.length;
  if (salesTotal) salesTotal.textContent = `(${total})`;
  updatePagination(total);
  const start = (state.currentPage - 1) * PAGE_SIZE;
  const pageItems = state.filteredSales.slice(start, start + PAGE_SIZE);
  renderTable(pageItems);
}

export async function loadSales(token) {
  const data = await apiRequest('/api/sales', token);
  state.salesCache = Array.isArray(data) ? data : data.items || [];
  state.currentPage = 1;
  renderPage();
}

export async function loadSummary(token) {
  try {
    const summary = await apiRequest('/api/sales/summary', token);
    if (summary && typeof summary.total === 'number') {
      showSummary(`Total de vendas ativas: R$ ${formatPrice(summary.total)}`);
    }
  } catch (_err) {
    showSummary('');
  }
}

function goToPage(targetPage) {
  const totalPages = Math.max(1, Math.ceil(state.filteredSales.length / PAGE_SIZE));
  const next = Math.min(Math.max(1, targetPage), totalPages);
  if (next !== state.currentPage) {
    state.currentPage = next;
    renderPage();
  }
}

export function initList() {
  if (storedFilters) {
    try {
      const parsed = JSON.parse(storedFilters);
      if (filterPeriod && parsed.period) {
        if (parsed.period === 'month') {
          filterPeriod.value = 'month';
        } else if (parsed.period === 'quarter') {
          filterPeriod.value = 'quarter';
        } else if (parsed.period === 'year') {
          filterPeriod.value = 'year';
        }
      }
    } catch (_err) {
      // ignore invalid filters
    }
    sessionStorage.removeItem(SALES_FILTER_KEY);
  }

  // Carregamento inicial é feito no gate de auth (ensureAuthOrRedirect)

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showMessage('');
      ensureAuthOrRedirect().then((user) => {
        if (!user) return;
        loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
        loadCustomers(null).catch((_err) => {});
        loadSales(null).catch((err) => showMessage(err.message, 'is-danger'));
        loadSummary(null);
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.currentPage = 1;
      renderPage();
    });
  }

  [filterStatus, filterPeriod, filterTotalMin, filterTotalMax].forEach((el) => {
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

  if (filterClear) {
    filterClear.addEventListener('click', () => {
      if (filterStatus) filterStatus.value = '';
      if (filterPeriod) filterPeriod.value = '';
      if (filterTotalMin) filterTotalMin.value = '';
      if (filterTotalMax) filterTotalMax.value = '';
      state.currentPage = 1;
      renderPage();
    });
  }

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
      const totalPages = Math.ceil(state.filteredSales.length / PAGE_SIZE);
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
}
