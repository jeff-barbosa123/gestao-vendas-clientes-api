/**
 * Listagem de clientes: filtros, ordenação, paginação, renderização e carga.
 */
import {
  BIRTHDAY_WINDOW_KEY,
  BIRTHDAY_WINDOW_OPTIONS,
  DELETE_FLAG,
  LOYAL_TOTAL,
  PAGE_SIZE,
  UPDATED_FLAG,
} from './constants.js';
import {
  backBtn,
  birthdayInsight,
  birthdayWindowSelect,
  clientsTotal,
  filterButtons,
  nameHeader,
  nextPage,
  pageInfo,
  pageJumpBtn,
  pageJumpInput,
  pageList,
  pagination,
  prevPage,
  refreshBtn,
  searchInput,
  spentHeader,
  tableBody,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, handleAuthFailure, normalizeError, requireAuth, showMessage } from './core.js';
import {
  formatBirthday,
  formatDateBR,
  formatDocument,
  formatMoney,
  getBirthdayFlag,
  getCustomerAgeTag,
  getLoyaltyTag,
  normalizeQuery,
  parseNotesMeta,
} from './formatters.js';

function updateBirthdayInsight() {
  if (!birthdayInsight) return;
  const count = state.customersCache.filter((customer) => getBirthdayFlag(customer)).length;
  birthdayInsight.textContent =
    count > 0
      ? `Aniversariantes nos pr\u00f3ximos ${state.birthdayWindowDays} dias: ${count}`
      : `Sem aniversariantes nos pr\u00f3ximos ${state.birthdayWindowDays} dias`;
}

function matchesFilter(customer) {
  if (state.activeFilter === 'all') return true;
  if (state.activeFilter === 'birthdays') {
    return getBirthdayFlag(customer);
  }
  if (state.activeFilter === 'loyal') {
    const tag = getLoyaltyTag(customer);
    return tag === 'Fiel' || tag === 'Frequente';
  }
  if (state.activeFilter === 'new') {
    if (typeof customer.isNew === 'boolean') return customer.isNew;
    return getCustomerAgeTag(customer) === 'Novo';
  }
  if (state.activeFilter === 'old') {
    return getCustomerAgeTag(customer) === 'Antigo';
  }
  return true;
}

function compareByNameThenId(a, b) {
  const aName = String(a.name || '');
  const bName = String(b.name || '');
  const nameOrder = aName.localeCompare(bName, 'pt-BR', { sensitivity: 'base' });
  if (nameOrder !== 0) return nameOrder;
  return String(a.id || '').localeCompare(String(b.id || ''), 'en', { sensitivity: 'base' });
}

function updateSortLabel() {
  if (!nameHeader) return;
  if (state.sortField === 'name') {
    nameHeader.textContent = state.sortAsc ? 'Nome A-Z' : 'Nome Z-A';
    nameHeader.setAttribute('aria-sort', state.sortAsc ? 'ascending' : 'descending');
  } else {
    nameHeader.textContent = 'Nome';
    nameHeader.setAttribute('aria-sort', 'none');
  }
  if (spentHeader) {
    spentHeader.setAttribute('aria-sort', state.sortField === 'spent' ? (state.sortAsc ? 'ascending' : 'descending') : 'none');
  }
}

function getFilteredItems() {
  const query = normalizeQuery(searchInput ? searchInput.value : '');
  const validCache = Array.isArray(state.customersCache) ? state.customersCache : [];
  const baseList = validCache.slice().sort((a, b) => {
    if (state.sortField === 'spent') {
      const aSpent = Number(a.totalSpent || a.total_spent || 0);
      const bSpent = Number(b.totalSpent || b.total_spent || 0);
      const order = aSpent - bSpent;
      if (order === 0) {
        const tie = compareByNameThenId(a, b);
        return state.sortAsc ? tie : -tie;
      }
      return state.sortAsc ? order : -order;
    }
    const nameOrder = compareByNameThenId(a, b);
    return state.sortAsc ? nameOrder : -nameOrder;
  });
  const filteredByQuery = !query ? baseList : baseList.filter((customer) => {
    const name = normalizeQuery(customer.name);
    const email = normalizeQuery(customer.email);
    const phone = normalizeQuery(customer.phone);
    const cpf = normalizeQuery(customer.cpf || '');
    const cnpj = normalizeQuery(customer.cnpj || '');
    return (
      name.includes(query) ||
      email.includes(query) ||
      phone.includes(query) ||
      cpf.includes(query) ||
      cnpj.includes(query)
    );
  });
  return filteredByQuery.filter(matchesFilter);
}

