const ingredientsService = require("../services/ingredientsService");
const stockService = require("../services/stockService");

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list: wrap(async (req, res) => res.json(await ingredientsService.list(req.user))),
  getById: wrap(async (req, res) => res.json(await ingredientsService.getById(req.params.id, req.user))),
  create: wrap(async (req, res) => res.status(201).json(await ingredientsService.create(req.body, req.user))),
  update: wrap(async (req, res) => res.json(await ingredientsService.update(req.params.id, req.body, req.user))),
  remove: wrap(async (req, res) => res.json(await ingredientsService.remove(req.params.id, req.user))),
  // Estoque
  lowStock: wrap(async (req, res) => res.json(await stockService.lowStock(req.user))),
  movements: wrap(async (req, res) => res.json(await stockService.listMovements(req.params.id, req.user))),
  purchase: wrap(async (req, res) => res.status(201).json(await stockService.registerPurchase(req.params.id, req.body, req.user))),
  adjust: wrap(async (req, res) => res.json(await stockService.adjustStock(req.params.id, req.body, req.user))),
  setMinStock: wrap(async (req, res) => res.json(await stockService.setMinStock(req.params.id, req.body, req.user))),
  disableStock: wrap(async (req, res) => res.json(await stockService.disableStock(req.params.id, req.user))),
};
