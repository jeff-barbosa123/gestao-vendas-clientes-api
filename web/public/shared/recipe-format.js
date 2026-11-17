/**
 * Formatacao e normalizacao de valores das fichas tecnicas.
 */
export function formatCatalogNumber(value, input) {
  const fixed = Number(value).toFixed(2).replace(/\.00$/, '');
  return input && input.type === 'number' ? fixed : fixed.replace('.', ',');
}

export function formatMoney(value) {
  return window.SGVC.utils.formatMoney(value);
}

export function formatQuantity(value) {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(2).replace('.', ',');
}

export function normalizeKgValue(value) {
  if (!Number.isFinite(value)) return value;
  if (value >= 100 && Number.isInteger(value)) {
    return value / 1000;
  }
  return value;
}
