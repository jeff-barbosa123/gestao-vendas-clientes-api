/**
 * Constantes da tela de edição de produto.
 */


import { API_BASE } from '../shared/config.js';
export { API_BASE };
export const DELETE_FLAG = 'sgvc.productDeleted';

export const UPDATED_FLAG = 'sgvc.productUpdated';

export const RECIPE_SEARCH_LIMIT = 12;

// Auth via cookie HttpOnly (token não deve existir no browser storage)
const session = { token: null };

export const CSRF_COOKIE_NAME = 'sgvc_csrf';

const CSRF_HEADER_NAME = 'X-CSRF-Token';

const params = new URLSearchParams(window.location.search);

export const productId = params.get('id');
