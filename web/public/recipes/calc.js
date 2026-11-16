/**
 * Números e unidades: parsing, normalização, formatação e custo de ingrediente.
 */
import { UNIT_ALIASES } from './constants.js';
import {
  showIngredientWarning,
  updateIngredientUnitHints,
  updatePackQuantityWarning,
  updatePackUnitHints,
} from './ingredients.js';

export function formatCatalogNumber(value, input) {
  const fixed = Number(value).toFixed(2).replace(/\.00$/, '');
  return input && input.type === 'number' ? fixed : fixed.replace('.', ',');
}

export function parseLocaleNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value || '').trim();
  if (!raw) return null;
  const compact = raw.replace(/\s/g, '');
  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');
  let normalized = compact;
  let usedThousands = false;
  if (hasComma && hasDot) {
    if (compact.lastIndexOf(',') > compact.lastIndexOf('.')) {
      normalized = compact.replace(/\./g, '').replace(',', '.');
      usedThousands = true;
    } else {
      normalized = compact.replace(/,/g, '');
      usedThousands = true;
    }
  } else if (hasComma) {
    const parts = compact.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      normalized = compact.replace(/,/g, '');
      usedThousands = true;
    } else {
      normalized = compact.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasDot) {
    const parts = compact.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      normalized = compact.replace(/\./g, '');
      usedThousands = true;
    } else {
      normalized = compact.replace(/,/g, '');
    }
  } else {
    normalized = compact;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  if (usedThousands) {
    showIngredientWarning(`Interpretei ${compact} como ${formatQuantity(parsed)}.`, 'parse');
  }
  return parsed;
}

function parseUnitInput(raw) {
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return null;
  const match = text.match(/^([\d.,]+)\s*([a-z]+)$/i);
  if (!match) return null;
  const value = parseLocaleNumber(match[1]);
  if (!Number.isFinite(value)) return null;
  const unitKey = match[2].toLowerCase();
  const unit = UNIT_ALIASES[unitKey];
  if (!unit) return null;
  return { value, unit };
}

export function applyUnitNormalization(input, unitSelect, markTouched) {
  if (!input || !unitSelect) return false;
  const parsed = parseUnitInput(input.value);
  if (!parsed) return false;
  input.value = formatQuantity(parsed.value);
  unitSelect.value = parsed.unit;
  if (markTouched) markTouched();
  updateIngredientUnitHints();
  updatePackUnitHints();
  updatePackQuantityWarning();
  return true;
}

export function toNumber(value, min = 0) {
  const parsed = parseLocaleNumber(value);
  if (!Number.isFinite(parsed) || parsed < min) return null;
  return parsed;
}

export function formatMoney(value) {
  return window.SGVC.utils.formatMoney(value);
}

export function formatQuantity(value) {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(2).replace('.', ',');
}

export function normalizeQuantity(value, unit) {
  const numeric = parseLocaleNumber(value);
  if (!Number.isFinite(numeric)) return null;
  switch (String(unit || '').toLowerCase()) {
    case 'kg':
      return numeric * 1000;
    case 'g':
      return numeric;
    case 'l':
      return numeric * 1000;
    case 'ml':
      return numeric;
    case 'un':
      return numeric;
    default:
      return numeric;
  }
}

export function calculateIngredientCost(item) {
  const unit = item.unit || 'g';
  const packUnit = item.packUnit || item.unit || 'g';
  const quantity = normalizeQuantity(item.quantity, unit);
  const pack = normalizeQuantity(item.packageQuantity, packUnit);
  const cost = parseLocaleNumber(item.cost);
  if (!Number.isFinite(quantity) || !Number.isFinite(pack) || !Number.isFinite(cost) || pack <= 0) return 0;
  return (quantity / pack) * cost;
}

export function normalizeKgValue(value) {
  if (!Number.isFinite(value)) return value;
  if (value >= 100 && Number.isInteger(value)) {
    return value / 1000;
  }
  return value;
}
