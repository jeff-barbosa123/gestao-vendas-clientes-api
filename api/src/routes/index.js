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
const pdvRoutes = require('./pdvRoutes');
const crmRoutes = require('./crmRoutes');
const priceSimulationRoutes = require('./priceSimulationRoutes');
const cepRoutes = require('./cepRoutes');
const cnpjRoutes = require('./cnpjRoutes');
const holidayRoutes = require('./holidayRoutes');
const barcodeRoutes = require('./barcodeRoutes');
const exportRoutes = require('./exportRoutes');
const errorAnalyticsRoutes = require('./errorAnalyticsRoutes');
const brandingRoutes = require('./brandingRoutes');
const { team: teamRoutes, company: companyRoutes } = require('./teamRoutes');
// Valores extras exigem escrita no cadastro dono do registro; definicoes exigem modules:manage.
function customFieldsGate(req) {
  if (req.method === 'GET') return {};
  const m = req.url.match(/^\/(product|customer)\/[^/]+\/values/);
  if (m) return { perm: m[1] === 'product' ? 'products:write' : 'customers:write' };
  return { perm: 'modules:manage' };
}
const customFieldsRoutes = require('./customFieldsRoutes');
const { gate, rw } = require('../middleware/tenant');

// Guardas globais de entrada: corpo JSON precisa ser objeto; query sem arrays/objetos aninhados
router.use(requireObjectBody);
router.use(rejectNestedQuery);

router.use('/auth', authRoutes);
router.use('/customers', gate(rw('customers:read', 'customers:write')), customersRoutes);
router.use('/products', gate(rw('products:read', 'products:write')), productsRoutes);
router.use('/sales', gate(rw('sales:read', 'sales:write')), salesRoutes);
router.use('/reports', gate(() => ({ perm: 'finance:view' })), reportsRoutes);
router.use('/docs', docsRoutes);
router.use('/recipes', gate(rw('recipes:read', 'recipes:write', 'producao')), recipesRoutes);
router.use('/ingredients', gate(rw('ingredients:read', 'ingredients:write', 'producao')), ingredientsRoutes);
router.use('/orders', gate(rw('orders:read', 'orders:write', 'encomendas')), ordersRoutes);
router.use('/crm', gate(rw('customers:read', 'customers:write', 'crm')), crmRoutes);
router.use('/pdv', gate(rw('pdv:use', 'pdv:use', 'pdv')), pdvRoutes);
router.use('/analytics', gate(() => ({ perm: 'analytics:read' })), analyticsRoutes);
router.use('/simulacao', gate(() => ({ perm: 'finance:view' })), priceSimulationRoutes);
router.use('/cep', cepRoutes);
router.use('/cnpj', cnpjRoutes);
router.use('/holidays', holidayRoutes);
router.use('/barcodes', barcodeRoutes);
router.use('/export', gate(() => ({ perm: 'export:use' })), exportRoutes);
router.use('/errors/analytics', errorAnalyticsRoutes);
router.use('/branding', gate(rw(null, 'branding:write')), brandingRoutes);
router.use('/team', gate(() => ({ perm: 'team:manage' })), teamRoutes);
router.use('/company', gate(rw(null, 'modules:manage')), companyRoutes);
router.use('/custom-fields', gate(customFieldsGate), customFieldsRoutes);

module.exports = router;
