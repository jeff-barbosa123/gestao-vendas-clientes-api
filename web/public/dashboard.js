/**
 * Dashboard (entrada). MÃ³dulos em /dashboard/*.js.
 */
import { API_BASE, DEBUG, FALLBACK_METRICS } from './dashboard/constants.js';
import {
  alertClientsBtn,
  alertProductsBtn,
  alertRevenueBtn,
  clientsBtn,
  els,
  linkedBtn,
  logoutBtn,
  marginBtn,
  periodSelect,
  productsBtn,
  profileBtn,
  quickClientBtn,
  quickProductBtn,
  quickSaleBtn,
  recipesBtn,
  reportsBtn,
  salesBtn,
} from './dashboard/dom.js';
import { state } from './dashboard/state.js';
import {
  clearDashboardMessage,
  ensureAuthenticated,
  fetchJson,
  handleAuthFailure,
  isLocalhostHost,
  money,
  normalizeError,
  showDashboardMessage,
  toggleEmpty,
} from './dashboard/core.js';
import { buildPeriodQuery, computePreviousPeriod } from './dashboard/period.js';
import { renderCharts } from './dashboard/charts.js';
import {
  renderPricingAlerts,
  renderStockAlerts,
  updateClientAlert,
  updateProductAlert,
  updateRevenueAlert,
} from './dashboard/alerts.js';

'use strict';

// Hardening: alerta (sem quebrar) quando rodando em contexto inseguro fora de localhost.
try {
  const apiUrl = new URL(API_BASE);
  if (apiUrl.protocol !== 'https:' && !isLocalhostHost(apiUrl.hostname)) {
    console.warn(
      '[DASHBOARD] API_BASE não usa HTTPS. Em produção, use HTTPS para evitar vazamento de token.'
    );
  }
} catch (_e) {
  // ignore
}

// Encomendas em aberto nos próximos 7 dias (independe do período do painel)
async function loadUpcomingOrders() {
  const msgEl = document.getElementById('alert-orders-message');
  const listEl = document.getElementById('alert-orders-list');
  const countEl = document.getElementById('alert-orders-count');
  if (!msgEl || !listEl) return;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 7 * 864e5);
  try {
    const orders = await fetchJson(
      '/api/orders',
      null,
      { from: from.toISOString(), to: to.toISOString(), status: 'PENDING,READY' },
      { method: 'GET' }
    );
    const list = Array.isArray(orders) ? orders : [];
    listEl.textContent = '';
    if (countEl) countEl.textContent = list.length ? String(list.length) : '';
    if (!list.length) {
      msgEl.textContent = 'Nenhuma encomenda para os próximos 7 dias.';
      return;
    }
    const total = list.reduce((s, o) => s + Number(o.total || 0), 0);
    msgEl.textContent = `${list.length} encomenda(s) nos próximos 7 dias · ${money(total)}.`;
    list.slice(0, 4).forEach((o) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = o.customerName || 'Cliente';
      const when = document.createElement('span');
      when.textContent = new Date(o.deliveryAt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      li.append(name, when);
      listEl.appendChild(li);
    });
  } catch (_err) {
    msgEl.textContent = 'Não foi possível carregar as encomendas.';
  }
}

