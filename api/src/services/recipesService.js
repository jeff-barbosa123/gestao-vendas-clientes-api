const { v4: uuidv4 } = require("uuid");
const repo = require("../db/repository");
const { ensureSafeText, ensureNumber, ensureNonNegative, ensureGreaterThanZero, round2 } = require("./recipes/primitives");
const { UNIT_GROUPS, normalizeUnit, normalizeQuantity, assertCompatibleUnits, normalizePackUnitToMatch } = require("./recipes/units");
const { normalizeRecipePayload, normalizeIngredients, normalizeOverhead } = require("./recipes/normalizers");
const { calculateFinancials, resolveMargin } = require("./recipes/costing");
const { renderRecipeExport } = require("./recipes/exportRenderer");

function ensureOwnership(recipe, user) {
  if (recipe.owner_id && user && recipe.owner_id !== user.id) {
    const err = new Error("Acesso negado");
    err.status = 403;
    throw err;
  }
}

async function list(user) {
  const rows = await repo.listRecipes(user ? user.id : null, false);
  return rows.map((row) => ({
    ...row,
    ownerId: row.owner_id,
    linkProductId: row.link_product_id,
  }));
}

async function getById(id, user) {
  const recipe = await repo.getRecipeById(id);
  if (!recipe || recipe.status === "INACTIVE") {
    const err = new Error("Receita não encontrada");
    err.status = 404;
    throw err;
  }
  ensureOwnership(recipe, user);
  return {
    ...recipe,
    ownerId: recipe.owner_id,
    linkProductId: recipe.link_product_id,
  };
}

async function assertUniqueName(name, userId, currentId) {
  const rows = await repo.listRecipes(userId, true);
  const exists = rows.find(
    (r) => r.name.toLowerCase() === name.toLowerCase() && r.owner_id === userId && r.id !== currentId
  );
  if (exists) {
    const err = new Error("Receita já cadastrada");
    err.status = 409;
    throw err;
  }
}

function buildRecipePayload(payload, base = {}) {
  const normalized = normalizeRecipePayload(payload);
  const name = String(normalized.name || base.name || "").trim();
  ensureSafeText(name, "name");
  if (!name) {
    const err = new Error("Dados incompletos para criação da ficha técnica");
    err.status = 400;
    throw err;
  }

  const description = normalized.description || base.description || null;
  ensureSafeText(description, "description");
  const yieldValue = ensureGreaterThanZero(normalized.yield ?? base.yield ?? 1, "yield");
  const yieldType = normalized.yieldType || base.yieldType;
  if (!yieldType) {
    const err = new Error("yieldType e obrigatório");
    err.status = 400;
    throw err;
  }
  ensureSafeText(String(yieldType), "yieldType");

  const calculations = calculateFinancials({
    ...base,
    ...normalized,
    yield: yieldValue,
  });

  return {
    name,
    description,
    yield: calculations.yieldQty,
    yieldType,
    ingredients: calculations.ingredients,
    overheadItems: calculations.overheadItems,
    overhead: calculations.overheadCost,
    labor: calculations.laborCost,
    costIngredients: calculations.ingredientCost,
    totalCost: calculations.totalCost,
    costPerUnit: calculations.costPerUnit,
    priceMinimum: calculations.priceMinimum,
    priceSuggested: calculations.priceSuggested,
    marginLabel: calculations.marginLabel,
    estimatedProfit: calculations.estimatedProfit,
  };
}

async function syncProductCost(productId, mapped, recipeId) {
  if (!productId) return null;
  const product = await repo.getProductById(productId);
  if (!product) {
    const err = new Error("Produto vinculado não encontrado");
    err.status = 404;
    throw err;
  }

  const costPerUnit = mapped?.costPerUnit ?? mapped?.custo_por_unidade ?? null;
  const priceMinimum = mapped?.priceMinimum ?? mapped?.preco_minimo ?? costPerUnit ?? null;

  const payload = {
    ficha_tecnica_id: recipeId || product.ficha_tecnica_id,
    product_type: "PRODUCED",
    // purchase_price é o custo usado no CMV das vendas: precisa acompanhar a ficha
    // (antes só custo_por_unidade era atualizado e a venda saía com CMV desatualizado/zero)
    purchase_price: costPerUnit,
    custo_por_unidade: costPerUnit,
    preco_minimo: priceMinimum,
    preco_minimo_sugerido: mapped?.priceSuggested ?? mapped?.preco_minimo_sugerido ?? priceMinimum,
    data_vinculo: new Date().toISOString(),
  };

  if (product.price && costPerUnit != null) {
    const cmv_previsto = Number((costPerUnit / product.price).toFixed(2));
    payload.cmv_previsto = cmv_previsto;
    payload.cmv_futuro = cmv_previsto;
  }

  return repo.updateProduct(productId, payload);
}

/**
 * Itens ligados ao cadastro de insumos (ingredientId) usam sempre o preço e a embalagem do cadastro.
 */
