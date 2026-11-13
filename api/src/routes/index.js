const express = require('express');
const router = express.Router();
const { requireObjectBody, rejectNestedQuery } = require('../middleware/validate');

const authRoutes = require('./authRoutes');
const customersRoutes = require('./customersRoutes');
const productsRoutes = require('./productsRoutes');
const salesRoutes = require('./salesRoutes');
const reportsRoutes = require('./reportsRoutes');
const docsRoutes = require('./docsRoutes');
const recipesRoutes = require('./recipesRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const ingredientsRoutes = require('./ingredientsRoutes');
const ordersRoutes = require('./ordersRoutes');
const priceSimulationRoutes = require('./priceSimulationRoutes');
const cepRoutes = require('./cepRoutes');
const cnpjRoutes = require('./cnpjRoutes');
const holidayRoutes = require('./holidayRoutes');
const barcodeRoutes = require('./barcodeRoutes');
const exportRoutes = require('./exportRoutes');
const errorAnalyticsRoutes = require('./errorAnalyticsRoutes');

// Guardas globais de entrada: corpo JSON precisa ser objeto; query sem arrays/objetos aninhados
router.use(requireObjectBody);
router.use(rejectNestedQuery);

router.use('/auth', authRoutes);
router.use('/customers', customersRoutes);
router.use('/products', productsRoutes);
router.use('/sales', salesRoutes);
router.use('/reports', reportsRoutes);
router.use('/docs', docsRoutes);
router.use('/recipes', recipesRoutes);
router.use('/ingredients', ingredientsRoutes);
router.use('/orders', ordersRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/simulacao', priceSimulationRoutes);
router.use('/cep', cepRoutes);
router.use('/cnpj', cnpjRoutes);
router.use('/holidays', holidayRoutes);
router.use('/barcodes', barcodeRoutes);
router.use('/export', exportRoutes);
router.use('/errors/analytics', errorAnalyticsRoutes);

module.exports = router;
