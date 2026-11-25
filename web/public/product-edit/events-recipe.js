/**
 * Eventos de vínculo e busca de ficha técnica.
 */
import { productId } from './constants.js';
import {
  linkRecipeBtn,
  productTypeProduced,
  productTypeResale,
  recipeError,
  recipeSearch,
  recipeSelect,
  unlinkRecipeBtn,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, showMessage } from './core.js';
import { setProductType } from './product-type.js';
import { applyRecipeSearch } from './recipes.js';
import { updateProducedPricing } from './pricing.js';
import { updateDirtyState } from './dirty.js';
import { loadLinkedRecipe, setRecipeState } from './linked-recipe.js';

export function initEventsRecipe() {
  if (linkRecipeBtn && recipeSelect) {
    linkRecipeBtn.addEventListener('click', async () => {
      if (recipeError) {
        recipeError.textContent = '';
        recipeError.hidden = true;
      }
      const fichaTecnicaId = recipeSelect.value;
      if (!fichaTecnicaId) {
        if (recipeError) {
          recipeError.textContent = 'Selecione uma ficha t\u00e9cnica.';
          recipeError.hidden = false;
        }
        return;
      }
      linkRecipeBtn.classList.add('is-loading');
      linkRecipeBtn.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}/vincular-ficha`, null, {
          method: 'POST',
          body: JSON.stringify({ fichaTecnicaId }),
        });
        showMessage('Ficha t\u00e9cnica vinculada com sucesso.', 'is-success');
        if (productTypeProduced) productTypeProduced.checked = true;
        if (productTypeResale) productTypeResale.checked = false;
        setProductType('produced');
        await loadLinkedRecipe(null, productId);
        state.original.recipeId = recipeSelect ? recipeSelect.value : '';
        updateDirtyState();
      } catch (err) {
        if (recipeError) {
          recipeError.textContent = err.message || 'Erro ao vincular ficha t\u00e9cnica.';
          recipeError.hidden = false;
        } else {
          showMessage(err.message, 'is-danger');
        }
      } finally {
        linkRecipeBtn.classList.remove('is-loading');
        linkRecipeBtn.disabled = false;
      }
    });
  }

  if (unlinkRecipeBtn) {
    unlinkRecipeBtn.addEventListener('click', async () => {
      const productLabel = state.original.name ? `"${state.original.name}"` : 'este produto';
      const recipeName = state.linkedRecipe && (state.linkedRecipe.name || state.linkedRecipe.nomeReceita);
      const recipeLabel = recipeName ? `a ficha "${recipeName}"` : 'a ficha técnica';
      if (!window.confirm(`Remover o vínculo de ${productLabel} com ${recipeLabel}? O produto passa a ser de revenda, e o custo por unidade, os preços mínimos e o CMV calculados pela ficha serão apagados. A ficha não será excluída.`)) return;
      if (recipeError) {
        recipeError.textContent = '';
        recipeError.hidden = true;
      }
      unlinkRecipeBtn.classList.add('is-loading');
      unlinkRecipeBtn.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}/remover-ficha`, null, {
          method: 'DELETE',
        });
        showMessage('Vínculo removido com sucesso.', 'is-success');
        setRecipeState(null);
        if (productTypeResale) productTypeResale.checked = true;
        if (productTypeProduced) productTypeProduced.checked = false;
        setProductType('resale');
        state.original.recipeId = '';
        updateDirtyState();
      } catch (err) {
        if (recipeError) {
          recipeError.textContent = err.message || 'Erro ao remover vínculo.';
          recipeError.hidden = false;
        } else {
          showMessage(err.message, 'is-danger');
        }
      } finally {
        unlinkRecipeBtn.classList.remove('is-loading');
        unlinkRecipeBtn.disabled = false;
      }
    });
  }

  if (recipeSearch) {
    recipeSearch.addEventListener('input', () => {
      applyRecipeSearch();
    });
  }

  if (recipeSelect) {
    recipeSelect.addEventListener('change', () => {
      if (recipeError) {
        recipeError.textContent = '';
        recipeError.hidden = true;
      }
      recipeSelect.classList.remove('is-danger');
      updateProducedPricing();
      updateDirtyState();
    });
  }
}
