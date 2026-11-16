/**
 * Tela de fichas de custo (entrada). MÃ³dulos em /recipes/*.js.
 */
import { DELETE_FLAG } from './recipes/constants.js';
import {
  createMargin,
  createMarginSuggestions,
  createOverhead,
  createOverheadSuggestions,
  createProfitTypePercent,
} from './recipes/dom.js';
import { state } from './recipes/state.js';
import { ensureAuthOrRedirect, showMessage } from './recipes/core.js';
import {
  bindQuickSuggestions,
  initCatalog,
  initMasks,
  loadIngredientCatalog,
  loadIngredientSuggestions,
} from './recipes/catalog.js';
import {
  ensureDefaultComponent,
  renderComponentSelect,
  renderComponentsSummary,
  updateComponentSubtotal,
  updateComponentsTotal,
} from './recipes/components.js';
import {
  renderOverheadItems,
  updateCostSummary,
  updateProfitTypeUI,
  updateSubmitState,
} from './recipes/summary.js';
import {
  renderIngredients,
  setIngredientAdvancedOpen,
  updateIngredientUnitHints,
  updatePackUnitDisplay,
  updatePackUnitHints,
} from './recipes/ingredients.js';
import {
  clearLocalStorageSnapshot,
  exportLocalStorageToJson,
  initList,
  loadRecipes,
} from './recipes/list.js';
import { initEvents } from './recipes/events.js';

initCatalog();

ensureAuthOrRedirect().then((user) => {
  if (!user) return;
  loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));
  const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
  if (deletedFlag) {
    sessionStorage.removeItem(DELETE_FLAG);
    showMessage('Ficha t\u00e9cnica removida.', 'is-success');
  }
});

initList();

initEvents();

window.sgvcExportLocalStorage = exportLocalStorageToJson;

window.sgvcClearLocalStorage = clearLocalStorageSnapshot;

initMasks();

loadIngredientSuggestions().then(loadIngredientCatalog);

bindQuickSuggestions(createOverheadSuggestions, createOverhead, state.overheadMask);

bindQuickSuggestions(createMarginSuggestions, createMargin, state.marginMask, () => {
  if (createProfitTypePercent && !createProfitTypePercent.checked) {
    createProfitTypePercent.checked = true;
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

renderIngredients();

renderOverheadItems();

updateComponentsTotal();

updateCostSummary();

updateComponentSubtotal();

renderComponentsSummary();

updateSubmitState();
