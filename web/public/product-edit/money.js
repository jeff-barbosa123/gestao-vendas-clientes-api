/**
 * Parsing, formatação e máscara de valores monetários.
 */

import { parseLocaleNumber, parsePrice, formatCurrency, bindCurrencyInput } from '../shared/money.js';
export { parsePrice, formatCurrency, bindCurrencyInput };
export function resolveNumber(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    const parsed = parseLocaleNumber(value);
    if (parsed != null) return parsed;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

