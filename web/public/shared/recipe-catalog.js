/**
 * Helpers do catalogo de ingredientes.
 */
import { catalogByName } from './recipe-constants.js';

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

export function findCatalogIngredient(name) {
  return catalogByName.get(String(name || '').trim().toLowerCase()) || null;
}
