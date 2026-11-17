const express = require('express');
const router = express.Router();
const controller = require('../controllers/brandingController');
const { authenticateStrict } = require('../middleware/authMiddlewareStrict');

// Autenticacao opcional: sem sessao valida segue como visitante (tema padrao)
function optionalAuth(req, res, next) {
  authenticateStrict(req, res, () => next());
}

router.get('/theme.css', optionalAuth, controller.themeCss);

router.use(authenticateStrict);
router.get('/', controller.get);
router.put('/', controller.save);
router.delete('/', controller.reset);
router.get('/logo', controller.logo);
router.post('/logo', controller.uploadLogo);
router.delete('/logo', controller.removeLogo);

module.exports = router;