/**
 * Estado mutável compartilhado da tela de edição de produto.
 */
export const state = {
  original: {
    name: '',
    description: '',
    purchasePrice: '',
    price: '',
    status: '',
    recipeId: '',
    finalPrice: '',
    productType: 'produced',
  },
  messageTimer: null,
  recipesCache: [],
  linkedRecipe: null,
  resaleCalcSource: 'percent',
  recipeFuse: null,
  csrfEnsured: false,
};
