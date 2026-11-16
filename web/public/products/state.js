/**
 * Estado mutável compartilhado da tela de produtos.
 */
export const state = {
  currentPage: 1,
  productsCache: [],
  recipesCache: [],
  sortAsc: true,
  sortField: 'name',
  messageTimer: null,
  resaleCalcSource: 'percent',
  recipeFuse: null,
};
