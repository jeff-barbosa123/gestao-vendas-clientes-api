const express = require('express');
const svc = require('../services/pdvService');
const { authenticate } = require('../middleware/authMiddleware');

// /api/pdv. Permissao pdv:use + modulo "pdv" pelo gate em routes/index.js.
// req.user.id = empresa (tenant); req.user.userId = operador real.
const wrap = (fn) => async (req, res, next) => {
  try {
    res.status(fn.status || 200).json(await fn(req));
  } catch (err) {
    next(err);
  }
};
const created = (fn) => Object.assign((req) => fn(req), { status: 201 });

const router = express.Router();
router.use(authenticate);

router.get('/settings', wrap((req) => svc.getSettings(req.user)));
router.put('/settings', wrap((req) => svc.setSettings(req.user, req.body || {})));
router.get('/session', wrap((req) => svc.getSession(req.user)));
router.get('/registers', wrap((req) => svc.list(req.user)));
router.post('/registers/open', wrap(created((req) => svc.open(req.user, req.body || {}))));
router.get('/registers/:id', wrap((req) => svc.getRegisterById(req.user, req.params.id)));
router.post('/registers/:id/movements', wrap(created((req) => svc.addMovement(req.user, req.params.id, req.body || {}))));
router.post('/registers/:id/close', wrap((req) => svc.close(req.user, req.params.id, req.body || {})));
router.get('/products', wrap((req) => svc.searchProducts(req.user, req.query.q)));
router.put('/products/:id/barcode', wrap((req) => svc.setBarcode(req.user, req.params.id, (req.body || {}).barcode)));
router.post('/sales', wrap(created((req) => svc.createSale(req.user, req.body || {}))));

module.exports = router;
