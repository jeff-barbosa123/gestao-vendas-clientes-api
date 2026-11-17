/**
 * Números e unidades: parsing, normalização, formatação e custo de ingrediente.
 */
import { UNIT_ALIASES } from './constants.js';
import { overheadWarning } from './dom.js';
import {
  showIngredientWarning,
  updateIngredientUnitHints,
  updatePackQuantityWarning,
  updatePackUnitHints,
} from './ingredients.js';
import { formatCatalogNumber, formatMoney, formatQuantity, normalizeKgValue } from '../shared/recipe-format.js';
export { formatCatalogNumber, formatMoney, formatQuantity, normalizeKgValue };

export function normalizeOverheadPercent(value) {
  if (value == null) return 0;
  if (value > 15) {
    if (overheadWarning) {
      overheadWarning.textContent = 'Recomendado manter at\u00e9 15%.';
      overheadWarning.hidden = false;
    }
    return 15;
  }
  if (overheadWarning) {
    overheadWarning.textContent = '';
    overheadWarning.hidden = true;
  }
  return value;
}

export function convertMonetaryInput(value) {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  // Remove caracteres não numéricos exceto vírgula e ponto
  const cleaned = trimmed.replace(/[^\d,.]/g, '');
  // Se não tem vírgula nem ponto, assume que são centavos
  if (!cleaned.includes(',') && !cleaned.includes('.')) {
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) return value;
    // Sempre assume que são centavos quando não tem separador
    // Ex: 250 -> 2,50, 5 -> 0,05, 50 -> 0,50
    return (num / 100).toFixed(2).replace('.', ',');
  }
  // Se já tem vírgula ou ponto, verifica se precisa ajustar
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2) {
      // Já tem formato correto, apenas garante que centavos têm 2 dígitos
      const reais = parts[0] || '0';
      const cents = parts[1].slice(0, 2).padEnd(2, '0');
      return `${reais},${cents}`;
    }
  }
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2) {
      // Converte ponto para vírgula
      const reais = parts[0] || '0';
      const cents = parts[1].slice(0, 2).padEnd(2, '0');
      return `${reais},${cents}`;
    }
  }
  return value;
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

/**
 * Calcula o custo do ingrediente usando a fórmula:
 * custo_item = (quantidade_usada / quantidade_pacote) × preco_pacote
 * 
 * IMPORTANTE: A unidade do item deve ser a mesma unidade do pacote.
 * Não faz conversão automática - unidades devem ser compatíveis (g com g, ml com ml, etc).
 */
export function calculateIngredientCost(item) {
  if (!item) return 0;
  
  // Valores diretos sem normalização (já devem estar na mesma unidade)
  const quantity = Number(item.quantity) || 0;
  const packageQuantity = Number(item.packageQuantity) || 0;
  const cost = Number(item.cost) || 0;
  
  // Validações: não calcular se valores inválidos
  if (quantity <= 0 || packageQuantity <= 0 || cost < 0) {
    return 0;
  }
  
  // Fórmula: (quantidade_usada / quantidade_pacote) × preco_pacote
  const result = (quantity / packageQuantity) * cost;
  
  // Garantir que não retorna NaN ou Infinity
  if (!Number.isFinite(result) || result < 0) {
    return 0;
  }
  
  return result;
}

/**
 * Detecta e corrige valores muito pequenos para gramas
 * Ex: 0,001 g provavelmente significa 0,001 kg = 1 g
 */
export function detectAndFixSmallGrams(value, unit) {
  if (!Number.isFinite(value) || unit !== 'g') return { value, converted: false };
  
  // Se o valor for menor que 1 e maior que 0, provavelmente está em kg
  if (value > 0 && value < 1) {
    // Converte de kg para g: 0,001 kg = 1 g
    const convertedValue = value * 1000;
    return {
      value: convertedValue,
      converted: true,
      originalValue: value,
      message: `Detectei ${formatQuantity(value)} kg. Converti para ${formatQuantity(convertedValue)} g. Use valores inteiros para gramas (ex: 1, 10, 100).`
    };
  }
  
  // Se o valor for muito pequeno (menos de 0,1 g), avisa
  if (value > 0 && value < 0.1) {
    return {
      value,
      converted: false,
      warning: true,
      message: `Atenção: ${formatQuantity(value)} g é muito pouco. Se você quis dizer ${formatQuantity(value)} kg, troque a unidade para "kg" ou use ${formatQuantity(value * 1000)} g.`
    };
  }
  
  return { value, converted: false };
}

/**
 * Normaliza e converte a unidade do pacote para corresponder à unidade usada
 * Regra: unidade do item = unidade do pacote (g com g, kg com kg, ml com ml, l com l)
 */
export function normalizePackUnit(quantityUnit, packUnit, packValue) {
  if (!quantityUnit || !packUnit || !Number.isFinite(packValue)) {
    return { packValue, packUnit, converted: false };
  }

  const qtyUnit = String(quantityUnit).toLowerCase();
  const pUnit = String(packUnit).toLowerCase();

  // Se as unidades já são compatíveis, não precisa converter
  if (qtyUnit === pUnit) {
    return { packValue, packUnit, converted: false };
  }

  // Conversões possíveis: kg ↔ g, l ↔ ml
  // Caso 1: Quantidade em g, pacote em kg → converter kg para g
  if (qtyUnit === 'g' && pUnit === 'kg') {
    const convertedValue = packValue * 1000;
    return {
      packValue: convertedValue,
      packUnit: 'g',
      converted: true,
      message: `A unidade do pacote foi convertida de ${formatQuantity(packValue)} kg para ${formatQuantity(convertedValue)} g para corresponder à unidade usada (g).`
    };
  }

  // Caso 2: Quantidade em kg, pacote em g → converter g para kg
  if (qtyUnit === 'kg' && pUnit === 'g') {
    const convertedValue = packValue / 1000;
    return {
      packValue: convertedValue,
      packUnit: 'kg',
      converted: true,
      message: `A unidade do pacote foi convertida de ${formatQuantity(packValue)} g para ${formatQuantity(convertedValue)} kg para corresponder à unidade usada (kg).`
    };
  }

  // Caso 3: Quantidade em ml, pacote em l → converter l para ml
  if (qtyUnit === 'ml' && pUnit === 'l') {
    const convertedValue = packValue * 1000;
    return {
      packValue: convertedValue,
      packUnit: 'ml',
      converted: true,
      message: `A unidade do pacote foi convertida de ${formatQuantity(packValue)} l para ${formatQuantity(convertedValue)} ml para corresponder à unidade usada (ml).`
    };
  }

  // Caso 4: Quantidade em l, pacote em ml → converter ml para l
  if (qtyUnit === 'l' && pUnit === 'ml') {
    const convertedValue = packValue / 1000;
    return {
      packValue: convertedValue,
      packUnit: 'l',
      converted: true,
      message: `A unidade do pacote foi convertida de ${formatQuantity(packValue)} ml para ${formatQuantity(convertedValue)} l para corresponder à unidade usada (l).`
    };
  }

  // Unidades incompatíveis (ex: g com ml, un com g)
  return {
    packValue,
    packUnit,
    converted: false,
    error: true,
    message: `Unidades incompatíveis: quantidade em "${quantityUnit}" e pacote em "${packUnit}". Use a mesma unidade para ambos (ex: g com g, ml com ml, un com un).`
  };
}
