const productsService = require('../services/productsService');

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

async function list(req, res, next) {
  try {
    res.json(productsService.getAll(req.user));
  } catch (e) {
    next(e);
  }
}
async function getById(req, res, next) {
  try {
    res.json(productsService.getById(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}
async function create(req, res, next) {
  try {
    res.status(201).json(productsService.create(req.body, req.user));
  } catch (e) {
    next(e);
  }
}
async function update(req, res, next) {
  try {
    res.json(productsService.update(req.params.id, req.body, req.user));
  } catch (e) {
    next(e);
  }
}
async function remove(req, res, next) {
  try {
    res.json(productsService.remove(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function linkRecipe(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    ensureNoForbiddenFields(req.body, ['ownerId', 'userId', 'isAdmin']);
    const { fichaTecnicaId } = req.body || {};
    const product = productsService.linkFichaTecnica(req.params.id, fichaTecnicaId, req.user);
    res.json(product);
  } catch (e) {
    next(e);
  }
}

async function unlinkRecipe(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    const product = productsService.removerFichaTecnica(req.params.id, req.user);
    res.json(product);
  } catch (e) {
    next(e);
  }
}

async function getRecipe(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    const recipe = productsService.obterFichaTecnica(req.params.id, req.user);
    res.json(recipe);
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getById, create, update, remove, linkRecipe, unlinkRecipe, getRecipe };


