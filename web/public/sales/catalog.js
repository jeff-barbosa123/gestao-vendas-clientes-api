/**
 * Catálogo de produtos e clientes: mapas, selects, preço e carga.
 */
import {
  addItemBtn,
  createCustomer,
  createCustomerHint,
  createCustomerId,
  createDate,
  createDateHoliday,
  customerOptions,
  editAddItem,
  editDate,
  editDateHoliday,
  editItemBarcode,
  editItemBarcodeMessage,
  editItemPrice,
  editItemProduct,
  editItemQty,
  itemBarcode,
  itemBarcodeMessage,
  itemPrice,
  itemProduct,
  itemQty,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, setInlineMessage } from './core.js';
import { formatDateInput, formatPrice, normalizeKey } from './formatters.js';
import { checkHoliday } from './holidays.js';
import { handleBarcodeLookup } from './barcode.js';
import { updateAddItemState } from './items.js';

function buildProductsMap(list) {
  state.productsMap = new Map();
  state.productsPriceMap = new Map();
  state.productNameMap = new Map();
  (list || []).forEach((product) => {
    if (!product) return;
    const id = product.id ?? product.productId ?? product.produtoId;
    if (id == null) return;
    const name =
      product.name ||
      product.nome ||
      product.nomeProduto ||
      product.productName ||
      `Produto ${id}`;
    state.productsMap.set(String(id), name);
    const nameKey = normalizeKey(name);
    if (nameKey && !state.productNameMap.has(nameKey)) {
      state.productNameMap.set(nameKey, String(id));
    }
    if (product.price != null) {
      state.productsPriceMap.set(String(id), Number(product.price));
    }
  });
}

function buildCustomerOptions(list) {
  state.customersCache = Array.isArray(list) ? list : [];
  state.customerValueMap = new Map();
  state.customerNameMap = new Map();
  if (!customerOptions) return;
  customerOptions.innerHTML = '';
  state.customersCache.forEach((customer) => {
    if (!customer) return;
    const id = customer.id ?? customer.customerId ?? customer.clienteId;
    const name = String(customer.name || customer.nome || '').trim();
    if (!name || id == null) return;
    const email = String(customer.email || '').trim();
    const display = email ? `${name} — ${email}` : name;
    const option = document.createElement('option');
    option.value = display;
    customerOptions.appendChild(option);
    state.customerValueMap.set(display, { id, name });
    const key = normalizeKey(name);
    if (key && !state.customerNameMap.has(key)) {
      state.customerNameMap.set(key, { id, name });
    }
  });
}

export function resolveCustomerSelection(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const direct = state.customerValueMap.get(raw);
  if (direct) return direct;
  const key = normalizeKey(raw);
  return state.customerNameMap.get(key) || null;
}

export function updateCustomerSelection(value) {
  const match = resolveCustomerSelection(value);
  if (createCustomerId) {
    createCustomerId.value = match ? String(match.id) : '';
  }
  if (createCustomerHint) {
    if (match) {
      setInlineMessage(createCustomerHint, 'Cliente cadastrado selecionado.', 'is-success');
    } else if (value && value.trim()) {
      setInlineMessage(createCustomerHint, 'Cliente não cadastrado. Venda de balcão.', 'is-warning');
    } else {
      setInlineMessage(createCustomerHint, 'Opcional: selecione um cliente cadastrado.');
    }
  }
}

function isActiveProduct(product) {
  if (!product) return false;
  const status = String(product.status || product.status_produto || product.statusProduto || '').toUpperCase();
  if (!status) return true;
  return status === 'ATIVO' || status === 'ACTIVE';
}

function fillProductSelect(selectEl, selectedId) {
  if (!selectEl) return;
  const activeProducts = (state.productsCache || []).filter(isActiveProduct);
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = activeProducts.length ? 'Selecione um produto' : 'Nenhum produto ativo';
  placeholder.disabled = activeProducts.length === 0;
  placeholder.selected = !selectedId;
  selectEl.appendChild(placeholder);
  activeProducts.forEach((product) => {
    const id = product.id ?? product.productId ?? product.produtoId;
    if (id == null) return;
    const name = state.productsMap.get(String(id)) || `Produto ${id}`;
    const option = document.createElement('option');
    option.value = String(id);
    option.textContent = name;
    if (selectedId && String(id) === String(selectedId)) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  });
}

