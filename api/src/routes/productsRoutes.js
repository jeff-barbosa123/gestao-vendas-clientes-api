const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', productsController.list);
router.post('/', productsController.create);
router.get('/:id', productsController.getById);
router.put('/:id', productsController.update);
router.delete('/:id', productsController.remove);

module.exports = router;

