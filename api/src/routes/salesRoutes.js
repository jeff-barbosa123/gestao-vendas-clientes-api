const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', salesController.list);
router.post('/', salesController.create);
router.get('/:id', salesController.getById);
router.put('/:id', salesController.update);
router.post('/:id/cancel', salesController.cancel);

module.exports = router;

