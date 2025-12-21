const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const { db } = require('../models/db');

function hasSqlInjectionRisk(value) {
  if (typeof value !== 'string') return false;
  const riskKeywords = /(select|insert|update|delete|drop|truncate|alter)\s+/i;
  return /(--|;)/.test(value) || riskKeywords.test(value);
}

function hasXssRisk(value) {
  if (typeof value !== 'string') return false;
  return /<\s*script[\s>]/i.test(value);
}

function ensureSafeText(value, fieldName) {
  if (value == null) return;
  if (hasSqlInjectionRisk(value) || hasXssRisk(value)) {
    const err = new Error(`${fieldName || 'Campo'} invalido`);
    err.status = 400;
    throw err;
  }
}

function ensureNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    const err = new Error(`${fieldName || 'Valor'} invalido`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

function ensureNonNegative(value, fieldName) {
  const parsed = ensureNumber(value, fieldName);
  if (parsed < 0) {
    const err = new Error(`${fieldName || 'Valor'} nao pode ser negativo`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

function ensureGreaterThanZero(value, fieldName) {
  const parsed = ensureNumber(value, fieldName);
  if (parsed <= 0) {
    const err = new Error(`${fieldName || 'Valor'} deve ser maior que zero`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

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

function round2(value) {
  return Number((value || 0).toFixed(2));
}

function computeLaborCost(payload) {
  if (payload.laborMinutes != null || payload.laborHourlyRate != null) {
    const minutes = ensureNonNegative(payload.laborMinutes ?? 0, 'laborMinutes');
    const hourlyRate = ensureNonNegative(payload.laborHourlyRate ?? 0, 'laborHourlyRate');
    return round2((hourlyRate / 60) * minutes);
  }
  return round2(ensureNonNegative(payload.labor ?? 0, 'labor'));
}

function normalizeIngredients(list) {
  if (!Array.isArray(list) || list.length === 0) {
    const err = new Error('ingredients sao obrigatorios');
    err.status = 400;
    throw err;
  }

  return list.map((item, index) => {
    const name = String(item.name || '').trim();
    ensureSafeText(name, 'Ingrediente');
    if (!name) {
      const err = new Error(`Ingrediente na posicao ${index} esta invalido`);
      err.status = 400;
      throw err;
    }

    const quantity = ensureGreaterThanZero(item.quantity ?? 1, 'quantity');
    const packageQuantity = ensureGreaterThanZero(item.packageQuantity ?? 1, 'packageQuantity');
    const packageCost = ensureNonNegative(item.cost ?? 0, 'cost');

    const unitCost = round2(packageCost / packageQuantity);
    const totalCost = round2(unitCost * quantity);

    return {
      name,
      quantity,
      cost: round2(packageCost),
      packageQuantity,
      unitCost,
      totalCost,
    };
  });
}

function normalizeOverhead(overhead, overheadItems) {
  const numberValue = ensureNonNegative(overhead ?? 0, 'overhead');
  const extras = Array.isArray(overheadItems)
    ? overheadItems
        .filter((item) => item && item.name)
        .map((item) => ({
          name: String(item.name).trim(),
          cost: round2(ensureNonNegative(item.cost ?? 0, 'overhead cost')),
        }))
    : [];

  extras.forEach((item) => ensureSafeText(item.name, 'Overhead'));
  const extrasTotal = extras.reduce((sum, item) => sum + item.cost, 0);

  return {
    items: extras,
    total: round2(numberValue + extrasTotal),
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
  const yieldQty = ensureGreaterThanZero(payload.yield ?? 1, 'yield');

  const totalCost = round2(ingredientCost + overheadCost + laborCost);
  const costPerUnit = round2(totalCost / yieldQty);

  const marginRaw = ensureNonNegative(payload.margin ?? 0, 'margin');
  let priceSuggested = costPerUnit;
  let marginLabel = '0%';

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

function ensureOwnership(recipe, user) {
  if (recipe.ownerId && user && recipe.ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    throw err;
  }
}

function list(user) {
  return db.recipes.filter(r =>
    r.status !== 'INACTIVE' && (r.ownerId ? (user && r.ownerId === user.id) : true)
  );
}

function getById(id, user) {
  const recipe = db.recipes.find((item) => item.id === id);
  if (!recipe || recipe.status === 'INACTIVE') {
    const err = new Error('Receita nao encontrada');
    err.status = 404;
    throw err;
  }
  ensureOwnership(recipe, user);
  return recipe;
}

function assertUniqueName(name, userId, currentId) {
  const exists = db.recipes.find(r =>
    r.name.toLowerCase() === name.toLowerCase() &&
    r.ownerId === userId &&
    r.id !== currentId
  );
  if (exists) {
    const err = new Error('Receita ja cadastrada');
    err.status = 409;
    throw err;
  }
}

function buildRecipePayload(payload, base = {}) {
  const normalized = normalizeRecipePayload(payload);
  const name = String(normalized.name || base.name || '').trim();
  ensureSafeText(name, 'name');
  if (!name) {
    const err = new Error('Dados incompletos para criacao da ficha tecnica');
    err.status = 400;
    throw err;
  }

  const description = normalized.description || base.description || null;
  ensureSafeText(description, 'description');
  const yieldValue = ensureGreaterThanZero(normalized.yield ?? base.yield ?? 1, 'yield');
  const yieldType = normalized.yieldType || base.yieldType;
  if (!yieldType) {
    const err = new Error('yieldType e obrigatorio');
    err.status = 400;
    throw err;
  }
  ensureSafeText(String(yieldType), 'yieldType');

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

function syncProductCost(productId, mapped, recipeId) {
  if (!productId) return null;
  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    const err = new Error('Produto vinculado nao encontrado');
    err.status = 404;
    throw err;
  }
  if (recipeId) {
    product.fichaTecnicaId = recipeId;
  }
  const costPerUnit = mapped?.costPerUnit ?? mapped?.custo_por_unidade ?? null;
  const priceMinimum = mapped?.priceMinimum ?? mapped?.preco_minimo ?? costPerUnit ?? null;
  if (costPerUnit != null) {
    product.purchase_price = costPerUnit;
    product.custo_por_unidade = costPerUnit;
    product.preco_minimo = priceMinimum;
    product.preco_minimo_sugerido = mapped?.priceSuggested ?? mapped?.preco_minimo_sugerido ?? priceMinimum;
    product.data_vinculo = new Date().toISOString();
    if (product.price) {
      product.cmv_previsto = Number((product.purchase_price / product.price).toFixed(2));
      product.cmv_futuro = product.cmv_previsto;
    }
  }
  return product;
}

function create(payload = {}, user) {
  if (!user || !user.id) {
    const err = new Error('Token invalido ou ausente');
    err.status = 401;
    throw err;
  }
  const mapped = buildRecipePayload(payload);
  assertUniqueName(mapped.name, user.id);
  const recipe = {
    id: uuidv4(),
    ownerId: user.id,
    linkProductId: payload.linkProductId || null,
    margin: payload.margin || null,
    overheadExtra: payload.overhead || 0,
    labor: mapped.labor,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...mapped,
  };

  db.recipes.push(recipe);

  if (payload.linkProductId) {
    syncProductCost(payload.linkProductId, mapped, recipe.id);
  }

  return recipe;
}

function update(id, payload = {}, user) {
  const index = db.recipes.findIndex((item) => item.id === id);
  if (index === -1) {
    const err = new Error('Receita nao encontrada');
    err.status = 404;
    throw err;
  }

  const current = db.recipes[index];
  ensureOwnership(current, user);
  const mapped = buildRecipePayload(payload, current);
  assertUniqueName(mapped.name, current.ownerId, current.id);

  const updated = {
    ...current,
    ...mapped,
    linkProductId: payload.linkProductId ?? current.linkProductId,
    status: payload.status || current.status || 'ACTIVE',
    updatedAt: new Date().toISOString(),
  };

  db.recipes[index] = updated;

  if (updated.linkProductId) {
    syncProductCost(updated.linkProductId, mapped, updated.id);
  }

  return updated;
}

function remove(id, user) {
  const index = db.recipes.findIndex((item) => item.id === id);
  if (index === -1) {
    const err = new Error('Receita nao encontrada');
    err.status = 404;
    throw err;
  }
  const current = db.recipes[index];
  ensureOwnership(current, user);

  // limpa vinculo no produto, se houver
  db.products = db.products.map((p) =>
    p.fichaTecnicaId === current.id
      ? {
          ...p,
          fichaTecnicaId: null,
          custo_por_unidade: null,
          preco_minimo: null,
          cmv_previsto: null,
        }
      : p
  );

  const updated = {
    ...current,
    status: 'INACTIVE',
    updatedAt: new Date().toISOString(),
  };
  db.recipes[index] = updated;
  return updated;
}

function calculate(payload = {}) {
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

async function exportRecipe(id, format = 'csv', user) {
  const recipe = getById(id, user);

  if (format === 'csv' || format === 'excel') {
    const header =
      'name,yield,yieldType,totalCost,costPerUnit,priceMinimum,priceSuggested,margin,estimatedProfit';
    const details = [
      recipe.name,
      recipe.yield,
      recipe.yieldType,
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
    const contentType = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';
    return { contentType, body };
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));

    doc.fontSize(18).text('Ficha Tecnica', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Nome: ${recipe.name}`);
    doc.text(`Rendimento: ${recipe.yield} (${recipe.yieldType})`);
    doc.text(`Custo total: R$ ${recipe.totalCost.toFixed(2)}`);
    doc.text(`Custo unitario: R$ ${recipe.costPerUnit.toFixed(2)}`);
    doc.text(`Preco minimo: R$ ${recipe.priceMinimum.toFixed(2)}`);
    doc.text(`Preco sugerido: R$ ${recipe.priceSuggested.toFixed(2)} (${recipe.marginLabel})`);
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

  const err = new Error('Formato de exportacao invalido');
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
