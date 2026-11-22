const express = require('express');
const controller = require('../controllers/customFieldsController');
const { authenticate } = require('../middleware/authMiddleware');

// /api/custom-fields. Permissoes pelo gate em routes/index.js:
// GET: qualquer membro; PUT /:entity (definicoes): modules:manage; PUT /:entity/:id/values: products:write ou customers:write.
const router = express.Router();
router.use(authenticate);
router.get('/', controller.list);
router.put('/:entity/:id/values', controller.saveValues);
router.put('/:entity', controller.save);

module.exports = router;
