/**
 * Carga e exibição dos dados: clientes, produtos, receita, encomendas e métricas.
 */
import { els, emptyEls } from './dom.js';
import { fetchJson, handleAuthFailure, money, normalizeError, toggleEmpty } from './core.js';
import { computePreviousPeriod } from './period.js';
import { renderCharts } from './charts.js';
import {
  renderPricingAlerts,
  renderStockAlerts,
  renderProductStockAlerts,
  updateClientAlert,
  updateProductAlert,
  updateRevenueAlert,
} from './alerts.js';

const METRIC_KEYS = ['customers', 'sales', 'revenue', 'cmv', 'profit', 'products', 'recipes', 'linked', 'margin'];
const REVENUE_ERROR = 'Não foi possível carregar os dados financeiros';
const notStale = () => false;

// Frase abaixo do número de um indicador; texto vazio esconde a linha.
function setMetricNote(key, text) {
  if (text && emptyEls[key]) emptyEls[key].textContent = text;
  toggleEmpty(key, Boolean(text));
}

// Sem valor confirmado: todos os indicadores mostram "—" com o motivo.
function clearMetrics(note) {
  Object.values(els).forEach((el) => {
    if (!el) return;
    el.textContent = '—';
    el.classList.remove('is-negative');
  });
  METRIC_KEYS.forEach((key) => setMetricNote(key, note));
  renderCharts({ salesCount: 0, revenueTotal: 0 });
}

// A cada carga (inclusive troca de período) os valores anteriores saem da tela.
export function showDashboardLoading() {
  clearMetrics('Carregando...');
  setAlertCardError('alert-revenue', '');
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('alert-revenue-message', 'Carregando análise financeira...');
  set('alert-revenue-hint', '');
  set('alert-revenue-count', '');
}

// Encomendas em aberto nos próximos 7 dias (independe do período do painel)
export async function loadUpcomingOrders(isStale = notStale) {
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
    if (isStale()) return;
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
    if (isStale()) return;
    msgEl.textContent = 'Não foi possível carregar as encomendas.';
  }
}

// Falha nos indicadores: mostra "—" em vez de zeros e nenhum aviso tranquilizador.
export function showMetricsUnavailable() {
  clearMetrics('Não foi possível carregar.');
  const unavailable = { alertsUnavailable: true };
  renderPricingAlerts(unavailable);
  renderStockAlerts(unavailable);
  renderProductStockAlerts(unavailable);
}

// Quando nem a sessão pôde ser conferida, os demais cartões também não ficam em "Carregando...".
export function showSecondaryUnavailable() {
  showRevenueError();
  const orders = document.getElementById('alert-orders-message');
  if (orders) orders.textContent = 'Não foi possível carregar as encomendas.';
  const list = document.getElementById('alert-orders-list');
  if (list) list.textContent = '';
}

export function updateMetrics(data) {
  renderPricingAlerts(data);
  renderStockAlerts(data);
  renderProductStockAlerts(data);
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
  // Sem faturamento não há margem: a API devolve 0, que não é um resultado real.
  let marginNote = '';
  if (revenueValue <= 0) marginNote = 'Sem faturamento no período para calcular a margem.';
  else if (!Number.isFinite(marginValue)) marginNote = 'Não foi possível carregar.';
  if (els.margin) {
    els.margin.textContent = marginNote ? '—' : `${(marginValue * 100).toFixed(1).replace(".", ",")}%`;
  }

  const noRevenue = revenueValue <= 0 ? 'Sem faturamento no período.' : '';
  setMetricNote('customers', customersValue <= 0 ? 'Nenhum cliente cadastrado.' : '');
  setMetricNote('sales', salesValue <= 0 ? 'Nenhuma venda no período.' : '');
  setMetricNote('revenue', noRevenue);
  setMetricNote('cmv', noRevenue);
  setMetricNote('profit', noRevenue);
  setMetricNote('products', productsValue <= 0 ? 'Nenhum produto cadastrado.' : '');
  setMetricNote('recipes', recipesValue <= 0 ? 'Nenhuma ficha técnica cadastrada.' : '');
  setMetricNote('linked', linkedValue <= 0 ? 'Nenhum produto vinculado.' : '');
  setMetricNote('margin', marginNote);

  renderCharts({
    salesCount: salesValue,
    revenueTotal: revenueValue,
  });
}

