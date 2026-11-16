/**
 * Validação e padronização do nome do produto.
 */
export function validateName(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  const nameRegex = /^[\p{L}0-9\s'\/-]+$/u;
  return nameRegex.test(trimmed);
}

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toTitleCase(value) {
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

function getNameGuidance(value) {
  const trimmed = normalizeSpaces(value);
  if (!trimmed) return 'Exemplo: Bolo de Chocolate 1kg.';
  if (trimmed.length < 3) return 'Use pelo menos 3 caracteres.';
  if (/^[0-9\s]+$/.test(trimmed)) return 'Inclua uma palavra para identificar o produto.';
  const allowed = /^[\p{L}0-9\s'\/-]+$/u;
  if (!allowed.test(trimmed)) return 'Use apenas letras, números, espaços, / ou -.';
  if (trimmed === trimmed.toUpperCase() || trimmed === trimmed.toLowerCase()) {
    return 'Dica: iniciais maiusculas deixam o nome mais profissional.';
  }
  return 'Nome válido. Prossiga com ficha técnica ou preços.';
}

export function updateNameGuidance(input, helpEl) {
  if (!input || !helpEl) return;
  helpEl.textContent = getNameGuidance(input.value);
}
