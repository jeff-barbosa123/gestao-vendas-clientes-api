const express = require('express');
const router = express.Router();
const recipesController = require('../controllers/recipesController');
const { authenticateStrict } = require('../middleware/authMiddlewareStrict');
const { rateLimit } = require('../middleware/rateLimit');

router.use(authenticateStrict);
router.use(rateLimit({ windowMs: 60_000, max: 60, message: 'Muitas requisicoes, tente novamente mais tarde' }));

router.get('/', recipesController.list);
router.post('/', recipesController.create);
router.post('/calculate', recipesController.calculate);
router.get('/:id', recipesController.getById);
router.put('/:id', recipesController.update);
router.delete('/:id', recipesController.remove);
router.get(
  '/:id/export',
  rateLimit({ windowMs: 60_000, max: 3, message: 'Muitas exportacoes, tente novamente mais tarde' }),
  recipesController.exportRecipe
);

module.exports = router;
