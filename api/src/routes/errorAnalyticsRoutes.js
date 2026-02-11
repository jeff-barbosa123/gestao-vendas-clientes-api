const express = require('express');
const router = express.Router();
const errorAnalyticsController = require('../controllers/errorAnalyticsController');
const { authenticate } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(authenticate);

// Erros mais frequentes
router.get('/frequent', errorAnalyticsController.getFrequentErrors);

// Timeline de erros
router.get('/timeline', errorAnalyticsController.getErrorsTimeline);

// Endpoints com mais erros
router.get('/endpoints', errorAnalyticsController.getEndpointsWithErrors);

// Erros recentes
router.get('/recent', errorAnalyticsController.getRecentErrors);

// Estatísticas gerais
router.get('/statistics', errorAnalyticsController.getErrorStatistics);

module.exports = router;