export function setPriceFromProduct(selectEl, priceInput) {
  if (!selectEl || !priceInput) return;
  const productId = selectEl.value;
  const price = getProductPriceById(productId);
  if (!Number.isFinite(price)) return;
  priceInput.value = formatPrice(price);
}

export function getProductNameById(productId) {
  if (!productId) return '';
  return state.productsMap.get(String(productId)) || '';
}

function getProductPriceById(productId) {
  if (!productId) return null;
  const value = state.productsPriceMap.get(String(productId));
  return Number.isFinite(value) ? value : null;
}

export function getProductIdByName(name) {
  const key = normalizeKey(name);
  if (!key) return null;
  return state.productNameMap.get(key) || null;
}

export function setCustomerField(wrapper, valueEl, value, formatter) {
  if (!wrapper || !valueEl) return;
  const text = formatter ? formatter(value) : String(value || '').trim();
  if (!text || text === '-') {
    wrapper.hidden = true;
    return;
  }
  wrapper.hidden = false;
  valueEl.textContent = text;
}

export async function loadProducts(token) {
  const data = await apiRequest('/api/products', token);
  state.productsCache = Array.isArray(data) ? data : data.items || [];
  buildProductsMap(state.productsCache);
  fillProductSelect(itemProduct);
  fillProductSelect(editItemProduct);
  setPriceFromProduct(itemProduct, itemPrice);
  setPriceFromProduct(editItemProduct, editItemPrice);
  updateAddItemState(itemProduct, itemQty, itemPrice, addItemBtn);
  updateAddItemState(editItemProduct, editItemQty, editItemPrice, editAddItem);
}

export async function loadCustomers(token) {
  const data = await apiRequest('/api/customers', token);
  const list = Array.isArray(data) ? data : data.items || [];
  buildCustomerOptions(list);
  if (createCustomer && createCustomer.value) {
    updateCustomerSelection(createCustomer.value);
  }
}

export function initCatalog() {
  if (createDate && !createDate.value) {
    createDate.value = formatDateInput(new Date());
  }

  if (createDateHoliday && createDate && createDate.value) {
    checkHoliday(createDate.value, null, createDateHoliday);
  }

  if (createCustomer) {
    createCustomer.addEventListener('input', (event) => {
      updateCustomerSelection(event.target.value);
    });
    createCustomer.addEventListener('blur', (event) => {
      updateCustomerSelection(event.target.value);
    });
  }

  if (createDate) {
    createDate.addEventListener('change', (event) => {
      checkHoliday(event.target.value, null, createDateHoliday);
    });
    createDate.addEventListener('input', (event) => {
      checkHoliday(event.target.value, null, createDateHoliday);
    });
  }

  if (editDate) {
    editDate.addEventListener('change', (event) => {
      checkHoliday(event.target.value, null, editDateHoliday);
    });
    editDate.addEventListener('input', (event) => {
      checkHoliday(event.target.value, null, editDateHoliday);
    });
  }

  if (itemBarcode) {
    itemBarcode.addEventListener('blur', () => {
      handleBarcodeLookup(itemBarcode, itemBarcodeMessage, itemProduct, itemQty, itemPrice, addItemBtn, null);
    });
    itemBarcode.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleBarcodeLookup(itemBarcode, itemBarcodeMessage, itemProduct, itemQty, itemPrice, addItemBtn, null);
      }
    });
  }

  if (editItemBarcode) {
    editItemBarcode.addEventListener('blur', () => {
      handleBarcodeLookup(
        editItemBarcode,
        editItemBarcodeMessage,
        editItemProduct,
        editItemQty,
        editItemPrice,
        editAddItem,
        null
      );
    });
    editItemBarcode.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleBarcodeLookup(
          editItemBarcode,
          editItemBarcodeMessage,
          editItemProduct,
          editItemQty,
          editItemPrice,
          editAddItem,
          null
        );
      }
    });
  }
}
