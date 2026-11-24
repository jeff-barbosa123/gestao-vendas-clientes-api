/**
 * Listagem de fichas: paginação, tabela, exportação e carga.
 */
import { PAGE_SIZE } from './constants.js';
import {
  backBtn,
  nextPage,
  pageInfo,
  pageJumpBtn,
  pageJumpInput,
  pageList,
  pagination,
  prevPage,
  recipesTotal,
  refreshBtn,
  searchInput,
  tableBody,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, buildUrl, ensureAuthOrRedirect, showMessage } from './core.js';
import { formatMoney } from './calc.js';

function updatePagination(total) {
  if (!pagination) return;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  pagination.hidden = totalPages <= 1;
  if (pageInfo) {
    const start = total === 0 ? 0 : (state.currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(state.currentPage * PAGE_SIZE, total);
    pageInfo.textContent = `Mostrando ${start}-${end} de ${total} fichas`;
  }
  if (pageList) {
    pageList.innerHTML = '';
    const maxButtons = 5;
    let start = Math.max(1, state.currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let page = start; page <= end; page += 1) {
      const btn = document.createElement('button');
      btn.className = 'button is-light is-small';
      btn.textContent = String(page);
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

function formatStatusLabel(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'ACTIVE' || value === 'ATIVO' || value === 'ATIVA') return 'Ativa';
  if (value === 'INACTIVE' || value === 'INATIVO' || value === 'INATIVA') return 'Inativa';
  return value ? value : '-';
}

function getStatusKey(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'INACTIVE' || value === 'INATIVO' || value === 'INATIVA') return 'INACTIVE';
  return 'ACTIVE';
}

function buildExportFilename(name, format) {
  const safe = String(name || 'ficha-tecnica')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${safe || 'ficha-tecnica'}.${format}`;
}

async function downloadExport(recipeId, name, format) {
  const url = buildUrl(`/api/recipes/${recipeId}/export?format=${encodeURIComponent(format)}`);
  try {
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Erro ao exportar.');
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = buildExportFilename(name, format);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  } catch (err) {
    showMessage(err.message, 'is-danger');
  }
}

function renderTable(items) {
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (!items || !items.length) {
    tableBody.innerHTML = window.SGVC.emptyRow(7, {
      cls: 'empty-row',
      hasData: state.recipesCache.length > 0,
      none: 'Nenhuma ficha técnica cadastrada ainda.',
      hint: 'A ficha técnica calcula o custo e o preço ideal de cada receita.',
      filtered: 'Nenhuma ficha técnica encontrada para esta busca.',
      cta: { label: 'Cadastrar primeira ficha', focus: '#create-name' },
      clear: '#search-input',
    });
    return;
  }
  items.forEach((recipe) => {
    const row = document.createElement('tr');
    row.classList.add('recipes-row');
          const status = formatStatusLabel(recipe.status || 'ACTIVE');
    const statusKey = getStatusKey(recipe.status || 'ACTIVE');
    const unitCost = Number.isFinite(recipe.costPerUnit) ? recipe.costPerUnit : null;
    const suggestedUnit = Number.isFinite(recipe.priceSuggested) ? recipe.priceSuggested : null;
    const yieldValue = Number.isFinite(recipe.yield) ? recipe.yield : null;
    const totalPrice = suggestedUnit != null && yieldValue != null ? suggestedUnit * yieldValue : null;
    const tdName = document.createElement('td');
    const nameBtn = document.createElement('button');
    nameBtn.className = 'recipes-name-link';
    nameBtn.type = 'button';
    nameBtn.dataset.id = String(recipe.id ?? '');
    nameBtn.textContent = String(recipe.name || '-');
    tdName.appendChild(nameBtn);

    const tdYield = document.createElement('td');
    tdYield.className = 'has-text-right';
    tdYield.textContent = `${String(recipe.yield ?? '-')}${recipe.yieldType ? ` ${recipe.yieldType}` : ''}`;

    const tdUnitCost = document.createElement('td');
    tdUnitCost.className = 'has-text-right';
    tdUnitCost.textContent = `R$ ${unitCost != null ? formatMoney(unitCost) : '-'}`;

    const tdSuggested = document.createElement('td');
    tdSuggested.className = 'has-text-right';
    tdSuggested.textContent = `R$ ${suggestedUnit != null ? formatMoney(suggestedUnit) : '-'}`;

    const tdTotal = document.createElement('td');
    tdTotal.className = 'has-text-right';
    tdTotal.textContent = `R$ ${totalPrice != null ? formatMoney(totalPrice) : '-'}`;

    const tdStatus = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.className = `recipes-status${statusKey === 'INACTIVE' ? ' is-inactive' : ''}`;
    statusSpan.textContent = String(status || '');
    tdStatus.appendChild(statusSpan);

    const tdActions = document.createElement('td');
    tdActions.className = 'has-text-right';
    const btnEdit = document.createElement('button');
    btnEdit.className = 'button is-light is-small';
    btnEdit.type = 'button';
    btnEdit.dataset.editId = String(recipe.id ?? '');
    btnEdit.textContent = 'Editar';
    const btnCsv = document.createElement('button');
    btnCsv.className = 'button is-light is-small';
    btnCsv.type = 'button';
    btnCsv.dataset.exportId = String(recipe.id ?? '');
    btnCsv.dataset.format = 'csv';
    btnCsv.dataset.name = String(recipe.name || '');
    btnCsv.textContent = 'CSV';
    const btnPdf = document.createElement('button');
    btnPdf.className = 'button is-light is-small';
    btnPdf.type = 'button';
    btnPdf.dataset.exportId = String(recipe.id ?? '');
    btnPdf.dataset.format = 'pdf';
    btnPdf.dataset.name = String(recipe.name || '');
    btnPdf.textContent = 'PDF';
    tdActions.appendChild(btnEdit);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnCsv);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnPdf);

    row.appendChild(tdName);
    row.appendChild(tdYield);
    row.appendChild(tdUnitCost);
    row.appendChild(tdSuggested);
    row.appendChild(tdTotal);
    row.appendChild(tdStatus);
    row.appendChild(tdActions);
    tableBody.appendChild(row);
  });
}

function renderPage() {
  const query = String(searchInput ? searchInput.value : '').toLowerCase();
  const filtered = state.recipesCache.filter((recipe) => {
    const name = String(recipe.name || '').toLowerCase();
    return name.includes(query);
  });
  const total = filtered.length;
  if (recipesTotal) recipesTotal.textContent = `(${total})`;
  updatePagination(total);
  const start = (state.currentPage - 1) * PAGE_SIZE;
  renderTable(filtered.slice(start, start + PAGE_SIZE));
}

export async function loadRecipes(token) {
  const data = await apiRequest('/api/recipes', token);
  state.recipesCache = Array.isArray(data) ? data : data.items || [];
  state.currentPage = 1;
  renderPage();
}

export function exportLocalStorageToJson() {
  const snapshot = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    snapshot[key] = localStorage.getItem(key);
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    localStorage: snapshot,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = 'sgvc-localstorage.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export function clearLocalStorageSnapshot() {
  localStorage.clear();
}

export function initList() {
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
        loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));
      });
    });
  }

  if (tableBody) {
    tableBody.addEventListener('click', (event) => {
      const nameBtn = event.target.closest('button[data-id]');
      if (nameBtn) {
        const id = nameBtn.dataset.id;
        window.location.href = `/recipe-edit.html?id=${encodeURIComponent(id)}`;
        return;
      }
      const editBtn = event.target.closest('button[data-edit-id]');
      if (editBtn) {
        const id = editBtn.dataset.editId;
        window.location.href = `/recipe-edit.html?id=${encodeURIComponent(id)}`;
        return;
      }
      const exportBtn = event.target.closest('button[data-export-id]');
      if (exportBtn) {
        const id = exportBtn.dataset.exportId;
        const format = exportBtn.dataset.format || 'csv';
        const name = exportBtn.dataset.name || '';
        downloadExport(id, name, format);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
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
      const totalPages = Math.ceil(state.recipesCache.length / PAGE_SIZE);
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
        state.currentPage = Math.max(1, value);
        renderPage();
      }
    });
  }

  if (pageJumpInput) {
    pageJumpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = Number(pageJumpInput.value);
        if (Number.isFinite(value)) {
          state.currentPage = Math.max(1, value);
          renderPage();
        }
      }
    });
  }
}
