/**
 * Estoque de insumos.
 *
 * - O estoque fica na unidade base do insumo (g, ml ou un).
 * - Só é controlado nos insumos com estoque informado (stock_quantity não nulo): quem não usa
 *   estoque não ganha números negativos a cada venda.
 * - Venda: para cada produto com ficha técnica, desconta (quantidade do item na ficha / rendimento)
 *   x quantidade vendida de cada insumo ligado.
 * - Cancelar ou editar a venda devolve o que ela tinha descontado.
 */
const repo = require("../db/repository");
const recipesService = require("./recipesService");

const UNIT_GROUP = { g: "g", kg: "g", ml: "ml", l: "ml", un: "un" };

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function parseNumber(value, label, { allowZero = true } = {}) {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) {
    throw badRequest(`${label} deve ser ${allowZero ? "zero ou maior" : "maior que zero"}`);
  }
  return n;
}

// Converte quantidade + unidade para a unidade base do insumo, checando se são do mesmo tipo
function toBase(quantity, unit, ingredient) {
  const u = String(unit || ingredient.packageUnit || "").trim().toLowerCase();
  if (!UNIT_GROUP[u]) throw badRequest("Unidade inválida. Use g, kg, ml, l ou un");
  if (UNIT_GROUP[u] !== ingredient.stockUnit) {
    throw badRequest(
      `O insumo "${ingredient.name}" é controlado em ${ingredient.stockUnit}. Informe a quantidade em ${
        ingredient.stockUnit === "g" ? "g ou kg" : ingredient.stockUnit === "ml" ? "ml ou l" : "un"
      }.`
    );
  }
  const base = recipesService.normalizeQuantity(quantity, u);
  return Number(Number(base).toFixed(3));
}

async function loadOwned(id, user) {
  const ingredient = await repo.getIngredientById(id);
  if (!ingredient) {
    const err = new Error("Insumo não encontrado");
    err.status = 404;
    throw err;
  }
  if (ingredient.ownerId && user && ingredient.ownerId !== user.id) {
    const err = new Error("Você não tem permissão para acessar este insumo");
    err.status = 403;
    throw err;
  }
  return ingredient;
}

/**
 * Entrada de compra: soma ao estoque. Com totalCost, o preço do insumo passa a ser o da compra
 * (quantidade + unidade + valor pago), o que recalcula as fichas e o CMV dos produtos.
 */
async function registerPurchase(id, payload = {}, user) {
  const ingredient = await loadOwned(id, user);
  const quantity = parseNumber(payload.quantity, "Quantidade comprada", { allowZero: false });
  const unit = payload.unit || ingredient.packageUnit;
  const baseQty = toBase(quantity, unit, ingredient);

  let unitCost = null;
  let priceUpdate = null;
  if (payload.totalCost != null && payload.totalCost !== "") {
    const totalCost = parseNumber(payload.totalCost, "Valor pago");
    unitCost = baseQty > 0 ? totalCost / baseQty : null;
    if (payload.updatePrice !== false && totalCost > 0) {
      // Reaproveita a regra do cadastro: grava histórico e recalcula fichas/produtos
      const ingredientsService = require("./ingredientsService");
      priceUpdate = await ingredientsService.update(
        id,
        { name: ingredient.name, packageQuantity: quantity, packageUnit: unit, packageCost: totalCost },
        user
      );
    }
  }

  const updated = await repo.moveIngredientStock(id, baseQty, {
    type: "PURCHASE",
    ownerId: user ? user.id : null,
    unitCost,
    note: payload.note ? String(payload.note).slice(0, 200) : null,
  });

  return {
    ...updated,
    recalculatedRecipes: priceUpdate ? priceUpdate.recalculatedRecipes : [],
    recalculationErrors: priceUpdate ? priceUpdate.recalculationErrors : [],
  };
}

/**
 * Ajuste por contagem: o estoque passa a ser exatamente o valor contado.
 * Também é como se liga o controle de estoque de um insumo pela primeira vez.
 */
async function adjustStock(id, payload = {}, user) {
  const ingredient = await loadOwned(id, user);
  const counted = parseNumber(payload.quantity, "Quantidade em estoque");
  const baseQty = toBase(counted, payload.unit || ingredient.packageUnit, ingredient);
  const current = ingredient.stockQuantity == null ? 0 : ingredient.stockQuantity;
  const delta = Number((baseQty - current).toFixed(3));
  const updated = await repo.moveIngredientStock(id, delta, {
    type: "ADJUST",
    ownerId: user ? user.id : null,
    note: payload.note ? String(payload.note).slice(0, 200) : null,
  });
  return updated;
}

