const recipesService = require("../services/recipesService");

async function list(req, res, next) {
  try {
    res.json(await recipesService.list(req.user));
  } catch (e) {
    next(e);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await recipesService.getById(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await recipesService.create(req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    res.json(await recipesService.update(req.params.id, req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    res.json(await recipesService.remove(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function calculate(req, res, next) {
  try {
    res.json(await recipesService.calculate(req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function exportRecipe(req, res, next) {
  try {
    const { body, contentType } = await recipesService.exportRecipe(
      req.params.id,
      req.query.format,
      req.user
    );
    res.setHeader("Content-Type", contentType);
    res.send(body);
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getById, create, update, remove, calculate, exportRecipe };
