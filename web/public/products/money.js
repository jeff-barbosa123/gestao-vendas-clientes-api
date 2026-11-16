/**
 * Parsing, formatação e máscara de valores monetários.
 */
function parseLocaleNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const compact = raw.replace(/\s/g, '');
  const sanitized = compact.replace(/[^0-9,.-]/g, '');
  if (!sanitized) return null;
  const hasComma = sanitized.includes(',');
  const hasDot = sanitized.includes('.');
  let normalized = sanitized;
  if (hasComma && hasDot) {
    if (sanitized.lastIndexOf(',') > sanitized.lastIndexOf('.')) {
      normalized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = sanitized.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = sanitized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = sanitized.replace(/,/g, '');
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function parsePrice(value) {
  const number = parseLocaleNumber(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

export function formatPrice(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrency(value) {
  return `R$ ${formatPrice(value)}`;
}

function sanitizeCurrencyInput(raw) {
  const value = String(raw ?? '');
  const cleaned = value.replace(/[^0-9,.-]/g, '');
  return cleaned;
}

export function bindCurrencyInput(input, onValueChange) {
  if (!input) return;
  input.addEventListener('input', () => {
    const sanitized = sanitizeCurrencyInput(input.value);
    if (sanitized !== input.value) {
      input.value = sanitized;
    }
    if (typeof onValueChange === 'function') onValueChange();
  });
  input.addEventListener('focus', () => {
    const parsed = parsePrice(input.value);
    if (parsed != null) {
      input.value = formatPrice(parsed);
    }
  });
  input.addEventListener('blur', () => {
    const parsed = parsePrice(input.value);
    if (parsed != null) {
      input.value = formatCurrency(parsed);
    }
    if (typeof onValueChange === 'function') onValueChange();
  });
}
