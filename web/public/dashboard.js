/**
 * Dashboard (entrada). MÃ³dulos em /dashboard/*.js.
 */
import { API_BASE, DEBUG, FALLBACK_METRICS } from './dashboard/constants.js';
import {
  alertClientsBtn,
  alertProductsBtn,
  alertRevenueBtn,
  clientsBtn,
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
  normalizeError,
  showDashboardMessage,
} from './dashboard/core.js';
import { buildPeriodQuery } from './dashboard/period.js';
import {
  loadClients,
  loadFallbackMetrics,
  loadProducts,
  loadRevenueInsights,
  loadUpcomingOrders,
  renderUserName,
  updateMetrics,
} from './dashboard/data.js';

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