async function setMinStock(id, payload = {}, user) {
  const ingredient = await loadOwned(id, user);
  if (payload.minStock == null || payload.minStock === "") {
    return repo.setIngredientMinStock(id, null);
  }
  const value = parseNumber(payload.minStock, "Estoque mínimo");
  const baseQty = toBase(value, payload.unit || ingredient.packageUnit, ingredient);
  return repo.setIngredientMinStock(id, baseQty);
}

async function disableStock(id, user) {
  await loadOwned(id, user);
  return repo.disableIngredientStock(id);
}

async function listMovements(id, user) {
  await loadOwned(id, user);
  return repo.listStockMovements(id);
}

// Quanto de cada insumo os itens vendidos consomem (unidade base)
async function computeConsumption(items, productMap) {
  const recipeQty = new Map(); // recipeId -> unidades vendidas
  const pending = []; // itens cujo produto não tem ficha_tecnica_id (pode estar ligado pela ficha)
  for (const item of items || []) {
    const productId = item.productId || item.product_id;
    const product = productMap && (productMap.get ? productMap.get(productId) : productMap[productId]);
    const recipeId = product && (product.ficha_tecnica_id || product.fichaTecnicaId);
    const qty = Number(item.quantity ?? item.quantidade ?? 0);
    if (!(qty > 0)) continue;
    if (recipeId) recipeQty.set(recipeId, (recipeQty.get(recipeId) || 0) + qty);
    else if (productId) pending.push({ productId, qty });
  }
  if (pending.length) {
    const linked = await repo.getRecipeIdsByLinkedProducts(pending.map((p) => p.productId));
    for (const { productId, qty } of pending) {
      const recipeId = linked.get(productId);
      if (recipeId) recipeQty.set(recipeId, (recipeQty.get(recipeId) || 0) + qty);
    }
  }
  if (!recipeQty.size) return new Map();

  const rows = await repo.getRecipeConsumptionRows([...recipeQty.keys()]);
  const consumption = new Map(); // ingredientId -> quantidade base
  for (const row of rows) {
    const sold = recipeQty.get(row.recipeId) || 0;
    const perUnit = recipesService.normalizeQuantity(row.quantity, row.unit) / (row.yieldQty || 1);
    const used = perUnit * sold;
    if (!(used > 0)) continue;
    consumption.set(row.ingredientId, (consumption.get(row.ingredientId) || 0) + used);
  }
  return consumption;
}

/** Desconta os insumos de uma venda. Retorna os insumos que ficaram no mínimo ou abaixo. */
async function applySale(saleId, items, productMap, user, client = null) {
  const consumption = await computeConsumption(items, productMap);
  const low = [];
  // Ordem fixa por id: vendas simultâneas travam as linhas na mesma ordem (evita deadlock)
  const ordered = [...consumption].sort(([a], [b]) => String(a).localeCompare(String(b)));
  for (const [ingredientId, used] of ordered) {
    const updated = await repo.moveIngredientStock(
      ingredientId,
      -Number(used.toFixed(3)),
      { type: "SALE", saleId, ownerId: user ? user.id : null },
      { onlyTracked: true, client }
    );
    if (updated && updated.lowStock) low.push({ id: updated.id, name: updated.name, stockQuantity: updated.stockQuantity, stockUnit: updated.stockUnit });
  }
  return low;
}

/** Devolve ao estoque tudo o que a venda ainda tem descontado (cancelamento ou edição). */
async function reverseSale(saleId, user, client = null) {
  const balances = (await repo.getSaleStockBalance(saleId, client)).sort((a, b) =>
    String(a.ingredientId).localeCompare(String(b.ingredientId))
  );
  for (const { ingredientId, net } of balances) {
    await repo.moveIngredientStock(
      ingredientId,
      -net,
      { type: "SALE_CANCEL", saleId, ownerId: user ? user.id : null },
      { onlyTracked: true, client }
    );
  }
  return balances.length;
}

async function lowStock(user) {
  return repo.listLowStockIngredients(user ? user.id : null);
}

module.exports = {
  registerPurchase,
  adjustStock,
  setMinStock,
  disableStock,
  listMovements,
  computeConsumption,
  applySale,
  reverseSale,
  lowStock,
};