function updatePagination(total) {
  if (!pagination) return;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  pagination.hidden = totalPages <= 1;
  if (pageInfo) {
    const start = total === 0 ? 0 : (state.currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(state.currentPage * PAGE_SIZE, total);
    pageInfo.textContent = `Mostrando ${start}-${end} de ${total} clientes`;
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
      first.addEventListener('click', () => {
        state.currentPage = 1;
        renderPage();
      });
      pageList.appendChild(first);
      if (start > 2) {
        const dots = document.createElement('span');
        dots.className = 'clients-page-ellipsis';
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
        dots.className = 'clients-page-ellipsis';
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
  if (pageJumpBtn) {
    pageJumpBtn.disabled = totalPages <= 1;
  }
}

function renderTable(items) {
  tableBody.innerHTML = '';
  if (!items || !items.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'empty-row';
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 8;
    emptyCell.textContent = 'Nenhum cliente encontrado. Tente buscar por outro nome ou e-mail.';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
    return;
  }
  items.forEach((customer) => {
    const row = document.createElement('tr');
    row.classList.add('clients-row');
    const safeName = String(customer.name || 'Sem nome');
    const notesCandidate = customer.notes || customer.note || '';
    const notesData = parseNotesMeta(notesCandidate);
    const notesText = notesData.text;
    const meta = notesData.metadata;
    const docValue = customer.cpf || customer.cnpj || '';
    const numericDoc = String(docValue || '').replace(/\D/g, '');
    let docTypeGuess = '';
    if (numericDoc.length === 11) {
      docTypeGuess = 'PF';
    } else if (numericDoc.length === 14) {
      docTypeGuess = 'PJ';
    }
    const docType = meta.type || docTypeGuess;
    const hasNotes = Boolean(notesText);
    const birthdayValue = customer.birth_date || customer.birthDate;
    const birthday = formatBirthday(birthdayValue);
    const birthdaySoon = getBirthdayFlag(customer);
    const since = formatDateBR(customer.created_at || customer.createdAt);
    const totalSpentValue = Number(customer.totalSpent || customer.total_spent || 0);
    const totalSpent = formatMoney(totalSpentValue);
    const isTopBuyer = totalSpentValue >= LOYAL_TOTAL;
    const loyaltyTag = getLoyaltyTag(customer);
    const ageTag = getCustomerAgeTag(customer);
    const tags = [loyaltyTag, ageTag].filter(Boolean);

    const tdName = document.createElement('td');
    const nameBtn = document.createElement('button');
    nameBtn.className = 'clients-name-link';
    nameBtn.type = 'button';
    nameBtn.dataset.id = String(customer.id ?? '');
    nameBtn.setAttribute('aria-label', `Editar cliente ${safeName}`);
    nameBtn.appendChild(document.createTextNode(safeName));
    if (isTopBuyer) {
      const star = document.createElement('span');
      star.className = 'top-buyer';
      star.setAttribute('aria-label', 'Cliente que compra mais');
      star.textContent = '⭐';
      nameBtn.appendChild(document.createTextNode(' '));
      nameBtn.appendChild(star);
    }
    if (hasNotes) {
      const notes = document.createElement('span');
      notes.className = 'notes-badge';
      notes.setAttribute('aria-label', 'Cliente com observações');
      notes.textContent = '📝';
      nameBtn.appendChild(document.createTextNode(' '));
      nameBtn.appendChild(notes);
    }
    tdName.appendChild(nameBtn);

    const tdEmail = document.createElement('td');
    tdEmail.textContent = String(customer.email || '-');

    const tdDoc = document.createElement('td');
    tdDoc.textContent = String(formatDocument(docValue, docType) || '-');

    const tdPhone = document.createElement('td');
    tdPhone.className = 'has-text-right';
    tdPhone.textContent = String(customer.phone || '-');

    const tdSpent = document.createElement('td');
    tdSpent.className = `has-text-right ${isTopBuyer ? 'top-buyer-total' : ''}`.trim();
    tdSpent.textContent = `R$ ${totalSpent}`;

    const tdBirthday = document.createElement('td');
    if (birthdaySoon) tdBirthday.classList.add('birthday-soon');
    tdBirthday.appendChild(document.createTextNode(String(birthday || '-')));
    if (birthdaySoon) {
      const badge = document.createElement('span');
      badge.className = 'birthday-badge';
      badge.setAttribute('aria-label', 'Aniversário próximo');
      badge.textContent = '🎁';
      tdBirthday.appendChild(document.createTextNode(' '));
      tdBirthday.appendChild(badge);
    }

    const tdSince = document.createElement('td');
    tdSince.textContent = String(since || '-');

    const tdTags = document.createElement('td');
    if (tags.length) {
      tags.forEach((tag) => {
        const span = document.createElement('span');
        span.className = 'client-tag';
        span.textContent = String(tag);
        tdTags.appendChild(span);
      });
    } else {
      const span = document.createElement('span');
      span.className = 'client-tag is-muted';
      span.textContent = 'Sem compras';
      tdTags.appendChild(span);
    }

    row.appendChild(tdName);
    row.appendChild(tdEmail);
    row.appendChild(tdDoc);
    row.appendChild(tdPhone);
    row.appendChild(tdSpent);
    row.appendChild(tdBirthday);
    row.appendChild(tdSince);
    row.appendChild(tdTags);
    tableBody.appendChild(row);
  });
}

export function renderPage() {
  const filtered = getFilteredItems();
  const total = filtered.length;
  if (clientsTotal) {
    clientsTotal.textContent = `(${total})`;
  }
  updateBirthdayInsight();
  updatePagination(total);
  updateSortLabel();
  const start = (state.currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  renderTable(pageItems);
}

export async function loadCustomers(token, showSkeleton = true) {
  // Mostra skeleton loading se solicitado
  if (showSkeleton && window.SGVCSkeleton && tableBody) {
    const skeleton = window.SGVCSkeleton.createTableSkeleton(5, 8);
    tableBody.innerHTML = '';
    tableBody.appendChild(skeleton.querySelector('tbody'));
  }
  
  try {
    // Tenta usar paginação se disponível, senão usa formato antigo
    // currentPage e PAGE_SIZE podem estar definidos globalmente no escopo
    const page = typeof state.currentPage !== 'undefined' ? state.currentPage : 1;
    const limit = typeof PAGE_SIZE !== 'undefined' ? PAGE_SIZE : 10;
    const url = `/api/customers?page=${page}&limit=${limit}`;
    
    const data = await apiRequest(url, token);
    
    // Suporta tanto formato paginado quanto formato antigo (backward compatibility)
    if (data && data.items && data.pagination) {
      // Dados paginados do servidor
      state.customersCache = data.items || [];
      const total = data.pagination.total || 0;
      if (clientsTotal) {
        clientsTotal.textContent = `(${total})`;
      }
      updateBirthdayInsight();
      // Atualiza paginação baseada no total do servidor
      // Atualiza currentPage se necessário
      if (typeof state.currentPage !== 'undefined') {
        const serverPage = data.pagination.page || 1;
        if (state.currentPage !== serverPage) {
          // Ajusta currentPage se necessário (por exemplo, se mudou no servidor)
          state.currentPage = serverPage;
        }
      }
      updatePagination(total);
      updateSortLabel();
      renderTable(state.customersCache);
    } else {
      // Formato antigo (array simples) - usa paginação client-side
      state.customersCache = Array.isArray(data) ? data : (data && data.items && Array.isArray(data.items) ? data.items : []);
      if (typeof state.currentPage !== 'undefined') {
        state.currentPage = 1;
      }
      renderPage();
    }
  } catch (err) {
    // Remove skeleton em caso de erro
    if (showSkeleton && window.SGVCSkeleton && tableBody) {
      window.SGVCSkeleton.removeSkeletons(tableBody);
    }
    
    if (handleAuthFailure(err)) throw err;
    const friendlyMessage = normalizeError(err);
    throw new Error(friendlyMessage);
  } finally {
    // Remove skeleton após carregamento
    if (showSkeleton && window.SGVCSkeleton && tableBody) {
      window.SGVCSkeleton.removeSkeletons(tableBody);
    }
  }
}

const flagCleanupTimers = {};

function scheduleFlagRemoval(flag, delayMs = 1200) {
  if (flagCleanupTimers[flag]) {
    clearTimeout(flagCleanupTimers[flag]);
  }
  flagCleanupTimers[flag] = setTimeout(() => {
    sessionStorage.removeItem(flag);
    delete flagCleanupTimers[flag];
  }, delayMs);
}

export function handlePostNavigationFlags() {
  const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
  if (deletedFlag) {
    showMessage('Cliente removido com sucesso.', 'is-success');
    scheduleFlagRemoval(DELETE_FLAG);
    // Recarrega a lista para atualizar os dados
    loadCustomers(null).catch((err) => {
      if (handleAuthFailure(err)) return;
      const friendlyMessage = normalizeError(err);
      console.error('Erro ao recarregar lista após remoção:', friendlyMessage);
    });
  }
  const updatedFlag = sessionStorage.getItem(UPDATED_FLAG);
  if (updatedFlag) {
    showMessage('Cliente atualizado com sucesso.', 'is-success');
    scheduleFlagRemoval(UPDATED_FLAG);
    // Recarrega a lista para atualizar os dados (incluindo CPF/CNPJ)
    loadCustomers(null).catch((err) => {
      if (handleAuthFailure(err)) return;
      const friendlyMessage = normalizeError(err);
      console.error('Erro ao recarregar lista após atualização:', friendlyMessage);
    });
  }
}

const storedWindow = Number(localStorage.getItem(BIRTHDAY_WINDOW_KEY));

function goToPage(targetPage) {
  const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / PAGE_SIZE));
  const next = Math.min(Math.max(1, targetPage), totalPages);
  if (next !== state.currentPage) {
    state.currentPage = next;
    renderPage();
  }
}

export function initList() {
  if (BIRTHDAY_WINDOW_OPTIONS.includes(storedWindow)) {
    state.birthdayWindowDays = storedWindow;
  }

  if (birthdayWindowSelect) {
    birthdayWindowSelect.value = String(state.birthdayWindowDays);
    birthdayWindowSelect.addEventListener('change', () => {
      const value = Number(birthdayWindowSelect.value);
      state.birthdayWindowDays = BIRTHDAY_WINDOW_OPTIONS.includes(value) ? value : 7;
      localStorage.setItem(BIRTHDAY_WINDOW_KEY, String(state.birthdayWindowDays));
      renderPage();
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showMessage('');
      refreshBtn.classList.add('is-loading');
      refreshBtn.disabled = true;
      requireAuth()
        .then((user) => {
          if (!user) return;
          return loadCustomers(null);
        })
        .catch((err) => {
          if (handleAuthFailure(err)) return;
          const friendlyMessage = normalizeError(err);
          showMessage(friendlyMessage, 'is-danger');
        })
        .finally(() => {
          refreshBtn.classList.remove('is-loading');
          refreshBtn.disabled = false;
        });
    });
  }

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    requireAuth()
      .then((user) => {
        if (!user) return;
        return loadCustomers(null).then(handlePostNavigationFlags);
      })
      .catch((err) => {
        if (handleAuthFailure(err)) return;
        const friendlyMessage = normalizeError(err);
        showMessage(friendlyMessage, 'is-danger');
      });
  });

  if (tableBody) {
    tableBody.addEventListener('click', (event) => {
      const btn = event.target.closest('.clients-name-link');
      if (!btn) return;
      const id = btn.dataset.id;
      window.location.href = `/client-edit.html?id=${encodeURIComponent(id)}`;
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.currentPage = 1;
      renderPage();
    });
  }

  if (filterButtons && filterButtons.length) {
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeFilter = btn.dataset.filter || 'all';
        filterButtons.forEach((item) => {
          const isActive = item === btn;
          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        state.currentPage = 1;
        renderPage();
      });
    });
  }

  if (nameHeader) {
    nameHeader.addEventListener('click', () => {
      state.sortField = 'name';
      state.sortAsc = !state.sortAsc;
      state.currentPage = 1;
      renderPage();
    });
  }

  if (spentHeader) {
    spentHeader.addEventListener('click', () => {
      if (state.sortField !== 'spent') {
        state.sortField = 'spent';
        state.sortAsc = false;
      } else {
        state.sortAsc = !state.sortAsc;
      }
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
}
