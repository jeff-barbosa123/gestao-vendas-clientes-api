const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', customersController.list);
router.post('/', customersController.create);
router.get('/:id', customersController.getById);
router.put('/:id', customersController.update);
router.delete('/:id', customersController.remove);

module.exports = router;

