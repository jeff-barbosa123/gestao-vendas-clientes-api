/**
 * Dashboard (entrada). MÃ³dulos em /dashboard/*.js.
 */
import { API_BASE } from './dashboard/constants.js';
import { isLocalhostHost } from './dashboard/core.js';
import { carregarDashboard } from './dashboard/load.js';
import { initEvents } from './dashboard/events.js';

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

initEvents();

// Carregar dashboard DEPOIS de adicionar event listeners
// Usar setTimeout para garantir que todos os event listeners estejam registrados primeiro
setTimeout(() => {
  carregarDashboard();
}, 0);
