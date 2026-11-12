(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

  const messageBox = document.getElementById('recipes-message');
  const backBtn = document.getElementById('back-dashboard');
  const refreshBtn = document.getElementById('refresh-list');
  const tableBody = document.getElementById('recipes-body');
  const searchInput = document.getElementById('search-input');
  const pagination = document.getElementById('recipes-pagination');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const pageList = document.getElementById('page-list');
  const recipesTotal = document.getElementById('recipes-total');
  const pageJumpInput = document.getElementById('page-jump-input');
  const pageJumpBtn = document.getElementById('page-jump-btn');

  const createForm = document.getElementById('create-form');
  const createName = document.getElementById('create-name');
  const createDescription = document.getElementById('create-description');
  const createYield = document.getElementById('create-yield');
  const createYieldType = document.getElementById('create-yield-type');
  const createOverhead = document.getElementById('create-overhead');
  const createOverheadWarning = document.getElementById('create-overhead-warning');
  const createOverheadSuggestions = document.getElementById('create-overhead-suggestions');
  const overheadItemName = document.getElementById('overhead-item-name');
  const overheadItemValue = document.getElementById('overhead-item-value');
  const overheadAddBtn = document.getElementById('overhead-add');
  const overheadBody = document.getElementById('overhead-body');
  const overheadTotalEl = document.getElementById('overhead-total');
  const overheadError = document.getElementById('overhead-error');
  const createMargin = document.getElementById('create-margin');
  const createMarginSuggestions = document.getElementById('create-margin-suggestions');
  const createProfitFixed = document.getElementById('create-profit-fixed');
  const createProfitTypeFixed = document.getElementById('create-profit-type-fixed');
  const createProfitTypePercent = document.getElementById('create-profit-type-percent');
  const createProfitFixedSection = document.getElementById('create-profit-fixed-section');
  const createProfitPercentSection = document.getElementById('create-profit-percent-section');
  const createSubmit = document.getElementById('create-submit');
  const fillExample = document.getElementById('fill-example');
  const createNameError = document.getElementById('create-name-error');
  const createYieldError = document.getElementById('create-yield-error');
  const ingredientName = document.getElementById('ingredient-name');
  const ingredientQty = document.getElementById('ingredient-qty');
  const ingredientUnit = document.getElementById('ingredient-unit');
  const ingredientPack = document.getElementById('ingredient-pack');
  const ingredientPackUnit = document.getElementById('ingredient-pack-unit');
  const ingredientCost = document.getElementById('ingredient-cost');
  const ingredientSuggestions = document.getElementById('ingredient-suggestions');
  const ingredientAdvanced = document.getElementById('ingredient-advanced');
  const ingredientAdvancedToggle = document.getElementById('ingredient-advanced-toggle');
  const addIngredientBtn = document.getElementById('add-ingredient');
  const componentName = document.getElementById('component-name');
  const componentAddBtn = document.getElementById('component-add');
  const componentAddMassa = document.getElementById('component-add-massa');
  const componentAddCobertura = document.getElementById('component-add-cobertura');
  const componentAddEmbalagem = document.getElementById('component-add-embalagem');
  const componentAddMaoObra = document.getElementById('component-add-mao-obra');
  const componentAddAviamentos = document.getElementById('component-add-aviamentos');
  const componentAddMateriaPrima = document.getElementById('component-add-materia-prima');
  const componentAddAcabamento = document.getElementById('component-add-acabamento');
  const componentSelect = document.getElementById('component-select');
  const componentRename = document.getElementById('component-rename');
  const componentRenameBtn = document.getElementById('component-rename-btn');
  const componentRemoveBtn = document.getElementById('component-remove-btn');
  const componentDuplicateBtn = document.getElementById('component-duplicate-btn');
  const componentMoveUpBtn = document.getElementById('component-move-up-btn');
  const componentMoveDownBtn = document.getElementById('component-move-down-btn');
  const ingredientError = document.getElementById('ingredient-error');
  const ingredientSuccess = document.getElementById('ingredient-success');
  const ingredientUnitHelp = document.getElementById('ingredient-unit-help');
  const ingredientUnitWarning = document.getElementById('ingredient-unit-warning');
  const ingredientsBody = document.getElementById('ingredients-body');
  const componentSubtotal = document.getElementById('component-subtotal');
  const componentsSummary = document.getElementById('components-summary');
  const componentsTotal = document.getElementById('components-total');
  const summaryTotal = document.getElementById('summary-total');
  const summaryOverhead = document.getElementById('summary-overhead');
  const summaryOverheadLabel = document.getElementById('summary-overhead-label');
  const summaryProfitType = document.getElementById('summary-profit-type');
  const summaryYield = document.getElementById('summary-yield');
  const summaryUnit = document.getElementById('summary-unit');
  const summarySuggested = document.getElementById('summary-suggested');
  const summaryProfit = document.getElementById('summary-profit');
  const calcStatus = document.getElementById('create-calc-status');

  const PAGE_SIZE = 10;
  let currentPage = 1;
  let recipesCache = [];
  const DELETE_FLAG = 'sgvc.recipeDeleted';
  let messageTimer = null;
  let ingredientTimer = null;
  let packUnitTouched = false;
  const DEFAULT_COMPONENT_NAME = 'Ingredientes principais';
  let components = [];
  let overheadItems = [];
  let overheadMask = null;
  let marginMask = null;
  let profitFixedMask = null;
  let overheadItemMask = null;

  const INGREDIENTS_URL = '/static/data/ingredients.json';
  const INGREDIENTS_FALLBACK = [
    'acucar',
    'farinha de trigo',
    'leite',
    'manteiga',
    'ovos',
    'chocolate',
    'fermento quimico',
    'sal',
    'oleo',
    'agua',
  ];
  const UNIT_ALIASES = {
    g: 'g',
    gr: 'g',
    grama: 'g',
    gramas: 'g',
    kg: 'kg',
    quilo: 'kg',
    quilos: 'kg',
    kilo: 'kg',
    kilos: 'kg',
    ml: 'ml',
    mililitro: 'ml',
    mililitros: 'ml',
    l: 'l',
    litro: 'l',
    litros: 'l',
    un: 'un',
    unidade: 'un',
    unidades: 'un',
  };

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

  function initMasks() {
    if (window.Cleave) {
      if (createOverhead) {
        overheadMask = new window.Cleave(createOverhead, {
          numeral: true,
          numeralDecimalMark: ',',
          delimiter: '.',
          numeralDecimalScale: 2,
          numeralPositiveOnly: true,
        });
      }
      if (createMargin) {
        marginMask = new window.Cleave(createMargin, {
          numeral: true,
          numeralDecimalMark: ',',
          delimiter: '.',
          numeralDecimalScale: 2,
          numeralPositiveOnly: true,
        });
      }
    }
    if (window.AutoNumeric) {
      const moneyOptions = {
        decimalCharacter: ',',
        digitGroupSeparator: '.',
        decimalPlaces: 2,
        minimumValue: '0',
        modifyValueOnWheel: false,
      };
      if (createProfitFixed) {
        profitFixedMask = new window.AutoNumeric(createProfitFixed, moneyOptions);
      }
      if (overheadItemValue) {
        overheadItemMask = new window.AutoNumeric(overheadItemValue, moneyOptions);
      }
    }
  }

  function setMaskedValue(input, value, mask) {
    if (!input) return;
    const safeValue = value == null ? '' : value;
    if (mask && typeof mask.clear === 'function' && safeValue === '') {
      mask.clear();
      return;
    }
    if (mask && typeof mask.set === 'function') {
      mask.set(safeValue);
    } else if (mask && typeof mask.setRawValue === 'function') {
      mask.setRawValue(String(safeValue));
    } else {
      input.value = String(safeValue);
    }
  }

  async function loadIngredientSuggestions() {
    if (!ingredientSuggestions) return;
    let items = INGREDIENTS_FALLBACK.slice();
    try {
      const response = await fetch(INGREDIENTS_URL, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) items = data.slice();
      }
    } catch (_err) {
      items = INGREDIENTS_FALLBACK.slice();
    }
    const unique = Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)));
    ingredientSuggestions.textContent = '';
    unique.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = String(item);
      ingredientSuggestions.appendChild(opt);
    });
  }

  // ===== Cadastro único de insumos =====
  // Insumos cadastrados aparecem primeiro nas sugestões; ao escolher um, embalagem e preço são
  // preenchidos e o item fica ligado ao cadastro (ingredientId): quando o preço mudar na tela
  // Insumos, esta ficha é recalculada automaticamente.
  const catalogByName = new Map();

  function findCatalogIngredient(name) {
    return catalogByName.get(String(name || '').trim().toLowerCase()) || null;
  }

  function formatCatalogNumber(value, input) {
    const fixed = Number(value).toFixed(2).replace(/\.00$/, '');
    return input && input.type === 'number' ? fixed : fixed.replace('.', ',');
  }

  async function loadIngredientCatalog() {
    try {
      const list = await apiRequest('/api/ingredients', null, { method: 'GET' });
      (Array.isArray(list) ? list : []).forEach((item) => {
        catalogByName.set(String(item.name).trim().toLowerCase(), item);
      });
      if (ingredientSuggestions && catalogByName.size) {
        const fragment = document.createDocumentFragment();
        catalogByName.forEach((item) => {
          const opt = document.createElement('option');
          opt.value = item.name;
          opt.label = `Insumo cadastrado: R$ ${Number(item.packageCost).toFixed(2).replace('.', ',')} por ${item.packageQuantity} ${item.packageUnit}`;
          fragment.appendChild(opt);
        });
        ingredientSuggestions.prepend(fragment);
      }
    } catch (_err) {
      // Sem cadastro de insumos disponível: a ficha continua funcionando com preço manual
    }
  }

  function applyCatalogToForm() {
    const match = findCatalogIngredient(ingredientName && ingredientName.value);
    if (!match) return;
    if (ingredientPack) ingredientPack.value = formatCatalogNumber(match.packageQuantity, ingredientPack);
    if (ingredientPackUnit) {
      ingredientPackUnit.value = match.packageUnit;
      ingredientPackUnit.dispatchEvent(new Event('change'));
    }
    if (ingredientCost) ingredientCost.value = formatCatalogNumber(match.packageCost, ingredientCost);
    if (typeof setIngredientAdvancedOpen === 'function') setIngredientAdvancedOpen(true);
    showIngredientSuccess(
      `Preço do cadastro de insumos: R$ ${Number(match.packageCost).toFixed(2).replace('.', ',')} por ${match.packageQuantity} ${match.packageUnit}. Esta ficha será recalculada quando o preço mudar.`
    );
  }

  if (ingredientName) {
    ingredientName.addEventListener('change', applyCatalogToForm);
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

  function validateCreateName(showMessage) {
    const value = createName ? createName.value.trim() : '';
    if (value.length < 3) {
      if (showMessage) {
        setFieldError(createName, createNameError, 'Informe um nome com pelo menos 3 letras.');
      } else if (createName) {
        createName.classList.add('is-danger');
      }
      return false;
    }
    clearFieldError(createName, createNameError);
    return true;
  }

  function validateCreateYield(showMessage) {
    const value = toNumber(createYield ? createYield.value : null, 0.01);
    if (value == null) {
      if (showMessage) {
        setFieldError(createYield, createYieldError, 'Informe um rendimento maior que zero.');
      } else if (createYield) {
        createYield.classList.add('is-danger');
      }
      return false;
    }
    clearFieldError(createYield, createYieldError);
    return true;
  }

  function setIngredientAdvancedOpen(isOpen) {
    if (!ingredientAdvanced || !ingredientAdvancedToggle) return;
    ingredientAdvanced.classList.toggle('is-open', isOpen);
    ingredientAdvanced.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    ingredientAdvancedToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function isIngredientAdvancedOpen() {
    return Boolean(ingredientAdvanced && ingredientAdvanced.classList.contains('is-open'));
  }

      function validateIngredientFields(showMessage) {
    const name = ingredientName ? ingredientName.value.trim() : '';
    const quantity = toNumber(ingredientQty ? ingredientQty.value : null, 0.01);
    const pack = toNumber(ingredientPack ? ingredientPack.value : null, 0.01);
    const cost = toNumber(ingredientCost ? ingredientCost.value : null, 0);
    const unit = ingredientUnit ? ingredientUnit.value : '';
    const advancedOpen = isIngredientAdvancedOpen();
    const wantsPrice = advancedOpen || pack != null || cost != null;
    const packValid = !wantsPrice || pack != null;
    const costValid = !wantsPrice || cost != null;
    const fields = [
      { input: ingredientName, valid: Boolean(name) },
      { input: ingredientQty, valid: quantity != null },
      { input: ingredientPack, valid: packValid },
      { input: ingredientCost, valid: costValid },
    ];
    let isValid = Boolean(name && quantity != null && unit && packValid && costValid);
    fields.forEach((field) => {
      if (!field.input) return;
      if (!wantsPrice && (field.input === ingredientPack || field.input === ingredientCost)) {
        field.input.classList.remove('is-danger');
        field.input.removeAttribute('aria-invalid');
        return;
      }
      if (field.valid) {
        field.input.classList.remove('is-danger');
        field.input.removeAttribute('aria-invalid');
      } else {
        field.input.classList.add('is-danger');
        field.input.setAttribute('aria-invalid', 'true');
      }
    });
    if (showMessage) {
      if (!isValid) {
        if (!advancedOpen) {
          setIngredientAdvancedOpen(true);
        }
        setFieldError(
          ingredientName,
          ingredientError,
          'Informe item, quantidade usada e a unidade.',
        );
      } else {
        clearFieldError(ingredientName, ingredientError);
      }
    }
    if (!isValid) showIngredientSuccess('');
    return isValid;
  }



  function showIngredientSuccess(message) {
    if (!ingredientSuccess) return;
    ingredientSuccess.textContent = message || '';
    ingredientSuccess.hidden = !message;
    if (ingredientTimer) {
      clearTimeout(ingredientTimer);
      ingredientTimer = null;
    }
    if (message) {
      ingredientTimer = setTimeout(() => {
        ingredientSuccess.hidden = true;
        ingredientSuccess.textContent = '';
      }, 2500);
    }
  }

  function validateName(value) {
    const trimmed = String(value || '').trim();
    if (trimmed.length < 3 || trimmed.length > 120) return false;
    return true;
  }

  function parseLocaleNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const raw = String(value || '').trim();
    if (!raw) return null;
    const compact = raw.replace(/\s/g, '');
    const hasComma = compact.includes(',');
    const hasDot = compact.includes('.');
    let normalized = compact;
    let usedThousands = false;
    if (hasComma && hasDot) {
      if (compact.lastIndexOf(',') > compact.lastIndexOf('.')) {
        normalized = compact.replace(/\./g, '').replace(',', '.');
        usedThousands = true;
      } else {
        normalized = compact.replace(/,/g, '');
        usedThousands = true;
      }
    } else if (hasComma) {
      const parts = compact.split(',');
      if (parts.length === 2 && parts[1].length === 3) {
        normalized = compact.replace(/,/g, '');
        usedThousands = true;
      } else {
        normalized = compact.replace(/\./g, '').replace(',', '.');
      }
    } else if (hasDot) {
      const parts = compact.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        normalized = compact.replace(/\./g, '');
        usedThousands = true;
      } else {
        normalized = compact.replace(/,/g, '');
      }
    } else {
      normalized = compact;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    if (usedThousands) {
      showIngredientWarning(`Interpretei ${compact} como ${formatQuantity(parsed)}.`, 'parse');
    }
    return parsed;
  }

  function parseUnitInput(raw) {
    const text = String(raw || '').trim().toLowerCase();
    if (!text) return null;
    const match = text.match(/^([\d.,]+)\s*([a-z]+)$/i);
    if (!match) return null;
    const value = parseLocaleNumber(match[1]);
    if (!Number.isFinite(value)) return null;
    const unitKey = match[2].toLowerCase();
    const unit = UNIT_ALIASES[unitKey];
    if (!unit) return null;
    return { value, unit };
  }

  function applyUnitNormalization(input, unitSelect, markTouched) {
    if (!input || !unitSelect) return false;
    const parsed = parseUnitInput(input.value);
    if (!parsed) return false;
    input.value = formatQuantity(parsed.value);
    unitSelect.value = parsed.unit;
    if (markTouched) markTouched();
    updateIngredientUnitHints();
    updatePackUnitHints();
    updatePackQuantityWarning();
    return true;
  }

  function toNumber(value, min = 0) {
    const parsed = parseLocaleNumber(value);
    if (!Number.isFinite(parsed) || parsed < min) return null;
    return parsed;
  }

  function formatMoney(value) {
    if (!Number.isFinite(value)) return '-';
    // Separador de milhar no padrão brasileiro (R$ 2.100,00)
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatQuantity(value) {
    if (!Number.isFinite(value)) return '-';
    return value.toFixed(2).replace('.', ',');
  }

  function normalizeQuantity(value, unit) {
    const numeric = parseLocaleNumber(value);
    if (!Number.isFinite(numeric)) return null;
    switch (String(unit || '').toLowerCase()) {
      case 'kg':
        return numeric * 1000;
      case 'g':
        return numeric;
      case 'l':
        return numeric * 1000;
      case 'ml':
        return numeric;
      case 'un':
        return numeric;
      default:
        return numeric;
    }
  }

  function calculateIngredientCost(item) {
    const unit = item.unit || 'g';
    const packUnit = item.packUnit || item.unit || 'g';
    const quantity = normalizeQuantity(item.quantity, unit);
    const pack = normalizeQuantity(item.packageQuantity, packUnit);
    const cost = parseLocaleNumber(item.cost);
    if (!Number.isFinite(quantity) || !Number.isFinite(pack) || !Number.isFinite(cost) || pack <= 0) return 0;
    return (quantity / pack) * cost;
  }

  function renderIngredients() {
    if (!ingredientsBody) return;
    ingredientsBody.innerHTML = '';
    const activeComponent = getActiveComponent();
    const items = activeComponent ? activeComponent.items || [] : [];
    if (!items.length) {
      const label = activeComponent
        ? `Nenhum item em ${activeComponent.name}. Use o formul\u00e1rio acima para incluir o primeiro.`
        : 'Nenhum item adicionado. Use o formul\u00e1rio acima para incluir o primeiro.';
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 4;
      emptyCell.textContent = label;
      emptyRow.appendChild(emptyCell);
      ingredientsBody.appendChild(emptyRow);
      updateComponentsTotal();
      updateCostSummary();
      renderComponentSelect();
      updateComponentSubtotal();
      renderComponentsSummary();
      updateSubmitState();
      return;
    }
    items.forEach((item, index) => {
      const realCost = calculateIngredientCost(item);
      const unit = item.unit || 'g';
      const packUnit = item.packUnit || unit;
      const qtyRaw = parseLocaleNumber(item.quantity);
      const packRaw = parseLocaleNumber(item.packageQuantity);
      const costRaw = parseLocaleNumber(item.cost);
      const qtyNorm = normalizeQuantity(item.quantity, unit);
      const packNorm = normalizeQuantity(item.packageQuantity, packUnit);
      const unitLabel = unit ? ` ${unit}` : '';
      const packUnitLabel = packUnit ? ` ${packUnit}` : '';
      const calcText =
        Number.isFinite(qtyRaw) && Number.isFinite(packRaw) && Number.isFinite(costRaw) &&
        Number.isFinite(qtyNorm) && Number.isFinite(packNorm) && packNorm > 0
          ? `R$ ${formatMoney(costRaw)} / ${formatQuantity(packRaw)}${packUnitLabel} x ${formatQuantity(qtyRaw)}${unitLabel} = R$ ${formatMoney(realCost)}`
          : '';
      const row = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.textContent = String(item.name || '');

      const tdQty = document.createElement('td');
      tdQty.className = 'has-text-right';
      tdQty.textContent = `${formatQuantity(Number(item.quantity))}${unitLabel}`;

      const tdCost = document.createElement('td');
      tdCost.className = 'has-text-right';
      const costWrap = document.createElement('div');
      costWrap.className = 'ingredient-cost-wrap';
      const costDiv = document.createElement('div');
      costDiv.className = 'ingredient-cost';
      costDiv.textContent = `R$ ${formatMoney(realCost)}`;
      costWrap.appendChild(costDiv);
      if (calcText) {
        const tip = document.createElement('span');
        tip.className = 'calc-tip';
        tip.setAttribute('data-tooltip', calcText);
        tip.tabIndex = 0;
        tip.setAttribute('role', 'img');
        tip.setAttribute('aria-label', 'Ver cálculo');
        tip.textContent = 'ℹ';
        costWrap.appendChild(document.createTextNode(' '));
        costWrap.appendChild(tip);
      }
      tdCost.appendChild(costWrap);

      const tdActions = document.createElement('td');
      tdActions.className = 'has-text-right';
      const btnRemove = document.createElement('button');
      btnRemove.className = 'button is-light is-small';
      btnRemove.dataset.index = String(index);
      btnRemove.type = 'button';
      btnRemove.textContent = 'Remover';
      tdActions.appendChild(btnRemove);

      row.appendChild(tdName);
      row.appendChild(tdQty);
      row.appendChild(tdCost);
      row.appendChild(tdActions);
      ingredientsBody.appendChild(row);
    });
    updateComponentsTotal();
    updateCostSummary();
    renderComponentSelect();
    updateComponentSubtotal();
    renderComponentsSummary();
    updateSubmitState();
  }

  function getAllIngredients() {
    return components.flatMap((component) => {
      const items = Array.isArray(component.items) ? component.items : [];
      return items.map((item) => ({
        ...item,
        component: component.name,
      }));
    });
  }

  function getRecipeFormState() {
    const nameValue = createName ? String(createName.value || '').trim() : '';
    const yieldValue = toNumber(createYield ? createYield.value : null, 0.01);
    const hasName = nameValue.length >= 3;
    const hasYield = yieldValue != null;
    const hasItems = getAllIngredients().length > 0;
    return { nameValue, yieldValue, hasName, hasYield, hasItems };
  }

  function updateComponentsTotal() {
    if (!componentsTotal) return;
    const total = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
    componentsTotal.textContent = `R$ ${formatMoney(total)}`;
  }

  function updateComponentSubtotal() {
    if (!componentSubtotal) return;
    const activeComponent = getActiveComponent();
    const items = activeComponent ? activeComponent.items || [] : [];
    const subtotal = items.reduce((sum, item) => sum + calculateIngredientCost(item), 0);
    componentSubtotal.textContent = `R$ ${formatMoney(subtotal)}`;
  }

  function renderComponentsSummary() {
    if (!componentsSummary) return;
    if (!components.length) {
      componentsSummary.innerHTML = '<span class="components-summary-empty">Nenhuma parte adicionada.</span>';
      return;
    }
    const items = components.map((component) => {
      const subtotal = (component.items || []).reduce((sum, item) => sum + calculateIngredientCost(item), 0);
      return `
        <div class="components-summary-item">
          <span class="components-summary-name">${component.name}</span>
          <span class="components-summary-value">R$ ${formatMoney(subtotal)}</span>
        </div>
      `;
    });
    componentsSummary.innerHTML = items.join('');
  }

  function getOverheadPercentValue() {
    const percent = toNumber(createOverhead ? createOverhead.value : null, 0);
    if (createOverheadWarning) {
      createOverheadWarning.textContent = '';
      createOverheadWarning.hidden = true;
    }
    if (percent == null) {
      return 0;
    }
    if (percent > 15) {
      if (createOverheadWarning) {
        createOverheadWarning.textContent = 'Acima do limite: o c\u00e1lculo usa 15%.';
        createOverheadWarning.hidden = false;
      }
      return 15;
    }
    return percent;
  }

  function getOverheadValue(ingredientsTotal) {
    const percent = getOverheadPercentValue();
    const base = Number.isFinite(ingredientsTotal) ? ingredientsTotal : 0;
    const percentValue = base * (percent / 100);
    const extraTotal = overheadItems.reduce((sum, item) => {
      const value = toNumber(item.value, 0);
      return sum + (value || 0);
    }, 0);
    return percentValue + extraTotal;
  }

  function renderOverheadItems() {
    if (!overheadBody) return;
    overheadBody.innerHTML = '';
    if (!overheadItems.length) {
      overheadBody.innerHTML = '<tr class="empty-row"><td colspan="3">Nenhum custo extra informado.</td></tr>';
    } else {
      overheadItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.name}</td>
          <td class="has-text-right">R$ ${formatMoney(toNumber(item.value, 0) || 0)}</td>
          <td class="has-text-right">
            <button class="button is-light is-small" data-index="${index}">Remover</button>
          </td>
        `;
        overheadBody.appendChild(row);
      });
    }
    const itemsTotal = overheadItems.reduce((sum, item) => sum + (toNumber(item.value, 0) || 0), 0);
    if (overheadTotalEl) {
      overheadTotalEl.textContent = `R$ ${formatMoney(itemsTotal)}`;
    }
    updateCostSummary();
    updateSubmitState();
  }

  function updateCostSummary() {
    if (!summaryTotal || !summaryUnit || !summarySuggested || !summaryYield || !summaryProfit || !summaryProfitType) {
      return;
    }
    const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
    const overheadValue = getOverheadValue(ingredientsTotal);
    const overheadItemsTotal = overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const overheadPercent = getOverheadPercentValue();
    const formState = getRecipeFormState();
    const placeholder = 'Preencha os dados acima';

    if (!formState.hasName || !formState.hasYield || !formState.hasItems) {
      if (summaryOverhead) {
        summaryOverhead.textContent = placeholder;
      }
      if (summaryOverheadLabel) {
        summaryOverheadLabel.textContent = 'Gastos extras (aguardando dados)';
      }
      summaryTotal.textContent = placeholder;
      summaryUnit.textContent = placeholder;
      summarySuggested.textContent = placeholder;
      summaryProfit.textContent = placeholder;
      summaryYield.textContent = placeholder;
      summaryProfitType.textContent = 'Aguardando dados para calcular';
      return;
    }
    if (summaryOverhead) {
      summaryOverhead.textContent = `R$ ${formatMoney(overheadValue)}`;
    }
    if (summaryOverheadLabel) {
      if (overheadPercent > 0) {
        summaryOverheadLabel.textContent = `Gastos extras (${overheadPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)`; // 15% e não 15,00%
      } else if (overheadItemsTotal > 0) {
        summaryOverheadLabel.textContent = 'Gastos extras (itens)';
      } else {
        summaryOverheadLabel.textContent = 'Gastos extras (n\u00e3o informado)';
      }
    }
    const totalCost = ingredientsTotal + overheadValue;
    const yieldValue = formState.yieldValue || 0;
    const marginPercent = toNumber(createMargin.value, 0) || 0;
    const fixedProfit = toNumber(createProfitFixed.value, 0) || 0;
    const profitType = createProfitTypePercent && createProfitTypePercent.checked ? 'percent' : 'fixed';

    summaryTotal.textContent = `R$ ${formatMoney(totalCost)}`;
    const hasProfit = (profitType === 'percent' && marginPercent > 0) || (profitType === 'fixed' && fixedProfit > 0);
    if (!hasProfit) {
      summaryProfitType.textContent = 'Sem lucro definido';
    } else if (profitType === 'percent') {
      summaryProfitType.textContent = `Percentual (${formatQuantity(marginPercent)}%)`;
    } else {
      summaryProfitType.textContent = `Valor fixo (R$ ${formatMoney(fixedProfit)})`;
    }

    if (yieldValue && yieldValue > 0) {
      const costPerUnit = totalCost / yieldValue;
      let suggestedTotal = totalCost;
      if (profitType === 'percent') {
        suggestedTotal = totalCost * (1 + marginPercent / 100);
      } else {
        suggestedTotal = totalCost + fixedProfit;
      }
      const suggestedUnit = suggestedTotal / yieldValue;
      const profit = suggestedUnit - costPerUnit;
      summaryUnit.textContent = `R$ ${formatMoney(costPerUnit)}`;
      summarySuggested.textContent = `R$ ${formatMoney(suggestedUnit)}`;
      summaryProfit.textContent = `R$ ${formatMoney(profit)}`;
      summaryYield.textContent = `${formatQuantity(yieldValue)} ${createYieldType.value || ''}`.trim();
    } else {
      const placeholder = 'Preencha os dados acima';
      summaryUnit.textContent = placeholder;
      summarySuggested.textContent = placeholder;
      summaryProfit.textContent = placeholder;
      summaryYield.textContent = placeholder;
    }
  }

  function updateSubmitState() {
    if (!createSubmit) return;
    const { hasName, hasYield, hasItems } = getRecipeFormState();
    const shouldEnable = hasName && hasYield && hasItems;
    if (createSubmit.classList.contains('is-loading')) {
      createSubmit.disabled = true;
      return;
    }
    createSubmit.disabled = !shouldEnable;
    updateCalcStatus();
  }

  function updateCalcStatus() {
    if (!calcStatus) return;
    const formState = getRecipeFormState();
    const missing = [];
    if (!formState.hasName) missing.push('nome do produto');
    if (!formState.hasYield) missing.push('rendimento');
    if (!formState.hasItems) missing.push('itens');
    if (missing.length) {
      calcStatus.textContent = `Faltam informa\u00e7\u00f5es: ${missing.join(', ')}.`;
      calcStatus.classList.remove('is-ready');
    } else {
      calcStatus.textContent = 'Dados suficientes para calcular.';
      calcStatus.classList.add('is-ready');
    }
  }

  function bindQuickSuggestions(container, input, mask, beforeApply) {
    if (!container || !input) return;
    container.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-value]');
      if (!btn) return;
      const value = Number(btn.dataset.value);
      if (!Number.isFinite(value)) return;
      if (typeof beforeApply === 'function') {
        beforeApply();
      }
      setMaskedValue(input, value, mask);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      updateCostSummary();
      updateSubmitState();
    });
  }

  function ensureDefaultComponent() {
    if (components.length) return;
    components = [{ name: DEFAULT_COMPONENT_NAME, items: [] }];
  }

  function getActiveComponent() {
    if (!components.length) return null;
    const name = componentSelect ? componentSelect.value : '';
    const found = components.find((component) => component.name === name);
    return found || components[0];
  }

  function setActiveComponent(name) {
    const active = components.find((component) => component.name === name) || components[0];
    if (componentSelect && active) {
      componentSelect.value = active.name;
    }
    renderIngredients();
    updateComponentSubtotal();
    renderComponentsSummary();
    updateSubmitState();
  }

  function renderComponentSelect() {
    if (!componentSelect) return;
    componentSelect.innerHTML = '';
    components.forEach((component) => {
      const option = document.createElement('option');
      option.value = component.name;
      option.textContent = component.name;
      componentSelect.appendChild(option);
    });
    const active = getActiveComponent();
    if (active) componentSelect.value = active.name;
    const activeIndex = components.findIndex((component) => component.name === componentSelect.value);
    const isDefault = active && active.name === DEFAULT_COMPONENT_NAME;
    if (componentRenameBtn) componentRenameBtn.disabled = !active || isDefault;
    if (componentRemoveBtn) componentRemoveBtn.disabled = !active || isDefault || components.length <= 1;
    if (componentDuplicateBtn) componentDuplicateBtn.disabled = !active;
    if (componentMoveUpBtn) componentMoveUpBtn.disabled = activeIndex <= 0;
    if (componentMoveDownBtn) componentMoveDownBtn.disabled = activeIndex < 0 || activeIndex >= components.length - 1;
  }

  function addComponent(rawName) {
    const name = String(rawName || '').trim();
    if (!name) return;
    const existing = components.find((component) => component.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      renderComponentSelect();
      setActiveComponent(existing.name);
      showMessage('Essa parte j\u00e1 existe. Selecionei para voc\u00ea.', 'is-success');
      return;
    }
    components.push({ name, items: [] });
    renderComponentSelect();
    setActiveComponent(name);
  }

  function renameActiveComponent(rawName) {
    const active = getActiveComponent();
    const name = String(rawName || '').trim();
    if (!active || !name || active.name === DEFAULT_COMPONENT_NAME) return;
    if (components.some((component) => component.name.toLowerCase() === name.toLowerCase())) {
      showMessage('Essa parte j\u00e1 existe.', 'is-danger');
      return;
    }
    active.name = name;
    renderComponentSelect();
    setActiveComponent(name);
  }

  function removeActiveComponent() {
    const active = getActiveComponent();
    if (!active || active.name === DEFAULT_COMPONENT_NAME || components.length <= 1) return;
    if (!window.confirm('Remover esta parte e todos os itens dela?')) return;
    components = components.filter((component) => component !== active);
    renderComponentSelect();
    setActiveComponent(components[0].name);
  }

  function duplicateActiveComponent() {
    const active = getActiveComponent();
    if (!active) return;
    const base = `${active.name} copia`;
    let name = base;
    let index = 2;
    while (components.some((component) => component.name.toLowerCase() === name.toLowerCase())) {
      name = `${base} ${index}`;
      index += 1;
    }
    const items = (active.items || []).map((item) => ({ ...item }));
    components.push({ name, items });
    renderComponentSelect();
    setActiveComponent(name);
  }

  function moveActiveComponent(direction) {
    const active = getActiveComponent();
    if (!active) return;
    const index = components.findIndex((component) => component === active);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= components.length) return;
    const swap = components[nextIndex];
    components[nextIndex] = active;
    components[index] = swap;
    renderComponentSelect();
    setActiveComponent(active.name);
  }

  function updatePackUnitDisplay() {
    if (!ingredientPackUnit || !ingredientUnit) return;
    if (!packUnitTouched) {
      ingredientPackUnit.value = ingredientUnit.value || 'g';
    }
  }

  function updatePackUnitHints() {
    if (!ingredientPackUnit || !ingredientPack) return;
    const packUnit = ingredientPackUnit.value || 'g';
    ingredientPack.placeholder = packUnit === 'kg' || packUnit === 'l' ? 'Ex: 1' : packUnit === 'un' ? 'Ex: 30' : 'Ex: 1000';
  }

  function getProfitType() {
    if (createProfitTypePercent && createProfitTypePercent.checked) return 'percent';
    return 'fixed';
  }

  function updateProfitTypeUI() {
    const profitType = getProfitType();
    const showFixed = profitType === 'fixed';
    const showPercent = profitType === 'percent';
    if (createProfitFixedSection) {
      createProfitFixedSection.hidden = !showFixed;
      createProfitFixedSection.style.display = showFixed ? '' : 'none';
      createProfitFixedSection.setAttribute('aria-hidden', showFixed ? 'false' : 'true');
    }
    if (createProfitPercentSection) {
      createProfitPercentSection.hidden = !showPercent;
      createProfitPercentSection.style.display = showPercent ? '' : 'none';
      createProfitPercentSection.setAttribute('aria-hidden', showPercent ? 'false' : 'true');
    }
    if (createProfitFixed) createProfitFixed.disabled = !showFixed;
    if (createMargin) createMargin.disabled = !showPercent;
    updateCostSummary();
  }

  function getBaseTotalCost() {
    const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
    const overheadValue = getOverheadValue(ingredientsTotal);
    return ingredientsTotal + overheadValue;
  }

  function updateIngredientUnitHints() {
    if (!ingredientUnit) return;
    const unit = ingredientUnit.value;
    if (ingredientQty) {
      ingredientQty.placeholder = unit === 'kg' || unit === 'l' ? 'Ex: 0,5' : unit === 'un' ? 'Ex: 2' : 'Ex: 200';
    }
    if (ingredientUnitHelp) {
      ingredientUnitHelp.textContent =
        unit === 'kg'
          ? 'Use kg para itens comprados por peso. Informe o tamanho do pacote em kg (ex: 1). Para itens por unidade, use un e pacote = 1.'
          : unit === 'l'
          ? 'Use l para itens comprados por volume. Informe o tamanho do pacote em litros (ex: 1). Para itens por unidade, use un e pacote = 1.'
          : unit === 'un'
          ? 'Comprou por unidade (lata/garrafa/caixa)? Use pacote = 1. Se o item tem peso/volume, troque a unidade para g/ml e informe o tamanho do pacote.'
          : 'Use g/ml quando comprar por peso/volume. Informe o tamanho real do pacote. Para itens por unidade, use un e pacote = 1.';
    }
    updatePackUnitHints();
    updatePackQuantityWarning();
  }


  function normalizeKgValue(value) {
    if (!Number.isFinite(value)) return value;
    if (value >= 100 && Number.isInteger(value)) {
      return value / 1000;
    }
    return value;
  }

  function showIngredientWarning(message, type = 'generic') {
    if (!ingredientUnitWarning) return;
    ingredientUnitWarning.textContent = message || '';
    ingredientUnitWarning.hidden = !message;
    if (!message) {
      delete ingredientUnitWarning.dataset.warningType;
      return;
    }
    ingredientUnitWarning.dataset.warningType = type;
  }

  function clearIngredientWarning(type) {
    if (!ingredientUnitWarning) return;
    // Se um tipo específico foi passado, só limpa se o tipo corresponder
    if (type) {
      const currentType = ingredientUnitWarning.dataset.warningType;
      if (currentType === type) {
        ingredientUnitWarning.textContent = '';
        ingredientUnitWarning.hidden = true;
        delete ingredientUnitWarning.dataset.warningType;
      }
    } else {
      // Se não foi passado tipo, limpa sempre
      ingredientUnitWarning.textContent = '';
      ingredientUnitWarning.hidden = true;
      delete ingredientUnitWarning.dataset.warningType;
    }
  }

  function updatePackQuantityWarning() {
    const pack = toNumber(ingredientPack ? ingredientPack.value : null, 0.01);
    const packUnit = ingredientPackUnit ? ingredientPackUnit.value : '';
    if (packUnit === 'un' && pack != null && pack >= 50) {
      showIngredientWarning(
        'Pacote muito alto para "un". Se comprar por peso/volume, troque a unidade para g/ml/l e informe o tamanho real do pacote. Se for por unidade (lata/garrafa/caixa), use pacote = 1.',
        'pack',
      );
      return;
    }
    clearIngredientWarning('pack');
  }

  function enforceKgLimits(value, label, max) {
    if (!Number.isFinite(value)) return null;
    if (value > max) {
      showIngredientWarning(`Valor muito alto em kg para ${label}. Use no m\u00e1ximo ${max} kg.`, 'kg');
      return null;
    }
    return value;
  }

  function updatePagination(total) {
    if (!pagination) return;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    pagination.hidden = totalPages <= 1;
    if (pageInfo) {
      const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
      const end = Math.min(currentPage * PAGE_SIZE, total);
      pageInfo.textContent = `Mostrando ${start}-${end} de ${total} fichas`;
    }
    if (pageList) {
      pageList.innerHTML = '';
      const maxButtons = 5;
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxButtons - 1);
      if (end - start < maxButtons - 1) {
        start = Math.max(1, end - maxButtons + 1);
      }
      for (let page = start; page <= end; page += 1) {
        const btn = document.createElement('button');
        btn.className = 'button is-light is-small';
        btn.textContent = String(page);
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
  function formatStatusLabel(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'ACTIVE' || value === 'ATIVO' || value === 'ATIVA') return 'Ativa';
    if (value === 'INACTIVE' || value === 'INATIVO' || value === 'INATIVA') return 'Inativa';
    return value ? value : '-';
  }

  function getStatusKey(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'INACTIVE' || value === 'INATIVO' || value === 'INATIVA') return 'INACTIVE';
    return 'ACTIVE';
  }

  function buildExportFilename(name, format) {
    const safe = String(name || 'ficha-tecnica')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return `${safe || 'ficha-tecnica'}.${format}`;
  }

  async function downloadExport(recipeId, name, format) {
    const url = buildUrl(`/api/recipes/${recipeId}/export?format=${encodeURIComponent(format)}`);
    try {
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Erro ao exportar.');
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = buildExportFilename(name, format);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      showMessage(err.message, 'is-danger');
    }
  }
  function renderTable(items) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (!items || !items.length) {
      tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhuma ficha t\u00e9cnica encontrada. Cadastre a primeira acima.</td></tr>';
      return;
    }
    items.forEach((recipe) => {
      const row = document.createElement('tr');
      row.classList.add('recipes-row');
            const status = formatStatusLabel(recipe.status || 'ACTIVE');
      const statusKey = getStatusKey(recipe.status || 'ACTIVE');
      const unitCost = Number.isFinite(recipe.costPerUnit) ? recipe.costPerUnit : null;
      const suggestedUnit = Number.isFinite(recipe.priceSuggested) ? recipe.priceSuggested : null;
      const yieldValue = Number.isFinite(recipe.yield) ? recipe.yield : null;
      const totalPrice = suggestedUnit != null && yieldValue != null ? suggestedUnit * yieldValue : null;
      const tdName = document.createElement('td');
      const nameBtn = document.createElement('button');
      nameBtn.className = 'recipes-name-link';
      nameBtn.type = 'button';
      nameBtn.dataset.id = String(recipe.id ?? '');
      nameBtn.textContent = String(recipe.name || '-');
      tdName.appendChild(nameBtn);

      const tdYield = document.createElement('td');
      tdYield.className = 'has-text-right';
      tdYield.textContent = `${String(recipe.yield ?? '-')}${recipe.yieldType ? ` ${recipe.yieldType}` : ''}`;

      const tdUnitCost = document.createElement('td');
      tdUnitCost.className = 'has-text-right';
      tdUnitCost.textContent = `R$ ${unitCost != null ? formatMoney(unitCost) : '-'}`;

      const tdSuggested = document.createElement('td');
      tdSuggested.className = 'has-text-right';
      tdSuggested.textContent = `R$ ${suggestedUnit != null ? formatMoney(suggestedUnit) : '-'}`;

      const tdTotal = document.createElement('td');
      tdTotal.className = 'has-text-right';
      tdTotal.textContent = `R$ ${totalPrice != null ? formatMoney(totalPrice) : '-'}`;

      const tdStatus = document.createElement('td');
      const statusSpan = document.createElement('span');
      statusSpan.className = `recipes-status${statusKey === 'INACTIVE' ? ' is-inactive' : ''}`;
      statusSpan.textContent = String(status || '');
      tdStatus.appendChild(statusSpan);

      const tdActions = document.createElement('td');
      tdActions.className = 'has-text-right';
      const btnEdit = document.createElement('button');
      btnEdit.className = 'button is-light is-small';
      btnEdit.type = 'button';
      btnEdit.dataset.editId = String(recipe.id ?? '');
      btnEdit.textContent = 'Editar';
      const btnCsv = document.createElement('button');
      btnCsv.className = 'button is-light is-small';
      btnCsv.type = 'button';
      btnCsv.dataset.exportId = String(recipe.id ?? '');
      btnCsv.dataset.format = 'csv';
      btnCsv.dataset.name = String(recipe.name || '');
      btnCsv.textContent = 'CSV';
      const btnPdf = document.createElement('button');
      btnPdf.className = 'button is-light is-small';
      btnPdf.type = 'button';
      btnPdf.dataset.exportId = String(recipe.id ?? '');
      btnPdf.dataset.format = 'pdf';
      btnPdf.dataset.name = String(recipe.name || '');
      btnPdf.textContent = 'PDF';
      tdActions.appendChild(btnEdit);
      tdActions.appendChild(document.createTextNode(' '));
      tdActions.appendChild(btnCsv);
      tdActions.appendChild(document.createTextNode(' '));
      tdActions.appendChild(btnPdf);

      row.appendChild(tdName);
      row.appendChild(tdYield);
      row.appendChild(tdUnitCost);
      row.appendChild(tdSuggested);
      row.appendChild(tdTotal);
      row.appendChild(tdStatus);
      row.appendChild(tdActions);
      tableBody.appendChild(row);
    });
  }

  function renderPage() {
    const query = String(searchInput ? searchInput.value : '').toLowerCase();
    const filtered = recipesCache.filter((recipe) => {
      const name = String(recipe.name || '').toLowerCase();
      return name.includes(query);
    });
    const total = filtered.length;
    if (recipesTotal) recipesTotal.textContent = `(${total})`;
    updatePagination(total);
    const start = (currentPage - 1) * PAGE_SIZE;
    renderTable(filtered.slice(start, start + PAGE_SIZE));
  }

  async function loadRecipes(token) {
    const data = await apiRequest('/api/recipes', token);
    recipesCache = Array.isArray(data) ? data : data.items || [];
    currentPage = 1;
    renderPage();
  }

  ensureAuthOrRedirect().then((user) => {
    if (!user) return;
    loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));
    const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
    if (deletedFlag) {
      sessionStorage.removeItem(DELETE_FLAG);
      showMessage('Ficha t\u00e9cnica removida.', 'is-success');
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
        loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));
      });
    });
  }

  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', () => {
      const name = ingredientName.value.trim();
      applyUnitNormalization(ingredientQty, ingredientUnit);
      applyUnitNormalization(ingredientPack, ingredientPackUnit, () => {
        packUnitTouched = true;
      });
      let quantity = toNumber(ingredientQty.value, 0.01);
      let pack = toNumber(ingredientPack.value, 0.01);
      let cost = toNumber(ingredientCost.value, 0);
      const unit = ingredientUnit ? ingredientUnit.value : '';
      const packUnit = ingredientPackUnit ? ingredientPackUnit.value : unit;
      const advancedOpen = isIngredientAdvancedOpen();
      const wantsPrice = advancedOpen || pack != null || cost != null;
      if (!name || quantity == null || !unit || (wantsPrice && (pack == null || cost == null))) {
        validateIngredientFields(true);
        showIngredientSuccess('');
        return;
      }
      if (!wantsPrice) {
        pack = 0;
        cost = 0;
      }
      if (unit === 'kg') {
        const adjustedQty = normalizeKgValue(quantity);
        if (adjustedQty !== quantity) {
          quantity = adjustedQty;
          ingredientQty.value = formatQuantity(quantity);
          showIngredientWarning(`Converti ${formatQuantity(adjustedQty * 1000)} g para ${formatQuantity(adjustedQty)} kg.`);
        }
        const limitedQty = enforceKgLimits(quantity, 'quantidade usada', 10);
        if (limitedQty == null) {
          return;
        }
      }
      if (wantsPrice && packUnit === 'kg') {
        const adjustedPack = normalizeKgValue(pack);
        if (adjustedPack !== pack) {
          pack = adjustedPack;
          ingredientPack.value = formatQuantity(pack);
          showIngredientWarning(`Converti ${formatQuantity(adjustedPack * 1000)} g para ${formatQuantity(adjustedPack)} kg.`);
        }
        const limitedPack = enforceKgLimits(pack, 'quantidade do pacote', 50);
        if (limitedPack == null) {
          return;
        }
        pack = limitedPack;
      }
      clearIngredientWarning();
      clearFieldError(ingredientName, ingredientError);
      showIngredientSuccess('Item adicionado.');
      const activeComponent = getActiveComponent();
      if (activeComponent) {
        activeComponent.items.push({ name, ingredientId: (findCatalogIngredient(name) || {}).id, quantity, packageQuantity: pack, cost, unit, packUnit, component: activeComponent.name });
      }
      ingredientName.value = '';
      ingredientQty.value = '';
      ingredientPack.value = '';
      ingredientCost.value = '';
      renderIngredients();
    });
  }



  if (overheadAddBtn) {
    overheadAddBtn.addEventListener('click', () => {
      const name = overheadItemName ? overheadItemName.value.trim() : '';
      const value = toNumber(overheadItemValue ? overheadItemValue.value : null, 0.01);
      if (!name || value == null) {
        if (overheadError) {
          overheadError.textContent = 'Informe descri\u00e7\u00e3o e valor.';
          overheadError.hidden = false;
        }
        return;
      }
      if (overheadError) {
        overheadError.textContent = '';
        overheadError.hidden = true;
      }
      overheadItems.push({ name, value });
      if (overheadItemName) overheadItemName.value = '';
      if (overheadItemValue) overheadItemValue.value = '';
      renderOverheadItems();
    });
  }

  if (overheadBody) {
    overheadBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      if (Number.isInteger(index)) {
        overheadItems.splice(index, 1);
        renderOverheadItems();
      }
    });
  }

  if (ingredientsBody) {
    ingredientsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      const activeComponent = getActiveComponent();
      if (Number.isInteger(index) && activeComponent && Array.isArray(activeComponent.items)) {
        activeComponent.items.splice(index, 1);
        renderIngredients();
      }
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldError(createName, createNameError);
      clearFieldError(createYield, createYieldError);

      const name = createName.value.trim();
      const yieldValue = toNumber(createYield.value, 0.01);
      if (!validateName(name)) {
        setFieldError(createName, createNameError, 'Informe um nome com pelo menos 3 letras.');
        return;
      }
      if (yieldValue == null) {
        setFieldError(createYield, createYieldError, 'Informe um rendimento maior que zero.');
        return;
      }
      if (!getAllIngredients().length) {
        setFieldError(ingredientName, ingredientError, 'Adicione pelo menos um item em alguma parte.');
        return;
      }

      createSubmit.classList.add('is-loading');
      createSubmit.disabled = true;
      try {
        const ingredientsAll = getAllIngredients();
        const ingredientsTotal = ingredientsAll.reduce((sum, item) => sum + calculateIngredientCost(item), 0);
        const overheadValue = getOverheadValue(ingredientsTotal);
        const baseTotal = ingredientsTotal + overheadValue;
        const profitType = getProfitType();
        let marginValue = 0;
        if (profitType === 'percent') {
          marginValue = (toNumber(createMargin.value, 0) || 0) / 100;
        } else {
          const fixedProfit = toNumber(createProfitFixed.value, 0) || 0;
          marginValue = baseTotal > 0 ? fixedProfit / baseTotal : 0;
        }
        const ingredientsPayload = ingredientsAll.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          packageQuantity: item.packageQuantity,
          cost: item.cost,
          unit: item.unit,
          packUnit: item.packUnit,
          component: item.component || undefined,
          ingredientId: item.ingredientId || undefined,
        }));
        await apiRequest('/api/recipes', null, {
          method: 'POST',
          body: JSON.stringify({
            name,
            description: createDescription.value.trim() || undefined,
            yield: yieldValue,
            yieldType: createYieldType.value,
            overhead: overheadValue,
            overheadItems: overheadItems.map((item) => ({
              name: item.name,
              cost: toNumber(item.value, 0) || 0,
            })),
            labor: 0,
            margin: marginValue,
            ingredients: ingredientsPayload,
          }),
        });
        showMessage('Ficha t\u00e9cnica salva com sucesso.', 'is-success');
        createForm.reset();
        components = [];
        overheadItems = [];
        ensureDefaultComponent();
        renderComponentSelect();
        renderIngredients();
        renderOverheadItems();
        updateCostSummary();
        await loadRecipes(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        createSubmit.classList.remove('is-loading');
        createSubmit.disabled = false;
      }
    });
  }

  if (tableBody) {
    tableBody.addEventListener('click', (event) => {
      const nameBtn = event.target.closest('button[data-id]');
      if (nameBtn) {
        const id = nameBtn.dataset.id;
        window.location.href = `/recipe-edit.html?id=${encodeURIComponent(id)}`;
        return;
      }
      const editBtn = event.target.closest('button[data-edit-id]');
      if (editBtn) {
        const id = editBtn.dataset.editId;
        window.location.href = `/recipe-edit.html?id=${encodeURIComponent(id)}`;
        return;
      }
      const exportBtn = event.target.closest('button[data-export-id]');
      if (exportBtn) {
        const id = exportBtn.dataset.exportId;
        const format = exportBtn.dataset.format || 'csv';
        const name = exportBtn.dataset.name || '';
        downloadExport(id, name, format);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
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
      const totalPages = Math.ceil(recipesCache.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderPage();
      }
    });
  }

  if (pageJumpBtn) {
    pageJumpBtn.addEventListener('click', () => {
      if (!pageJumpInput) return;
      const value = Number(pageJumpInput.value);
      if (Number.isFinite(value)) {
        currentPage = Math.max(1, value);
        renderPage();
      }
    });
  }

  if (pageJumpInput) {
    pageJumpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = Number(pageJumpInput.value);
        if (Number.isFinite(value)) {
          currentPage = Math.max(1, value);
          renderPage();
        }
      }
    });
  }

  function exportLocalStorageToJson() {
    const snapshot = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      snapshot[key] = localStorage.getItem(key);
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      localStorage: snapshot,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'sgvc-localstorage.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  function clearLocalStorageSnapshot() {
    localStorage.clear();
  }

  window.sgvcExportLocalStorage = exportLocalStorageToJson;
  window.sgvcClearLocalStorage = clearLocalStorageSnapshot;

  [createYield, createOverhead, createProfitFixed, createMargin].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      updateCostSummary();
      updateSubmitState();
    });
  });

  if (createYieldType) {
    createYieldType.addEventListener('change', () => {
      updateCostSummary();
      updateSubmitState();
    });
  }

  if (ingredientUnit) {
    ingredientUnit.addEventListener('change', () => {
      if (ingredientPackUnit && !packUnitTouched) {
        ingredientPackUnit.value = ingredientUnit.value;
      }
      updatePackUnitDisplay();
      updateIngredientUnitHints();
      updatePackUnitHints();
    });
    ingredientUnit.addEventListener('change', () => validateIngredientFields(false));
  }

      if (ingredientPackUnit) {
      ingredientPackUnit.addEventListener('change', () => {
        packUnitTouched = true;
        updatePackUnitHints();
        updatePackQuantityWarning();
      });
    }
    if (ingredientAdvancedToggle) {
    ingredientAdvancedToggle.addEventListener('click', () => {
      setIngredientAdvancedOpen(!isIngredientAdvancedOpen());
    });
  }

  [createName, createYield].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      if (input === createName) validateCreateName(true);
      if (input === createYield) validateCreateYield(true);
      updateSubmitState();
    });
    input.addEventListener('blur', () => {
      if (input === createName) validateCreateName(true);
      if (input === createYield) validateCreateYield(true);
      updateSubmitState();
    });
  });

  [ingredientName, ingredientQty, ingredientPack, ingredientCost].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      if (input === ingredientQty || input === ingredientPack || input === ingredientCost) {
        clearIngredientWarning('parse');
        clearIngredientWarning('kg');
      }
      if (input === ingredientPack) {
        updatePackQuantityWarning();
      }
      validateIngredientFields(false);
    });
    input.addEventListener('blur', () => {
      if (input === ingredientQty) {
        applyUnitNormalization(ingredientQty, ingredientUnit);
      }
      if (input === ingredientPack) {
        applyUnitNormalization(ingredientPack, ingredientPackUnit, () => {
          packUnitTouched = true;
        });
      }
      validateIngredientFields(true);
    });
  });

  if (componentAddBtn) {
    componentAddBtn.addEventListener('click', () => {
      if (!componentName) return;
      addComponent(componentName.value);
      componentName.value = '';
    });
  }

  if (componentName) {
    componentName.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addComponent(componentName.value);
        componentName.value = '';
      }
    });
  }

  if (componentAddMassa) {
    componentAddMassa.addEventListener('click', () => addComponent('Massa'));
  }

    if (componentAddCobertura) {
      componentAddCobertura.addEventListener('click', () => addComponent('Cobertura'));
    }

    if (componentAddEmbalagem) {
      componentAddEmbalagem.addEventListener('click', () => addComponent('Embalagem'));
    }

  if (componentAddMaoObra) {
    componentAddMaoObra.addEventListener('click', () => addComponent('M\u00e3o de obra'));
  }

  if (componentAddAviamentos) {
    componentAddAviamentos.addEventListener('click', () => addComponent('Recheio'));
  }

  if (componentAddMateriaPrima) {
    componentAddMateriaPrima.addEventListener('click', () => addComponent('Mat\u00e9ria-prima'));
  }

    if (componentAddAcabamento) {
      componentAddAcabamento.addEventListener('click', () => addComponent('Acabamento'));
    }

  if (componentSelect) {
    componentSelect.addEventListener('change', () => {
      setActiveComponent(componentSelect.value);
    });
  }

    if (componentRenameBtn) {
      componentRenameBtn.addEventListener('click', () => {
        if (!componentRename) return;
        renameActiveComponent(componentRename.value);
        componentRename.value = '';
      });
    }

    if (componentRename) {
      componentRename.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          renameActiveComponent(componentRename.value);
          componentRename.value = '';
        }
      });
    }

    if (componentRemoveBtn) {
      componentRemoveBtn.addEventListener('click', () => {
        removeActiveComponent();
      });
    }

    if (componentDuplicateBtn) {
      componentDuplicateBtn.addEventListener('click', () => {
        duplicateActiveComponent();
      });
    }

    if (componentMoveUpBtn) {
      componentMoveUpBtn.addEventListener('click', () => {
        moveActiveComponent(-1);
      });
    }

    if (componentMoveDownBtn) {
      componentMoveDownBtn.addEventListener('click', () => {
        moveActiveComponent(1);
      });
    }

  if (fillExample) {
    fillExample.addEventListener('click', () => {
      if (createName) createName.value = 'Bolo de Chocolate 1kg';
      if (createDescription) createDescription.value = 'Bolo simples com recheio';
      if (createYield) createYield.value = '10';
      if (createYieldType) createYieldType.value = 'UN';
      setMaskedValue(createOverhead, 5, overheadMask);
      setMaskedValue(createProfitFixed, 10, profitFixedMask);
      setMaskedValue(createMargin, 30, marginMask);
      if (createProfitTypeFixed) createProfitTypeFixed.checked = true;
      components = [
        {
          name: 'Massa',
          items: [
            { name: 'Farinha de trigo', quantity: 200, packageQuantity: 1000, cost: 6, unit: 'g', component: 'Massa' },
            { name: 'Acucar', quantity: 150, packageQuantity: 1000, cost: 5, unit: 'g', component: 'Massa' },
            { name: 'Ovos', quantity: 3, packageQuantity: 30, cost: 18, unit: 'un', component: 'Massa' },
          ],
        },
        {
          name: 'Cobertura',
          items: [
            { name: 'Chocolate', quantity: 200, packageQuantity: 1000, cost: 18, unit: 'g', component: 'Cobertura' },
          ],
        },
      ];
      renderComponentSelect();
      if (componentSelect) componentSelect.value = 'Massa';
      renderIngredients();
      showIngredientSuccess('Exemplo carregado.');
      validateCreateName(false);
      validateCreateYield(false);
      setIngredientAdvancedOpen(true);
    });
  }

  if (createProfitTypeFixed) {
    createProfitTypeFixed.addEventListener('change', () => updateProfitTypeUI());
  }
  if (createProfitTypePercent) {
    createProfitTypePercent.addEventListener('change', () => updateProfitTypeUI());
  }

  initMasks();
  loadIngredientSuggestions().then(loadIngredientCatalog);
  bindQuickSuggestions(createOverheadSuggestions, createOverhead, overheadMask);
  bindQuickSuggestions(createMarginSuggestions, createMargin, marginMask, () => {
    if (createProfitTypePercent && !createProfitTypePercent.checked) {
      createProfitTypePercent.checked = true;
      updateProfitTypeUI();
    }
  });

  setIngredientAdvancedOpen(false);
  updateProfitTypeUI();
  updateIngredientUnitHints();
  updatePackUnitDisplay();
  updatePackUnitHints();
  ensureDefaultComponent();
  renderComponentSelect();
  renderIngredients();
  renderOverheadItems();
  updateComponentsTotal();
  updateCostSummary();
  updateComponentSubtotal();
  renderComponentsSummary();
  updateSubmitState();

  // Removido: bloco legado que dependia de token em storage.
})();






