(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const messageBox = document.getElementById('products-message');
  const backBtn = document.getElementById('back-dashboard');
  const refreshBtn = document.getElementById('refresh-list');
  const tableBody = document.getElementById('products-body');
  const nameHeader = document.getElementById('name-header');
  const priceHeader = document.getElementById('price-header');
  const searchInput = document.getElementById('search-input');
  const pagination = document.getElementById('products-pagination');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const pageList = document.getElementById('page-list');
  const productsTotal = document.getElementById('products-total');
  const pageJumpInput = document.getElementById('page-jump-input');
  const pageJumpBtn = document.getElementById('page-jump-btn');
  const filterType = document.getElementById('filter-type');
  const filterStatus = document.getElementById('filter-status');
  const filterPriceMin = document.getElementById('filter-price-min');
  const filterPriceMax = document.getElementById('filter-price-max');
  const filterClear = document.getElementById('filter-clear');

  const createForm = document.getElementById('create-form');
  const createName = document.getElementById('create-name');
  const createNameHelp = document.getElementById('create-name-help');
  const createDescription = document.getElementById('create-description');
  const createDescriptionHelp = document.getElementById('create-description-help');
  const productTypeProduced = document.getElementById('product-type-produced');
  const productTypeResale = document.getElementById('product-type-resale');
  const producedSection = document.getElementById('produced-section');
  const resaleSection = document.getElementById('resale-section');
  const createFlowHint = document.getElementById('create-flow-hint');
  const createRecipeSearch = document.getElementById('create-recipe-search');
  const createRecipeSearchHelp = document.getElementById('create-recipe-search-help');
  const createRecipeId = document.getElementById('create-recipe-id');
  const createRecipeError = document.getElementById('create-recipe-error');
  const createCostUnit = document.getElementById('create-cost-unit');
  const createPriceSuggested = document.getElementById('create-price-suggested');
  const createPriceSuggestedHelp = document.getElementById('create-price-suggested-help');
  const createFinalPrice = document.getElementById('create-final-price');
  const createFinalPriceHint = document.getElementById('create-final-price-hint');
  const createProfit = document.getElementById('create-profit');
  const createPurchasePrice = document.getElementById('create-purchase-price');
  const createPrice = document.getElementById('create-price');
  const createPriceSuggestion = document.getElementById('create-price-suggestion');
  const resaleCalcMargin = document.getElementById('resale-calc-margin');
  const resaleCalcMarkup = document.getElementById('resale-calc-markup');
  const resalePercent = document.getElementById('resale-percent');
  const resalePercentHelp = document.getElementById('resale-percent-help');
  const createStatus = document.getElementById('create-status');
  const createSubmit = document.getElementById('create-submit');
  const createNameError = document.getElementById('create-name-error');
  const createPurchasePriceError = document.getElementById('create-purchase-price-error');
  const createPriceError = document.getElementById('create-price-error');
  const productTypeCards = document.querySelectorAll('.product-type-card');
  const DELETE_FLAG = 'sgvc.productDeleted';
  const UPDATED_FLAG = 'sgvc.productUpdated';
  const RECIPE_SEARCH_LIMIT = 12;

  const PAGE_SIZE = 10;
  let currentPage = 1;
  let productsCache = [];
  let recipesCache = [];
  let sortAsc = true;
  let sortField = 'name';
  let messageTimer = null;
  let resaleCalcSource = 'percent';
  let recipeFuse = null;

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`;
    }
    return `${base}${normalizedPath}`;
  }

  // Auth via cookie HttpOnly (token não deve existir no browser storage)
  const session = { token: null };

  async function ensureAuthOrRedirect() {
    try {
      const user = await window.apiGetMe();
      if (!user) {
        window.location.href = '/';
        return null;
      }
      return user;
    } catch (_err) {
      window.location.href = '/';
      return null;
    }
  }

  function showMessage(text, type) {
    if (!messageBox) return;
    messageBox.textContent = text || '';
    messageBox.classList.remove('is-success', 'is-danger');
    if (type) messageBox.classList.add(type);
    messageBox.hidden = !text;
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }
    if (text) {
      const timeout = type === 'is-danger' ? 6500 : 4500;
      messageTimer = setTimeout(() => {
        messageBox.hidden = true;
        messageBox.textContent = '';
        messageBox.classList.remove('is-success', 'is-danger');
      }, timeout);
    }
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

  function setFieldError(input, errorEl, message) {
    if (!input) return;
    input.classList.add('is-danger');
    input.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
    }
  }

  function clearFieldError(input, errorEl) {
    if (!input) return;
    input.classList.remove('is-danger');
    input.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  function validateName(value) {
    const trimmed = String(value || '').trim();
    if (trimmed.length < 3 || trimmed.length > 120) return false;
    const nameRegex = /^[\p{L}0-9\s'\/-]+$/u;
    return nameRegex.test(trimmed);
  }

  function normalizeSpaces(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function toTitleCase(value) {
    const lower = normalizeSpaces(value).toLowerCase();
    const lowerWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'para', 'em', 'na', 'no', 'nas', 'nos', 'com']);
    return lower
      .split(' ')
      .map((word, index) => {
        if (!word) return '';
        if (index > 0 && lowerWords.has(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  function standardizeText(value, type) {
    const normalized = normalizeSpaces(value);
    if (!normalized) return '';
    if (type === 'name') {
      if (normalized === normalized.toUpperCase() || normalized === normalized.toLowerCase()) {
        return toTitleCase(normalized);
      }
      return normalized;
    }
    if (type === 'description') {
      if (normalized === normalized.toLowerCase()) {
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
      }
      return normalized;
    }
    return normalized;
  }

  function getNameGuidance(value) {
    const trimmed = normalizeSpaces(value);
    if (!trimmed) return 'Exemplo: Bolo de Chocolate 1kg.';
    if (trimmed.length < 3) return 'Use pelo menos 3 caracteres.';
    if (/^[0-9\s]+$/.test(trimmed)) return 'Inclua uma palavra para identificar o produto.';
    const allowed = /^[\p{L}0-9\s'\/-]+$/u;
    if (!allowed.test(trimmed)) return 'Use apenas letras, numeros, espacos, / ou -.';
    if (trimmed === trimmed.toUpperCase() || trimmed === trimmed.toLowerCase()) {
      return 'Dica: iniciais maiusculas deixam o nome mais profissional.';
    }
    return 'Nome valido. Prossiga com ficha tecnica ou precos.';
  }

  function updateNameGuidance(input, helpEl) {
    if (!input || !helpEl) return;
    helpEl.textContent = getNameGuidance(input.value);
  }

  function parseLocaleNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const compact = raw.replace(/\s/g, '');
    const sanitized = compact.replace(/[^0-9,.-]/g, '');
    if (!sanitized) return null;
    const hasComma = sanitized.includes(',');
    const hasDot = sanitized.includes('.');
    let normalized = sanitized;
    if (hasComma && hasDot) {
      if (sanitized.lastIndexOf(',') > sanitized.lastIndexOf('.')) {
        normalized = sanitized.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = sanitized.replace(/,/g, '');
      }
    } else if (hasComma) {
      normalized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = sanitized.replace(/,/g, '');
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  function parsePrice(value) {
    const number = parseLocaleNumber(value);
    if (!Number.isFinite(number) || number < 0) return null;
    return number;
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatCurrency(value) {
    return `R$ ${formatPrice(value)}`;
  }

  function sanitizeCurrencyInput(raw) {
    const value = String(raw ?? '');
    const cleaned = value.replace(/[^0-9,.-]/g, '');
    return cleaned;
  }

  function bindCurrencyInput(input, onValueChange) {
    if (!input) return;
    input.addEventListener('input', () => {
      const sanitized = sanitizeCurrencyInput(input.value);
      if (sanitized !== input.value) {
        input.value = sanitized;
      }
      if (typeof onValueChange === 'function') onValueChange();
    });
    input.addEventListener('focus', () => {
      const parsed = parsePrice(input.value);
      if (parsed != null) {
        input.value = formatPrice(parsed);
      }
    });
    input.addEventListener('blur', () => {
      const parsed = parsePrice(input.value);
      if (parsed != null) {
        input.value = formatCurrency(parsed);
      }
      if (typeof onValueChange === 'function') onValueChange();
    });
  }

  function getSelectedProductType() {
    if (productTypeResale && productTypeResale.checked) return 'resale';
    return 'produced';
  }

  function updateProductTypeCards() {
    productTypeCards.forEach((card) => {
      const input = card.querySelector('input[type="radio"]');
      const isChecked = input && input.checked;
      card.classList.toggle('is-selected', Boolean(isChecked));
    });
  }

  function updateFlowHint(type) {
    if (!createFlowHint) return;
    if (type === 'produced') {
      createFlowHint.innerHTML =
        '<strong>Fluxo guiado:</strong> selecione a ficha tecnica, valide o preco sugerido e ajuste se necessario.';
      return;
    }
    createFlowHint.innerHTML =
      '<strong>Fluxo guiado:</strong> informe o custo de compra, escolha a regra e confirme o preco de venda.';
  }

  function setProductType(type) {
    const isProduced = type === 'produced';
    if (producedSection) producedSection.hidden = !isProduced;
    if (resaleSection) resaleSection.hidden = isProduced;
    if (createRecipeId) {
      createRecipeId.toggleAttribute('required', isProduced);
      if (isProduced) {
        createRecipeId.setAttribute('aria-required', 'true');
      } else {
        createRecipeId.removeAttribute('aria-required');
        createRecipeId.classList.remove('is-danger');
      }
    }
    if (createPurchasePrice) createPurchasePrice.toggleAttribute('required', !isProduced);
    if (createPrice) createPrice.toggleAttribute('required', !isProduced);
    if (createRecipeError) {
      createRecipeError.textContent = '';
      createRecipeError.hidden = true;
    }
    updateProductTypeCards();
    updateFlowHint(type);
    if (isProduced) {
      updateProducedPricing();
    } else {
      updateResalePercentHelp();
      applyResalePricingRule();
      updateResaleProfit();
    }
  }

  function updateRecipeSelect(list = recipesCache) {
    if (!createRecipeId) return;
    const selectedId = createRecipeId.value;
    createRecipeId.innerHTML = '<option value="">Selecione uma ficha t\u00e9cnica</option>';
    // Garante que list seja um array válido
    const validList = Array.isArray(list) ? list : [];
    validList.forEach((recipe) => {
      if (!recipe || !recipe.id) return;
      const option = document.createElement('option');
      option.value = recipe.id;
      option.textContent = recipe.name || recipe.nomeReceita || 'Ficha t\u00e9cnica';
      createRecipeId.appendChild(option);
    });
    if (selectedId) {
      const selectedExists = validList.some((recipe) => recipe && recipe.id === selectedId);
      if (!selectedExists && Array.isArray(recipesCache)) {
        const selectedRecipe = recipesCache.find((recipe) => recipe && recipe.id === selectedId);
        if (selectedRecipe) {
          const option = document.createElement('option');
          option.value = selectedRecipe.id;
          option.textContent = `${selectedRecipe.name || selectedRecipe.nomeReceita || 'Ficha t\u00e9cnica'} (selecionada)`;
          createRecipeId.appendChild(option);
        }
      }
      createRecipeId.value = selectedId;
    }
  }

  function buildRecipeFuse() {
    if (typeof window.Fuse === 'undefined') {
      recipeFuse = null;
      return;
    }
    // Garante que recipesCache seja um array válido
    const validCache = Array.isArray(recipesCache) ? recipesCache : [];
    recipeFuse = new window.Fuse(validCache, {
      keys: ['name', 'nomeReceita'],
      threshold: 0.3,
    });
  }

  function normalizeSearch(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function applyRecipeSearch() {
    if (!createRecipeSearch) return;
    // Garante que recipesCache seja um array válido
    const validCache = Array.isArray(recipesCache) ? recipesCache : [];
    const query = normalizeSearch(createRecipeSearch.value);
    if (!query) {
      const total = validCache.length;
      const limited = validCache.slice(0, RECIPE_SEARCH_LIMIT);
      updateRecipeSelect(limited);
      if (createRecipeSearchHelp) {
        createRecipeSearchHelp.textContent = `Exibindo ${limited.length} de ${total} fichas tecnicas.`;
      }
      return;
    }
    let results = [];
    if (recipeFuse) {
      // Valida que recipeFuse.search() retorne um Array antes de chamar .map()
      const searchResults = recipeFuse.search(query);
      if (Array.isArray(searchResults)) {
        results = searchResults.map((item) => item.item);
      } else {
        // Fallback para filtro manual se recipeFuse.search() retornar valor inválido
        results = validCache.filter((recipe) => {
          if (!recipe) return false;
          const label = normalizeSearch(recipe.name || recipe.nomeReceita || '');
          return label.includes(query);
        });
      }
    } else {
      results = validCache.filter((recipe) => {
        if (!recipe) return false;
        const label = normalizeSearch(recipe.name || recipe.nomeReceita || '');
        return label.includes(query);
      });
    }
    const total = results.length;
    const limited = results.slice(0, RECIPE_SEARCH_LIMIT);
    updateRecipeSelect(limited);
    if (createRecipeSearchHelp) {
      createRecipeSearchHelp.textContent = total
        ? `Exibindo ${limited.length} de ${total} fichas encontradas.`
        : 'Nenhuma ficha tecnica encontrada. Ajuste o termo.';
    }
  }

  function getSelectedRecipe() {
    if (!createRecipeId) return null;
    const id = createRecipeId.value;
    // Garante que recipesCache seja um array válido
    if (!Array.isArray(recipesCache)) return null;
    return recipesCache.find((recipe) => recipe && recipe.id === id) || null;
  }

  function updateFinalPriceHint(customized) {
    if (!createFinalPriceHint) return;
    if (customized) {
      createFinalPriceHint.innerHTML = '<span class="final-price-badge">Pre\u00e7o personalizado</span>';
      return;
    }
    createFinalPriceHint.textContent = 'Se deixar vazio, o sistema usa o pre\u00e7o sugerido.';
  }

  function updateProducedSuggestionHelp(costUnit, suggested) {
    if (!createPriceSuggestedHelp) return;
    if (!Number.isFinite(costUnit) || !Number.isFinite(suggested) || suggested <= 0) {
      createPriceSuggestedHelp.textContent = 'O preco sugerido sera calculado a partir da ficha tecnica.';
      return;
    }
    if (costUnit > 0) {
      const margin = ((suggested - costUnit) / costUnit) * 100;
      const formattedMargin = Number.isFinite(margin) ? `${margin.toFixed(0)}%` : '';
      createPriceSuggestedHelp.textContent = `Base: custo ${formatCurrency(costUnit)} + ${formattedMargin} = ${formatCurrency(
        suggested
      )}.`;
      return;
    }
    createPriceSuggestedHelp.textContent = `Base calculada pela ficha: ${formatCurrency(suggested)}.`;
  }

  function updateProducedPricing() {
    const recipe = getSelectedRecipe();
    if (!createCostUnit || !createPriceSuggested) return;
    if (!recipe) {
      createCostUnit.textContent = '-';
      createPriceSuggested.textContent = '-';
      if (createRecipeId) {
        createRecipeId.classList.remove('is-danger');
      }
      if (createPurchasePrice) createPurchasePrice.value = '';
      if (createPrice) createPrice.value = '';
      if (createFinalPrice && createFinalPrice.value) {
        createFinalPrice.value = '';
      }
      if (createRecipeError) {
        createRecipeError.textContent = '';
        createRecipeError.hidden = true;
      }
      updateProducedSuggestionHelp(null, null);
      updateFinalPriceHint(false);
      return;
    }
    const costUnit = Number(recipe.costPerUnit ?? recipe.custoUnitarioFinal ?? 0);
    const suggested = Number(recipe.priceSuggested ?? recipe.preco_minimo_sugerido ?? 0);
    createCostUnit.textContent = formatCurrency(costUnit);
    createPriceSuggested.textContent = formatCurrency(suggested);
    updateProducedSuggestionHelp(costUnit, suggested);
    if (createPurchasePrice) createPurchasePrice.value = formatCurrency(costUnit);
    const override = parsePrice(createFinalPrice ? createFinalPrice.value : null);
    const finalPrice = Number.isFinite(override) ? override : suggested;
    if (createPrice) createPrice.value = formatCurrency(finalPrice);
    updateFinalPriceHint(override != null && override !== suggested);
  }

  function updateResaleProfit() {
    if (!createProfit) return;
    const purchase = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
    const price = parsePrice(createPrice ? createPrice.value : null);
    if (purchase == null || price == null) {
      createProfit.textContent = '-';
      return;
    }
    const profit = price - purchase;
    const percentOnCost = purchase > 0 ? (profit / purchase) * 100 : 0;
    const percentOnSale = price > 0 ? (profit / price) * 100 : 0;
    const mode = resaleCalcMarkup && resaleCalcMarkup.checked ? 'markup' : 'margin';
    const percentValue = mode === 'markup' ? percentOnCost : percentOnSale;
    const label = mode === 'markup' ? 'sobre custo' : 'sobre venda';
    createProfit.textContent = `${formatCurrency(profit)} (${percentValue.toFixed(0)}% ${label})`;
  }

  function getResaleCalcMode() {
    return resaleCalcMarkup && resaleCalcMarkup.checked ? 'markup' : 'margin';
  }

  function updateResalePercentHelp() {
    if (!resalePercentHelp) return;
    const mode = getResaleCalcMode();
    resalePercentHelp.textContent =
      mode === 'markup'
        ? 'Percentual sobre o custo de compra.'
        : 'Margem sobre o pre\u00e7o de venda.';
  }

  function updateResaleSuggestionHelp() {
    if (!createPriceSuggestion) return;
    const purchase = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
    const percent = parsePrice(resalePercent ? resalePercent.value : null);
    const price = parsePrice(createPrice ? createPrice.value : null);
    if (purchase == null || percent == null) {
      createPriceSuggestion.textContent = 'Informe o custo e o percentual para visualizar a sugestao.';
      return;
    }
    const mode = getResaleCalcMode();
    let suggestedPrice = price;
    if (suggestedPrice == null) {
      if (mode === 'markup') {
        suggestedPrice = purchase * (1 + percent / 100);
      } else if (percent < 100) {
        suggestedPrice = purchase / (1 - percent / 100);
      }
    }
    if (suggestedPrice == null) {
      createPriceSuggestion.textContent = '';
      return;
    }
    const label = mode === 'markup' ? 'markup' : 'margem';
    createPriceSuggestion.textContent = `Sugestao: compra ${formatCurrency(purchase)} + ${label} ${percent.toFixed(
      0
    )}% = ${formatCurrency(suggestedPrice)}.`;
  }

  function applyResalePricingRule() {
    const purchase = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
    const percent = parsePrice(resalePercent ? resalePercent.value : null);
    if (purchase == null || percent == null) return;
    const mode = getResaleCalcMode();
    let price = null;
    if (mode === 'markup') {
      price = purchase * (1 + percent / 100);
    } else {
      if (percent >= 100) return;
      price = purchase / (1 - percent / 100);
    }
    if (createPrice) createPrice.value = formatCurrency(price);
    updateResaleProfit();
    updateResaleSuggestionHelp();
  }

  function syncPercentFromPrice() {
    const purchase = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
    const price = parsePrice(createPrice ? createPrice.value : null);
    if (purchase == null || price == null || !resalePercent) return;
    const profit = price - purchase;
    const mode = getResaleCalcMode();
    const percent = mode === 'markup'
      ? purchase > 0 ? (profit / purchase) * 100 : 0
      : price > 0 ? (profit / price) * 100 : 0;
    resalePercent.value = percent.toFixed(0);
    updateResaleProfit();
    updateResaleSuggestionHelp();
  }

  function updateSortLabel() {
    if (!nameHeader) return;
    if (sortField === 'name') {
      nameHeader.textContent = sortAsc ? 'Nome A-Z' : 'Nome Z-A';
      nameHeader.setAttribute('aria-sort', sortAsc ? 'ascending' : 'descending');
    } else {
      nameHeader.textContent = 'Nome';
      nameHeader.setAttribute('aria-sort', 'none');
    }
    if (priceHeader) {
      priceHeader.setAttribute('aria-sort', sortField === 'price' ? (sortAsc ? 'ascending' : 'descending') : 'none');
    }
  }

  function getFilteredItems() {
    const query = String(searchInput ? searchInput.value : '').toLowerCase();
    const typeValue = String(filterType ? filterType.value : '').toLowerCase();
    const statusValue = String(filterStatus ? filterStatus.value : '').toUpperCase();
    const minPrice = parsePrice(filterPriceMin ? filterPriceMin.value : null);
    const maxPrice = parsePrice(filterPriceMax ? filterPriceMax.value : null);
    const baseList = productsCache.slice().sort((a, b) => {
      if (sortField === 'price') {
        const aPrice = Number(a.price ?? a.precoVenda ?? 0);
        const bPrice = Number(b.price ?? b.precoVenda ?? 0);
        const order = aPrice - bPrice;
        return sortAsc ? order : -order;
      }
      const aName = String(a.name || '');
      const bName = String(b.name || '');
      const order = aName.localeCompare(bName, 'pt-BR', { sensitivity: 'base' });
      return sortAsc ? order : -order;
    });
    return baseList.filter((product) => {
      const name = String(product.name || '').toLowerCase();
      const description = String(product.description || '').toLowerCase();
      const matchesQuery = !query || name.includes(query) || description.includes(query);
      if (!matchesQuery) return false;

      if (statusValue) {
        const status = String(product.status || product.status_produto || 'ATIVO').toUpperCase();
        if (status !== statusValue) return false;
      }

      if (typeValue) {
        const typeRaw = (product.productType || product.product_type || '').toString().toLowerCase();
        const hasRecipe = Boolean(product.fichaTecnicaId || product.ficha_tecnica_id);
        const inferred = typeRaw ? typeRaw : hasRecipe ? 'produced' : 'resale';
        if (inferred !== typeValue) return false;
      }

      const priceValue = Number(product.price ?? product.precoVenda ?? 0);
      if (minPrice != null && priceValue < minPrice) return false;
      if (maxPrice != null && priceValue > maxPrice) return false;

      return true;
    });
  }

  function updatePagination(total) {
    if (!pagination) return;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    pagination.hidden = totalPages <= 1;
    if (pageInfo) {
      const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
      const end = Math.min(currentPage * PAGE_SIZE, total);
      pageInfo.textContent = `Mostrando ${start}-${end} de ${total} produtos`;
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
          dots.className = 'products-page-ellipsis';
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
          dots.className = 'products-page-ellipsis';
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

  function renderTable(items) {
    tableBody.innerHTML = '';
    if (!items || !items.length) {
      tableBody.innerHTML =
        '<tr class="products-empty"><td colspan="7">Nenhum produto encontrado. Tente buscar por outro nome.</td></tr>';
      return;
    }
    items.forEach((product) => {
      const row = document.createElement('tr');
      row.classList.add('products-row');
      const safeName = product.name || 'Sem nome';
      const status = (product.status || product.status_produto || 'ATIVO').toUpperCase();
      const statusClass = status === 'INATIVO' ? 'products-status is-inactive' : 'products-status';
      const priceValue = product.price ?? product.precoVenda ?? 0;
      const typeValue = (product.productType || product.product_type || '').toString().toLowerCase();
      const hasRecipe = Boolean(product.fichaTecnicaId || product.ficha_tecnica_id);
      const isProduced = typeValue === 'produced' ? true : typeValue === 'resale' ? false : hasRecipe;
      const typeClass = isProduced ? 'products-type is-produced' : 'products-type is-resale';
      const typeLabel = isProduced ? 'Produzido' : 'Revenda';
      const recipeName = Array.isArray(recipesCache) && recipesCache.length > 0
        ? (recipesCache.find((recipe) => recipe && recipe.id === (product.fichaTecnicaId || product.ficha_tecnica_id))?.name || '-')
        : '-';
      row.innerHTML = `
        <td>
          <button
            class="products-name-link"
            type="button"
            data-id="${product.id}"
            aria-label="Editar produto ${escapeHtml(safeName)}"
          >
            ${escapeHtml(safeName)}
          </button>
        </td>
        <td>${escapeHtml(product.description || '-')}</td>
        <td><span class="${typeClass}">${typeLabel}</span></td>
        <td>${escapeHtml(recipeName)}</td>
        <td class="has-text-right">R$ ${formatPrice(priceValue)}</td>
        <td><span class="${statusClass}">${escapeHtml(status)}</span></td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-edit-id="${product.id}">Editar</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  function renderPage() {
    const filtered = getFilteredItems();
    const total = filtered.length;
    if (productsTotal) {
      productsTotal.textContent = `(${total})`;
    }
    updatePagination(total);
    updateSortLabel();
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    renderTable(pageItems);
  }

  async function loadProducts(token) {
    try {
      const data = await apiRequest('/api/products', token);
      productsCache = Array.isArray(data) ? data : (data && data.items && Array.isArray(data.items) ? data.items : []);
      currentPage = 1;
      renderPage();
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return;
      }
      // Em caso de erro, garante que productsCache seja um array vazio
      productsCache = [];
      if (err && (err.status === 401 || err.status === 403)) {
        // Erro de autenticação - redireciona para login
        window.location.href = '/';
        return;
      }
      // Para outros erros, renderiza página vazia
      currentPage = 1;
      renderPage();
      throw err; // Re-lança para tratamento pelo chamador
    }
  }

  async function loadRecipes(token) {
    try {
      const data = await apiRequest('/api/recipes', token);
      recipesCache = Array.isArray(data) ? data : (data && data.items && Array.isArray(data.items) ? data.items : []);
      buildRecipeFuse();
      applyRecipeSearch();
      updateProducedPricing();
      renderPage();
    } catch (err) {
      // Em caso de erro (incluindo 401), garante que recipesCache seja um array vazio
      recipesCache = [];
      buildRecipeFuse();
      applyRecipeSearch();
      updateProducedPricing();
      // Se for erro de autenticação, não renderiza a página (será redirecionado)
      if (err && err.status !== 401 && err.status !== 403) {
        renderPage();
      }
      // Re-lança o erro para ser tratado pelo catch do chamador
      return Promise.reject(err);
    }
  }

  ensureAuthOrRedirect().then((user) => {
    if (!user) return;

    const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
    if (deletedFlag) {
      sessionStorage.removeItem(DELETE_FLAG);
      showMessage('Produto removido com sucesso.', 'is-success');
    }

    const updatedFlag = sessionStorage.getItem(UPDATED_FLAG);
    if (updatedFlag) {
      sessionStorage.removeItem(UPDATED_FLAG);
      showMessage('Produto atualizado.', 'is-success');
    }

    loadProducts(null).catch((err) => {
      if (err && err.name === 'AbortError') {
        return;
      }
      if (err && (err.status === 401 || err.status === 403)) {
        window.location.href = '/';
        return;
      }
      showMessage(err && err.message ? err.message : 'Erro ao carregar produtos.', 'is-danger');
    });
    loadRecipes(null).catch((err) => {
      if (err && err.name === 'AbortError') {
        return;
      }
      if (err && (err.status === 401 || err.status === 403)) {
        window.location.href = '/';
        return;
      }
      showMessage(err && err.message ? err.message : 'Erro ao carregar fichas técnicas.', 'is-danger');
    });
  });

  // carregamento inicial agora ocorre no gate de auth (ensureAuthOrRedirect)

  window.addEventListener('pageshow', (event) => {
    const flag = sessionStorage.getItem(UPDATED_FLAG);
    if (flag) {
      sessionStorage.removeItem(UPDATED_FLAG);
      showMessage('Produto atualizado.', 'is-success');
      loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
      return;
    }
    if (event.persisted) {
      loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
    }
  });

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
      });
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = standardizeText(createName.value, 'name');
      const description = standardizeText(createDescription.value, 'description');
      createName.value = name;
      createDescription.value = description;
      const productType = getSelectedProductType();
      const purchasePriceValue = parsePrice(createPurchasePrice ? createPurchasePrice.value : null);
      const priceValue = parsePrice(createPrice ? createPrice.value : null);
      const status = createStatus.value;

      clearFieldError(createName, createNameError);
      clearFieldError(createPurchasePrice, createPurchasePriceError);
      clearFieldError(createPrice, createPriceError);

      if (!validateName(name)) {
        setFieldError(createName, createNameError, 'Nome deve ter 3 a 120 caracteres.');
        return;
      }
      if (productType === 'produced') {
    const recipe = getSelectedRecipe();
    if (!recipe) {
      if (createRecipeError) {
        createRecipeError.textContent = 'Selecione uma ficha t\u00e9cnica.';
        createRecipeError.hidden = false;
      }
      if (createRecipeId) {
        createRecipeId.classList.add('is-danger');
        createRecipeId.focus();
      }
      return;
    }
        updateProducedPricing();
        if (parsePrice(createPurchasePrice.value) == null) {
          setFieldError(createPurchasePrice, createPurchasePriceError, 'Informe o pre\u00e7o de compra.');
          return;
        }
        if (parsePrice(createPrice.value) == null) {
          setFieldError(createPrice, createPriceError, 'Informe o pre\u00e7o de venda.');
          return;
        }
      } else {
        if (purchasePriceValue == null) {
          setFieldError(createPurchasePrice, createPurchasePriceError, 'Informe o pre\u00e7o de compra.');
          return;
        }
        if (priceValue == null) {
          setFieldError(createPrice, createPriceError, 'Informe o pre\u00e7o de venda.');
          return;
        }
      }

      createSubmit.classList.add('is-loading');
      createSubmit.disabled = true;
      try {
        const payload = {
          name,
          description,
          purchase_price: parsePrice(createPurchasePrice.value),
          price: parsePrice(createPrice.value),
          status,
          statusProduto: status,
          productType,
        };
        if (productType === 'produced') {
          payload.fichaTecnicaId = createRecipeId ? createRecipeId.value : null;
        }
        await apiRequest('/api/products', null, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showMessage('Produto criado com sucesso.', 'is-success');
        createForm.reset();
        setProductType(getSelectedProductType());
        updateProducedPricing();
        updateResaleProfit();
        await loadProducts(null);
      } catch (err) {
        showMessage((err && err.message ? err.message : 'Erro ao cadastrar produto.'), 'is-danger');
      } finally {
        createSubmit.classList.remove('is-loading');
        createSubmit.disabled = false;
      }
    });
  }

  if (tableBody) {
    tableBody.addEventListener('click', (event) => {
      const btn = event.target.closest('.products-name-link');
      const editBtn = event.target.closest('button[data-edit-id]');
      const id = (btn && btn.dataset.id) || (editBtn && editBtn.dataset.editId);
      if (!id) return;
      window.location.href = `/product-edit.html?id=${encodeURIComponent(id)}`;
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1;
      renderPage();
    });
  }

  [filterType, filterStatus, filterPriceMin, filterPriceMax].forEach((el) => {
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
      if (filterType) filterType.value = '';
      if (filterStatus) filterStatus.value = '';
      if (filterPriceMin) filterPriceMin.value = '';
      if (filterPriceMax) filterPriceMax.value = '';
      currentPage = 1;
      renderPage();
    });
  }

  if (nameHeader) {
    nameHeader.addEventListener('click', () => {
      sortField = 'name';
      sortAsc = !sortAsc;
      currentPage = 1;
      renderPage();
    });
  }

  if (priceHeader) {
    priceHeader.addEventListener('click', () => {
      if (sortField !== 'price') {
        sortField = 'price';
        sortAsc = false;
      } else {
        sortAsc = !sortAsc;
      }
      currentPage = 1;
      renderPage();
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
      const totalPages = Math.ceil(getFilteredItems().length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderPage();
      }
    });
  }

  function goToPage(targetPage) {
    const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / PAGE_SIZE));
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

  if (createName) {
    createName.addEventListener('input', () => {
      if (validateName(createName.value)) {
        clearFieldError(createName, createNameError);
      }
      updateNameGuidance(createName, createNameHelp);
    });
    createName.addEventListener('blur', () => {
      const standardized = standardizeText(createName.value, 'name');
      if (standardized !== createName.value) {
        createName.value = standardized;
      }
      updateNameGuidance(createName, createNameHelp);
    });
    updateNameGuidance(createName, createNameHelp);
  }

  if (createDescription) {
    createDescription.addEventListener('blur', () => {
      const standardized = standardizeText(createDescription.value, 'description');
      if (standardized !== createDescription.value) {
        createDescription.value = standardized;
      }
    });
  }

  if (createPrice) {
    bindCurrencyInput(createPrice, () => {
      resaleCalcSource = 'price';
      if (parsePrice(createPrice.value) != null) {
        clearFieldError(createPrice, createPriceError);
      }
      syncPercentFromPrice();
    });
  }

  if (createPurchasePrice) {
    bindCurrencyInput(createPurchasePrice, () => {
      if (parsePrice(createPurchasePrice.value) != null) {
        clearFieldError(createPurchasePrice, createPurchasePriceError);
      }
      if (resaleCalcSource === 'price') {
        syncPercentFromPrice();
      } else {
        applyResalePricingRule();
      }
    });
  }

  if (createFinalPrice) {
    bindCurrencyInput(createFinalPrice, () => updateProducedPricing());
  }

  if (createRecipeSearch) {
    createRecipeSearch.addEventListener('input', () => {
      applyRecipeSearch();
    });
  }

  if (createRecipeId) {
    createRecipeId.addEventListener('change', () => {
      if (createRecipeError) {
        createRecipeError.textContent = '';
        createRecipeError.hidden = true;
      }
      createRecipeId.classList.remove('is-danger');
      updateProducedPricing();
    });
  }

  if (productTypeProduced) {
    productTypeProduced.addEventListener('change', () => setProductType('produced'));
  }
  if (productTypeResale) {
    productTypeResale.addEventListener('change', () => setProductType('resale'));
  }

  [resaleCalcMargin, resaleCalcMarkup].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      resaleCalcSource = 'percent';
      updateResalePercentHelp();
      applyResalePricingRule();
    });
  });

  if (resalePercent) {
    resalePercent.addEventListener('input', () => {
      resaleCalcSource = 'percent';
      applyResalePricingRule();
    });
    resalePercent.addEventListener('blur', () => {
      const parsed = parsePrice(resalePercent.value);
      if (parsed != null) {
        resalePercent.value = parsed.toFixed(0);
      }
      applyResalePricingRule();
    });
  }

  if (filterPriceMin) {
    bindCurrencyInput(filterPriceMin, renderPage);
  }
  if (filterPriceMax) {
    bindCurrencyInput(filterPriceMax, renderPage);
  }

  setProductType(getSelectedProductType());
  updateResaleProfit();
  updateResalePercentHelp();
  updateResaleSuggestionHelp();
  updateProductTypeCards();

  // Event listeners dos botões principais
  function handleAuthFailure(err) {
    if (!err || (err.status !== 401 && err.status !== 403)) return false;
    window.location.href = '/';
    return true;
  }

  function normalizeError(err) {
    if (window.SGVCErrorHandler && window.SGVCErrorHandler.normalizeApiError) {
      return window.SGVCErrorHandler.normalizeApiError(err);
    }
    return err && err.message ? err.message : 'Erro ao processar solicitação. Tente novamente.';
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showMessage('');
      refreshBtn.classList.add('is-loading');
      refreshBtn.disabled = true;
      ensureAuthOrRedirect()
        .then((user) => {
          if (!user) return Promise.resolve();
          return Promise.all([loadProducts(null), loadRecipes(null)]);
        })
        .catch((err) => {
        if (handleAuthFailure(err)) return;
        const friendlyMessage = normalizeError(err);
        showMessage(friendlyMessage || 'Erro ao atualizar produtos. Tente novamente.', 'is-danger');
      })
        .finally(() => {
        refreshBtn.classList.remove('is-loading');
        refreshBtn.disabled = false;
      });
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
      const filtered = getFilteredItems();
      const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderPage();
      }
    });
  }

  if (pageJumpBtn && pageJumpInput) {
    pageJumpBtn.addEventListener('click', () => {
      const value = Number(pageJumpInput.value);
      if (Number.isFinite(value) && value > 0) {
        const filtered = getFilteredItems();
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        const targetPage = Math.min(Math.max(1, Math.trunc(value)), totalPages);
        currentPage = targetPage;
        renderPage();
      }
    });

    pageJumpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        pageJumpBtn.click();
      }
    });
  }

  if (searchInput) {
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        renderPage();
      }, 300);
    });
  }

  if (nameHeader) {
    nameHeader.addEventListener('click', () => {
      if (sortField !== 'name') {
        sortField = 'name';
        sortAsc = true;
      } else {
        sortAsc = !sortAsc;
      }
      currentPage = 1;
      renderPage();
    });
  }

  if (priceHeader) {
    priceHeader.addEventListener('click', () => {
      if (sortField !== 'price') {
        sortField = 'price';
        sortAsc = false;
      } else {
        sortAsc = !sortAsc;
      }
      currentPage = 1;
      renderPage();
    });
  }

  if (filterType) {
    filterType.addEventListener('change', () => {
      currentPage = 1;
      renderPage();
    });
  }

  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      currentPage = 1;
      renderPage();
    });
  }

  if (filterClear) {
    filterClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (filterType) filterType.value = '';
      if (filterStatus) filterStatus.value = '';
      if (filterPriceMin) filterPriceMin.value = '';
      if (filterPriceMax) filterPriceMax.value = '';
      currentPage = 1;
      renderPage();
    });
  }

  // Event listeners para botões de editar na tabela
  if (tableBody) {
    tableBody.addEventListener('click', (event) => {
      const editBtn = event.target.closest('[data-edit-id]');
      const nameLink = event.target.closest('[data-id]');
      
      if (editBtn) {
        const productId = editBtn.getAttribute('data-edit-id');
        if (productId) {
          window.location.href = `/product-edit.html?id=${productId}`;
        }
      } else if (nameLink) {
        const productId = nameLink.getAttribute('data-id');
        if (productId) {
          window.location.href = `/product-edit.html?id=${productId}`;
        }
      }
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!createSubmit || createSubmit.disabled) return;

      // Validações básicas
      const name = createName ? createName.value.trim() : '';
      const selectedType = getSelectedProductType();

      if (!name || name.length < 3) {
        showMessage('Nome do produto é obrigatório (mínimo 3 caracteres).', 'is-danger');
        if (createName) {
          createName.focus();
          setFieldError(createName, createNameError, 'Nome obrigatório (mín. 3 caracteres).');
        }
        return;
      }

      let purchasePrice = null;
      if (selectedType === 'resale' && createPurchasePrice) {
        purchasePrice = parsePrice(createPurchasePrice.value);
        if (purchasePrice == null || purchasePrice <= 0) {
          showMessage('Preço de compra é obrigatório para produtos de revenda.', 'is-danger');
          if (createPurchasePrice) {
            createPurchasePrice.focus();
            setFieldError(createPurchasePrice, createPurchasePriceError, 'Preço de compra obrigatório.');
          }
          return;
        }
      }

      let price = null;
      if (createPrice) {
        price = parsePrice(createPrice.value);
        if (price == null || price <= 0) {
          showMessage('Preço de venda é obrigatório.', 'is-danger');
          if (createPrice) {
            createPrice.focus();
            setFieldError(createPrice, createPriceError, 'Preço de venda obrigatório.');
          }
          return;
        }
      }

      // Preparar dados
      createSubmit.disabled = true;
      createSubmit.classList.add('is-loading');
      const originalText = createSubmit.textContent;
      createSubmit.textContent = 'Criando...';

      try {
        const productData = {
          name,
          description: createDescription ? createDescription.value.trim() : null,
          price,
          purchase_price: purchasePrice,
          status: createStatus ? createStatus.value || 'ATIVO' : 'ATIVO',
          product_type: selectedType,
        };

        if (selectedType === 'produced' && createRecipeId && createRecipeId.value) {
          productData.ficha_tecnica_id = createRecipeId.value;
        }

        await apiRequest('/api/products', null, {
          method: 'POST',
          body: JSON.stringify(productData),
        });

        showMessage('Produto criado com sucesso!', 'is-success');
        createForm.reset();
        setProductType(getSelectedProductType());
        updateResaleProfit();
        updateResalePercentHelp();
        updateResaleSuggestionHelp();
        updateProductTypeCards();
        
        // Recarregar lista
        await loadProducts(null);
        await loadRecipes(null);
      } catch (err) {
        if (handleAuthFailure(err)) return;
        const friendlyMessage = normalizeError(err);
        showMessage(friendlyMessage || 'Erro ao criar produto. Tente novamente.', 'is-danger');
      } finally {
        createSubmit.disabled = false;
        createSubmit.classList.remove('is-loading');
        createSubmit.textContent = originalText;
      }
    });
  }
})();
