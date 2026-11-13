const { ensureSafeText, ensureNonNegative, ensureGreaterThanZero, round2 } = require("./primitives");
const { normalizeUnit, normalizeQuantity, assertCompatibleUnits, normalizePackUnitToMatch } = require("./units");

function normalizeRecipePayload(payload = {}) {
  const normalized = { ...payload };

  if (payload.nomeReceita && normalized.name == null) normalized.name = payload.nomeReceita;
  if (payload.descricao && normalized.description == null) normalized.description = payload.descricao;
  if (payload.rendimento != null && normalized.yield == null) normalized.yield = payload.rendimento;

  if (payload.ingredientes && normalized.ingredients == null) {
    normalized.ingredients = payload.ingredientes.map((item) => ({
      name: item.nomeIngrediente ?? item.nome ?? item.name,
      quantity: item.quantidade ?? item.quantity,
      cost: item.custoUnitario ?? item.cost ?? item.custo,
      packageQuantity: item.packageQuantity ?? item.quantidadeEmbalagem ?? 1,
      unit: item.unidade ?? item.unit ?? null,
      packUnit: item.packUnit ?? item.pack_unit ?? item.unidadePacote ?? null,
    }));
  }

  if (payload.gastosIndiretos && normalized.overheadItems == null) {
    normalized.overheadItems = payload.gastosIndiretos.map((item) => ({
      name: item.descricao ?? item.name,
      cost: item.valor ?? item.cost ?? 0,
    }));
  }

  return normalized;
}

function normalizeIngredients(list) {
  if (!Array.isArray(list) || list.length === 0) {
    const err = new Error("ingredients sao obrigatórios");
    err.status = 400;
    throw err;
  }

  return list.map((item, index) => {
    const name = String(item.name || "").trim();
    ensureSafeText(name, "Ingrediente");
    if (!name) {
      const err = new Error(`Ingrediente na posição ${index} está inválido`);
      err.status = 400;
      throw err;
    }

    const quantity = ensureGreaterThanZero(item.quantity ?? 1, "quantity");
    const packageQuantity = ensureGreaterThanZero(item.packageQuantity ?? 1, "packageQuantity");
    const packageCost = ensureNonNegative(item.cost ?? 0, "cost");
    const unit = normalizeUnit(item.unit ?? item.unidade);
    let packUnit = normalizeUnit(item.packUnit ?? item.pack_unit ?? item.unidadePacote) || unit;
    
    // Normalizar unidade do pacote para corresponder à unidade usada
    // Esta é a regra de ouro: unidade do item = unidade do pacote
    const normalizedPack = normalizePackUnitToMatch(unit, packUnit, packageQuantity);
    const finalPackQuantity = normalizedPack.packValue;
    const finalPackUnit = normalizedPack.packUnit;
    
    // Validar que as unidades são compatíveis (mesmo grupo: peso, volume, unidade)
    assertCompatibleUnits(unit, finalPackUnit);
    
    const component =
      item.component != null && String(item.component || "").trim()
        ? String(item.component || "").trim()
        : null;
    if (component) {
      ensureSafeText(component, "Componente");
    }

    // Agora ambas as quantidades já estão na mesma unidade, então normalizamos para a base
    const quantityBase = normalizeQuantity(quantity, unit);
    const packageBase = normalizeQuantity(finalPackQuantity, finalPackUnit);
    
    // Custo por unidade base (g, ml, un) com 4 casas e custo do item calculado sem arredondar no meio.
    // Antes o custo por grama era arredondado para centavos (ex.: R$ 0,0065/g virava R$ 0,01/g),
    // o que inflava em até ~50% o custo de ingredientes vendidos por peso/volume.
    const unitCost = packageBase > 0 ? Math.round((packageCost / packageBase) * 10000) / 10000 : 0;
    const totalCost = packageBase > 0 ? round2((packageCost * quantityBase) / packageBase) : 0;

    const ingredientId =
      typeof item.ingredientId === "string" && /^[0-9a-f-]{36}$/i.test(item.ingredientId)
        ? item.ingredientId
        : null;

    return {
      name,
      ingredientId,
      quantity,
      cost: round2(packageCost),
      packageQuantity: finalPackQuantity, // Usar o valor normalizado
      unit,
      packUnit: finalPackUnit, // Usar a unidade normalizada
      component,
      unitCost,
      totalCost,
    };
  });
}

function normalizeOverhead(overhead, overheadItems) {
  const numberValue = ensureNonNegative(overhead ?? 0, "overhead");
  const extras = Array.isArray(overheadItems)
    ? overheadItems
        .filter((item) => item && item.name)
        .map((item) => ({
          name: String(item.name).trim(),
          cost: round2(ensureNonNegative(item.cost ?? 0, "overhead cost")),
        }))
    : [];

  extras.forEach((item) => ensureSafeText(item.name, "Overhead"));
  const extrasTotal = extras.reduce((sum, item) => sum + item.cost, 0);

  return {
    items: extras,
    total: round2(numberValue + extrasTotal),
  };
}

module.exports = {
  normalizeRecipePayload,
  normalizeIngredients,
  normalizeOverhead,
};
