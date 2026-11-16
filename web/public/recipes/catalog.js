/**
 * Máscaras, sugestões e catálogo de ingredientes.
 */
import { INGREDIENTS_FALLBACK, INGREDIENTS_URL, catalogByName } from './constants.js';
import {
  createMargin,
  createOverhead,
  createProfitFixed,
  ingredientCost,
  ingredientName,
  ingredientPack,
  ingredientPackUnit,
  ingredientSuggestions,
  overheadItemValue,
} from './dom.js';
import { state } from './state.js';
import { apiRequest } from './core.js';
import { formatCatalogNumber } from './calc.js';
import { updateCostSummary, updateSubmitState } from './summary.js';
import { setIngredientAdvancedOpen, showIngredientSuccess } from './ingredients.js';

export function initMasks() {
  if (window.Cleave) {
    if (createOverhead) {
      state.overheadMask = new window.Cleave(createOverhead, {
        numeral: true,
        numeralDecimalMark: ',',
        delimiter: '.',
        numeralDecimalScale: 2,
        numeralPositiveOnly: true,
      });
    }
    if (createMargin) {
      state.marginMask = new window.Cleave(createMargin, {
        numeral: true,
        numeralDecimalMark: ',',
        delimiter: '.',
        numeralDecimalScale: 2,
        numeralPositiveOnly: true,
      });
    }
  }
  if (window.AutoNumeric) {
    const moneyOptions = {
      decimalCharacter: ',',
      digitGroupSeparator: '.',
      decimalPlaces: 2,
      minimumValue: '0',
      modifyValueOnWheel: false,
    };
    if (createProfitFixed) {
      state.profitFixedMask = new window.AutoNumeric(createProfitFixed, moneyOptions);
    }
    if (overheadItemValue) {
      state.overheadItemMask = new window.AutoNumeric(overheadItemValue, moneyOptions);
    }
  }
}

export function setMaskedValue(input, value, mask) {
  if (!input) return;
  const safeValue = value == null ? '' : value;
  if (mask && typeof mask.clear === 'function' && safeValue === '') {
    mask.clear();
    return;
  }
  if (mask && typeof mask.set === 'function') {
    mask.set(safeValue);
  } else if (mask && typeof mask.setRawValue === 'function') {
    mask.setRawValue(String(safeValue));
  } else {
    input.value = String(safeValue);
  }
}

export async function loadIngredientSuggestions() {
  if (!ingredientSuggestions) return;
  let items = INGREDIENTS_FALLBACK.slice();
  try {
    const response = await fetch(INGREDIENTS_URL, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) items = data.slice();
    }
  } catch (_err) {
    items = INGREDIENTS_FALLBACK.slice();
  }
  const unique = Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)));
  ingredientSuggestions.textContent = '';
  unique.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = String(item);
    ingredientSuggestions.appendChild(opt);
  });
}

export function findCatalogIngredient(name) {
  return catalogByName.get(String(name || '').trim().toLowerCase()) || null;
}

export async function loadIngredientCatalog() {
  try {
    const list = await apiRequest('/api/ingredients', null, { method: 'GET' });
    (Array.isArray(list) ? list : []).forEach((item) => {
      catalogByName.set(String(item.name).trim().toLowerCase(), item);
    });
    if (ingredientSuggestions && catalogByName.size) {
      const fragment = document.createDocumentFragment();
      catalogByName.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.name;
        opt.label = `Insumo cadastrado: R$ ${Number(item.packageCost).toFixed(2).replace('.', ',')} por ${item.packageQuantity} ${item.packageUnit}`;
        fragment.appendChild(opt);
      });
      ingredientSuggestions.prepend(fragment);
    }
  } catch (_err) {
    // Sem cadastro de insumos disponível: a ficha continua funcionando com preço manual
  }
}

function applyCatalogToForm() {
  const match = findCatalogIngredient(ingredientName && ingredientName.value);
  if (!match) return;
  if (ingredientPack) ingredientPack.value = formatCatalogNumber(match.packageQuantity, ingredientPack);
  if (ingredientPackUnit) {
    ingredientPackUnit.value = match.packageUnit;
    ingredientPackUnit.dispatchEvent(new Event('change'));
  }
  if (ingredientCost) ingredientCost.value = formatCatalogNumber(match.packageCost, ingredientCost);
  if (typeof setIngredientAdvancedOpen === 'function') setIngredientAdvancedOpen(true);
  showIngredientSuccess(
    `Preço do cadastro de insumos: R$ ${Number(match.packageCost).toFixed(2).replace('.', ',')} por ${match.packageQuantity} ${match.packageUnit}. Esta ficha será recalculada quando o preço mudar.`
  );
}

export function bindQuickSuggestions(container, input, mask, beforeApply) {
  if (!container || !input) return;
  container.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-value]');
    if (!btn) return;
    const value = Number(btn.dataset.value);
    if (!Number.isFinite(value)) return;
    if (typeof beforeApply === 'function') {
      beforeApply();
    }
    setMaskedValue(input, value, mask);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateCostSummary();
    updateSubmitState();
  });
}

export function initCatalog() {
  if (ingredientName) {
    ingredientName.addEventListener('change', applyCatalogToForm);
  }
}
