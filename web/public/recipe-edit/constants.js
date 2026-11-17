/**
 * Constantes da tela de edição de ficha (ingredientes padrão e apelidos de unidade).
 */


import { API_BASE } from '../shared/config.js';
import { DEFAULT_COMPONENT_NAME, INGREDIENTS_URL, INGREDIENTS_FALLBACK, UNIT_ALIASES, catalogByName } from '../shared/recipe-constants.js';
export { DEFAULT_COMPONENT_NAME, INGREDIENTS_URL, INGREDIENTS_FALLBACK, UNIT_ALIASES, catalogByName };
export { API_BASE };
export const DELETE_FLAG = 'sgvc.recipeDeleted';



export const AUTO_SAVE_KEY = 'sgvc.recipe.edit.draft';







// Auth via cookie HttpOnly (token não deve existir no browser storage)
const session = { token: null };



export const params = new URLSearchParams(window.location.search);
