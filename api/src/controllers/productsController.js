const productsService = require('../services/productsService');

async function list(req, res, next) {
  try { res.json(productsService.list()); } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try { res.json(productsService.getById(req.params.id)); } catch (e) { next(e); }
}
async function create(req, res, next) {
  try { res.status(201).json(productsService.create(req.body)); } catch (e) { next(e); }
}
async function update(req, res, next) {
  try { res.json(productsService.update(req.params.id, req.body)); } catch (e) { next(e); }
}
async function remove(req, res, next) {
  try { res.json(productsService.remove(req.params.id)); } catch (e) { next(e); }
}

module.exports = { list, getById, create, update, remove };

