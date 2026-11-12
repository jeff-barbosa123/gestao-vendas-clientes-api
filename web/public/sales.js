(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;
  // Auth via cookie HttpOnly (não usar token no browser storage)

  const messageBox = document.getElementById('sales-message');
  const summaryBox = document.getElementById('sales-summary');
  const backBtn = document.getElementById('back-dashboard');
  const refreshBtn = document.getElementById('refresh-list');
  const tableBody = document.getElementById('sales-body');
  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  const filterPeriod = document.getElementById('filter-period');
  const filterTotalMin = document.getElementById('filter-total-min');
  const filterTotalMax = document.getElementById('filter-total-max');
  const filterClear = document.getElementById('filter-clear');
  const pagination = document.getElementById('sales-pagination');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const pageList = document.getElementById('page-list');
  const salesTotal = document.getElementById('sales-total');
  const pageJumpInput = document.getElementById('page-jump-input');
  const pageJumpBtn = document.getElementById('page-jump-btn');

  const createForm = document.getElementById('create-form');
  const createCustomer = document.getElementById('create-customer');
  const createCustomerId = document.getElementById('create-customer-id');
  const createCustomerHint = document.getElementById('create-customer-hint');
  const customerOptions = document.getElementById('customer-options');
  const createDate = document.getElementById('create-date');
  const createDateHoliday = document.getElementById('create-date-holiday');
  const createDateError = document.getElementById('create-date-error');
  const addItemBtn = document.getElementById('add-item');
  const itemProduct = document.getElementById('item-product');
  const itemQty = document.getElementById('item-qty');
  const itemPrice = document.getElementById('item-price');
  const itemError = document.getElementById('item-error');
  const itemBarcode = document.getElementById('item-barcode');
  const itemBarcodeMessage = document.getElementById('item-barcode-message');
  const itemsBody = document.getElementById('items-body');
  const saleTotal = document.getElementById('sale-total');
  const createSubmit = document.getElementById('create-submit');
  const editModal = document.getElementById('edit-sale-modal');
  const editClose = document.getElementById('edit-sale-close');
  const editCloseBtn = document.getElementById('edit-sale-close-btn');
  const editForm = document.getElementById('edit-form');
  const editDate = document.getElementById('edit-date');
  const editPayment = document.getElementById('edit-payment');
  const createPayment = document.getElementById('create-payment');
  const detailsPayment = document.getElementById('sale-details-payment');
  const PAYMENT_LABELS = {
    PIX: 'Pix',
    CASH: 'Dinheiro',
    CREDIT_CARD: 'Cartão de crédito',
    DEBIT_CARD: 'Cartão de débito',
    OTHER: 'Outro',
  };
  const paymentLabel = (value) => PAYMENT_LABELS[value] || 'Não informado';
  const editDateHoliday = document.getElementById('edit-date-holiday');
  const editDateError = document.getElementById('edit-date-error');
  const editAddItem = document.getElementById('edit-add-item');
  const editItemProduct = document.getElementById('edit-item-product');
  const editItemQty = document.getElementById('edit-item-qty');
  const editItemPrice = document.getElementById('edit-item-price');
  const editItemError = document.getElementById('edit-item-error');
  const editItemBarcode = document.getElementById('edit-item-barcode');
  const editItemBarcodeMessage = document.getElementById('edit-item-barcode-message');
  const editItemsBody = document.getElementById('edit-items-body');
  const editSaleTotal = document.getElementById('edit-sale-total');
  const editSubmit = document.getElementById('edit-submit');
  const detailsModal = document.getElementById('sale-details-modal');
  const detailsClose = document.getElementById('sale-details-close');
  const detailsCloseBtn = document.getElementById('sale-details-close-btn');
  const detailsCustomer = document.getElementById('sale-details-customer');
  const detailsDate = document.getElementById('sale-details-date');
  const detailsStatus = document.getElementById('sale-details-status');
  const detailsTotal = document.getElementById('sale-details-total');
  const detailsItems = document.getElementById('sale-details-items');
  const detailsCustomerBlock = document.getElementById('sale-details-customer-block');
  const detailsName = document.getElementById('sale-details-name');
  const detailsEmail = document.getElementById('sale-details-email');
  const detailsPhone = document.getElementById('sale-details-phone');
  const detailsType = document.getElementById('sale-details-type');
  const detailsDocument = document.getElementById('sale-details-document');
  const detailsDocumentLabel = document.getElementById('sale-details-document-label');
  const detailsBirth = document.getElementById('sale-details-birth');
  const detailsTrade = document.getElementById('sale-details-trade');
  const detailsStreet = document.getElementById('sale-details-street');
  const detailsNumber = document.getElementById('sale-details-number');
  const detailsComplement = document.getElementById('sale-details-complement');
  const detailsCity = document.getElementById('sale-details-city');
  const detailsNeighborhood = document.getElementById('sale-details-neighborhood');
  const detailsPostal = document.getElementById('sale-details-postal');
  const detailsFieldName = document.getElementById('sale-details-field-name');
  const detailsFieldEmail = document.getElementById('sale-details-field-email');
  const detailsFieldPhone = document.getElementById('sale-details-field-phone');
  const detailsFieldType = document.getElementById('sale-details-field-type');
  const detailsFieldDocument = document.getElementById('sale-details-field-document');
  const detailsFieldBirth = document.getElementById('sale-details-field-birth');
  const detailsFieldTrade = document.getElementById('sale-details-field-trade');
  const detailsFieldStreet = document.getElementById('sale-details-field-street');
  const detailsFieldNumber = document.getElementById('sale-details-field-number');
  const detailsFieldComplement = document.getElementById('sale-details-field-complement');
  const detailsFieldCity = document.getElementById('sale-details-field-city');
  const detailsFieldNeighborhood = document.getElementById('sale-details-field-neighborhood');
  const detailsFieldPostal = document.getElementById('sale-details-field-postal');
  const detailsAddressBlock = document.getElementById('sale-details-address-block');
  const detailsFullAddress = document.getElementById('sale-details-full-address');
  const detailsEmpty = document.getElementById('sale-details-empty');
  const detailsNotes = document.getElementById('sale-details-notes');
  const detailsNotesCard = document.getElementById('sale-details-notes-card');
  const detailsPdfBtn = document.getElementById('sale-details-pdf');
  const cancelModal = document.getElementById('cancel-sale-modal');
  const cancelClose = document.getElementById('cancel-sale-close');
  const cancelCloseBtn = document.getElementById('cancel-sale-close-btn');
  const cancelBackBtn = document.getElementById('cancel-sale-back');
  const cancelConfirmBtn = document.getElementById('cancel-sale-confirm');
  const PAGE_SIZE = 10;
  let currentPage = 1;
  let salesCache = [];
  let productsCache = [];
  let productsMap = new Map();
  let productsPriceMap = new Map();
  let productNameMap = new Map();
  let customersCache = [];
  let customerValueMap = new Map();
  let customerNameMap = new Map();
  let holidaysCache = new Map();
  let messageTimer = null;
  let barcodeMessageTimer = null;
  let items = [];
  let editItems = [];
  let editingId = null;
  let pendingCancelId = null;
  let currentDetails = null;
  let filteredSales = [];
  const SALES_FILTER_KEY = 'sgvc.salesFilters';

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`;
    }
    return `${base}${normalizedPath}`;
  }

  async function requireAuth() {
    if (!window.apiGetMe) {
      window.location.href = '/';
      return null;
    }
    try {
      const me = await window.apiGetMe({ force: true });
      return me && me.user ? me.user : me;
    } catch (_err) {
      if (_err && _err.name === 'AbortError') {
        return null;
      }
      window.location.href = '/';
      return null;
    }
  }

  function showMessage(text, type) {
    if (!messageBox) return;
    messageBox.textContent = text || '';
    messageBox.classList.remove('is-success', 'is-danger', 'is-warning');
    if (type) messageBox.classList.add(type);
    messageBox.hidden = !text;
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }
    if (text) {
      const timeout = type === 'is-danger' || type === 'is-warning' ? 6500 : 4500;
      messageTimer = setTimeout(() => {
        messageBox.hidden = true;
        messageBox.textContent = '';
        messageBox.classList.remove('is-success', 'is-danger', 'is-warning');
      }, timeout);
    }
  }

  function showSummary(text) {
    if (!summaryBox) return;
    summaryBox.textContent = text || '';
    summaryBox.hidden = !text;
  }

  function setInlineMessage(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.classList.remove('is-warning', 'is-success');
    if (type) el.classList.add(type);
  }

  function buildProductsMap(list) {
    productsMap = new Map();
    productsPriceMap = new Map();
    productNameMap = new Map();
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
      productsMap.set(String(id), name);
      const nameKey = normalizeKey(name);
      if (nameKey && !productNameMap.has(nameKey)) {
        productNameMap.set(nameKey, String(id));
      }
      if (product.price != null) {
        productsPriceMap.set(String(id), Number(product.price));
      }
    });
  }

  function buildCustomerOptions(list) {
    customersCache = Array.isArray(list) ? list : [];
    customerValueMap = new Map();
    customerNameMap = new Map();
    if (!customerOptions) return;
    customerOptions.innerHTML = '';
    customersCache.forEach((customer) => {
      if (!customer) return;
      const id = customer.id ?? customer.customerId ?? customer.clienteId;
      const name = String(customer.name || customer.nome || '').trim();
      if (!name || id == null) return;
      const email = String(customer.email || '').trim();
      const display = email ? `${name} — ${email}` : name;
      const option = document.createElement('option');
      option.value = display;
      customerOptions.appendChild(option);
      customerValueMap.set(display, { id, name });
      const key = normalizeKey(name);
      if (key && !customerNameMap.has(key)) {
        customerNameMap.set(key, { id, name });
      }
    });
  }

  function resolveCustomerSelection(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const direct = customerValueMap.get(raw);
    if (direct) return direct;
    const key = normalizeKey(raw);
    return customerNameMap.get(key) || null;
  }

  function updateCustomerSelection(value) {
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
    const activeProducts = (productsCache || []).filter(isActiveProduct);
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
      const name = productsMap.get(String(id)) || `Produto ${id}`;
      const option = document.createElement('option');
      option.value = String(id);
      option.textContent = name;
      if (selectedId && String(id) === String(selectedId)) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    });
  }

  function setPriceFromProduct(selectEl, priceInput) {
    if (!selectEl || !priceInput) return;
    const productId = selectEl.value;
    const price = getProductPriceById(productId);
    if (!Number.isFinite(price)) return;
    priceInput.value = formatPrice(price);
  }

  function updateAddItemState(selectEl, qtyEl, priceEl, buttonEl) {
    if (!buttonEl) return;
    const hasProduct = Boolean(selectEl && selectEl.value);
    const qty = Number(qtyEl ? qtyEl.value : 0);
    const price = parsePrice(priceEl ? priceEl.value : null);
    const isReady = hasProduct && qty > 0 && price != null;
    buttonEl.classList.toggle('is-highlight', isReady);
  }

  function getProductNameById(productId) {
    if (!productId) return '';
    return productsMap.get(String(productId)) || '';
  }

  function getProductPriceById(productId) {
    if (!productId) return null;
    const value = productsPriceMap.get(String(productId));
    return Number.isFinite(value) ? value : null;
  }

  function getProductIdByName(name) {
    const key = normalizeKey(name);
    if (!key) return null;
    return productNameMap.get(key) || null;
  }

  async function apiRequest(path, _tokenIgnored, options = {}) {
    const url = buildUrl(path);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = payload && (payload.message || payload.error) ? payload.message || payload.error : 'Erro na API';
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function setFieldError(el, message) {
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  function parsePrice(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    let normalized = raw.replace(/\s/g, '');
    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');
    if (hasComma && hasDot) {
      normalized = normalized.replace(/\./g, '');
    }
    if (hasComma) {
      normalized = normalized.replace(',', '.');
    }
    const number = Number(normalized);
    if (!Number.isFinite(number) || number <= 0) return null;
    return number;
  }

  function parseFilterMoney(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    let normalized = raw.replace(/\s/g, '');
    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');
    if (hasComma && hasDot) {
      normalized = normalized.replace(/\./g, '');
    }
    if (hasComma) {
      normalized = normalized.replace(',', '.');
    }
    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) return null;
    return number;
  }

  function showBarcodeMessage(el, text, type) {
    if (!el) return;
    setInlineMessage(el, text, type);
    if (barcodeMessageTimer) {
      clearTimeout(barcodeMessageTimer);
      barcodeMessageTimer = null;
    }
    if (text) {
      barcodeMessageTimer = setTimeout(() => {
        setInlineMessage(el, '');
      }, 6000);
    }
  }

  function normalizeBarcode(value) {
    return String(value || '').replace(/\D/g, '');
  }

  async function lookupBarcode(code, token) {
    try {
      return await apiRequest(`/api/barcodes/${code}`, token);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  async function handleBarcodeLookup(inputEl, messageEl, selectEl, qtyEl, priceEl, buttonEl, token) {
    if (!inputEl) return;
    const code = normalizeBarcode(inputEl.value);
    if (!code) {
      showBarcodeMessage(messageEl, '');
      return;
    }
    if (code.length < 8) {
      showBarcodeMessage(messageEl, 'Código de barras incompleto.', 'is-warning');
      return;
    }
    showBarcodeMessage(messageEl, 'Buscando produto pelo código de barras...', 'is-success');
    try {
      const data = await lookupBarcode(code, token);
      if (!data || (!data.name && !data.brand)) {
        showBarcodeMessage(messageEl, 'Produto não encontrado pelo código informado.', 'is-warning');
        return;
      }
      const displayName = data.name || data.brand;
      const productId = getProductIdByName(displayName);
      if (productId && selectEl) {
        selectEl.value = String(productId);
        setPriceFromProduct(selectEl, priceEl);
        updateAddItemState(selectEl, qtyEl, priceEl, buttonEl);
        showBarcodeMessage(messageEl, `Produto sugerido: ${displayName}. Selecionado automaticamente.`, 'is-success');
        return;
      }
      showBarcodeMessage(messageEl, `Produto sugerido: ${displayName}. Selecione manualmente.`, 'is-warning');
    } catch (_err) {
      showBarcodeMessage(messageEl, 'Não foi possível consultar o código agora.', 'is-warning');
    }
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Datas de venda são "só data" e chegam da API como meia-noite UTC.
  // Exibir em UTC evita mostrar o dia anterior no fuso do Brasil (UTC-3).
  function formatDateInput(value) {
    if (!value) return '';
    if (value instanceof Date) {
      // "Hoje" no fuso local (toISOString() viraria o dia seguinte depois das 21h)
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  function formatDateDisplay(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  async function loadHolidays(year, token) {
    const key = String(year);
    const cached = holidaysCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.items;
    }
    const response = await apiRequest(`/api/holidays/${key}`, token);
    const items = Array.isArray(response) ? response : response.items || [];
    holidaysCache.set(key, { items, expiresAt: Date.now() + 1000 * 60 * 60 * 24 });
    return items;
  }

  async function checkHoliday(dateValue, token, targetEl) {
    if (!targetEl) return;
    if (!dateValue) {
      setInlineMessage(targetEl, '');
      return;
    }
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      setInlineMessage(targetEl, '');
      return;
    }
    try {
      const items = await loadHolidays(date.getFullYear(), token);
      const iso = date.toISOString().slice(0, 10);
      const match = (items || []).find((holiday) => holiday && String(holiday.date) === iso);
      if (match) {
        const name = String(match.name || match.nome || 'Feriado');
        setInlineMessage(targetEl, `Feriado nacional: ${name}.`, 'is-warning');
      } else {
        setInlineMessage(targetEl, '');
      }
    } catch (_err) {
      setInlineMessage(targetEl, '');
    }
  }

  function formatBirthDate(value) {
    if (!value) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      const [year, month, day] = String(value).split('-');
      return `${day}/${month}/${year}`;
    }
    return formatDateDisplay(value);
  }

  const META_OPEN = '<sgvc-meta>';
  const META_CLOSE = '</sgvc-meta>';

  function parseNotesMeta(value) {
    const payload = String(value || '');
    const start = payload.indexOf(META_OPEN);
    if (start === -1) {
      return { text: payload.trim(), metadata: {} };
    }
    const end = payload.indexOf(META_CLOSE, start);
    if (end === -1) {
      return { text: payload.trim(), metadata: {} };
    }
    const metaPart = payload.slice(start + META_OPEN.length, end).trim();
    let metadata = {};
    try {
      metadata = JSON.parse(metaPart);
    } catch (_err) {
      metadata = {};
    }
    const textOnly = payload.slice(0, start).trim();
    return { text: textOnly, metadata };
  }

  function formatCpf(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  function formatCnpj(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  function formatDocument(value, type) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (type === 'PF') return formatCpf(digits);
    if (type === 'PJ') return formatCnpj(digits);
    if (digits.length === 11) return formatCpf(digits);
    if (digits.length === 14) return formatCnpj(digits);
    return digits;
  }

  function getTypeLabel(type) {
    const normalized = String(type || '').trim().toUpperCase();
    if (normalized === 'PF') return 'Pessoa F\u00edsica (PF)';
    if (normalized === 'PJ') return 'Pessoa Jur\u00eddica (PJ)';
    return '';
  }

  function formatAddress(customer) {
    if (!customer) return '-';
    const street = customer.addressStreet || customer.address_street || '';
    const number = customer.addressNumber || customer.address_number || '';
    const neighborhood = customer.addressNeighborhood || customer.address_neighborhood || '';
    const city = customer.addressCity || customer.address_city || '';
    const postal = customer.addressPostalCode || customer.address_postal_code || '';
    const complement = String(customer.complement || '').trim();
    const state = String(customer.addressState || customer.address_state || '').trim().toUpperCase();
    const streetLine = [street, number].filter(Boolean).join(', ');
    const neighborhoodCity = [neighborhood, city].filter(Boolean).join(' - ');
    const stateText = state ? `UF ${state}` : '';
    const complementText = complement ? `Complemento ${complement}` : '';
    const postalText = postal ? `CEP ${postal}` : '';
    const parts = [streetLine, complementText, neighborhoodCity, stateText, postalText].filter(Boolean);
    return parts.join(' - ') || '-';
  }

  function normalizeKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function normalizeName(value) {
    return normalizeKey(value);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openPrint(details) {
    if (!details) return;
    const typeBlock =
      details.customerDetails && details.customerDetails.type
        ? `<div><div class="label">Tipo</div><div class="value">${escapeHtml(details.customerDetails.type)}</div></div>`
        : '';
    const documentBlock =
      details.customerDetails && details.customerDetails.document
        ? `<div><div class="label">${escapeHtml(details.customerDetails.documentLabel || 'Documento')}</div><div class="value">${escapeHtml(details.customerDetails.document)}</div></div>`
        : '';
    const tradeBlock =
      details.customerDetails && details.customerDetails.tradeName
        ? `<div><div class="label">Nome fantasia</div><div class="value">${escapeHtml(details.customerDetails.tradeName)}</div></div>`
        : '';
    const complementBlock =
      details.customerDetails && details.customerDetails.complement
        ? `<div><div class="label">Complemento</div><div class="value">${escapeHtml(details.customerDetails.complement)}</div></div>`
        : '';
    const stateBlock =
      details.customerDetails && details.customerDetails.state
        ? `<div><div class="label">UF</div><div class="value">${escapeHtml(details.customerDetails.state)}</div></div>`
        : '';
    const customerBlock = details.customerDetails
      ? `
          <div class="section-title">Dados do cliente</div>
          <div class="meta">
            <div><div class="label">Nome</div><div class="value">${escapeHtml(details.customerDetails.name)}</div></div>
            <div><div class="label">E-mail</div><div class="value">${escapeHtml(details.customerDetails.email)}</div></div>
            <div><div class="label">Telefone</div><div class="value">${escapeHtml(details.customerDetails.phone)}</div></div>
            ${typeBlock}
            ${documentBlock}
            <div><div class="label">Nascimento</div><div class="value">${escapeHtml(details.customerDetails.birthDate)}</div></div>
            ${tradeBlock}
            <div><div class="label">Endere\u00e7o completo</div><div class="value">${escapeHtml(details.customerDetails.address)}</div></div>
            ${complementBlock}
            <div><div class="label">Bairro</div><div class="value">${escapeHtml(details.customerDetails.neighborhood)}</div></div>
            <div><div class="label">Cidade</div><div class="value">${escapeHtml(details.customerDetails.city)}</div></div>
            ${stateBlock}
            <div><div class="label">CEP</div><div class="value">${escapeHtml(details.customerDetails.postal)}</div></div>
          </div>
        `
      : '';
    const itemsRows = details.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td style="text-align:right;">${escapeHtml(item.qty)}</td>
            <td style="text-align:right;">R$ ${escapeHtml(item.price)}</td>
            <td style="text-align:right;">R$ ${escapeHtml(item.total)}</td>
          </tr>
        `
      )
      .join('');
    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Detalhes da venda</title>
          <style>
            body { font-family: "Source Sans 3", Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .value { font-weight: 600; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
            th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
            .notes { margin-top: 16px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
            .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #475569; margin: 14px 0 8px; }
          </style>
        </head>
        <body>
          <h1>Detalhes da venda</h1>
          <div class="meta">
            <div><div class="label">Cliente</div><div class="value">${escapeHtml(details.customer)}</div></div>
            <div><div class="label">Data</div><div class="value">${escapeHtml(details.date)}</div></div>
            <div><div class="label">Status</div><div class="value">${escapeHtml(details.status)}</div></div>
            <div><div class="label">Total</div><div class="value">R$ ${escapeHtml(details.total)}</div></div>
          </div>
          ${customerBlock}
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th style="text-align:right;">Qtd</th>
                <th style="text-align:right;">Preco</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="notes">
            <div class="label">Observa\u00e7\u00f5es</div>
            <div class="value">${escapeHtml(details.notes || '-')}</div>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    // Evita document.write (desencorajado e mais difícil de auditar)
    win.document.open();
    win.document.documentElement.innerHTML = parsed.documentElement.innerHTML;
    win.document.close();
    win.focus();
    win.print();
  }

  function sanitizeFileName(value) {
    return String(value || 'venda')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function openPdf(details) {
    if (!details) return;
    const jsPdfLib = window.jspdf && window.jspdf.jsPDF ? window.jspdf : null;
    if (!jsPdfLib) {
      openPrint(details);
      return;
    }
    const doc = new jsPdfLib.jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    let y = margin;
    const accent = [15, 118, 110];
    const gray = [100, 116, 139];
    const generatedAt = new Date().toLocaleString('pt-BR');

    const addTitle = (text) => {
      doc.setFillColor(240, 253, 250);
      doc.roundedRect(margin, y - 16, pageWidth - margin * 2, 32, 8, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(text, margin + 14, y + 6);
      doc.setFontSize(10);
      doc.setTextColor(gray[0], gray[1], gray[2]);
      doc.text('SGVC', pageWidth - margin - 80, y + 2, { align: 'right' });
      doc.text(`Gerado em ${generatedAt}`, pageWidth - margin - 14, y + 14, { align: 'right' });
      doc.setTextColor(15, 23, 42);
      y += 32;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    };

    const addSection = (text) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(gray[0], gray[1], gray[2]);
      doc.text(text.toUpperCase(), margin, y);
      doc.setTextColor(15, 23, 42);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    };

    const ensureSpace = (height) => {
      if (y + height > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    addTitle('Detalhes da venda');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(details.customer || '-', margin, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', margin + 260, y);
    doc.setFont('helvetica', 'normal');
    doc.text(details.date || '-', margin + 260, y + 12);
    y += 30;
    doc.setFont('helvetica', 'bold');
    doc.text('Status', margin, y);
    doc.setFont('helvetica', 'normal');
    const statusText = details.status || '-';
    const statusLower = String(statusText).toLowerCase();
    if (statusLower.includes('cancel')) {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(5, 150, 105);
    }
    doc.text(statusText, margin, y + 12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', margin + 260, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(`R$ ${details.total || '0,00'}`, margin + 260, y + 14);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 28;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    if (details.customerDetails) {
      ensureSpace(80);
      addSection('Cliente');
      const phoneValue = formatPhone(details.customerDetails.phone);
      const normalizedPhone = phoneValue === 'N\u00e3o informado' ? '' : phoneValue;
      const fields = [
        ['Nome', details.customerDetails.name],
        ['Tipo', details.customerDetails.type],
        [details.customerDetails.documentLabel || 'Documento', details.customerDetails.document],
        ['Nome fantasia', details.customerDetails.tradeName],
        ['E-mail', details.customerDetails.email],
        ['Telefone', normalizedPhone],
        ['Nascimento', details.customerDetails.birthDate],
        ['Endere\u00e7o completo', details.customerDetails.address],
        ['Complemento', details.customerDetails.complement],
        ['Bairro', details.customerDetails.neighborhood],
        ['Cidade', details.customerDetails.city],
        ['UF', details.customerDetails.state],
        ['CEP', details.customerDetails.postal],
      ].filter((entry) => entry[1] && String(entry[1]).trim());
      const leftX = margin;
      const rightX = margin + 260;
      const colWidth = 240;
      let colY = y;
      fields.forEach((item, index) => {
        const x = index % 2 === 0 ? leftX : rightX;
        if (index % 2 === 0 && index > 0) {
          colY += 28;
          y = colY;
        }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(gray[0], gray[1], gray[2]);
        doc.text(item[0], x, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const value = doc.splitTextToSize(String(item[1]), colWidth);
        doc.text(value, x, y + 12);
      });
      y = colY + 28;
    } else {
      ensureSpace(30);
      addSection('Cliente');
      doc.text('Cliente n\u00e3o cadastrado.', margin, y);
      y += 18;
    }

    ensureSpace(80);
    addSection('Itens da venda');
    const colProduct = margin;
    const colQty = pageWidth - margin - 160;
    const colPrice = pageWidth - margin - 100;
    const colTotal = pageWidth - margin;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 4, pageWidth - margin, y + 4);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('Produto', colProduct, y);
    doc.text('Qtd', colQty, y, { align: 'right' });
    doc.text('Preco', colPrice, y, { align: 'right' });
    doc.text('Total', colTotal, y, { align: 'right' });
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    (details.items || []).forEach((item) => {
      ensureSpace(20);
      doc.text(String(item.name || '-'), colProduct, y);
      doc.text(String(item.qty || '-'), colQty, y, { align: 'right' });
      doc.text(`R$ ${String(item.price || '-')}`, colPrice, y, { align: 'right' });
      doc.text(`R$ ${String(item.total || '-')}`, colTotal, y, { align: 'right' });
      y += 16;
    });

    if (details.notes && details.notes !== '-' && details.notes !== 'Sem observa\u00e7\u00f5es.') {
      ensureSpace(40);
      addSection('Observa\u00e7\u00f5es');
      const lines = doc.splitTextToSize(String(details.notes), pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 12;
    }

    const fileBase = sanitizeFileName(`${details.customer || 'venda'}-${details.date || ''}`);
    doc.save(`${fileBase || 'venda'}.pdf`);
  }

  function normalizeStatus(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (raw === 'ACTIVE' || raw === 'ATIVA' || raw === 'ATIVO') {
      return { key: 'ATIVA', label: 'Ativa' };
    }
    if (raw === 'CANCELED' || raw === 'CANCELADA' || raw === 'CANCELADO') {
      return { key: 'CANCELADA', label: 'Cancelada' };
    }
    if (!raw) return { key: 'ATIVA', label: 'Ativa' };
    const lower = raw.toLowerCase();
    return { key: raw, label: lower.charAt(0).toUpperCase() + lower.slice(1) };
  }

  function setCustomerField(wrapper, valueEl, value, formatter) {
    if (!wrapper || !valueEl) return;
    const text = formatter ? formatter(value) : String(value || '').trim();
    if (!text || text === '-') {
      wrapper.hidden = true;
      return;
    }
    wrapper.hidden = false;
    valueEl.textContent = text;
  }

  function formatPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return digits ? 'N\u00e3o informado' : '';
  }

  function getSaleDate(sale) {
    const value = sale.date || sale.dataVenda || sale.saleDate || sale.createdAt;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isWithinPeriod(date, period) {
    if (!period || !date) return true;
    const now = new Date();
    if (period === 'today') {
      return isSameDay(date, now);
    }
    if (period === 'month') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    if (period === 'year') {
      return date.getFullYear() === now.getFullYear();
    }
    if (period === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const startMonth = quarter * 3;
      return date.getFullYear() === now.getFullYear() && date.getMonth() >= startMonth && date.getMonth() <= startMonth + 2;
    }
    const days = Number(period);
    if (!Number.isFinite(days) || days <= 0) return true;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }

  function updateTotal() {
    const total = items.reduce((sum, item) => sum + item.total, 0);
    saleTotal.textContent = `R$ ${formatPrice(total)}`;
  }

  function updateEditTotal() {
    const total = editItems.reduce((sum, item) => sum + item.total, 0);
    if (editSaleTotal) editSaleTotal.textContent = `R$ ${formatPrice(total)}`;
  }

  function renderItems() {
    itemsBody.innerHTML = '';
    items.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(item.productName || item.productId)}</td>
        <td class="has-text-right">${escapeHtml(item.qty)}</td>
        <td class="has-text-right">R$ ${formatPrice(item.price)}</td>
        <td class="has-text-right">R$ ${formatPrice(item.total)}</td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-index="${index}" aria-label="Remover item">Remover</button>
        </td>
      `;
      itemsBody.appendChild(row);
    });
    updateTotal();
  }

  function renderEditItems() {
    if (!editItemsBody) return;
    editItemsBody.innerHTML = '';
    editItems.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(item.productName || item.productId)}</td>
        <td class="has-text-right">${escapeHtml(item.qty)}</td>
        <td class="has-text-right">R$ ${formatPrice(item.price)}</td>
        <td class="has-text-right">R$ ${formatPrice(item.total)}</td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-edit-index="${index}" aria-label="Remover item">Remover</button>
        </td>
      `;
      editItemsBody.appendChild(row);
    });
    updateEditTotal();
  }

  function toggleModal(modal, isOpen) {
    if (!modal) return;
    modal.classList.toggle('is-active', isOpen);
    modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  function updatePagination(total) {
    if (!pagination) return;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    pagination.hidden = totalPages <= 1;
    if (pageInfo) {
      const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
      const end = Math.min(currentPage * PAGE_SIZE, total);
      pageInfo.textContent = `Mostrando ${start}-${end} de ${total} vendas`;
    }
    if (pageList) {
      pageList.innerHTML = '';
      const maxButtons = 5;
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxButtons - 1);
      if (end - start < maxButtons - 1) {
        start = Math.max(1, end - maxButtons + 1);
      }
      if (start > 1) {
        const first = document.createElement('button');
        first.className = 'button is-light is-small';
        first.textContent = '1';
        first.setAttribute('aria-label', 'P\u00e1gina 1');
        first.addEventListener('click', () => {
          currentPage = 1;
          renderPage();
        });
        pageList.appendChild(first);
        if (start > 2) {
          const dots = document.createElement('span');
          dots.className = 'sales-page-ellipsis';
          dots.textContent = '...';
          pageList.appendChild(dots);
        }
      }
      for (let page = start; page <= end; page += 1) {
        const btn = document.createElement('button');
        btn.className = 'button is-light is-small';
        btn.textContent = String(page);
        btn.setAttribute('aria-label', `P\u00e1gina ${page}`);
        if (page === currentPage) {
          btn.classList.add('is-link');
          btn.setAttribute('aria-current', 'page');
        }
        btn.addEventListener('click', () => {
          currentPage = page;
          renderPage();
        });
        pageList.appendChild(btn);
      }
      if (end < totalPages) {
        if (end < totalPages - 1) {
          const dots = document.createElement('span');
          dots.className = 'sales-page-ellipsis';
          dots.textContent = '...';
          pageList.appendChild(dots);
        }
        const last = document.createElement('button');
        last.className = 'button is-light is-small';
        last.textContent = String(totalPages);
        last.setAttribute('aria-label', `P\u00e1gina ${totalPages}`);
        last.addEventListener('click', () => {
          currentPage = totalPages;
          renderPage();
        });
        pageList.appendChild(last);
      }
    }
    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage === totalPages;
    if (pageJumpInput) {
      pageJumpInput.value = String(currentPage);
      pageJumpInput.max = String(totalPages);
      pageJumpInput.disabled = totalPages <= 1;
    }
    if (pageJumpBtn) pageJumpBtn.disabled = totalPages <= 1;
  }

  function renderTable(itemsList) {
    tableBody.innerHTML = '';
    if (!itemsList || !itemsList.length) {
      tableBody.innerHTML = '<tr class="sales-empty"><td colspan="6">Nenhuma venda encontrada.</td></tr>';
      return;
    }
    itemsList.forEach((sale) => {
      const row = document.createElement('tr');
      row.classList.add('sales-row');
      const statusData = normalizeStatus(sale.statusVenda || sale.status_venda || sale.status || 'ATIVA');
      const statusClass = statusData.key === 'CANCELADA' ? 'sales-status is-canceled' : 'sales-status';
      const total = sale.total || sale.valorTotal || 0;
      const canCancel = statusData.key !== 'CANCELADA';
      const customerName =
        sale.customerName ||
        sale.customer_name ||
        sale.clienteNome ||
        sale.cliente_nome ||
        '-';
      row.innerHTML = `
        <td>
          <button class="sales-customer-link" type="button" data-view-id="${sale.id}">
            ${escapeHtml(customerName)}
          </button>
        </td>
        <td>${escapeHtml(formatDateDisplay(sale.date || sale.dataVenda))}</td>
        <td class="has-text-right">R$ ${formatPrice(total)}</td>
        <td><span class="${statusClass}">${escapeHtml(statusData.label)}</span></td>
        <td class="has-text-right"><span class="sales-items">${(sale.items || sale.produtos || []).length}</span></td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-view-id="${sale.id}" title="Ver detalhes da venda">Detalhes</button>
          <button class="button is-light is-small" data-edit-id="${sale.id}" title="Alterar dados da venda">Editar</button>
          ${
            canCancel
              ? `<button class="button is-light is-small" data-cancel-id="${sale.id}" title="Cancelar venda">Cancelar</button>`
              : ''
          }
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  function renderPage() {
    const query = String(searchInput.value || '').toLowerCase();
    const statusFilter = filterStatus ? filterStatus.value : '';
    const periodFilter = filterPeriod ? filterPeriod.value : '';
    const minTotal = parseFilterMoney(filterTotalMin ? filterTotalMin.value : '');
    const maxTotal = parseFilterMoney(filterTotalMax ? filterTotalMax.value : '');
    const normalizedQuery = query.trim();
    filteredSales = salesCache.filter((sale) => {
      const name = String(
        sale.customerName || sale.customer_name || sale.clienteNome || sale.cliente_nome || ''
      ).toLowerCase();
      const statusData = normalizeStatus(sale.status || sale.statusVenda || sale.status_venda || '');
      const statusKey = statusData.key;
      const statusLabel = statusData.label.toLowerCase();
      const total = Number(sale.total || sale.valorTotal || 0);
      const date = getSaleDate(sale);

      if (normalizedQuery) {
        if (!name.includes(normalizedQuery) && !statusLabel.includes(normalizedQuery)) {
          return false;
        }
      }
      if (statusFilter && statusKey !== statusFilter) return false;
      if (!isWithinPeriod(date, periodFilter)) return false;
      if (minTotal != null && total < minTotal) return false;
      if (maxTotal != null && total > maxTotal) return false;
      return true;
    });
    const total = filteredSales.length;
    if (salesTotal) salesTotal.textContent = `(${total})`;
    updatePagination(total);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredSales.slice(start, start + PAGE_SIZE);
    renderTable(pageItems);
  }

  async function loadSales(token) {
    const data = await apiRequest('/api/sales', token);
    salesCache = Array.isArray(data) ? data : data.items || [];
    currentPage = 1;
    renderPage();
  }

  async function loadProducts(token) {
    const data = await apiRequest('/api/products', token);
    productsCache = Array.isArray(data) ? data : data.items || [];
    buildProductsMap(productsCache);
    fillProductSelect(itemProduct);
    fillProductSelect(editItemProduct);
    setPriceFromProduct(itemProduct, itemPrice);
    setPriceFromProduct(editItemProduct, editItemPrice);
    updateAddItemState(itemProduct, itemQty, itemPrice, addItemBtn);
    updateAddItemState(editItemProduct, editItemQty, editItemPrice, editAddItem);
  }

  async function loadCustomers(token) {
    const data = await apiRequest('/api/customers', token);
    const list = Array.isArray(data) ? data : data.items || [];
    buildCustomerOptions(list);
    if (createCustomer && createCustomer.value) {
      updateCustomerSelection(createCustomer.value);
    }
  }

  async function loadSummary(token) {
    try {
      const summary = await apiRequest('/api/sales/summary', token);
      if (summary && typeof summary.total === 'number') {
        showSummary(`Total de vendas ativas: R$ ${formatPrice(summary.total)}`);
      }
    } catch (_err) {
      showSummary('');
    }
  }

  const session = { token: null }; // Auth via cookie HttpOnly (não usar token no browser storage)

  // Auth: valida sessão via /api/auth/me (cookie HttpOnly)
  async function ensureAuthOrRedirect() {
    try {
      const user = await window.apiGetMe();
      if (!user) {
        window.location.href = '/';
        return null;
      }
      return user;
    } catch (_err) {
      if (_err && _err.name === 'AbortError') {
        return null;
      }
      window.location.href = '/';
      return null;
    }
  }

  // Gate de auth: só inicializa dados se estiver autenticado
  ensureAuthOrRedirect().then((user) => {
    if (!user) return;
    loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
    loadCustomers(null).catch((_err) => {});
    loadSales(null).catch((err) => showMessage(err.message, 'is-danger'));
    loadSummary(null);
  });

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

  const storedFilters = sessionStorage.getItem(SALES_FILTER_KEY);
  if (storedFilters) {
    try {
      const parsed = JSON.parse(storedFilters);
      if (filterPeriod && parsed.period) {
        if (parsed.period === 'month') {
          filterPeriod.value = 'month';
        } else if (parsed.period === 'quarter') {
          filterPeriod.value = 'quarter';
        } else if (parsed.period === 'year') {
          filterPeriod.value = 'year';
        }
      }
    } catch (_err) {
      // ignore invalid filters
    }
    sessionStorage.removeItem(SALES_FILTER_KEY);
  }

  // Carregamento inicial é feito no gate de auth (ensureAuthOrRedirect)

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showMessage('');
      ensureAuthOrRedirect().then((user) => {
        if (!user) return;
        loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
        loadCustomers(null).catch((_err) => {});
        loadSales(null).catch((err) => showMessage(err.message, 'is-danger'));
        loadSummary(null);
      });
    });
  }

  [itemQty, itemPrice].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => updateAddItemState(itemProduct, itemQty, itemPrice, addItemBtn));
  });

  [editItemQty, editItemPrice].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => updateAddItemState(editItemProduct, editItemQty, editItemPrice, editAddItem));
  });

  if (itemProduct) {
    itemProduct.addEventListener('change', () => {
      setPriceFromProduct(itemProduct, itemPrice);
      updateAddItemState(itemProduct, itemQty, itemPrice, addItemBtn);
    });
  }

  if (editItemProduct) {
    editItemProduct.addEventListener('change', () => {
      setPriceFromProduct(editItemProduct, editItemPrice);
      updateAddItemState(editItemProduct, editItemQty, editItemPrice, editAddItem);
    });
  }

  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      const productId = itemProduct.value.trim();
      const qty = Number(itemQty.value);
      const price = parsePrice(itemPrice.value);

      setFieldError(itemError, '');
      if (!productId) {
        setFieldError(itemError, 'Selecione um produto.');
        return;
      }
      if (!qty || qty <= 0 || !price) {
        setFieldError(itemError, 'Informe quantidade e pre\u00e7o v\u00e1lidos.');
        return;
      }

      const total = qty * price;
      const productName = getProductNameById(productId);
      items.push({ productId, productName, qty, price, total });
      itemProduct.value = '';
      itemQty.value = '';
      itemPrice.value = '';
      updateAddItemState(itemProduct, itemQty, itemPrice, addItemBtn);
      renderItems();
    });
  }

  if (itemsBody) {
    itemsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      if (Number.isInteger(index)) {
        items.splice(index, 1);
        renderItems();
      }
    });
  }

  if (editItemsBody) {
    editItemsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-edit-index]');
      if (!btn) return;
      const index = Number(btn.dataset.editIndex);
      if (Number.isInteger(index)) {
        editItems.splice(index, 1);
        renderEditItems();
      }
    });
  }

  if (editAddItem) {
    editAddItem.addEventListener('click', () => {
      const productId = editItemProduct.value.trim();
      const qty = Number(editItemQty.value);
      const price = parsePrice(editItemPrice.value);

      setFieldError(editItemError, '');
      if (!productId) {
        setFieldError(editItemError, 'Selecione um produto.');
        return;
      }
      if (!qty || qty <= 0 || price == null) {
        setFieldError(editItemError, 'Informe quantidade e pre\u00e7o v\u00e1lidos.');
        return;
      }

      const total = qty * price;
      const productName = getProductNameById(productId);
      editItems.push({ productId, productName, qty, price, total });
      editItemProduct.value = '';
      editItemQty.value = '';
      editItemPrice.value = '';
      updateAddItemState(editItemProduct, editItemQty, editItemPrice, editAddItem);
      renderEditItems();
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setFieldError(createDateError, '');
      setFieldError(itemError, '');

      if (!createDate.value) {
        setFieldError(createDateError, 'Informe a data da venda.');
        return;
      }
      if (!items.length) {
        setFieldError(itemError, 'Adicione pelo menos um item.');
        return;
      }

      createSubmit.classList.add('is-loading');
      createSubmit.disabled = true;
      try {
        const rawCustomer = createCustomer.value.trim();
        const match = resolveCustomerSelection(rawCustomer);
        const created = await apiRequest('/api/sales', null, {
          method: 'POST',
          body: JSON.stringify({
            customerId: match ? match.id : undefined,
            customerName: rawCustomer || undefined,
            date: createDate.value,
            paymentMethod: createPayment && createPayment.value ? createPayment.value : undefined,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.qty,
              unitPrice: item.price,
            })),
          }),
        });
        const lowStock = created && Array.isArray(created.lowStockIngredients) ? created.lowStockIngredients : [];
        if (lowStock.length) {
          showMessage(
            `Venda criada com sucesso. Atenção: ${lowStock.map((i) => i.name).join(', ')} ${
              lowStock.length === 1 ? 'chegou' : 'chegaram'
            } ao estoque mínimo.`,
            'is-warning'
          );
        } else {
          showMessage('Venda criada com sucesso.', 'is-success');
        }
        createForm.reset();
        items = [];
        renderItems();
        updateCustomerSelection('');
        showBarcodeMessage(itemBarcodeMessage, '');
        if (createDate) {
          createDate.value = formatDateInput(new Date());
          checkHoliday(createDate.value, null, createDateHoliday);
        }
        await loadSales(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        createSubmit.classList.remove('is-loading');
        createSubmit.disabled = false;
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1;
      renderPage();
    });
  }

  [filterStatus, filterPeriod, filterTotalMin, filterTotalMax].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => {
      currentPage = 1;
      renderPage();
    });
    el.addEventListener('change', () => {
      currentPage = 1;
      renderPage();
    });
  });

  if (filterClear) {
    filterClear.addEventListener('click', () => {
      if (filterStatus) filterStatus.value = '';
      if (filterPeriod) filterPeriod.value = '';
      if (filterTotalMin) filterTotalMin.value = '';
      if (filterTotalMax) filterTotalMax.value = '';
      currentPage = 1;
      renderPage();
    });
  }

  if (tableBody) {
    tableBody.addEventListener('click', async (event) => {
      const viewBtn = event.target.closest('button[data-view-id]');
      if (viewBtn) {
        const saleId = viewBtn.dataset.viewId;
        if (!saleId) return;
        try {
          const sale = await apiRequest(`/api/sales/${saleId}`, null);
          const statusData = normalizeStatus(sale.statusVenda || sale.status_venda || sale.status || 'ATIVA');
          const customerName =
            sale.customerName ||
            sale.customer_name ||
            sale.clienteNome ||
            sale.cliente_nome ||
            '-';
          if (detailsCustomer) detailsCustomer.textContent = customerName;
          if (detailsDate) detailsDate.textContent = formatDateDisplay(sale.date || sale.dataVenda);
          if (detailsPayment) detailsPayment.textContent = `Pagamento: ${paymentLabel(sale.paymentMethod)}`;
          if (detailsStatus) detailsStatus.textContent = statusData.label;
          if (detailsStatus) {
            detailsStatus.classList.toggle('is-canceled', statusData.key === 'CANCELADA');
          }
          if (detailsTotal) detailsTotal.textContent = `R$ ${formatPrice(sale.total || sale.valorTotal || 0)}`;
          if (detailsCustomerBlock) detailsCustomerBlock.hidden = true;
          if (detailsEmpty) detailsEmpty.hidden = true;
          if (detailsItems) {
            detailsItems.innerHTML = '';
            (sale.items || []).forEach((item) => {
              const productId = item.productId ?? item.idProduto ?? item.produtoId;
              const qty = Number(item.quantity || item.qtd || 0);
              const price = Number(item.unitPrice || item.priceUnit || item.precoUnitario || 0);
              const total = qty * price;
              const name =
                item.productName ||
                item.nomeProduto ||
                getProductNameById(productId) ||
                productId ||
                '-';
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${name}</td>
                <td class="has-text-right">${qty}</td>
                <td class="has-text-right">R$ ${formatPrice(price)}</td>
                <td class="has-text-right">R$ ${formatPrice(total)}</td>
              `;
              detailsItems.appendChild(row);
            });
          }
          let customerDetails = null;
          if (sale.customerId) {
            try {
              customerDetails = await apiRequest(`/api/customers/${sale.customerId}`, null);
            } catch (_err) {
              customerDetails = null;
            }
          }
          if (!customerDetails && customerName && customerName !== '-') {
            try {
              const customers = await apiRequest('/api/customers', null);
              const normalized = normalizeName(customerName);
              customerDetails = (customers || []).find((customer) => normalizeName(customer.name) === normalized) || null;
            } catch (_err) {
              customerDetails = null;
            }
          }
          let notesText = '';
          let typeLabel = '';
          let typeKey = '';
          let documentLabel = 'Documento';
          let documentFormatted = '';
          let tradeNameValue = '';
          let complementValue = '';
          let stateValue = '';
          let fullAddress = '';
          if (customerDetails) {
            const parsedNotes = parseNotesMeta(customerDetails.notes || customerDetails.note || '');
            notesText = parsedNotes.text;
            const metadata = parsedNotes.metadata || {};
            typeKey = String(metadata.type || '').trim().toUpperCase();
            typeLabel = getTypeLabel(typeKey);
            tradeNameValue = String(metadata.tradeName || '').trim();
            complementValue = String(metadata.complement || '').trim();
            stateValue = String(customerDetails.addressState || customerDetails.address_state || '').trim().toUpperCase();
            let documentSource = '';
            if (typeKey === 'PF') {
              documentSource = metadata.cpf || customerDetails.cpf || customerDetails.cnpj || '';
            } else {
              documentSource = customerDetails.cnpj || metadata.cnpj || '';
            }
            documentFormatted = formatDocument(documentSource, typeKey);
            documentLabel = typeKey === 'PF' ? 'CPF' : typeKey === 'PJ' ? 'CNPJ' : 'Documento';
            const customerWithMeta = {
              ...customerDetails,
              complement: complementValue,
              addressState: stateValue,
              address_state: stateValue,
            };
            fullAddress = formatAddress(customerWithMeta);
          }
          if (detailsCustomerBlock && customerDetails) {
            detailsCustomerBlock.hidden = false;
            if (detailsEmpty) detailsEmpty.hidden = true;
            setCustomerField(detailsFieldName, detailsName, customerDetails.name || customerName);
            setCustomerField(detailsFieldEmail, detailsEmail, customerDetails.email);
            setCustomerField(detailsFieldPhone, detailsPhone, customerDetails.phone, formatPhone);
            setCustomerField(detailsFieldType, detailsType, typeLabel);
            if (detailsFieldDocument) {
              if (detailsDocumentLabel) detailsDocumentLabel.textContent = documentLabel;
              setCustomerField(detailsFieldDocument, detailsDocument, documentFormatted);
            }
            setCustomerField(detailsFieldBirth, detailsBirth, customerDetails.birthDate, formatBirthDate);
            setCustomerField(detailsFieldTrade, detailsTrade, tradeNameValue);
            setCustomerField(detailsFieldStreet, detailsStreet, customerDetails.addressStreet);
            setCustomerField(detailsFieldNumber, detailsNumber, customerDetails.addressNumber);
            setCustomerField(detailsFieldComplement, detailsComplement, complementValue);
            setCustomerField(detailsFieldCity, detailsCity, customerDetails.addressCity);
            setCustomerField(detailsFieldNeighborhood, detailsNeighborhood, customerDetails.addressNeighborhood);
            setCustomerField(detailsFieldPostal, detailsPostal, customerDetails.addressPostalCode);
            if (detailsFullAddress) {
              detailsFullAddress.textContent = fullAddress || '-';
            }
            if (detailsAddressBlock) {
              const hasAddress = [
                customerDetails.addressStreet,
                customerDetails.addressNumber,
                customerDetails.addressNeighborhood,
                customerDetails.addressCity,
                customerDetails.addressPostalCode,
              ].some((value) => String(value || '').trim());
              detailsAddressBlock.hidden = !hasAddress;
            }
          }
          if (detailsCustomerBlock && !customerDetails) {
            detailsCustomerBlock.hidden = true;
            if (detailsEmpty) detailsEmpty.hidden = false;
          }
          if (detailsNotes) detailsNotes.textContent = notesText || 'Sem observa\u00e7\u00f5es.';
          if (detailsNotesCard) detailsNotesCard.hidden = !notesText;
          currentDetails = {
            customer: customerName,
            date: formatDateDisplay(sale.date || sale.dataVenda),
            status: statusData.label,
            total: formatPrice(sale.total || sale.valorTotal || 0),
            items: (sale.items || []).map((item) => {
              const productId = item.productId ?? item.idProduto ?? item.produtoId;
              const qty = Number(item.quantity || item.qtd || 0);
              const price = Number(item.unitPrice || item.priceUnit || item.precoUnitario || 0);
              const total = qty * price;
              const name =
                item.productName ||
                item.nomeProduto ||
                getProductNameById(productId) ||
                productId ||
                '-';
              return {
                name,
                qty: String(qty),
                price: formatPrice(price),
                total: formatPrice(total),
              };
            }),
            notes: notesText || '-',
            customerDetails: customerDetails
              ? {
                  name: customerDetails.name || customerName || '-',
                  email: customerDetails.email || '-',
                  phone: customerDetails.phone || '-',
                  birthDate: formatBirthDate(customerDetails.birthDate),
                  city: customerDetails.addressCity || '-',
                  neighborhood: customerDetails.addressNeighborhood || '-',
                  address: fullAddress || '-',
                  postal: customerDetails.addressPostalCode || '-',
                  type: typeLabel,
                  document: documentFormatted,
                  documentLabel,
                  tradeName: tradeNameValue,
                  complement: complementValue,
                  state: stateValue,
                }
              : null,
          };
          toggleModal(detailsModal, true);
        } catch (err) {
          showMessage(err.message, 'is-danger');
        }
        return;
      }

      const editBtn = event.target.closest('button[data-edit-id]');
      if (editBtn) {
        const saleId = editBtn.dataset.editId;
        if (!saleId) return;
        try {
          const sale = await apiRequest(`/api/sales/${saleId}`, null);
          editingId = saleId;
          editItems = (sale.items || []).map((item) => {
            const productId = item.productId ?? item.idProduto ?? item.produtoId;
            const qty = Number(item.quantity || item.qtd || 1);
            const price = Number(item.unitPrice || item.priceUnit || item.precoUnitario || 0);
            return {
              productId,
              productName: item.productName || item.nomeProduto || getProductNameById(productId),
              qty,
              price,
              total: qty * price,
            };
          });
          if (editDate) editDate.value = formatDateInput(sale.date || sale.dataVenda);
          if (editPayment) editPayment.value = sale.paymentMethod || '';
          if (editDateHoliday) {
            checkHoliday(editDate.value, null, editDateHoliday);
          }
          renderEditItems();
          toggleModal(editModal, true);
        } catch (err) {
          showMessage(err.message, 'is-danger');
        }
        return;
      }

      const btn = event.target.closest('button[data-cancel-id]');
      if (!btn) return;
      const saleId = btn.dataset.cancelId;
      if (!saleId) return;
      pendingCancelId = saleId;
      if (cancelConfirmBtn) cancelConfirmBtn.disabled = false;
      toggleModal(cancelModal, true);
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!editingId) return;
      setFieldError(editDateError, '');
      setFieldError(editItemError, '');

      if (!editDate.value) {
        setFieldError(editDateError, 'Informe a data da venda.');
        return;
      }
      if (!editItems.length) {
        setFieldError(editItemError, 'Adicione pelo menos um item.');
        return;
      }

      editSubmit.classList.add('is-loading');
      editSubmit.disabled = true;
      try {
        await apiRequest(`/api/sales/${editingId}`, null, {
          method: 'PUT',
          body: JSON.stringify({
            date: editDate.value,
            paymentMethod: editPayment && editPayment.value ? editPayment.value : undefined,
            items: editItems.map((item) => ({
              productId: item.productId,
              quantity: item.qty,
              unitPrice: item.price,
            })),
          }),
        });
        showMessage('Venda atualizada.', 'is-success');
        toggleModal(editModal, false);
        await loadSales(null);
        loadSummary(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        editSubmit.classList.remove('is-loading');
        editSubmit.disabled = false;
      }
    });
  }

  [editClose, editCloseBtn].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => toggleModal(editModal, false));
  });

  [detailsClose, detailsCloseBtn].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => toggleModal(detailsModal, false));
  });
  if (detailsModal) {
    detailsModal.addEventListener('click', (event) => {
      const closeBtn = event.target.closest('.modal-close-btn');
      if (closeBtn) toggleModal(detailsModal, false);
    });
  }

  if (detailsPdfBtn) {
    detailsPdfBtn.addEventListener('click', () => openPdf(currentDetails));
  }

  [cancelClose, cancelCloseBtn, cancelBackBtn].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => {
      pendingCancelId = null;
      toggleModal(cancelModal, false);
    });
  });

  if (cancelConfirmBtn) {
    cancelConfirmBtn.addEventListener('click', async () => {
      if (!pendingCancelId) return;
      cancelConfirmBtn.disabled = true;
      try {
        await apiRequest(`/api/sales/${pendingCancelId}/cancel`, null, { method: 'POST' });
        showMessage('Venda cancelada.', 'is-success');
        toggleModal(cancelModal, false);
        await loadSales(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        pendingCancelId = null;
        cancelConfirmBtn.disabled = false;
      }
    });
  }

  if (prevPage) {
    prevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderPage();
      }
    });
  }

  if (nextPage) {
    nextPage.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderPage();
      }
    });
  }

  function goToPage(targetPage) {
    const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
    const next = Math.min(Math.max(1, targetPage), totalPages);
    if (next !== currentPage) {
      currentPage = next;
      renderPage();
    }
  }

  if (pageJumpBtn) {
    pageJumpBtn.addEventListener('click', () => {
      if (!pageJumpInput) return;
      const value = Number(pageJumpInput.value);
      if (Number.isFinite(value)) {
        goToPage(Math.trunc(value));
      }
    });
  }

  if (pageJumpInput) {
    pageJumpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = Number(pageJumpInput.value);
        if (Number.isFinite(value)) {
          goToPage(Math.trunc(value));
        }
      }
    });
  }
})();
