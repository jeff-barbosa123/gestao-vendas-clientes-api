const recipesService = require('../services/recipesService');

async function list(req, res, next) {
  try {
    res.json(recipesService.list());
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    res.json(recipesService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const recipe = recipesService.create(req.body);
    res.status(201).json(recipe);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(recipesService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    res.json(recipesService.remove(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function calculate(req, res, next) {
  try {
    res.json(recipesService.calculate(req.body));
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
