const priceSimulationService = require('../services/priceSimulationService');

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

async function simulateById(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    ensureNoForbiddenFields(req.body, ['ownerId', 'isAdmin']);
    const result = priceSimulationService.simulateById(req.body || {}, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function simulateQuick(req, res, next) {
  try {
    ensureAllowedQuery(req.query, []);
    ensureNoForbiddenFields(req.body, ['ownerId', 'isAdmin']);
    const result = priceSimulationService.simulateQuick(req.body || {}, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function simulateGet(req, res, next) {
  try {
    ensureAllowedQuery(req.query, ['margem', 'taxaEntrega']);
    const result = priceSimulationService.simulateById(
      { receitaId: req.params.id, margem: req.query.margem, taxaEntrega: req.query.taxaEntrega },
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { simulateById, simulateQuick, simulateGet };
