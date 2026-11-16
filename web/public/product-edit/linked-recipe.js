/**
 * Ficha técnica vinculada ao produto: estado e carga.
 */
import { purchasePriceInput, recipeSelect } from './dom.js';
import { state } from './state.js';
import { apiRequest, showMessage } from './core.js';
import { updateProducedPricing } from './pricing.js';

export function setRecipeState(recipe) {
  state.linkedRecipe = recipe || null;
  if (recipeSelect) {
    recipeSelect.value = recipe && recipe.id ? recipe.id : '';
  }
  if (purchasePriceInput) {
    purchasePriceInput.disabled = Boolean(recipe);
  }
  updateProducedPricing();
}

export async function loadLinkedRecipe(token, productId) {
  if (!productId) return;
  try {
    const recipe = await apiRequest(`/api/products/${productId}/ficha-tecnica`, token);
    setRecipeState(recipe);
  } catch (err) {
    if (err.status === 404) {
      setRecipeState(null);
      return;
    }
    showMessage(err.message, 'is-danger');
  }
}
