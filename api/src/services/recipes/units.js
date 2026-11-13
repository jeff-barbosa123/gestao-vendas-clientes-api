const { ensureNumber } = require("./primitives");

const ALLOWED_UNITS = new Set(["g", "kg", "ml", "l", "un"]);

const UNIT_GROUPS = {
  g: "weight",
  kg: "weight",
  ml: "volume",
  l: "volume",
  un: "unit",
};

function normalizeUnit(value) {
  if (value == null) return null;
  const unit = String(value).trim().toLowerCase();
  if (!unit) return null;
  if (!ALLOWED_UNITS.has(unit)) {
    const err = new Error("Unidade inválida");
    err.status = 400;
    throw err;
  }
  return unit;
}

function normalizeQuantity(value, unit) {
  const parsed = ensureNumber(value, "quantity");
  if (!Number.isFinite(parsed)) return parsed;
  switch (unit) {
    case "kg":
      return parsed * 1000;
    case "g":
      return parsed;
    case "l":
      return parsed * 1000;
    case "ml":
      return parsed;
    case "un":
      return parsed;
    default:
      return parsed;
  }
}

function assertCompatibleUnits(unit, packUnit) {
  if (!unit || !packUnit) return;
  const unitGroup = UNIT_GROUPS[unit];
  const packGroup = UNIT_GROUPS[packUnit];
  if (unitGroup && packGroup && unitGroup !== packGroup) {
    const err = new Error("Unidades incompatíveis para cálculo");
    err.status = 400;
    throw err;
  }
}

/**
 * Normaliza e converte a unidade do pacote para corresponder à unidade usada
 * Regra: unidade do item = unidade do pacote (g com g, kg com kg, ml com ml, l com l)
 */
function normalizePackUnitToMatch(quantityUnit, packUnit, packValue) {
  if (!quantityUnit || !packUnit || !Number.isFinite(packValue)) {
    return { packValue, packUnit };
  }

  const qtyUnit = String(quantityUnit).toLowerCase();
  const pUnit = String(packUnit).toLowerCase();

  // Se as unidades já são compatíveis, não precisa converter
  if (qtyUnit === pUnit) {
    return { packValue, packUnit };
  }

  // Conversões possíveis: kg ↔ g, l ↔ ml
  // Caso 1: Quantidade em g, pacote em kg → converter kg para g
  if (qtyUnit === 'g' && pUnit === 'kg') {
    return {
      packValue: packValue * 1000,
      packUnit: 'g',
    };
  }

  // Caso 2: Quantidade em kg, pacote em g → converter g para kg
  if (qtyUnit === 'kg' && pUnit === 'g') {
    return {
      packValue: packValue / 1000,
      packUnit: 'kg',
    };
  }

  // Caso 3: Quantidade em ml, pacote em l → converter l para ml
  if (qtyUnit === 'ml' && pUnit === 'l') {
    return {
      packValue: packValue * 1000,
      packUnit: 'ml',
    };
  }

  // Caso 4: Quantidade em l, pacote em ml → converter ml para l
  if (qtyUnit === 'l' && pUnit === 'ml') {
    return {
      packValue: packValue / 1000,
      packUnit: 'l',
    };
  }

  // Unidades incompatíveis (ex: g com ml, un com g) - retorna sem converter
  // O assertCompatibleUnits vai detectar e lançar erro
  return { packValue, packUnit };
}

module.exports = {
  ALLOWED_UNITS,
  UNIT_GROUPS,
  normalizeUnit,
  normalizeQuantity,
  assertCompatibleUnits,
  normalizePackUnitToMatch,
};
