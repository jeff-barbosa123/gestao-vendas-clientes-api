const salesService = require('../services/salesService');

async function list(req, res, next) {
  try {
    res.json(salesService.getAll(req.user));
  } catch (e) {
    next(e);
  }
}

async function getById(req, res, next) {
  try {
    res.json(salesService.getById(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const sale = salesService.create(req.body, req.user);
    res.status(201).json(sale);
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    res.json(salesService.update(req.params.id, req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function cancel(req, res, next) {
  try {
    res.json(salesService.cancel(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function summary(_req, res, next) {
  try {
    res.json(salesService.summary());
  } catch (e) {
    next(e);
  }
}

async function audit(req, res, next) {
  try {
    res.json(salesService.getAudit(req.params.id));
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getById, create, update, cancel, summary, audit };