// Estado de erro de um cartão: mensagem clara e "Tentar novamente", sem parecer base vazia.
function setAlertCardError(prefix, message) {
  const messageEl = document.getElementById(`${prefix}-message`);
  if (!messageEl) return;
  const card = messageEl.closest('.dashboard-alert-card');
  if (!card) return;
  const failed = Boolean(message);
  card.classList.toggle('is-load-error', failed);
  const retry = card.querySelector('[data-retry]');
  if (retry) {
    retry.hidden = !failed;
    retry.disabled = false;
  }
  const action = document.getElementById(`${prefix}-action`);
  if (action) action.classList.toggle('is-hidden', failed);
  if (!failed) return;
  messageEl.textContent = message;
  const hint = document.getElementById(`${prefix}-hint`);
  if (hint) hint.textContent = '';
  const count = document.getElementById(`${prefix}-count`);
  if (count) count.textContent = '';
}

export function showClientsError() {
  setAlertCardError('alert-clients', 'Não foi possível carregar os clientes.');
}

export function showProductsError() {
  setAlertCardError('alert-products', 'Não foi possível carregar os produtos.');
}

export function showRevenueError() {
  setAlertCardError('alert-revenue', REVENUE_ERROR);
}

// Sem permissão (403): o cartão some, sem tirar a pessoa do painel.
function hideAlertCard(prefix) {
  const card = document.getElementById(`${prefix}-message`)?.closest('.dashboard-alert-card');
  if (card) card.hidden = true;
}

async function loadAlertList(path, prefix, render, showError, isStale = notStale) {
  try {
    const data = await fetchJson(path, null);
    if (isStale()) return { list: [] };
    // Suporta formato paginado e não paginado
    const list = Array.isArray(data)
      ? data
      : (data.items && Array.isArray(data.items) ? data.items : []);
    setAlertCardError(prefix, '');
    render(list);
    return { list };
  } catch (err) {
    if (isStale()) return { list: [] };
    if (err && err.status === 403) {
      hideAlertCard(prefix);
      return { list: [] };
    }
    if (handleAuthFailure(err)) return { list: [] };
    const friendlyMessage = normalizeError(err);
    console.error(`${path}:`, friendlyMessage);
    showError();
    return { list: [], error: friendlyMessage };
  }
}

export function loadClients(isStale) {
  return loadAlertList('/api/customers', 'alert-clients', updateClientAlert, showClientsError, isStale);
}

export function loadProducts(isStale) {
  return loadAlertList('/api/products', 'alert-products', updateProductAlert, showProductsError, isStale);
}

export async function loadRevenueInsights(token, period, isStale = notStale) {
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
    if (isStale()) return;
    if (!current) {
      showRevenueError();
      return;
    }
    setAlertCardError('alert-revenue', '');
    updateRevenueAlert(current, previous, previousPeriod ? previousPeriod.unit : null);
  } catch (err) {
    if (isStale()) return;
    console.error("Revenue insight:", err);
    // Sem permissão (403), tentar de novo nao adianta: so a mensagem, sem o botao.
    if (err && err.status === 403) {
      const message = document.getElementById('alert-revenue-message');
      if (message) message.textContent = REVENUE_ERROR;
      return;
    }
    showRevenueError();
  }
}

export async function loadFallbackMetrics(token, period) {
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
      margin: financial && Number.isFinite(financial.margin) ? financial.margin : undefined,
      cmvTotal: financial && Number.isFinite(financial.cmv) ? financial.cmv : undefined,
      profitTotal: financial && Number.isFinite(financial.profit) ? financial.profit : undefined,
      // O caminho alternativo não traz avisos de preço e estoque: eles ficam como "não verificados".
      alertsUnavailable: true,
    };
  } catch (err) {
    console.error("Fallback metrics failed:", err);
    return null;
  }
}

// Mostra o nome (ou o e-mail) do usuário logado no cabeçalho, no lugar de "Usuário"
export function renderUserName(user) {
  const label = document.getElementById('dashboard-user');
  if (!label || !user) return;
  const name = (user.name || user.nome || user.email || '').trim();
  if (!name) return;
  label.textContent = name;
  label.title = user.email || name;
  const avatar = document.querySelector('.dashboard-avatar');
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
}
