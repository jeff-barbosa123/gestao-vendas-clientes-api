const express = require('express');
const svc = require('../services/financeService');
const { authenticate } = require('../middleware/authMiddleware');

// /api/finance. GET: finance:view; escrita: finance:manage; modulo opcional "financeiro" (gate em routes/index.js).
const wrap = (status, fn) => async (req, res, next) => {
  try {
    res.status(status).json(await fn(req));
  } catch (err) {
    next(err);
  }
};

const router = express.Router();
router.use(authenticate);
router.get('/summary', wrap(200, (req) => svc.summary(req.user)));
router.get('/cashflow', wrap(200, (req) => svc.cashflow(req.user, req.query)));
router.get('/dre', wrap(200, (req) => svc.dre(req.user, req.query)));
router.get('/entries', wrap(200, (req) => svc.list(req.user, req.query)));
router.post('/entries', wrap(201, (req) => svc.create(req.user, req.body || {})));
router.put('/entries/:id', wrap(200, (req) => svc.update(req.user, req.params.id, req.body || {})));
router.post('/entries/:id/pay', wrap(200, (req) => svc.pay(req.user, req.params.id, req.body || {})));
router.post('/entries/:id/cancel', wrap(200, (req) => svc.cancel(req.user, req.params.id)));
router.post('/entries/:id/reopen', wrap(200, (req) => svc.reopen(req.user, req.params.id)));

module.exports = router;
