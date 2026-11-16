/**
 * Constantes do dashboard (API, timeout e métricas de fallback).
 */
// Aguardar DOM estar pronto antes de executar

// Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
export const API_BASE =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:4000' : window.location.origin);

// Auth via cookie HttpOnly (não usar token no browser storage)
const REQUEST_TIMEOUT_MS =
  Number(window.APP_CONFIG && window.APP_CONFIG.REQUEST_TIMEOUT_MS) || 10000;

export const DEBUG = !!(window.APP_CONFIG && window.APP_CONFIG.DEBUG);

export const FALLBACK_METRICS = {
  customers: 0,
  salesCount: 0,
  revenueTotal: 0,
  products: 0,
  recipes: 0,
  linkedProducts: 0,
  margin: 0,
};
