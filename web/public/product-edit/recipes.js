/**
 * Fichas técnicas: select, busca (Fuse) e carga.
 */
import { RECIPE_SEARCH_LIMIT } from './constants.js';
import { recipeSearch, recipeSearchHelp, recipeSelect } from './dom.js';
import { state } from './state.js';
import { apiRequest } from './core.js';

function updateRecipeSelect(list = state.recipesCache) {
  if (!recipeSelect) return;
  const currentValue = recipeSelect.value;
  recipeSelect.innerHTML = '<option value="">Selecione uma ficha t\u00e9cnica</option>';
  list.forEach((recipe) => {
    const option = document.createElement('option');
    option.value = recipe.id;
    option.textContent = recipe.name || recipe.nomeReceita || 'Ficha t\u00e9cnica';
    recipeSelect.appendChild(option);
  });
  if (currentValue) {
    const selectedExists = list.some((recipe) => recipe.id === currentValue);
    if (!selectedExists) {
      const selectedRecipe = state.recipesCache.find((recipe) => recipe.id === currentValue);
      if (selectedRecipe) {
        const option = document.createElement('option');
        option.value = selectedRecipe.id;
        option.textContent = `${selectedRecipe.name || selectedRecipe.nomeReceita || 'Ficha t\u00e9cnica'} (selecionada)`;
        recipeSelect.appendChild(option);
      }
    }
    recipeSelect.value = currentValue;
  }
}

function buildRecipeFuse() {
  if (typeof window.Fuse === 'undefined') {
    state.recipeFuse = null;
    return;
  }
  state.recipeFuse = new window.Fuse(state.recipesCache, {
    keys: ['name', 'nomeReceita'],
    threshold: 0.3,
  });
}

function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function applyRecipeSearch() {
  if (!recipeSearch) return;
  const query = normalizeSearch(recipeSearch.value);
  if (!query) {
    const total = state.recipesCache.length;
    const limited = state.recipesCache.slice(0, RECIPE_SEARCH_LIMIT);
    updateRecipeSelect(limited);
    if (recipeSearchHelp) {
      recipeSearchHelp.textContent = `Exibindo ${limited.length} de ${total} fichas técnicas.`;
    }
    return;
  }
  let results = [];
  if (state.recipeFuse) {
    results = state.recipeFuse.search(query).map((item) => item.item);
  } else {
    results = state.recipesCache.filter((recipe) => {
      const label = normalizeSearch(recipe.name || recipe.nomeReceita || '');
      return label.includes(query);
    });
  }
  const total = results.length;
  const limited = results.slice(0, RECIPE_SEARCH_LIMIT);
  updateRecipeSelect(limited);
  if (recipeSearchHelp) {
    recipeSearchHelp.textContent = total
      ? `Exibindo ${limited.length} de ${total} fichas encontradas.`
      : 'Nenhuma ficha técnica encontrada. Ajuste o termo.';
  }
}

export function getSelectedRecipe() {
  if (!recipeSelect) return null;
  const id = recipeSelect.value;
  return state.recipesCache.find((recipe) => recipe.id === id) || null;
}

export async function loadRecipes(token) {
  const data = await apiRequest('/api/recipes', token);
  state.recipesCache = Array.isArray(data) ? data : data.items || [];
  buildRecipeFuse();
  applyRecipeSearch();
}
