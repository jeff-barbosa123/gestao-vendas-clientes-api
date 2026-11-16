/**
 * Eventos do dashboard: período, navegação e logout.
 */
import { DEBUG } from './constants.js';
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
} from './dom.js';
import { state } from './state.js';
import { fetchJson } from './core.js';
import { carregarDashboard } from './load.js';

export function initEvents() {
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
}
