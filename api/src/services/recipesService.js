const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const { db } = require('../models/db');

function ensurePositiveNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function computeLaborCost(payload) {
  const minutes = ensurePositiveNumber(payload.laborMinutes, null);
  const hourlyRate = ensurePositiveNumber(payload.laborHourlyRate, null);

  if (minutes != null && hourlyRate != null) {
    return (hourlyRate / 60) * minutes;
  }

  return ensurePositiveNumber(payload.labor, 0);
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

    const packageQuantity = ensurePositiveNumber(item.packageQuantity, 1) || 1;
    const packageCost = ensurePositiveNumber(item.cost, 0);
    if (packageCost < 0) {
      const err = new Error(`Custo inválido para ${name}`);
      err.status = 400;
      throw err;
    }

    // CMV de ingrediente: (preço da embalagem / quantidade da embalagem) * quantidade usada
    const unitCost = packageCost / packageQuantity;
    const totalCost = unitCost * quantity;

    return {
      name,
      quantity,
      cost: packageCost,
      packageQuantity,
      unitCost,
      totalCost,
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
    (sum, item) => sum + item.totalCost,
    0
  );

  const { total: overheadCost, items: overheadItems } = normalizeOverhead(
    payload.overhead,
    payload.overheadItems
  );

  const laborCost = computeLaborCost(payload);
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

function exportRecipe(id, format = 'csv') {
  const recipe = getById(id);

  if (format === 'csv' || format === 'excel') {
    const header =
      'name,yield,totalCost,costPerUnit,priceMinimum,priceSuggested,margin,estimatedProfit';
    const details = [
      recipe.name,
      recipe.yield,
      recipe.totalCost,
      recipe.costPerUnit,
      recipe.priceMinimum,
      recipe.priceSuggested,
      recipe.marginLabel,
      recipe.estimatedProfit,
    ].join(',');

    const ingredientHeader = 'ingredient,quantity,unitCost,totalCost';
    const ingredientLines = (recipe.ingredients || []).map((ing) =>
      [
        ing.name,
        ing.quantity,
        ing.unitCost,
        ing.totalCost,
      ].join(',')
    );

    const body = [header, details, '', ingredientHeader, ...ingredientLines].join('\n');
    return { contentType: 'text/csv', body };
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));

    doc.fontSize(18).text('Ficha Técnica', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Nome: ${recipe.name}`);
    doc.text(`Rendimento: ${recipe.yield}`);
    doc.text(`Custo total: R$ ${recipe.totalCost.toFixed(2)}`);
    doc.text(`Custo unitário: R$ ${recipe.costPerUnit.toFixed(2)}`);
    doc.text(`Preço mínimo: R$ ${recipe.priceMinimum.toFixed(2)}`);
    doc.text(`Preço sugerido: R$ ${recipe.priceSuggested.toFixed(2)} (${recipe.marginLabel})`);
    doc.text(`Lucro estimado: R$ ${recipe.estimatedProfit.toFixed(2)}`);

    doc.moveDown();
    doc.fontSize(14).text('Ingredientes');
    doc.fontSize(12);
    (recipe.ingredients || []).forEach((ing) => {
      doc.text(
        `${ing.name} - Qtde: ${ing.quantity} | Custo unit: R$ ${ing.unitCost.toFixed(
          2
        )} | Total: R$ ${ing.totalCost.toFixed(2)}`
      );
    });
    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve({ contentType: 'application/pdf', body: Buffer.concat(chunks) });
      });
    });
  }

  const err = new Error('Formato de exportação inválido');
  err.status = 400;
  throw err;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  calculate,
  exportRecipe,
};
