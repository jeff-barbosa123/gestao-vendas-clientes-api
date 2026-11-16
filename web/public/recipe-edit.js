/**
 * Tela de edição de ficha de custo (entrada). MÃ³dulos em /recipe-edit/*.js.
 */
import { DELETE_FLAG, params } from './recipe-edit/constants.js';
import {
  marginInput,
  marginSuggestions,
  overheadInput,
  overheadSuggestions,
  profitTypePercent,
} from './recipe-edit/dom.js';
import { state } from './recipe-edit/state.js';
import { apiRequest, ensureAuthOrRedirect, showMessage } from './recipe-edit/core.js';
import {
  bindQuickSuggestions,
  initCatalog,
  initMasks,
  loadIngredientCatalog,
  loadIngredientSuggestions,
} from './recipe-edit/catalog.js';
import {
  ensureDefaultComponent,
  renderComponentSelect,
  renderComponentsSummary,
  updateComponentSubtotal,
  updateComponentsTotal,
} from './recipe-edit/components.js';
import {
  enableSaveButton,
  renderOverheadItems,
  updateCostSummary,
  updateProfitTypeUI,
} from './recipe-edit/summary.js';
import {
  setIngredientAdvancedOpen,
  updateIngredientUnitHints,
  updatePackUnitDisplay,
  updatePackUnitHints,
} from './recipe-edit/ingredients.js';
import { applyRecipeData } from './recipe-edit/persist.js';
import { initEvents } from './recipe-edit/events.js';

initCatalog();

initEvents();

initMasks();

loadIngredientSuggestions().then(loadIngredientCatalog);

bindQuickSuggestions(overheadSuggestions, overheadInput, state.overheadMask);

bindQuickSuggestions(marginSuggestions, marginInput, state.marginMask, () => {
  if (profitTypePercent && !profitTypePercent.checked) {
    profitTypePercent.checked = true;
    updateProfitTypeUI();
  }
});

setIngredientAdvancedOpen(false);

updateProfitTypeUI();

updateIngredientUnitHints();

updatePackUnitDisplay();

updatePackUnitHints();

ensureDefaultComponent();

renderComponentSelect();

renderComponentsSummary();

updateComponentsTotal();

updateComponentSubtotal();

renderOverheadItems();

updateCostSummary();

// Inicialização (auth via cookie HttpOnly)
ensureAuthOrRedirect();

state.recipeId = params.get('id');

function bootstrap() {
  if (!state.recipeId) {
    window.location.href = '/recipes.html';
    return;
  }

  // Carregar receita da API - NÃO carregar rascunho primeiro para evitar sobrescrever dados
  apiRequest(`/api/recipes/${state.recipeId}`, null)
    .then((recipe) => {
      applyRecipeData(recipe);
      enableSaveButton(); // Garantir que o botão seja atualizado após carregar dados
      const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
      if (deletedFlag) {
        sessionStorage.removeItem(DELETE_FLAG);
        showMessage('Ficha técnica removida.', 'is-success');
      }
    })
    .catch((err) => {
      if (err.status === 404) {
        showMessage('Receita não encontrada.', 'is-danger');
        setTimeout(() => {
          window.location.href = '/recipes.html';
        }, 2000);
      } else {
        showMessage(err.message || 'Erro ao carregar receita.', 'is-danger');
      }
    });
}

bootstrap();
