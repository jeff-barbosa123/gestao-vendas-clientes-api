/**
 * Constantes da tela de fichas de custo (ingredientes padrão e apelidos de unidade).
 */


import { API_BASE } from '../shared/config.js';
import { DEFAULT_COMPONENT_NAME, INGREDIENTS_URL, INGREDIENTS_FALLBACK, UNIT_ALIASES, catalogByName } from '../shared/recipe-constants.js';
export { DEFAULT_COMPONENT_NAME, INGREDIENTS_URL, INGREDIENTS_FALLBACK, UNIT_ALIASES, catalogByName };
export { API_BASE };
export const PAGE_SIZE = 10;

export const DELETE_FLAG = 'sgvc.recipeDeleted';









// Auth via cookie HttpOnly (token não deve existir no browser storage)
const session = { token: null };


