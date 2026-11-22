const express = require('express');
const svc = require('../services/crmService');
const { authenticate } = require('../middleware/authMiddleware');

// /api/crm. Leitura: customers:read; anotacoes/contatos: customers:write; modulo opcional "crm" (gate em routes/index.js).
const wrap = (status, fn) => async (req, res, next) => {
  try {
    res.status(status).json(await fn(req));
  } catch (err) {
    next(err);
  }
};

const router = express.Router();
router.use(authenticate);
router.get('/customers', wrap(200, (req) => svc.list(req.user, { status: req.query.status })));
router.get('/customers/:id', wrap(200, (req) => svc.detail(req.user, req.params.id)));
router.post('/customers/:id/interactions', wrap(201, (req) => svc.addInteraction(req.user, req.params.id, req.body || {})));

module.exports = router;
