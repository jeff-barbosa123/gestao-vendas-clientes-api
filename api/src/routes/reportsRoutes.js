const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticateStrict } = require('../middleware/authMiddlewareStrict');
const { rateLimit } = require('../middleware/rateLimit');

const MAX_QUERY_LENGTH = 2048;

function noCache(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Authorization');
  next();
}

function blockLongQuery(req, res, next) {
  if (req.originalUrl && req.originalUrl.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ success: false, message: 'Query string muito longa' });
  }
  next();
}

router.use(authenticateStrict);
router.use(noCache);
router.use(blockLongQuery);

router.get(
  '/revenue',
  rateLimit({ windowMs: 60_000, max: 60, message: 'Muitas requisicoes, tente novamente mais tarde' }),
  reportsController.revenueSummary
);
router.get(
  '/revenue/export',
  rateLimit({ windowMs: 60_000, max: 3, message: 'Muitas exportacoes, tente novamente mais tarde' }),
  reportsController.exportRevenue
);
router.get('/financial', reportsController.financialReport);

module.exports = router;
