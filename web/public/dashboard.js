/**
 * Dashboard (entrada). MÃ³dulos em /dashboard/*.js.
 */
import { API_BASE, DEBUG, FALLBACK_METRICS } from './dashboard/constants.js';
import {
  alertClientsBtn,
  alertClientsCount,
  alertClientsHint,
  alertClientsMessage,
  alertProductsBtn,
  alertProductsCount,
  alertProductsHint,
  alertProductsMessage,
  alertRevenueBtn,
  alertRevenueCount,
  alertRevenueHint,
  alertRevenueMessage,
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

'use strict';

function renderCharts(data) {
  const chartSection = document.querySelector('[data-chart-section]');
  if (!chartSection || !window.Chart) {
    if (chartSection) chartSection.hidden = true;
    return;
  }

  // CORREÇÃO: Garante que data seja um objeto válido antes de acessar propriedades
  if (!data || typeof data !== 'object') {
    data = { salesCount: 0, revenueTotal: 0 };
  }

  const salesValue = Number(data.salesCount || 0);
  const revenueValue = Number(data.revenueTotal || 0);
  const hasSales = salesValue > 0;
  const hasRevenue = revenueValue > 0;

  chartSection.hidden = !(hasSales || hasRevenue);
  toggleEmpty('salesChart', !hasSales);
  toggleEmpty('revenueChart', !hasRevenue);

  if (!hasSales && !hasRevenue) return;

  // CORREÇÃO: Garante arrays válidos (não undefined) para Chart.js
  const chartLabels = ['Período'];
  const salesDataArray = [salesValue];
  const revenueDataArray = [revenueValue];

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 4, left: 8 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10,
        borderWidth: 0,
        displayColors: false,
        callbacks: {
          title: () => 'Período',
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false, beginAtZero: true },
    },
  };

  const salesCanvas = document.getElementById('sales-chart');
  if (salesCanvas) {
    try {
      if (!state.salesChart) {
        state.salesChart = new Chart(salesCanvas, {
          type: 'bar',
          data: {
            labels: chartLabels,
            datasets: [
              {
                data: salesDataArray,
                backgroundColor: '#4f46e5',
                borderColor: '#4338ca',
                borderWidth: 1,
                borderRadius: 14,
                barThickness: 36,
                maxBarThickness: 40,
              },
            ],
          },
          options: baseOptions,
        });
      } else {
        // CORREÇÃO: Verifica se datasets existe e é array antes de acessar
        if (state.salesChart.data && Array.isArray(state.salesChart.data.datasets) && state.salesChart.data.datasets[0]) {
          state.salesChart.data.labels = chartLabels;
          state.salesChart.data.datasets[0].data = salesDataArray;
          state.salesChart.update();
        }
      }
    } catch (err) {
      // CORREÇÃO: Suprime erros internos do Chart.js (index.js minificado)
      // Esses erros não afetam a funcionalidade e são causados por biblioteca externa
      console.warn('[DASHBOARD] Erro ao renderizar gráfico de vendas (suprimido):', err.message);
    }
  }

  const revenueCanvas = document.getElementById('revenue-chart');
  if (revenueCanvas) {
    try {
      if (!state.revenueChart) {
        state.revenueChart = new Chart(revenueCanvas, {
          type: 'bar',
          data: {
            labels: chartLabels,
            datasets: [
              {
                data: revenueDataArray,
                backgroundColor: '#16a34a',
                borderColor: '#15803d',
                borderWidth: 1,
                borderRadius: 14,
                barThickness: 36,
                maxBarThickness: 40,
              },
            ],
          },
          options: baseOptions,
        });
      } else {
        // CORREÇÃO: Verifica se datasets existe e é array antes de acessar
        if (state.revenueChart.data && Array.isArray(state.revenueChart.data.datasets) && state.revenueChart.data.datasets[0]) {
          state.revenueChart.data.labels = chartLabels;
          state.revenueChart.data.datasets[0].data = revenueDataArray;
          state.revenueChart.update();
        }
      }
    } catch (err) {
      // CORREÇÃO: Suprime erros internos do Chart.js (index.js minificado)
      // Esses erros não afetam a funcionalidade e são causados por biblioteca externa
      console.warn('[DASHBOARD] Erro ao renderizar gráfico de faturamento (suprimido):', err.message);
    }
  }
}

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

function buildPeriodQuery(value) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  let end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  if (value === 'quarter') {
    const quarter = Math.floor(now.getUTCMonth() / 3);
    const startMonth = quarter * 3;
    start.setUTCMonth(startMonth);
    start.setUTCDate(1);
    end = new Date(Date.UTC(now.getUTCFullYear(), startMonth + 3, 0));
  } else if (value === 'year') {
    start.setUTCMonth(0);
    start.setUTCDate(1);
    end = new Date(Date.UTC(now.getUTCFullYear(), 12, 0));
  }
  const fmt = (d) => d.toISOString().slice(0, 10);
  return {
    queryString: `?start=${fmt(start)}&end=${fmt(end)}`,
    start: fmt(start),
    end: fmt(end),
  };
}

