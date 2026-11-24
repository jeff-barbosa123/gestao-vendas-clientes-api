const express = require('express');
const router = express.Router();
const spreadsheetController = require('../controllers/spreadsheetController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// GET /api/import/:entity/template?format=csv|xlsx -> planilha modelo
router.get('/:entity/template', spreadsheetController.downloadTemplate);

// POST /api/import/:entity  body: { filename, contentBase64 } -> resumo { total, imported, failed, errors[] }
router.post('/:entity', spreadsheetController.importEntity);

module.exports = router;
