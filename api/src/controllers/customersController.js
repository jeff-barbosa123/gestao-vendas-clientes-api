const customersService = require('../services/customersService');

async function list(req, res, next) {
  try { res.json(customersService.list()); } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try { res.json(customersService.getById(req.params.id, req.user)); } catch (e) { next(e); }
}
async function create(req, res, next) {
  try { res.status(201).json(customersService.create(req.body, req.user)); } catch (e) { next(e); }
}
async function update(req, res, next) {
  try { res.json(customersService.update(req.params.id, req.body, req.user)); } catch (e) { next(e); }
}
async function remove(req, res, next) {
  try { res.json(customersService.remove(req.params.id, req.user)); } catch (e) { next(e); }
}

module.exports = { list, getById, create, update, remove };
