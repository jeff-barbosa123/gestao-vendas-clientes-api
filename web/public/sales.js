/**
 * Tela de vendas (entrada). MÃ³dulos em /sales/*.js.
 */
import { ensureAuthOrRedirect, showMessage } from './sales/core.js';
import { initCatalog, loadCustomers, loadProducts } from './sales/catalog.js';
import { initItems } from './sales/items.js';
import { initList, loadSales, loadSummary } from './sales/list.js';
import { initEventsForms } from './sales/events-forms.js';
import { initEventsModals } from './sales/events-modals.js';
import { initEventsTable } from './sales/events-table.js';

// Gate de auth: só inicializa dados se estiver autenticado
ensureAuthOrRedirect().then((user) => {
  if (!user) return;
  loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
  loadCustomers(null).catch((_err) => {});
  loadSales(null).catch((err) => showMessage(err.message, 'is-danger'));
  loadSummary(null);
});

initCatalog();

initList();

initItems();

initEventsForms();

initEventsTable();

initEventsModals();
