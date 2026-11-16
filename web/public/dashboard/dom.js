/**
 * Referências de DOM do dashboard.
 */
// ELEMENTOS
export const els = {
  customers: document.getElementById('metric-customers'),
  sales: document.getElementById('metric-sales'),
  revenue: document.getElementById('metric-revenue'),
  cmv: document.getElementById('metric-cmv'),
  profit: document.getElementById('metric-profit'),
  products: document.getElementById('metric-products'),
  recipes: document.getElementById('metric-recipes'),
  linked: document.getElementById('metric-linked'),
  margin: document.getElementById('metric-margin'),
};

export const periodSelect = document.getElementById('dashboard-period');

export const reportsBtn = document.getElementById('reports-btn');

export const profileBtn = document.getElementById('profile-btn');

export const logoutBtn = document.getElementById('logout-btn');

export const clientsBtn = document.getElementById('clients-manage-action');

export const salesBtn = document.getElementById('sales-manage-action');

export const productsBtn = document.getElementById('products-manage-action');

export const recipesBtn = document.getElementById('recipes-manage-action');

export const linkedBtn = document.getElementById('linked-manage-action');

export const marginBtn = document.getElementById('margin-manage-action');

export const quickSaleBtn = document.getElementById('quick-sale-action');

export const quickClientBtn = document.getElementById('quick-client-action');

export const quickProductBtn = document.getElementById('quick-product-action');

export const dashboardMessage = document.getElementById('dashboard-message');

export const emptyEls = {
  customers: document.querySelector('[data-empty="customers"]'),
  sales: document.querySelector('[data-empty="sales"]'),
  revenue: document.querySelector('[data-empty="revenue"]'),
  cmv: document.querySelector('[data-empty="cmv"]'),
  profit: document.querySelector('[data-empty="profit"]'),
  products: document.querySelector('[data-empty="products"]'),
  recipes: document.querySelector('[data-empty="recipes"]'),
  linked: document.querySelector('[data-empty="linked"]'),
  margin: document.querySelector('[data-empty="margin"]'),
  salesChart: document.querySelector('[data-empty="sales-chart"]'),
  revenueChart: document.querySelector('[data-empty="revenue-chart"]'),
};

export const alertClientsMessage = document.getElementById('alert-clients-message');

export const alertClientsHint = document.getElementById('alert-clients-hint');

export const alertClientsCount = document.getElementById('alert-clients-count');

export const alertClientsBtn = document.getElementById('alert-clients-action');

export const alertRevenueMessage = document.getElementById('alert-revenue-message');

export const alertRevenueHint = document.getElementById('alert-revenue-hint');

export const alertRevenueCount = document.getElementById('alert-revenue-count');

export const alertRevenueBtn = document.getElementById('alert-revenue-action');

export const alertProductsMessage = document.getElementById('alert-products-message');

export const alertProductsHint = document.getElementById('alert-products-hint');

export const alertProductsCount = document.getElementById('alert-products-count');

export const alertProductsBtn = document.getElementById('alert-products-action');
