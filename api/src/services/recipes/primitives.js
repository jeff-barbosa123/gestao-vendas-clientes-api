function hasSqlInjectionRisk(value) {
  if (typeof value !== "string") return false;
  const riskKeywords = /(select|insert|update|delete|drop|truncate|alter)\s+/i;
  return /(--|;)/.test(value) || riskKeywords.test(value);
}

function hasXssRisk(value) {
  if (typeof value !== "string") return false;
  return /<\s*script[\s>]/i.test(value);
}

function ensureSafeText(value, fieldName) {
  if (value == null) return;
  if (hasSqlInjectionRisk(value) || hasXssRisk(value)) {
    const err = new Error(`${fieldName || "Campo"} inválido`);
    err.status = 400;
    throw err;
  }
}

function ensureNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    const err = new Error(`${fieldName || "Valor"} inválido`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

function ensureNonNegative(value, fieldName) {
  const parsed = ensureNumber(value, fieldName);
  if (parsed < 0) {
    const err = new Error(`${fieldName || "Valor"} não pode ser negativo`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

function ensureGreaterThanZero(value, fieldName) {
  const parsed = ensureNumber(value, fieldName);
  if (parsed <= 0) {
    const err = new Error(`${fieldName || "Valor"} deve ser maior que zero`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

// Arredondamento financeiro "meio para cima" em centavos.
// toFixed/Math.round puros erram em casos como 0,575 (vira 0,57 por imprecisão do ponto flutuante).
function round2(value) {
  const n = Number(value) || 0;
  return Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  hasSqlInjectionRisk,
  hasXssRisk,
  ensureSafeText,
  ensureNumber,
  ensureNonNegative,
  ensureGreaterThanZero,
  round2,
};
