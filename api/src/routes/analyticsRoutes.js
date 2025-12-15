const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/overview', analyticsController.overview);
router.get('/timeseries', analyticsController.timeseries);

module.exports = router;
