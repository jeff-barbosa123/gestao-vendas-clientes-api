/**
 * Orquestração da carga do dashboard.
 */
import { FALLBACK_METRICS } from './constants.js';
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
  updateMetrics,
} from './data.js';

export async function carregarDashboard() {
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