function updateMetrics(data) {
  renderPricingAlerts(data);
  renderStockAlerts(data);
  const customersValue = Number(data.customers ?? 0);
  const salesValue = Number(data.salesCount ?? 0);
  const revenueValue = Number(data.revenueTotal ?? 0);
  const cmvValue = Number(data.cmvTotal ?? 0);
  const profitValue = Number(data.profitTotal ?? revenueValue - cmvValue);
  const productsValue = Number(data.products ?? 0);
  const recipesValue = Number(data.recipes ?? 0);
  const linkedValue = Number(data.linkedProducts ?? 0);
  const marginValue = data.margin;

  if (els.customers) els.customers.textContent = customersValue || 0;
  if (els.sales) els.sales.textContent = salesValue || 0;
  if (els.revenue) els.revenue.textContent = money(revenueValue);
  if (els.cmv) els.cmv.textContent = money(cmvValue);
  if (els.profit) {
    els.profit.textContent = money(profitValue);
    els.profit.classList.toggle('is-negative', profitValue < 0);
  }
  if (els.products) els.products.textContent = productsValue || 0;
  if (els.recipes) els.recipes.textContent = recipesValue || 0;
  if (els.linked) els.linked.textContent = linkedValue || 0;
  if (els.margin) {
    els.margin.textContent =
      marginValue != null ? `${(marginValue * 100).toFixed(1).replace(".", ",")}%` : '0%';
  }

  toggleEmpty('customers', customersValue <= 0);
  toggleEmpty('sales', salesValue <= 0);
  toggleEmpty('revenue', revenueValue <= 0);
  toggleEmpty('cmv', revenueValue <= 0);
  toggleEmpty('profit', revenueValue <= 0);
  toggleEmpty('products', productsValue <= 0);
  toggleEmpty('recipes', recipesValue <= 0);
  toggleEmpty('linked', linkedValue <= 0);
  toggleEmpty('margin', marginValue == null);

  renderCharts({
    salesCount: salesValue,
    revenueTotal: revenueValue,
  });
}

async function loadClients(token) {
  try {
    const data = await fetchJson("/api/customers", token);
    // Suporta formato paginado e não paginado
    const list = Array.isArray(data) 
      ? data 
      : (data.items && Array.isArray(data.items) ? data.items : []);
    updateClientAlert(list);
    return list;
  } catch (err) {
    if (handleAuthFailure(err)) return [];
    const friendlyMessage = normalizeError(err);
    console.error("Clients list:", friendlyMessage);
    updateClientAlert([]);
    return [];
  }
}

async function loadProducts(token) {
  try {
    const data = await fetchJson("/api/products", token);
    // Suporta formato paginado e não paginado
    const list = Array.isArray(data) 
      ? data 
      : (data.items && Array.isArray(data.items) ? data.items : []);
    updateProductAlert(list);
    return list;
  } catch (err) {
    if (handleAuthFailure(err)) return [];
    const friendlyMessage = normalizeError(err);
    console.error("Products list:", friendlyMessage);
    updateProductAlert([]);
    return [];
  }
}

async function loadRevenueInsights(token, period) {
  if (!period) return; // auth via cookie HttpOnly: não há token no navegador
  try {
    const current = await fetchJson("/api/reports/financial", token, {
      start: period.start,
      end: period.end,
      breakdown: "total",
    });
    const previousPeriod = computePreviousPeriod(period);
    let previous = null;
    if (previousPeriod) {
      try {
        previous = await fetchJson("/api/reports/financial", token, {
          start: previousPeriod.start,
          end: previousPeriod.end,
          breakdown: "total",
        });
      } catch (_err) {
        previous = null;
      }
    }
    updateRevenueAlert(current, previous);
  } catch (err) {
    console.error("Revenue insight:", err);
    updateRevenueAlert(null, null);
  }
}

async function loadFallbackMetrics(token, period) {
  if (!period) return null; // auth via cookie HttpOnly: não há token no navegador
  try {
    const [customers, products, recipes, financial] = await Promise.all([
      fetchJson("/api/customers", token),
      fetchJson("/api/products", token),
      fetchJson("/api/recipes", token),
      fetchJson("/api/reports/financial", token, {
        start: period.start,
        end: period.end,
        breakdown: "total",
      }),
    ]);
    const linked = (products || []).filter((p) => p.ficha_tecnica_id).length;
    const recipesCount = Array.isArray(recipes) ? recipes.length : 0;
    return {
      customers: Array.isArray(customers) ? customers.length : 0,
      products: Array.isArray(products) ? products.length : 0,
      recipes: recipesCount,
      linkedProducts: linked,
      revenueTotal: financial && Number.isFinite(financial.revenue) ? financial.revenue : 0,
      salesCount: financial && Number.isFinite(financial.salesCount) ? financial.salesCount : 0,
      margin: financial && Number.isFinite(financial.margin) ? financial.margin : 0,
    };
  } catch (err) {
    console.error("Fallback metrics failed:", err);
    return null;
  }
}

