const express = require('express');
const router = express.Router();
const recipesController = require('../controllers/recipesController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', recipesController.list);
router.post('/', recipesController.create);
router.post('/calculate', recipesController.calculate);
router.get('/:id', recipesController.getById);
router.put('/:id', recipesController.update);
router.delete('/:id', recipesController.remove);

module.exports = router;
