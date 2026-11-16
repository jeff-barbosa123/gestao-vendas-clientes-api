/**
 * Estado mutável compartilhado da tela de vendas.
 */
export const state = {
  currentPage: 1,
  salesCache: [],
  productsCache: [],
  productsMap: new Map(),
  productsPriceMap: new Map(),
  productNameMap: new Map(),
  customersCache: [],
  customerValueMap: new Map(),
  customerNameMap: new Map(),
  holidaysCache: new Map(),
  messageTimer: null,
  barcodeMessageTimer: null,
  items: [],
  editItems: [],
  editingId: null,
  pendingCancelId: null,
  currentDetails: null,
  filteredSales: [],
};
