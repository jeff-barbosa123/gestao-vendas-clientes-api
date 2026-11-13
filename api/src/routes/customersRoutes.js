const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { customerBody } = require('../validation/schemas');

router.use(authenticate);

router.get('/', customersController.list);
router.post('/', validate({ body: customerBody }), customersController.create);
router.get('/:id', customersController.getById);
router.put('/:id', validate({ body: customerBody }), customersController.update);
router.delete('/:id', customersController.remove);

module.exports = router;
