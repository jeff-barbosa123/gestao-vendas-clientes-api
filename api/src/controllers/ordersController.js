const ordersService = require("../services/ordersService");

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list: wrap(async (req, res) => res.json(await ordersService.list(req.user, req.query))),
  needs: wrap(async (req, res) => res.json(await ordersService.needs(req.user, req.query))),
  getById: wrap(async (req, res) => res.json(await ordersService.getById(req.params.id, req.user))),
  create: wrap(async (req, res) => res.status(201).json(await ordersService.create(req.body, req.user))),
  update: wrap(async (req, res) => res.json(await ordersService.update(req.params.id, req.body, req.user))),
  changeStatus: wrap(async (req, res) => res.json(await ordersService.changeStatus(req.params.id, req.body, req.user))),
};
