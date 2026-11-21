const express = require('express');
const router = express.Router();
const errorAnalyticsController = require('../controllers/errorAnalyticsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePlatformAdmin } = require('../middleware/platformAdmin');

// Todas as rotas requerem autenticação
router.use(authenticate);
// Erros sao de toda a plataforma (nao por empresa): so o administrador da plataforma acessa.
router.use(requirePlatformAdmin);

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
