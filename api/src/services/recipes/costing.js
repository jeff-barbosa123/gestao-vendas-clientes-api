const { ensureNonNegative, ensureGreaterThanZero, round2 } = require("./primitives");
const { normalizeIngredients, normalizeOverhead } = require("./normalizers");

function computeLaborCost(payload) {
  if (payload.laborMinutes != null || payload.laborHourlyRate != null) {
    const minutes = ensureNonNegative(payload.laborMinutes ?? 0, "laborMinutes");
    const hourlyRate = ensureNonNegative(payload.laborHourlyRate ?? 0, "laborHourlyRate");
    return round2((hourlyRate / 60) * minutes);
  }
  return round2(ensureNonNegative(payload.labor ?? 0, "labor"));
}

function calculateFinancials(payload = {}) {
  const ingredients = normalizeIngredients(payload.ingredients);
  const ingredientCost = ingredients.reduce((sum, item) => sum + item.totalCost, 0);

  const { total: overheadCost, items: overheadItems } = normalizeOverhead(
    payload.overhead,
    payload.overheadItems
  );

  const laborCost = computeLaborCost(payload);
  const yieldQty = ensureGreaterThanZero(payload.yield ?? 1, "yield");

  const totalCost = round2(ingredientCost + overheadCost + laborCost);
  const costPerUnit = round2(totalCost / yieldQty);

  const marginRaw = ensureNonNegative(payload.margin ?? 0, "margin");
  let priceSuggested = costPerUnit;
  let marginLabel = "0%";

  if (marginRaw > 0) {
    if (marginRaw >= 1) {
      priceSuggested = round2(costPerUnit * marginRaw);
      marginLabel = `${((marginRaw - 1) * 100).toFixed(0)}%`;
    } else {
      priceSuggested = round2(costPerUnit * (1 + marginRaw));
      marginLabel = `${(marginRaw * 100).toFixed(0)}%`;
    }
  }

  const estimatedProfit = round2((priceSuggested - costPerUnit) * yieldQty);

  return {
    ingredients,
    overheadItems,
    ingredientCost: round2(ingredientCost),
    overheadCost: round2(overheadCost),
    laborCost,
    totalCost,
    costPerUnit,
    priceMinimum: costPerUnit,
    priceSuggested,
    yieldQty,
    marginLabel,
    estimatedProfit,
  };
}

// Margem efetiva da ficha. Fichas antigas (sem a coluna margin) têm a margem deduzida do preço sugerido.
function resolveMargin(payloadMargin, current) {
  if (payloadMargin != null && payloadMargin !== "") return payloadMargin;
  if (current && current.margin != null) return current.margin;
  const cost = Number(current && (current.cost_per_unit ?? current.costPerUnit));
  const suggested = Number(current && (current.price_suggested ?? current.priceSuggested));
  if (cost > 0 && suggested > cost) return Number((suggested / cost).toFixed(4));
  return 0;
}

module.exports = {
  computeLaborCost,
  calculateFinancials,
  resolveMargin,
};
