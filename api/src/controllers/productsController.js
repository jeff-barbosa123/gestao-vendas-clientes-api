const productsService = require("../services/productsService");

async function list(req, res, next) {
  try {
    res.json(await productsService.getAll(req.user));
  } catch (e) {
    next(e);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await productsService.getById(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await productsService.create(req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    res.json(await productsService.update(req.params.id, req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    res.json(await productsService.remove(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function linkFichaTecnica(req, res, next) {
  try {
    res.json(await productsService.linkFichaTecnica(req.params.id, req.body.fichaTecnicaId, req.user));
  } catch (e) {
    next(e);
  }
}

async function removerFichaTecnica(req, res, next) {
  try {
    res.json(await productsService.removerFichaTecnica(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function obterFichaTecnica(req, res, next) {
  try {
    res.json(await productsService.obterFichaTecnica(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  linkFichaTecnica,
  removerFichaTecnica,
  obterFichaTecnica,
};
