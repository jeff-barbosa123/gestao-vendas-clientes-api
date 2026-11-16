/**
 * Fichas técnicas: select, busca (Fuse) e carga.
 */
import { RECIPE_SEARCH_LIMIT } from './constants.js';
import { createRecipeId, createRecipeSearch, createRecipeSearchHelp } from './dom.js';
import { state } from './state.js';
import { apiRequest } from './core.js';
import { updateProducedPricing } from './pricing.js';
import { renderPage } from './list.js';

function updateRecipeSelect(list = state.recipesCache) {
  if (!createRecipeId) return;
  const selectedId = createRecipeId.value;
  createRecipeId.innerHTML = '<option value="">Selecione uma ficha t\u00e9cnica</option>';
  // Garante que list seja um array válido
  const validList = Array.isArray(list) ? list : [];
  validList.forEach((recipe) => {
    if (!recipe || !recipe.id) return;
    const option = document.createElement('option');
    option.value = recipe.id;
    option.textContent = recipe.name || recipe.nomeReceita || 'Ficha t\u00e9cnica';
    createRecipeId.appendChild(option);
  });
  if (selectedId) {
    const selectedExists = validList.some((recipe) => recipe && recipe.id === selectedId);
    if (!selectedExists && Array.isArray(state.recipesCache)) {
      const selectedRecipe = state.recipesCache.find((recipe) => recipe && recipe.id === selectedId);
      if (selectedRecipe) {
        const option = document.createElement('option');
        option.value = selectedRecipe.id;
        option.textContent = `${selectedRecipe.name || selectedRecipe.nomeReceita || 'Ficha t\u00e9cnica'} (selecionada)`;
        createRecipeId.appendChild(option);
      }
    }
    createRecipeId.value = selectedId;
  }
}

function buildRecipeFuse() {
  if (typeof window.Fuse === 'undefined') {
    state.recipeFuse = null;
    return;
  }
  // Garante que recipesCache seja um array válido
  const validCache = Array.isArray(state.recipesCache) ? state.recipesCache : [];
  state.recipeFuse = new window.Fuse(validCache, {
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
  if (!createRecipeSearch) return;
  // Garante que recipesCache seja um array válido
  const validCache = Array.isArray(state.recipesCache) ? state.recipesCache : [];
  const query = normalizeSearch(createRecipeSearch.value);
  if (!query) {
    const total = validCache.length;
    const limited = validCache.slice(0, RECIPE_SEARCH_LIMIT);
    updateRecipeSelect(limited);
    if (createRecipeSearchHelp) {
      createRecipeSearchHelp.textContent = `Exibindo ${limited.length} de ${total} fichas técnicas.`;
    }
    return;
  }
  let results = [];
  if (state.recipeFuse) {
    // Valida que recipeFuse.search() retorne um Array antes de chamar .map()
    const searchResults = state.recipeFuse.search(query);
    if (Array.isArray(searchResults)) {
      results = searchResults.map((item) => item.item);
    } else {
      // Fallback para filtro manual se recipeFuse.search() retornar valor inválido
      results = validCache.filter((recipe) => {
        if (!recipe) return false;
        const label = normalizeSearch(recipe.name || recipe.nomeReceita || '');
        return label.includes(query);
      });
    }
  } else {
    results = validCache.filter((recipe) => {
      if (!recipe) return false;
      const label = normalizeSearch(recipe.name || recipe.nomeReceita || '');
      return label.includes(query);
    });
  }
  const total = results.length;
  const limited = results.slice(0, RECIPE_SEARCH_LIMIT);
  updateRecipeSelect(limited);
  if (createRecipeSearchHelp) {
    createRecipeSearchHelp.textContent = total
      ? `Exibindo ${limited.length} de ${total} fichas encontradas.`
      : 'Nenhuma ficha técnica encontrada. Ajuste o termo.';
  }
}

export function getSelectedRecipe() {
  if (!createRecipeId) return null;
  const id = createRecipeId.value;
  // Garante que recipesCache seja um array válido
  if (!Array.isArray(state.recipesCache)) return null;
  return state.recipesCache.find((recipe) => recipe && recipe.id === id) || null;
}

export async function loadRecipes(token) {
  try {
    const data = await apiRequest('/api/recipes', token);
    state.recipesCache = Array.isArray(data) ? data : (data && data.items && Array.isArray(data.items) ? data.items : []);
    buildRecipeFuse();
    applyRecipeSearch();
    updateProducedPricing();
    renderPage();
  } catch (err) {
    // Em caso de erro (incluindo 401), garante que recipesCache seja um array vazio
    state.recipesCache = [];
    buildRecipeFuse();
    applyRecipeSearch();
    updateProducedPricing();
    // Se for erro de autenticação, não renderiza a página (será redirecionado)
    if (err && err.status !== 401 && err.status !== 403) {
      renderPage();
    }
    // Re-lança o erro para ser tratado pelo catch do chamador
    return Promise.reject(err);
  }
}
