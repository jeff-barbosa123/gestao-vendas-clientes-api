const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate } = require('../middleware/authMiddleware');
const { rateLimit } = require('../middleware/rateLimit');

router.use(authenticate);

router.get('/revenue', reportsController.revenueSummary);
router.get(
  '/revenue/export',
  rateLimit({ windowMs: 60_000, max: 3, message: 'Muitas exportacoes, tente novamente mais tarde' }),
  reportsController.exportRevenue
);
router.get('/financial', reportsController.financialReport);

module.exports = router;
