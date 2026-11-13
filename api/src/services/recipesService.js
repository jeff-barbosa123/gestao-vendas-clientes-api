const { v4: uuidv4 } = require("uuid");
const PDFDocument = require("pdfkit");
const repo = require("../db/repository");
const { ensureSafeText, ensureNumber, ensureNonNegative, ensureGreaterThanZero, round2 } = require("./recipes/primitives");
const { UNIT_GROUPS, normalizeUnit, normalizeQuantity, assertCompatibleUnits, normalizePackUnitToMatch } = require("./recipes/units");
const { normalizeRecipePayload, normalizeIngredients, normalizeOverhead } = require("./recipes/normalizers");

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

// Margem efetiva da ficha. Fichas antigas (sem a coluna margin) têm a margem deduzida do preço sugerido.
function resolveMargin(payloadMargin, current) {
  if (payloadMargin != null && payloadMargin !== "") return payloadMargin;
  if (current && current.margin != null) return current.margin;
  const cost = Number(current && (current.cost_per_unit ?? current.costPerUnit));
  const suggested = Number(current && (current.price_suggested ?? current.priceSuggested));
  if (cost > 0 && suggested > cost) return Number((suggested / cost).toFixed(4));
  return 0;
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

async function exportRecipe(id, format = "csv", user) {
  const recipe = await getById(id, user);
  
  // Recalcular os ingredientes para garantir que os custos estão corretos
  // (importante para receitas antigas que foram salvas com unidades mistas)
  let recalculatedIngredients = [];
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    try {
      recalculatedIngredients = normalizeIngredients(recipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        packageQuantity: ing.packageQuantity,
        packUnit: ing.packUnit,
        cost: ing.cost,
        component: ing.component,
      })));
    } catch (err) {
      // Se houver erro no recálculo, usar os valores originais
      recalculatedIngredients = recipe.ingredients;
    }
  }

  if (format === "csv" || format === "excel") {
    const csvEscape = (value) => {
      if (value === null || value === undefined) return "";
      const text = String(value);
      if (/[;"\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const formatNumber = (value) => {
      if (!Number.isFinite(value)) return "";
      return value.toFixed(2).replace(".", ",");
    };
    const priceTotal = Number.isFinite(recipe.priceSuggested) && Number.isFinite(recipe.yield)
      ? recipe.priceSuggested * recipe.yield
      : null;
    const lines = [
      "Campo;Valor",
      `Nome;${csvEscape(recipe.name)}`,
      `Rendimento;${csvEscape(recipe.yield)}`,
      `Unidade;${csvEscape(recipe.yieldType)}`,
      `Custo total;${formatNumber(recipe.totalCost)}`,
      `Custo unitário;${formatNumber(recipe.costPerUnit)}`,
      `Preço mínimo;${formatNumber(recipe.priceMinimum)}`,
      `Preço sugerido;${formatNumber(recipe.priceSuggested)}`,
      `Preço total da receita;${formatNumber(priceTotal)}`,
      `Margem;${csvEscape(recipe.marginLabel)}`,
      `Lucro estimado;${formatNumber(recipe.estimatedProfit)}`,
      "",
      "Ingredientes",
      "Ingrediente;Quantidade;Unidade;Custo unitário;Custo total",
      ...(recalculatedIngredients.length > 0 ? recalculatedIngredients : (recipe.ingredients || [])).map((ing) =>
        [
          csvEscape(ing.name),
          csvEscape(ing.quantity),
          csvEscape(ing.unit || ""),
          formatNumber(ing.unitCost),
          formatNumber(ing.totalCost),
        ].join(";")
      ),
    ];
    const body = lines.join("\n");
    const contentType = format === "excel" ? "application/vnd.ms-excel" : "text/csv";
    return { contentType, body };
  }

  if (format === "pdf") {
    const formatNumber = (value) => {
      if (!Number.isFinite(value)) return "0,00";
      return value.toFixed(2).replace(".", ",");
    };
    const priceTotal = Number.isFinite(recipe.priceSuggested) && Number.isFinite(recipe.yield)
      ? recipe.priceSuggested * recipe.yield
      : 0;
    const costIngredients = Number.isFinite(recipe.costIngredients) ? recipe.costIngredients : 0;
    const overheadTotal = Number.isFinite(recipe.overhead) ? recipe.overhead : 0;
    const laborTotal = Number.isFinite(recipe.labor) ? recipe.labor : 0;
    const generatedAt = new Date().toLocaleString("pt-BR");

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));

    doc.fontSize(18).text("Ficha Técnica", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Gerado em: ${generatedAt}`, { align: "right" });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Nome: ${recipe.name}`);
    doc.text(`Rendimento: ${recipe.yield} (${recipe.yieldType})`);
    doc.text(`Custo ingredientes: R$ ${formatNumber(costIngredients)}`);
    doc.text(`Custos indiretos: R$ ${formatNumber(overheadTotal)}`);
    doc.text(`Mão de obra: R$ ${formatNumber(laborTotal)}`);
    doc.text(`Custo total: R$ ${formatNumber(recipe.totalCost)}`);
    doc.text(`Custo unitário: R$ ${formatNumber(recipe.costPerUnit)}`);
    doc.text(`Preço mínimo: R$ ${formatNumber(recipe.priceMinimum)}`);
    doc.font("Helvetica-Bold").text(
      `Preço sugerido: R$ ${formatNumber(recipe.priceSuggested)} (${recipe.marginLabel})`
    );
    doc.font("Helvetica");
    doc.text(`Preço total da receita: R$ ${formatNumber(priceTotal)}`);
    doc.text(`Lucro estimado: R$ ${formatNumber(recipe.estimatedProfit)}`);

    doc.moveDown();
    doc.fontSize(14).text("Ingredientes");
    doc.moveDown(0.5);
    doc.fontSize(10);

    // Usar ingredientes recalculados se disponíveis
    const ingredientsForPDF = recalculatedIngredients.length > 0 
      ? recalculatedIngredients 
      : (recipe.ingredients || []);

    const tableX = doc.x;
    const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rowHeight = 20;
    const colWidths = [
      tableWidth * 0.50,
      tableWidth * 0.12,
      tableWidth * 0.08,
      tableWidth * 0.14,
      tableWidth * 0.16,
    ];
    const colAlign = ["left", "right", "center", "right", "right"];
    const colX = [
      tableX,
      tableX + colWidths[0],
      tableX + colWidths[0] + colWidths[1],
      tableX + colWidths[0] + colWidths[1] + colWidths[2],
      tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    ];

    const drawHeader = () => {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
      const y = doc.y;
      doc.save();
      doc.fillOpacity(1);
      doc.rect(tableX, y - 2, tableWidth, rowHeight).fill("#e6e6e6");
      doc.restore();
      doc.font("Helvetica-Bold").fillColor("#000");
      const headers = ["Ingrediente", "Qtd", "Un", "Custo un.", "Custo total"];
      headers.forEach((text, idx) => {
        doc.text(text, colX[idx], y, {
          width: colWidths[idx],
          align: colAlign[idx],
          lineBreak: false,
        });
      });
      doc.moveDown(1);
    };

    const drawRow = (values) => {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      doc.font("Helvetica").fillColor("#000");
      values.forEach((text, idx) => {
        doc.text(text, colX[idx], y, {
          width: colWidths[idx],
          align: colAlign[idx],
          lineBreak: false,
        });
      });
      doc.moveDown(0.9);
    };

    drawHeader();

    ingredientsForPDF.forEach((ing) => {
      drawRow([
        String(ing.name || ""),
        formatNumber(ing.quantity),
        String(ing.unit || ""),
        `R$ ${formatNumber(ing.unitCost)}`,
        `R$ ${formatNumber(ing.totalCost)}`,
      ]);
    });

    doc.font("Helvetica");
    doc.end();

    return new Promise((resolve) => {
      doc.on("end", () => {
        resolve({ contentType: "application/pdf", body: Buffer.concat(chunks) });
      });
    });
  }

  const err = new Error("Formato de exportação inválido");
  err.status = 400;
  throw err;
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
