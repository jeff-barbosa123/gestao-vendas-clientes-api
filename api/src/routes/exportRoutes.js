const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const spreadsheetController = require('../controllers/spreadsheetController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateExportParams } = require('../utils/export');

router.use(authenticate);

// PDF e JSON (formatos legados) continuam nos handlers antigos; CSV e Excel (XLSX) usam o utilitario compartilhado.
const legacy = {
  customers: exportController.exportCustomers,
  products: exportController.exportProducts,
  sales: exportController.exportSales,
};

// GET /api/export/:entity?format=csv|xlsx  (clientes, produtos, insumos, vendas, encomendas, financeiro)
router.get('/:entity', validateExportParams, (req, res, next) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  if ((format === 'pdf' || format === 'json') && legacy[req.params.entity]) {
    return legacy[req.params.entity](req, res, next);
  }
  return spreadsheetController.exportEntity(req, res, next);
});

module.exports = router;
