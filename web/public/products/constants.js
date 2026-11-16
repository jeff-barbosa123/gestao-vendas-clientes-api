/**
 * Constantes da tela de produtos.
 */
// Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
export const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

export const DELETE_FLAG = 'sgvc.productDeleted';

export const UPDATED_FLAG = 'sgvc.productUpdated';

export const RECIPE_SEARCH_LIMIT = 12;

export const PAGE_SIZE = 10;

// Auth via cookie HttpOnly (token não deve existir no browser storage)
const session = { token: null };
