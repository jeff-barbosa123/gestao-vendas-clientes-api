const salesService = require('../services/salesService');

async function list(req, res, next) { try { res.json(salesService.list()); } catch (e) { next(e); } }
async function getById(req, res, next) { try { res.json(salesService.getById(req.params.id)); } catch (e) { next(e); } }
async function create(req, res, next) { try { res.status(201).json(salesService.create(req.body)); } catch (e) { next(e); } }
async function update(req, res, next) { try { res.json(salesService.update(req.params.id, req.body)); } catch (e) { next(e); } }
async function cancel(req, res, next) { try { res.json(salesService.cancel(req.params.id)); } catch (e) { next(e); } }

module.exports = { list, getById, create, update, cancel };

