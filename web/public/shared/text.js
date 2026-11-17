/**
 * Normalizacao e padronizacao de texto (telas de produto).
 */
export function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function toTitleCase(value) {
  const lower = normalizeSpaces(value).toLowerCase();
  const lowerWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'para', 'em', 'na', 'no', 'nas', 'nos', 'com']);
  return lower
    .split(' ')
    .map((word, index) => {
      if (!word) return '';
      if (index > 0 && lowerWords.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function standardizeText(value, type) {
  const normalized = normalizeSpaces(value);
  if (!normalized) return '';
  if (type === 'name') {
    if (normalized === normalized.toUpperCase() || normalized === normalized.toLowerCase()) {
      return toTitleCase(normalized);
    }
    return normalized;
  }
  if (type === 'description') {
    if (normalized === normalized.toLowerCase()) {
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
    return normalized;
  }
  return normalized;
}