// Mostra o nome (ou o e-mail) do usuário logado no cabeçalho, no lugar de "Usuário"
function renderUserName(user) {
  const label = document.getElementById('dashboard-user');
  if (!label || !user) return;
  const name = (user.name || user.nome || user.email || '').trim();
  if (!name) return;
  label.textContent = name;
  label.title = user.email || name;
  const avatar = document.querySelector('.dashboard-avatar');
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
}

async function carregarDashboard() {
  const user = await ensureAuthenticated();
  if (!user) {
    // Não redirecionar se estiver navegando (clique em botão)
    if (state.isNavigating) return;
    showDashboardMessage('Sessão expirada. Faça login novamente.', 'is-danger');
    updateMetrics(FALLBACK_METRICS);
    return;
  }
  clearDashboardMessage();
  renderUserName(user);
  const period = buildPeriodQuery(periodSelect ? periodSelect.value : null);

  try {
    const data = await fetchJson('/api/analytics/overview', null, {
      start: period.start,
      end: period.end,
    });
    updateMetrics(data || {});
  } catch (err) {
    if (handleAuthFailure(err)) return;
    
    const friendlyMessage = normalizeError(err);
    
    try {
      const fallback = await loadFallbackMetrics(null, period);
      if (fallback) {
        clearDashboardMessage();
        updateMetrics(fallback);
        return;
      }
    } catch (fallbackErr) {
      const fallbackFriendly = normalizeError(fallbackErr);
      console.error('Fallback dashboard:', fallbackFriendly);
    }
    
    showDashboardMessage(friendlyMessage || 'Não foi possível carregar os indicadores. Tente novamente mais tarde.', 'is-danger');
    updateMetrics(FALLBACK_METRICS);
    console.error('Dashboard error:', friendlyMessage);
  } finally {
    await Promise.all([
      loadUpcomingOrders(),
      loadRevenueInsights(null, period),
      loadClients(null),
      loadProducts(null),
    ]);
  }
}

// Adicionar event listeners PRIMEIRO, antes de qualquer outra coisa
// Isso garante que os cliques sejam processados antes de qualquer redirecionamento
if (periodSelect) {
  periodSelect.addEventListener('change', () => carregarDashboard());
}

if (reportsBtn) reportsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/reports.html';
});

if (profileBtn) profileBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/profile.html';
});

if (clientsBtn) {
  clientsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.isNavigating = true;
    if (DEBUG) console.log('[DASHBOARD] Redirecionando para /clients.html');
    // Usar setTimeout para garantir que o redirecionamento aconteça após todos os handlers
    setTimeout(() => {
      window.location.href = '/clients.html';
    }, 0);
  });
  if (DEBUG) console.log('[DASHBOARD] Event listener adicionado ao botão clients-manage-action');
} else {
  console.warn('[DASHBOARD] Botão clients-manage-action não encontrado!');
}

if (salesBtn) salesBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/sales.html';
});

if (productsBtn) productsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/products.html';
});

if (recipesBtn) recipesBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/recipes.html';
});

if (linkedBtn) linkedBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/vinculos.html';
});

if (marginBtn) marginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/simulacao.html';
});

if (quickSaleBtn) quickSaleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/sales.html';
});

if (quickClientBtn) quickClientBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/clients.html';
});

if (quickProductBtn) quickProductBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/products.html';
});

if (alertClientsBtn) alertClientsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/clients.html';
});

if (alertRevenueBtn) alertRevenueBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/sales.html';
});

if (alertProductsBtn) alertProductsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.isNavigating = true;
  window.location.href = '/products.html';
});

// Carregar dashboard DEPOIS de adicionar event listeners
// Usar setTimeout para garantir que todos os event listeners estejam registrados primeiro
setTimeout(() => {
  carregarDashboard();
}, 0);

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetchJson('/api/auth/logout', null, {}, { method: 'POST', skipAuth: true });
    } catch (_err) {
      // ignore
    }
    window.location.href = '/';
  });
}
