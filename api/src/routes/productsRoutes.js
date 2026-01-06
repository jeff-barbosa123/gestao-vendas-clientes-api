const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const { authenticateStrict } = require('../middleware/authMiddlewareStrict');
const { rateLimit } = require('../middleware/rateLimit');

const linkRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: 'Muitas requisicoes, tente novamente mais tarde',
});

router.use(authenticateStrict);

router.get('/', productsController.list);
router.post('/', productsController.create);
router.get('/:id', productsController.getById);
router.put('/:id', productsController.update);
router.delete('/:id', productsController.remove);
router.post('/:id/vincular-ficha', linkRateLimit, productsController.linkFichaTecnica);
router.delete('/:id/remover-ficha', linkRateLimit, productsController.removerFichaTecnica);
router.get('/:id/ficha-tecnica', linkRateLimit, productsController.obterFichaTecnica);

module.exports = router;
