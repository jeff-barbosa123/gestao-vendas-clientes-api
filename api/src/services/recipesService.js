const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/db');

function ensurePositiveNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeIngredients(list) {
  if (!Array.isArray(list) || list.length === 0) {
    const err = new Error(' ingredients são obrigatórios');
    err.status = 400;
    throw err;
  }

  return list.map((item, index) => {
    const name = String(item.name || '').trim();
    if (!name) {
      const err = new Error(`Ingrediente na posição ${index} está inválido`);
      err.status = 400;
      throw err;
    }

    const quantity = ensurePositiveNumber(item.quantity, 1);
    if (quantity <= 0) {
      const err = new Error(`Quantidade inválida para ${name}`);
      err.status = 400;
      throw err;
    }

    const cost = ensurePositiveNumber(item.cost, 0);
    if (cost < 0) {
      const err = new Error(`Custo inválido para ${name}`);
      err.status = 400;
      throw err;
    }

    return {
      name,
      quantity,
      cost,
    };
  });
}

function normalizeOverhead(overhead, overheadItems) {
  const numberValue = ensurePositiveNumber(overhead, 0);
  const extras = Array.isArray(overheadItems)
    ? overheadItems
        .filter((item) => item && item.name)
        .map((item) => ({
          name: String(item.name).trim(),
          cost: ensurePositiveNumber(item.cost, 0),
        }))
    : [];

  const extrasTotal = extras.reduce((sum, item) => sum + item.cost, 0);

  return {
    items: extras,
    total: numberValue + extrasTotal,
  };
}

function calculateFinancials(payload = {}) {
  const ingredients = normalizeIngredients(payload.ingredients);
  const ingredientCost = ingredients.reduce(
    (sum, item) => sum + item.quantity * item.cost,
    0
  );

  const { total: overheadCost, items: overheadItems } = normalizeOverhead(
    payload.overhead,
    payload.overheadItems
  );

  const laborCost = ensurePositiveNumber(payload.labor, 0);
  const yieldQty = ensurePositiveNumber(payload.yield, 1) || 1;

  const totalCost = ingredientCost + overheadCost + laborCost;
  const costPerUnit = totalCost / yieldQty;

  const marginRaw = ensurePositiveNumber(payload.margin, 0);
  let priceSuggested = costPerUnit;
  let marginLabel = '0%';

  if (marginRaw > 0) {
    if (marginRaw >= 1) {
      priceSuggested = costPerUnit * marginRaw;
      marginLabel = `${((marginRaw - 1) * 100).toFixed(0)}%`;
    } else {
      priceSuggested = costPerUnit * (1 + marginRaw);
      marginLabel = `${(marginRaw * 100).toFixed(0)}%`;
    }
  }

  const estimatedProfit = (priceSuggested - costPerUnit) * yieldQty;

  return {
    ingredients,
    overheadItems,
    ingredientCost,
    overheadCost,
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

function list() {
  return db.recipes;
}

function getById(id) {
  const recipe = db.recipes.find((item) => item.id === id);
  if (!recipe) {
    const err = new Error('Receita não encontrada');
    err.status = 404;
    throw err;
  }
  return recipe;
}

function buildRecipePayload(payload, base = {}) {
  const name = String(payload.name || base.name || '').trim();
  if (!name) {
    const err = new Error('name é obrigatório');
    err.status = 400;
    throw err;
  }

  const description = payload.description || base.description || null;
  const yieldValue =
    ensurePositiveNumber(payload.yield, base.yield || 1) || 1;

  const calculations = calculateFinancials({
    ...base,
    ...payload,
    yield: yieldValue,
  });

  return {
    name,
    description,
    yield: calculations.yieldQty,
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

function syncProductCost(productId, unitCost) {
  if (!productId) return null;
  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    const err = new Error('Produto vinculado não encontrado');
    err.status = 404;
    throw err;
  }
  product.purchase_price = unitCost;
  return product;
}

function create(payload = {}) {
  const mapped = buildRecipePayload(payload);
  const recipe = {
    id: uuidv4(),
    linkProductId: payload.linkProductId || null,
    margin: payload.margin || null,
    overheadExtra: payload.overhead || 0,
    labor: mapped.labor,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...mapped,
  };

  db.recipes.push(recipe);

  if (payload.linkProductId) {
    syncProductCost(payload.linkProductId, mapped.costPerUnit);
  }

  return recipe;
}

function update(id, payload = {}) {
  const index = db.recipes.findIndex((item) => item.id === id);
  if (index === -1) {
    const err = new Error('Receita não encontrada');
    err.status = 404;
    throw err;
  }

  const current = db.recipes[index];
  const mapped = buildRecipePayload(payload, current);

  const updated = {
    ...current,
    ...mapped,
    linkProductId: payload.linkProductId ?? current.linkProductId,
    updatedAt: new Date().toISOString(),
  };

  db.recipes[index] = updated;

  if (updated.linkProductId) {
    syncProductCost(updated.linkProductId, mapped.costPerUnit);
  }

  return updated;
}

function remove(id) {
  const index = db.recipes.findIndex((item) => item.id === id);
  if (index === -1) {
    const err = new Error('Receita não encontrada');
    err.status = 404;
    throw err;
  }
  return db.recipes.splice(index, 1)[0];
}

function calculate(payload = {}) {
  const mapped = buildRecipePayload(payload);
  return {
    name: mapped.name,
    yield: mapped.yield,
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

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  calculate,
};
