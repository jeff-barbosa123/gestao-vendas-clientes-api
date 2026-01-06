const recipesService = require('./recipesService');

function buildError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

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
    throw buildError(`${fieldName || 'Campo'} inválido`, 400);
  }
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function parseMarginPercent(margin) {
  if (margin == null) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }
  const m = Number(margin);
  if (!Number.isFinite(m) || m < 0) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }
  return m;
}

function parseTaxaEntrega(value) {
  if (value == null) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }
  return parsed;
}

function buildSimulationPayload(custoTotal, custoPorUnidade, marginPercent, taxaEntrega) {
  const precoMinimo = custoPorUnidade;
  const precoIdeal = round2(custoPorUnidade * (1 + marginPercent / 100));
  const precoFinalSimulado = round2(precoIdeal + taxaEntrega);
  const valorLucro = round2(custoPorUnidade * (marginPercent / 100));
  const lucroEstimado = round2(precoFinalSimulado - custoPorUnidade);

  return {
    custo_total: round2(custoTotal),
    custo_por_unidade: round2(custoPorUnidade),
    preco_minimo: precoMinimo,
    preco_ideal: precoIdeal,
    margem: marginPercent,
    taxa_entrega: round2(taxaEntrega),
    preco_final_simulado: precoFinalSimulado,
    valor_lucro: valorLucro,
    lucro_estimado: lucroEstimado,
    custoUnitario: round2(custoPorUnidade),
    margemLucroPercentual: marginPercent,
    taxaEntrega: round2(taxaEntrega),
    precoFinalSimulado,
    valorLucro,
    lucroEstimado,
  };
}

function simulateFromRecipe(recipe, marginPercent, taxaEntrega) {
  const custoTotal = round2(recipe.totalCost);
  const custoPorUnidade = round2(recipe.costPerUnit);
  return buildSimulationPayload(custoTotal, custoPorUnidade, marginPercent, taxaEntrega);
}

function sumNumberObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 0;
  return Object.values(obj).reduce((sum, val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return sum;
    return sum + num;
  }, 0);
}

function validateOverheadsObject(overheads) {
  if (overheads == null) return;
  if (typeof overheads !== 'object' || Array.isArray(overheads)) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }
  for (const [key, value] of Object.entries(overheads)) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      throw buildError('Dados incompletos para simulação de preço', 400);
    }
    ensureSafeText(key, 'Overhead');
  }
}

function parseQuickIngredients(list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }

  return list.map((item) => {
    const name = String(item.nome ?? item.name ?? '').trim();
    const quantity = Number(item.quantidade ?? item.quantity);
    const unitCost = Number(item.custo ?? item.unitCost ?? item.cost);

    ensureSafeText(name, 'Ingrediente');
    if (!name || !Number.isFinite(quantity) || !Number.isFinite(unitCost)) {
      throw buildError('Dados incompletos para simulação de preço', 400);
    }
    if (quantity <= 0 || unitCost < 0) {
      throw buildError('Dados incompletos para simulação de preço', 400);
    }

    return {
      name,
      quantity,
      unitCost,
      totalCost: unitCost * quantity,
    };
  });
}

function simulateQuickFromPayload(payload) {
  const marginPercent = parseMarginPercent(payload.margem ?? payload.margin);

  const rendimento = payload.rendimento ?? payload.yield ?? payload.rendimentoTotal;
  const yieldQty = Number(rendimento);
  if (!Number.isFinite(yieldQty) || yieldQty <= 0) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }

  const ingredients = parseQuickIngredients(payload.ingredientes ?? payload.ingredients);
  const custoIngredientes = ingredients.reduce((sum, it) => sum + it.totalCost, 0);

  const overheadNumber = payload.overhead ?? 0;
  const overheadParsed = Number(overheadNumber);
  if (!Number.isFinite(overheadParsed) || overheadParsed < 0) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }

  validateOverheadsObject(payload.overheads);
  const overheadsObjectTotal = sumNumberObject(payload.overheads);
  const overheadTotalRaw = overheadParsed + overheadsObjectTotal;

  const maoDeObra = Number(payload.maoDeObra ?? payload.labor ?? 0);
  if (!Number.isFinite(maoDeObra) || maoDeObra < 0) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }

  const taxaEntrega = parseTaxaEntrega(payload.taxaEntrega ?? payload.deliveryFee);

  const custoTotal = round2(custoIngredientes + overheadTotalRaw + maoDeObra);
  const custoPorUnidade = round2(custoTotal / yieldQty);

  return buildSimulationPayload(custoTotal, custoPorUnidade, marginPercent, taxaEntrega);
}

async function simulateById({ receitaId, margem, taxaEntrega }, user) {
  if (!receitaId || margem == null) {
    throw buildError('Dados incompletos para simulação de preço', 400);
  }
  const marginPercent = parseMarginPercent(margem);
  const deliveryFee = parseTaxaEntrega(taxaEntrega);
  ensureSafeText(String(receitaId), 'receitaId');

  try {
    const recipe = await recipesService.getById(String(receitaId), user);
    return simulateFromRecipe(recipe, marginPercent, deliveryFee);
  } catch (err) {
    if (err && err.status === 404) {
      throw buildError('Receita não encontrada', 404);
    }
    if (err && err.status === 403) {
      throw buildError('Acesso não autorizado à receita', 403);
    }
    throw err;
  }
}

function simulateQuick(payload = {}, user) {
  if (!user || !user.id) {
    throw buildError('Token inválido ou ausente', 401);
  }
  return simulateQuickFromPayload(payload);
}

module.exports = {
  simulateById,
  simulateQuick,
};
