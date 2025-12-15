const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const customersRoutes = require('./customersRoutes');
const productsRoutes = require('./productsRoutes');
const salesRoutes = require('./salesRoutes');
const reportsRoutes = require('./reportsRoutes');
const docsRoutes = require('./docsRoutes');
const recipesRoutes = require('./recipesRoutes');
const analyticsRoutes = require('./analyticsRoutes');

router.use('/auth', authRoutes);
router.use('/customers', customersRoutes);
router.use('/products', productsRoutes);
router.use('/sales', salesRoutes);
router.use('/reports', reportsRoutes);
router.use('/docs', docsRoutes);
router.use('/recipes', recipesRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
