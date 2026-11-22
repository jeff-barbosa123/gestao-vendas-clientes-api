const svc = require('../services/customFieldsService');

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

// req.user.id = ID da empresa (tenant), resolvido pelo gate em routes/index.js.
module.exports = {
  list: wrap(async (req, res) => {
    const out = {};
    for (const entity of ['product', 'customer']) out[entity] = await svc.listDefinitions(req.user.id, entity);
    res.status(200).json(out);
  }),
  save: wrap(async (req, res) =>
    res.status(200).json({ fields: await svc.saveDefinitions(req.user.id, req.params.entity, req.body || {}) })
  ),
  saveValues: wrap(async (req, res) =>
    res.status(200).json(await svc.saveValues(req.user.id, req.params.entity, req.params.id, req.body || {}))
  ),
};
