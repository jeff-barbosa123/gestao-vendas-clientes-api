const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/revenue', reportsController.revenueSummary);
router.get('/revenue/export', reportsController.exportRevenue);

module.exports = router;

