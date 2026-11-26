/**
 * Orquestração da carga do dashboard.
 */
import { periodSelect } from './dom.js';
import { state } from './state.js';
import {
  clearDashboardMessage,
  ensureAuthenticated,
  fetchJson,
  handleAuthFailure,
  normalizeError,
  showDashboardMessage,
} from './core.js';
import { buildPeriodQuery } from './period.js';
import {
  loadClients,
  loadFallbackMetrics,
  loadProducts,
  loadRevenueInsights,
  loadUpcomingOrders,
  renderUserName,
  showClientsError,
  showDashboardLoading,
  showMetricsUnavailable,
  showProductsError,
  showSecondaryUnavailable,
  updateMetrics,
} from './data.js';

// Marca o painel com falha: com ela, nada fica recolhido pelo guia de primeiros passos.
function setLoadError(hasError) {
  const dashboard = document.querySelector('.dashboard');
  if (dashboard) dashboard.toggleAttribute('data-load-error', hasError);
}

// Recarrega os dados sem recarregar a página.
function retryLoad() {
  document.querySelectorAll('[data-retry]').forEach((button) => { button.disabled = true; });
  const retry = document.getElementById('dashboard-retry');
  if (retry) retry.disabled = true;
  window.dispatchEvent(new CustomEvent('sgvc:dashboard-retry'));
  return carregarDashboard();
}

document.querySelectorAll('[data-retry]').forEach((button) => button.addEventListener('click', retryLoad));

// Só a carga mais recente escreve na tela: respostas de um período já trocado são descartadas.
let currentLoad = 0;

export async function carregarDashboard() {
  currentLoad += 1;
  const load = currentLoad;
  const isStale = () => load !== currentLoad;
  showDashboardLoading();

  let user;
  try {
    user = await ensureAuthenticated();
  } catch (err) {
    if (state.isNavigating || isStale()) return;
    const reason = normalizeError(err);
    showMetricsUnavailable();
    showSecondaryUnavailable();
    showClientsError();
    showProductsError();
    setLoadError(true);
    showDashboardMessage(`Não foi possível carregar o painel. ${reason}`, 'is-danger', retryLoad);
    return;
  }
  // Sessão expirada (401): ensureAuthenticated já redireciona para o login.
  if (!user || isStale()) return;
  renderUserName(user);
  const period = buildPeriodQuery(periodSelect ? periodSelect.value : null);
  let metricsError = null;
  let metrics = null;

  try {
    const data = await fetchJson('/api/analytics/overview', null, {
      start: period.start,
      end: period.end,
    });
    metrics = data || {};
  } catch (err) {
    if (handleAuthFailure(err)) return;

    metricsError = normalizeError(err);

    try {
      const fallback = await loadFallbackMetrics(null, period);
      if (fallback) {
        metrics = fallback;
        metricsError = null;
      }
    } catch (fallbackErr) {
      console.error('Fallback dashboard:', normalizeError(fallbackErr));
    }
  }

  if (isStale()) return;

  if (metrics) {
    updateMetrics(metrics);
  } else {
    showMetricsUnavailable();
    console.error('Dashboard error:', metricsError);
  }

  const [, , clients, products] = await Promise.all([
    loadUpcomingOrders(isStale),
    loadRevenueInsights(null, period, isStale),
    loadClients(isStale),
    loadProducts(isStale),
  ]);
  if (isStale()) return;

  const failed = [];
  if (!metrics) failed.push('os indicadores');
  if (clients && clients.error) failed.push('os clientes');
  if (products && products.error) failed.push('os produtos');
  setLoadError(failed.length > 0);
  if (!failed.length) {
    clearDashboardMessage();
    return;
  }
  const names = failed.length > 1 ? `${failed.slice(0, -1).join(', ')} e ${failed[failed.length - 1]}` : failed[0];
  const reason = metricsError || (clients && clients.error) || (products && products.error);
  showDashboardMessage(`Não foi possível carregar ${names}. ${reason}`, 'is-danger', retryLoad);
}