function renderPricingAlerts(data) {
  const countEl = document.getElementById('alert-pricing-count');
  const msgEl = document.getElementById('alert-pricing-message');
  const listEl = document.getElementById('alert-pricing-list');
  if (!msgEl || !listEl) return;
  const alerts = Array.isArray(data.pricingAlerts) ? data.pricingAlerts : [];
  const threshold = Math.round(Number(data.lowMarginThreshold ?? 0.3) * 100);
  const below = alerts.filter((a) => a.level === 'below_cost').length;
  listEl.textContent = '';
  if (countEl) countEl.textContent = alerts.length ? String(alerts.length) : '';
  if (!alerts.length) {
    msgEl.textContent = `Todos os produtos com custo informado têm margem de pelo menos ${threshold}%.`;
    return;
  }
  msgEl.textContent = below
    ? `${below} produto(s) vendido(s) abaixo do custo e ${alerts.length - below} com margem abaixo de ${threshold}%.`
    : `${alerts.length} produto(s) com margem abaixo de ${threshold}%.`;
  alerts.slice(0, 4).forEach((a) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = a.name;
    const value = document.createElement('span');
    value.className = a.level === 'below_cost' ? 'is-below-cost' : 'is-low-margin';
    value.textContent = a.level === 'below_cost' ? 'abaixo do custo' : `${Math.round(a.margin * 100)}%`;
    value.title = a.message || '';
    li.append(name, value);
    listEl.appendChild(li);
  });
}

function formatStockQty(value, unit) {
  const n = Number(value || 0);
  const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if ((unit === 'g' || unit === 'ml') && Math.abs(n) >= 1000) return `${fmt(n / 1000)} ${unit === 'g' ? 'kg' : 'l'}`;
  return `${fmt(n)} ${unit || ''}`.trim();
}

function renderStockAlerts(data) {
  const countEl = document.getElementById('alert-stock-count');
  const msgEl = document.getElementById('alert-stock-message');
  const listEl = document.getElementById('alert-stock-list');
  if (!msgEl || !listEl) return;
  const alerts = Array.isArray(data.stockAlerts) ? data.stockAlerts : [];
  listEl.textContent = '';
  if (countEl) countEl.textContent = alerts.length ? String(alerts.length) : '';
  if (!alerts.length) {
    msgEl.textContent = 'Nenhum insumo abaixo do estoque mínimo. Defina o mínimo na tela de Insumos para receber o aviso.';
    return;
  }
  msgEl.textContent = `${alerts.length} insumo(s) no estoque mínimo ou abaixo.`;
  alerts.slice(0, 4).forEach((a) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = a.name;
    const value = document.createElement('span');
    value.className = 'is-below-cost';
    value.textContent = formatStockQty(a.stockQuantity, a.stockUnit);
    value.title = `Mínimo: ${formatStockQty(a.minStock, a.stockUnit)}`;
    li.append(name, value);
    listEl.appendChild(li);
  });
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

function formatIso(date) {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(from, to) {
  const a = formatIso(from);
  const b = formatIso(to);
  if (!a || !b) return null;
  const diff = Math.abs(b.getTime() - a.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function computePreviousPeriod(period) {
  const startDate = formatIso(period.start);
  const endDate = formatIso(period.end);
  if (!startDate || !endDate) return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - diffMs);
  return {
    start: previousStart.toISOString().slice(0, 10),
    end: previousEnd.toISOString().slice(0, 10),
  };
}

function setAlertContent(badgeEl, count, messageEl, message, hintEl, hint) {
  if (badgeEl) badgeEl.textContent = count ? `(${count})` : "";
  if (messageEl) messageEl.textContent = message || "";
  if (hintEl) hintEl.textContent = hint || "";
}

function updateClientAlert(customers) {
  const list = Array.isArray(customers) ? customers : [];
  const now = new Date();
  const inactiveCount = list.filter((customer) => {
    const last = customer.lastPurchase || customer.last_purchase || customer.last_purchase_at;
    const days = daysBetween(last, now);
    return days != null && days > 30;
  }).length;
  const total = list.length;
  const message = inactiveCount
    ? `${inactiveCount} cliente${inactiveCount > 1 ? "s" : ""} sem compra há mais de 30 dias`
    : total
    ? "Todos os clientes compraram recentemente"
    : "Sem dados de clientes ainda";
  const hint = inactiveCount
    ? "Que tal entrar em contato e oferecer uma promoção?"
    : total
    ? "Continue fidelizando sua base."
    : "Adicione clientes para começar.";
  setAlertContent(alertClientsCount, inactiveCount, alertClientsMessage, message, alertClientsHint, hint);
}

function updateProductAlert(products) {
  const list = Array.isArray(products) ? products : [];
  const pending = list.filter((item) => !item.ficha_tecnica_id).length;
  const message = pending
    ? `${pending} produto${pending > 1 ? "s" : ""} sem ficha técnica`
    : list.length
    ? "Todas as fichas técnicas estão vinculadas"
    : "Sem produtos cadastrados";
  const hint = pending
    ? "Sem ficha técnica não é possível calcular o lucro real"
    : "Aproveite para revisar os custos e margens.";
  setAlertContent(alertProductsCount, pending, alertProductsMessage, message, alertProductsHint, hint);
}

function updateRevenueAlert(current, previous) {
  if (!current) {
    setAlertContent(alertRevenueCount, 0, alertRevenueMessage, "Não foi possível carregar os dados financeiros", alertRevenueHint, "");
    return;
  }
  const revenue = current.revenue != null ? Number(current.revenue) : 0;
  const salesCount = Number(current.salesCount || 0);
  const message = `Faturamento ${money(revenue)}`;
  let hint = "Sem dados comparativos";
  if (previous && Number(previous.revenue) > 0) {
    const prevRevenue = Number(previous.revenue);
    const change = prevRevenue === 0 ? 0 : ((revenue - prevRevenue) / prevRevenue) * 100;
    const sign = change >= 0 ? "+" : "";
    hint = `Variação de ${sign}${change.toFixed(1).replace(".", ",")}% em relação ao período anterior`;
  }
  setAlertContent(alertRevenueCount, salesCount, alertRevenueMessage, message, alertRevenueHint, hint);
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