async function applyCatalogPrices(ingredients, user) {
  if (!Array.isArray(ingredients)) return ingredients;
  const cache = new Map();
  const result = [];
  for (const item of ingredients) {
    const id = item && item.ingredientId;
    if (!id) {
      result.push(item);
      continue;
    }
    if (!cache.has(id)) cache.set(id, await repo.getIngredientById(id));
    const ingredient = cache.get(id);
    if (!ingredient) {
      const err = new Error("Insumo não encontrado no cadastro");
      err.status = 400;
      throw err;
    }
    if (ingredient.ownerId && user && ingredient.ownerId !== user.id) {
      const err = new Error("Você não tem permissão para usar este insumo");
      err.status = 403;
      throw err;
    }
    const itemUnit = item.unit ? String(item.unit).trim().toLowerCase() : null;
    const itemGroup = itemUnit ? UNIT_GROUPS[itemUnit] : null;
    const catalogGroup = UNIT_GROUPS[ingredient.packageUnit];
    if (itemGroup && catalogGroup && itemGroup !== catalogGroup) {
      const hints = { weight: "g ou kg", volume: "ml ou l", unit: "un" };
      const err = new Error(
        `O insumo "${ingredient.name}" está cadastrado em ${ingredient.packageUnit}. ` +
          `Informe a quantidade usada em ${hints[catalogGroup]} (hoje está em ${itemUnit}).`
      );
      err.status = 400;
      throw err;
    }
    result.push({
      ...item,
      name: item.name || ingredient.name,
      cost: ingredient.packageCost,
      packageQuantity: ingredient.packageQuantity,
      packUnit: ingredient.packageUnit,
    });
  }
  return result;
}

async function create(payload = {}, user) {
  if (!user || !user.id) {
    const err = new Error("Token inválido ou ausente");
    err.status = 401;
    throw err;
  }
  const withCatalog = { ...payload };
  if (payload.ingredients) withCatalog.ingredients = await applyCatalogPrices(payload.ingredients, user);
  const mapped = buildRecipePayload(withCatalog);
  await assertUniqueName(mapped.name, user.id);

  const recipe = {
    id: uuidv4(),
    ownerId: user.id,
    linkProductId: payload.linkProductId || null,
    margin: payload.margin != null && payload.margin !== "" ? Number(payload.margin) : null,
    overheadExtra: payload.overhead || 0,
    labor: mapped.labor,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...mapped,
  };

  await repo.createRecipe(recipe, mapped.ingredients, mapped.overheadItems);

  if (payload.linkProductId) {
    await syncProductCost(payload.linkProductId, mapped, recipe.id);
  }

  return recipe;
}

async function update(id, payload = {}, user) {
  const current = await repo.getRecipeById(id);
  if (!current) {
    const err = new Error("Receita não encontrada");
    err.status = 404;
    throw err;
  }

  ensureOwnership(current, user);
  const margin = resolveMargin(payload.margin, current);
  const withCatalog = { ...payload, margin };
  // Sem ingredients no payload, os itens atuais são recalculados (preços do cadastro de insumos)
  if (payload.ingredients) {
    withCatalog.ingredients = await applyCatalogPrices(payload.ingredients, user);
  } else if (!payload.ingredientes) {
    withCatalog.ingredients = await applyCatalogPrices(current.ingredients, user);
  }
  const mapped = buildRecipePayload(withCatalog, current);
  await assertUniqueName(mapped.name, current.owner_id, current.id);

  const updated = {
    ...current,
    ...mapped,
    margin: Number(margin) || 0,
    linkProductId: payload.linkProductId ?? current.link_product_id,
    status: payload.status || current.status || "ACTIVE",
    updatedAt: new Date().toISOString(),
  };

  await repo.updateRecipe(id, updated, mapped.ingredients, mapped.overheadItems);

  if (updated.linkProductId) {
    await syncProductCost(updated.linkProductId, mapped, updated.id);
  }

  return updated;
}

async function remove(id, user) {
  const current = await repo.getRecipeById(id);
  if (!current) {
    const err = new Error("Receita não encontrada");
    err.status = 404;
    throw err;
  }
  ensureOwnership(current, user);

  if (current.link_product_id) {
    await repo.updateProduct(current.link_product_id, {
      ficha_tecnica_id: null,
      custo_por_unidade: null,
      preco_minimo: null,
      cmv_previsto: null,
    });
  }

  const updated = await repo.softDeleteRecipe(id);
  return updated;
}

async function calculate(payload = {}) {
  const mapped = buildRecipePayload(payload);
  return {
    name: mapped.name,
    yield: mapped.yield,
    yieldType: mapped.yieldType,
    ingredients: mapped.ingredients,
    overhead: mapped.overhead,
    labor: mapped.labor,
    costIngredients: mapped.costIngredients,
    totalCost: mapped.totalCost,
    priceMinimum: mapped.priceMinimum,
    priceSuggested: mapped.priceSuggested,
    costPerUnit: mapped.costPerUnit,
    marginLabel: mapped.marginLabel,
    estimatedProfit: mapped.estimatedProfit,
  };
}

/**
 * Recalcula todas as fichas que usam o insumo (e os produtos vinculados a elas).
 * Chamado quando o preço ou a embalagem do insumo muda.
 */
async function recalculateByIngredient(ingredientId, user) {
  const recipeIds = await repo.listRecipeIdsByIngredient(ingredientId);
  const updated = [];
  const failed = [];
  // Uma ficha com problema não impede o recálculo das demais
  for (const recipeId of recipeIds) {
    try {
      const recipe = await update(recipeId, {}, user);
      updated.push({ id: recipe.id, name: recipe.name, costPerUnit: recipe.costPerUnit, priceSuggested: recipe.priceSuggested });
    } catch (err) {
      const current = await repo.getRecipeById(recipeId).catch(() => null);
      failed.push({ id: recipeId, name: current ? current.name : null, error: err.message });
    }
  }
  return { updated, failed };
}

async function exportRecipe(id, format = "csv", user) {
  const recipe = await getById(id, user);
  return renderRecipeExport(recipe, format);
}

module.exports = {
  normalizeUnit,
  normalizeQuantity,
  recalculateByIngredient,
  list,
  getById,
  create,
  update,
  remove,
  calculate,
  exportRecipe,
};
