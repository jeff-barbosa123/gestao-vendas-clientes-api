/**
 * Validação e padronização do nome do produto.
 */
import { normalizeSpaces, standardizeText } from '../shared/text.js';
export { standardizeText };
export function validateName(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  const nameRegex = /^[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff0-9\s'\/-]+$/;
  return nameRegex.test(trimmed);
}

function getNameGuidance(value) {
  const trimmed = normalizeSpaces(value);
  if (!trimmed) return 'Exemplo: Bolo de Chocolate 1kg.';
  if (trimmed.length < 3) return 'Use pelo menos 3 caracteres.';
  if (/^[0-9\s]+$/.test(trimmed)) return 'Inclua uma palavra para identificar o produto.';
  const allowed = /^[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff0-9\s'\/-]+$/;
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
