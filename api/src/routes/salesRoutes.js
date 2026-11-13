const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { saleBody } = require('../validation/schemas');

router.use(authenticate);

router.get('/', salesController.list);
router.get('/summary', salesController.summary);
router.post('/', validate({ body: saleBody }), salesController.create);
router.get('/:id', salesController.getById);
router.put('/:id', validate({ body: saleBody }), salesController.update);
router.post('/:id/cancel', salesController.cancel);
router.get('/:id/audit', salesController.audit);

module.exports = router;
