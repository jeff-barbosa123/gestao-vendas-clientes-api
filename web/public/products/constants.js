/**
 * Constantes da tela de produtos.
 */


import { API_BASE } from '../shared/config.js';
export { API_BASE };
export const DELETE_FLAG = 'sgvc.productDeleted';

export const UPDATED_FLAG = 'sgvc.productUpdated';

export const RECIPE_SEARCH_LIMIT = 12;

export const PAGE_SIZE = 10;

// Auth via cookie HttpOnly (token não deve existir no browser storage)
const session = { token: null };
