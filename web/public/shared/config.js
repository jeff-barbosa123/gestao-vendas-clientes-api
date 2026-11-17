/**
 * Configuracao compartilhada das telas (base da API).
 */
// Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
export const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;
