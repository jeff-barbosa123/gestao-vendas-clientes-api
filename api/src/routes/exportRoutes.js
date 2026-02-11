const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateExportParams } = require('../utils/export');

router.use(authenticate);

// Exportação de clientes
router.get('/customers', validateExportParams, exportController.exportCustomers);

// Exportação de produtos
router.get('/products', validateExportParams, exportController.exportProducts);

// Exportação de vendas
router.get('/sales', validateExportParams, exportController.exportSales);

module.exports = router;
