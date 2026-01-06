const salesService = require("../services/salesService");

async function list(req, res, next) {
  try {
    res.json(await salesService.getAll(req.user));
  } catch (e) {
    next(e);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await salesService.getById(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await salesService.create(req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    res.json(await salesService.update(req.params.id, req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function cancel(req, res, next) {
  try {
    res.json(await salesService.cancel(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function summary(req, res, next) {
  try {
    res.json(await salesService.summary(req.user));
  } catch (e) {
    next(e);
  }
}

async function audit(req, res, next) {
  try {
    res.json(await salesService.getAudit(req.params.id));
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getById, create, update, cancel, summary, audit };
