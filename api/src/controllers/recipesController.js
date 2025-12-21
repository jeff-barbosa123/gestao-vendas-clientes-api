const recipesService = require('../services/recipesService');

function buildError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function ensureAllowedQuery(query, allowed) {
  const invalid = Object.keys(query || {}).filter((key) => !allowed.includes(key));
  if (invalid.length > 0) {
    throw buildError('Parametros invalidos', 400);
  }
}

function ensureNoForbiddenFields(body, forbidden = []) {
  if (!body || typeof body !== 'object') return;
  const present = forbidden.find((field) => Object.prototype.hasOwnProperty.call(body, field));
  if (present) {
    throw buildError('Campos invalidos', 400);
  }
}

function mapRecipeResponse(recipe) {
  if (!recipe) return recipe;
  const mapped = {
    ...recipe,
    idFichaTecnica: recipe.id ?? null,
    nomeReceita: recipe.name ?? null,
    descricao: recipe.description ?? null,
    rendimento: recipe.yield ?? null,
    custoTotal: recipe.totalCost ?? null,
    custoUnitarioFinal: recipe.costPerUnit ?? null,
    usuarioId: recipe.ownerId ?? null,
  };

  if (Array.isArray(recipe.ingredients)) {
    mapped.ingredientes = recipe.ingredients.map((item) => ({
      ...item,
      nomeIngrediente: item.name,
      quantidade: item.quantity,
      custoUnitario: item.unitCost,
    }));
  }

  return mapped;
}

async function list(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    res.json(recipesService.list(req.user).map(mapRecipeResponse));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    res.json(mapRecipeResponse(recipesService.getById(req.params.id, req.user)));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    ensureNoForbiddenFields(req.body, ['ownerId', 'isAdmin']);
    const recipe = recipesService.create(req.body, req.user);
    res.status(201).json(mapRecipeResponse(recipe));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    ensureNoForbiddenFields(req.body, ['ownerId', 'isAdmin']);
    res.json(mapRecipeResponse(recipesService.update(req.params.id, req.body, req.user)));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    res.json(mapRecipeResponse(recipesService.remove(req.params.id, req.user)));
  } catch (err) {
    next(err);
  }
}

async function calculate(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    res.json(mapRecipeResponse(recipesService.calculate(req.body)));
  } catch (err) {
    next(err);
  }
}

async function exportRecipe(req, res, next) {
  try {
    ensureAllowedQuery(req.query, ['format']);
    const { format = 'csv' } = req.query;
    const result = await recipesService.exportRecipe(req.params.id, format, req.user);
    res.setHeader('Content-Type', result.contentType);
    if (result.contentType === 'application/pdf') {
      res.setHeader('Content-Disposition', 'attachment; filename="ficha-tecnica.pdf"');
      return res.send(result.body);
    }
    res.send(result.body);
  } catch (err) {
    next(err);
  }
}

async function exportRecipe(req, res, next) {
  try {
    const { format = 'csv' } = req.query;
    const result = await recipesService.exportRecipe(req.params.id, format);
    res.setHeader('Content-Type', result.contentType);
    if (result.contentType === 'application/pdf') {
      res.setHeader('Content-Disposition', 'attachment; filename=\"ficha-tecnica.pdf\"');
      return res.send(result.body);
    }
    res.send(result.body);
  } catch (err) {
    next(err);
  }
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
