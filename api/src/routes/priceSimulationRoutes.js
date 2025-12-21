const express = require('express');
const router = express.Router();
const priceSimulationController = require('../controllers/priceSimulationController');
const { authenticateStrict } = require('../middleware/authMiddlewareStrict');
const { rateLimit } = require('../middleware/rateLimit');

router.use(authenticateStrict);
router.use(rateLimit({ windowMs: 60_000, max: 60, message: 'Muitas requisicoes, tente novamente mais tarde' }));

router.post('/preco', priceSimulationController.simulateById);
router.post('/preco/rapida', priceSimulationController.simulateQuick);
router.get('/preco/:id', priceSimulationController.simulateGet);

module.exports = router;
