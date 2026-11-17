/**
 * Constantes da tela de edição de ficha (ingredientes padrão e apelidos de unidade).
 */


import { API_BASE } from '../shared/config.js';
export { API_BASE };
export const DELETE_FLAG = 'sgvc.recipeDeleted';

export const DEFAULT_COMPONENT_NAME = 'Ingredientes principais';

export const AUTO_SAVE_KEY = 'sgvc.recipe.edit.draft';

export const INGREDIENTS_URL = '/static/data/ingredients.json';

export const INGREDIENTS_FALLBACK = [
  'acucar',
  'farinha de trigo',
  'leite',
  'manteiga',
  'ovos',
  'chocolate',
  'fermento quimico',
  'sal',
  'oleo',
  'agua',
];

export const UNIT_ALIASES = {
  g: 'g',
  gr: 'g',
  grama: 'g',
  gramas: 'g',
  kg: 'kg',
  quilo: 'kg',
  quilos: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  ml: 'ml',
  mililitro: 'ml',
  mililitros: 'ml',
  l: 'l',
  litro: 'l',
  litros: 'l',
  un: 'un',
  unidade: 'un',
  unidades: 'un',
};

// Auth via cookie HttpOnly (token não deve existir no browser storage)
const session = { token: null };

// ===== Cadastro único de insumos =====
// Insumos cadastrados aparecem primeiro nas sugestões; ao escolher um, embalagem e preço são
// preenchidos e o item fica ligado ao cadastro (ingredientId): quando o preço mudar na tela
// Insumos, esta ficha é recalculada automaticamente.
export const catalogByName = new Map();

export const params = new URLSearchParams(window.location.search);
