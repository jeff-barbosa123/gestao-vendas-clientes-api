
(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;
  const DELETE_FLAG = 'sgvc.recipeDeleted';

  const messageBox = document.getElementById('edit-message');
  const backBtn = document.getElementById('back-list');
  const form = document.getElementById('edit-form');
  const nameInput = document.getElementById('edit-name');
  const descriptionInput = document.getElementById('edit-description');
  const yieldInput = document.getElementById('edit-yield');
  const yieldTypeInput = document.getElementById('edit-yield-type');
  const overheadInput = document.getElementById('edit-overhead');
  const overheadWarning = document.getElementById('edit-overhead-warning');
  const overheadSuggestions = document.getElementById('edit-overhead-suggestions');
  const overheadItemName = document.getElementById('edit-overhead-item-name');
  const overheadItemValue = document.getElementById('edit-overhead-item-value');
  const overheadAddBtn = document.getElementById('edit-overhead-add');
  const overheadBody = document.getElementById('edit-overhead-body');
  const overheadTotalEl = document.getElementById('edit-overhead-total');
  const overheadError = document.getElementById('edit-overhead-error');
  const marginInput = document.getElementById('edit-margin');
  const marginSuggestions = document.getElementById('edit-margin-suggestions');
  const profitFixedInput = document.getElementById('edit-profit-fixed');
  const profitTypeFixed = document.getElementById('edit-profit-type-fixed');
  const profitTypePercent = document.getElementById('edit-profit-type-percent');
  const profitFixedSection = document.getElementById('edit-profit-fixed-section');
  const profitPercentSection = document.getElementById('edit-profit-percent-section');
  const saveBtn = document.getElementById('save-btn');
  const deleteBtn = document.getElementById('delete-btn');
  const nameError = document.getElementById('edit-name-error');
  const yieldError = document.getElementById('edit-yield-error');
  const ingredientName = document.getElementById('edit-ingredient-name');
  const ingredientQty = document.getElementById('edit-ingredient-qty');
  const ingredientUnit = document.getElementById('edit-ingredient-unit');
  const ingredientPack = document.getElementById('edit-ingredient-pack');
  const ingredientPackUnit = document.getElementById('edit-ingredient-pack-unit');
  const ingredientCost = document.getElementById('edit-ingredient-cost');
  const ingredientSuggestions = document.getElementById('edit-ingredient-suggestions');
  const ingredientAdvanced = document.getElementById('edit-ingredient-advanced');
  const ingredientAdvancedToggle = document.getElementById('edit-ingredient-advanced-toggle');
  const ingredientError = document.getElementById('edit-ingredient-error');
  const ingredientSuccess = document.getElementById('edit-ingredient-success');
  const ingredientUnitHelp = document.getElementById('edit-ingredient-unit-help');
  const ingredientUnitWarning = document.getElementById('edit-ingredient-unit-warning');
  const addIngredientBtn = document.getElementById('edit-add-ingredient');
  const ingredientsBody = document.getElementById('edit-ingredients-body');
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
  const componentsSummary = document.getElementById('components-summary');
  const componentSubtotal = document.getElementById('component-subtotal');
  const componentsTotal = document.getElementById('components-total');
  const summaryTotal = document.getElementById('summary-total');
  const summaryOverhead = document.getElementById('summary-overhead');
  const summaryOverheadLabel = document.getElementById('summary-overhead-label');
  const summaryProfitType = document.getElementById('summary-profit-type');
  const summaryYield = document.getElementById('summary-yield');
  const summaryUnit = document.getElementById('summary-unit');
  const summarySuggested = document.getElementById('summary-suggested');
  const summaryProfit = document.getElementById('summary-profit');
  const calcStatus = document.getElementById('edit-calc-status');
  const deleteModal = document.getElementById('delete-modal');
  const deleteClose = document.getElementById('delete-close');
  const deleteCloseBtn = document.getElementById('delete-close-btn');
  const deleteCancel = document.getElementById('delete-cancel');
  const deleteConfirm = document.getElementById('delete-confirm');

  const DEFAULT_COMPONENT_NAME = 'Ingredientes principais';
  const AUTO_SAVE_KEY = 'sgvc.recipe.edit.draft';
  let components = [];
  let overheadItems = [];
  let editingIngredientIndex = null;
  let editingComponentName = null;
  const addIngredientLabel = addIngredientBtn ? addIngredientBtn.textContent : '';
  let messageTimer = null;
  let ingredientTimer = null;
  let packUnitTouched = false;
  let overheadMask = null;
  let marginMask = null;
  let profitFixedMask = null;
  let overheadItemMask = null;
  let ingredientCostMask = null;
  let recipeId = null;

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
      if (overheadInput) {
        overheadMask = new window.Cleave(overheadInput, {
          numeral: true,
          numeralDecimalMark: ',',
          delimiter: '.',
          numeralDecimalScale: 2,
          numeralPositiveOnly: true,
        });
      }
      if (marginInput) {
        marginMask = new window.Cleave(marginInput, {
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
      // AutoNumeric não suporta type="number", então só inicializar se o campo não for type="number"
      if (profitFixedInput && profitFixedInput.type !== 'number') {
        try {
          profitFixedMask = new window.AutoNumeric(profitFixedInput, moneyOptions);
        } catch (err) {
          console.warn('[RECIPE-EDIT] Erro ao inicializar AutoNumeric em profitFixedInput:', err);
        }
      }
      if (overheadItemValue && overheadItemValue.type !== 'number') {
        try {
          overheadItemMask = new window.AutoNumeric(overheadItemValue, moneyOptions);
        } catch (err) {
          console.warn('[RECIPE-EDIT] Erro ao inicializar AutoNumeric em overheadItemValue:', err);
        }
      }
      if (ingredientCost && ingredientCost.type !== 'number') {
        try {
          ingredientCostMask = new window.AutoNumeric(ingredientCost, moneyOptions);
        } catch (err) {
          console.warn('[RECIPE-EDIT] Erro ao inicializar AutoNumeric em ingredientCost:', err);
        }
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
        if (Array.isArray(data)) {
          items = data.slice();
        }
      }
    } catch (_err) {
      items = INGREDIENTS_FALLBACK.slice();
    }
    // Garantir que items é sempre um array antes de usar .map()
    if (!Array.isArray(items)) {
      items = [];
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

  function validateEditName(showMessage) {
    const value = nameInput ? nameInput.value.trim() : '';
    if (value.length < 3) {
      if (showMessage) {
        setFieldError(nameInput, nameError, 'Informe um nome com pelo menos 3 letras.');
      } else if (nameInput) {
        nameInput.classList.add('is-danger');
      }
      return false;
    }
    clearFieldError(nameInput, nameError);
    return true;
  }

  function validateEditYield(showMessage) {
    const value = toNumber(yieldInput ? yieldInput.value : null, 0.01);
    if (value == null) {
      if (showMessage) {
        setFieldError(yieldInput, yieldError, 'Informe um rendimento maior que zero.');
      } else if (yieldInput) {
        yieldInput.classList.add('is-danger');
      }
      return false;
    }
    clearFieldError(yieldInput, yieldError);
    return true;
  }

  function saveFormState() {
    if (!recipeId) return;
    try {
      const state = {
        recipeId,
        name: nameInput ? nameInput.value : '',
        description: descriptionInput ? descriptionInput.value : '',
        yield: yieldInput ? yieldInput.value : '',
        yieldType: yieldTypeInput ? yieldTypeInput.value : 'UN',
        overhead: overheadInput ? overheadInput.value : '',
        overheadItems: overheadItems || [],
        margin: marginInput ? marginInput.value : '',
        profitFixed: profitFixedInput ? profitFixedInput.value : '',
        profitType: profitTypeFixed && profitTypeFixed.checked ? 'fixed' : 'percent',
        components: components || [],
        timestamp: Date.now(),
      };
      localStorage.setItem(`${AUTO_SAVE_KEY}.${recipeId}`, JSON.stringify(state));
    } catch (err) {
      console.error('[RECIPE-EDIT] Erro ao salvar estado do formulário:', err);
    }
  }

  function loadFormState() {
    if (!recipeId) return null;
    try {
      const saved = localStorage.getItem(`${AUTO_SAVE_KEY}.${recipeId}`);
      if (!saved) return null;
      const state = JSON.parse(saved);
      // Verificar se o estado salvo é recente (últimas 24 horas)
      if (state.timestamp && Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`${AUTO_SAVE_KEY}.${recipeId}`);
        return null;
      }
      return state;
    } catch (err) {
      console.error('[RECIPE-EDIT] Erro ao carregar estado do formulário:', err);
      return null;
    }
  }

  function clearFormState() {
    if (!recipeId) return;
    try {
      localStorage.removeItem(`${AUTO_SAVE_KEY}.${recipeId}`);
    } catch (err) {
      console.error('[RECIPE-EDIT] Erro ao limpar estado do formulário:', err);
    }
  }

  function restoreFormState(state) {
    if (!state) return;
    if (nameInput && state.name) nameInput.value = state.name;
    if (descriptionInput && state.description) descriptionInput.value = state.description;
    if (yieldInput && state.yield) yieldInput.value = state.yield;
    if (yieldTypeInput && state.yieldType) yieldTypeInput.value = state.yieldType;
    if (overheadInput && state.overhead) {
      if (overheadMask) {
        setMaskedValue(overheadInput, parseFloat(state.overhead) || 0, overheadMask);
      } else {
        overheadInput.value = state.overhead;
      }
    }
    if (marginInput && state.margin) {
      if (marginMask) {
        setMaskedValue(marginInput, parseFloat(state.margin) || 0, marginMask);
      } else {
        marginInput.value = state.margin;
      }
    }
    if (profitFixedInput && state.profitFixed) {
      if (profitFixedMask) {
        setMaskedValue(profitFixedInput, parseFloat(state.profitFixed) || 0, profitFixedMask);
      } else {
        profitFixedInput.value = state.profitFixed;
      }
    }
    if (state.profitType === 'fixed' && profitTypeFixed) {
      profitTypeFixed.checked = true;
      if (profitTypePercent) profitTypePercent.checked = false;
    } else if (profitTypePercent) {
      profitTypePercent.checked = true;
      if (profitTypeFixed) profitTypeFixed.checked = false;
    }
    if (state.overheadItems && Array.isArray(state.overheadItems)) {
      overheadItems = state.overheadItems.map((item) => ({
        name: item.name || '',
        value: String(item.value || item.cost || 0),
      }));
      renderOverheadItems();
    }
    if (state.components && Array.isArray(state.components) && state.components.length > 0) {
      components = state.components.map((comp) => ({
        name: comp.name || '',
        items: (comp.items || []).map((item) => ({
          name: item.name || '',
          ingredientId: item.ingredientId || undefined,
          quantity: item.quantity || 0,
          packageQuantity: item.packageQuantity || 0,
          cost: item.cost || 0,
          unit: item.unit || 'g',
          packUnit: item.packUnit || item.unit || 'g',
        })),
      }));
      if (!components.length) {
        ensureDefaultComponent();
      }
      renderComponentSelect();
      renderIngredients();
    }
    updateProfitTypeUI();
    updateComponentsTotal();
    updateComponentSubtotal();
    renderComponentsSummary();
    updateCostSummary();
  }

  function updateSaveState() {
    // Usar enableSaveButton em vez de duplicar lógica
    enableSaveButton();
    updateCalcStatus();
  }

  function updateCalcStatus() {
    if (!calcStatus) return;
    const missing = [];
    if (!validateName(nameInput ? nameInput.value : '')) missing.push('nome do produto');
    if (toNumber(yieldInput ? yieldInput.value : null, 0.01) == null) missing.push('rendimento');
    if (!getAllIngredients().length) missing.push('itens');
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
      updateSaveState();
    });
  }

  function ensureDefaultComponent() {
    if (!components.length) {
      components.push({ name: DEFAULT_COMPONENT_NAME, items: [] });
    }
  }

  function getActiveComponent() {
    if (!components.length) return null;
    const selected = componentSelect ? componentSelect.value : '';
    const active = components.find((component) => component.name === selected);
    return active || components[0];
  }

  function setActiveComponent(name) {
    const active = components.find((component) => component.name === name) || components[0];
    if (componentSelect && active) {
      componentSelect.value = active.name;
    }
    resetIngredientForm();
    renderIngredients();
    updateComponentSubtotal();
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
    if (!name) {
      showMessage('Informe um nome para a parte.', 'is-danger');
      if (componentName) componentName.focus();
      return;
    }
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
    saveFormState();
    showMessage(`Parte "${name}" adicionada com sucesso.`, 'is-success');
  }

  function renameActiveComponent(rawName) {
    const active = getActiveComponent();
    const name = String(rawName || '').trim();
    if (!active) {
      console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado para renomear');
      showMessage('Selecione uma parte antes de renomear.', 'is-danger');
      return;
    }
    if (!name) {
      showMessage('Informe um nome para a parte.', 'is-danger');
      if (componentRename) componentRename.focus();
      return;
    }
    if (active.name === DEFAULT_COMPONENT_NAME) {
      showMessage('Não é possível renomear "Ingredientes principais".', 'is-danger');
      return;
    }
    // Permite renomear mesmo se o nome já existir em outra parte (corrigir nome errado)
    const existing = components.find((component) => component !== active && component.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      showMessage('Essa parte j\u00e1 existe. Escolha outro nome.', 'is-danger');
      if (componentRename) componentRename.focus();
      return;
    }
    const oldName = active.name;
    active.name = name;
    renderComponentSelect();
    setActiveComponent(name);
    saveFormState();
    showMessage(`Parte "${oldName}" renomeada para "${name}".`, 'is-success');
  }

  function removeActiveComponent() {
    const active = getActiveComponent();
    if (!active) {
      console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado para remover');
      showMessage('Selecione uma parte antes de remover.', 'is-danger');
      return;
    }
    if (active.name === DEFAULT_COMPONENT_NAME) {
      showMessage('Não é possível remover "Ingredientes principais".', 'is-danger');
      return;
    }
    if (components.length <= 1) {
      showMessage('Não é possível remover a única parte restante.', 'is-danger');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja remover "${active.name}" e todos os itens dela?`)) return;
    const removedName = active.name;
    components = components.filter((component) => component !== active);
    renderComponentSelect();
    if (components.length > 0) {
      setActiveComponent(components[0].name);
    }
    renderIngredients();
    updateComponentSubtotal();
    updateComponentsTotal();
    updateCostSummary();
    saveFormState();
    showMessage(`Parte "${removedName}" removida com sucesso.`, 'is-success');
  }

  function duplicateActiveComponent() {
    const active = getActiveComponent();
    if (!active) {
      console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado para duplicar');
      showMessage('Selecione uma parte antes de duplicar.', 'is-danger');
      return;
    }
    const base = `${active.name} c\u00f3pia`;
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
    saveFormState();
    showMessage(`Parte "${name}" criada com sucesso.`, 'is-success');
    renderIngredients();
    updateComponentSubtotal();
    updateComponentsTotal();
    updateCostSummary();
  }

  function moveActiveComponent(direction) {
    const active = getActiveComponent();
    if (!active) {
      console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado para mover');
      showMessage('Selecione uma parte antes de mover.', 'is-danger');
      return;
    }
    const index = components.findIndex((component) => component === active);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= components.length) {
      console.warn('[RECIPE-EDIT] Não é possível mover componente na posição', index, 'para', nextIndex);
      return;
    }
    const swap = components[nextIndex];
    components[nextIndex] = active;
    components[index] = swap;
    renderComponentSelect();
    setActiveComponent(active.name);
    saveFormState();
    const directionText = direction < 0 ? 'para cima' : 'para baixo';
    showMessage(`Parte "${active.name}" movida ${directionText}.`, 'is-success');
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

  function updateComponentsTotal() {
    if (!componentsTotal) return;
    const total = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
    componentsTotal.textContent = `Custo total das partes: R$ ${formatMoney(total)}`;
  }

  function updateComponentSubtotal() {
    if (!componentSubtotal) return;
    const active = getActiveComponent();
    const items = active ? active.items || [] : [];
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

  function buildComponentsFromIngredients(ingredients) {
    const map = new Map();
    const order = [];
    (ingredients || []).forEach((item) => {
      const rawName = String(item.component || DEFAULT_COMPONENT_NAME).trim() || DEFAULT_COMPONENT_NAME;
      if (!map.has(rawName)) {
        map.set(rawName, []);
        order.push(rawName);
      }
      map.get(rawName).push({
        name: item.name,
        ingredientId: item.ingredientId || undefined,
        quantity: item.quantity,
        packageQuantity: item.packageQuantity,
        cost: item.cost,
        unit: item.unit || '',
        packUnit: item.packUnit || item.unit || '',
      });
    });
    if (!order.length) {
      return [{ name: DEFAULT_COMPONENT_NAME, items: [] }];
    }
    return order.map((name) => ({ name, items: map.get(name) || [] }));
  }

  function normalizeOverheadPercent(value) {
    if (value == null) return 0;
    if (value > 15) {
      if (overheadWarning) {
        overheadWarning.textContent = 'Recomendado manter at\u00e9 15%.';
        overheadWarning.hidden = false;
      }
      return 15;
    }
    if (overheadWarning) {
      overheadWarning.textContent = '';
      overheadWarning.hidden = true;
    }
    return value;
  }

  function getOverheadPercentValue() {
    const raw = toNumber(overheadInput ? overheadInput.value : null, 0);
    return normalizeOverheadPercent(raw || 0);
  }

  function getOverheadValue(ingredientsTotal) {
    const percent = getOverheadPercentValue();
    const percentValue = ingredientsTotal * (percent / 100);
    const detailed = overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    return percentValue + detailed;
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
          <td class="has-text-right">R$ ${formatMoney(Number(item.value) || 0)}</td>
          <td class="has-text-right"><button class="button is-light is-small" data-index="${index}">Remover</button></td>
        `;
        overheadBody.appendChild(row);
      });
    }
    const total = overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    if (overheadTotalEl) overheadTotalEl.textContent = `R$ ${formatMoney(total)}`;
    updateCostSummary();
  }

  function updateCostSummary() {
    if (!summaryTotal || !summaryUnit || !summarySuggested || !summaryYield || !summaryProfit || !summaryProfitType) {
      return;
    }
    const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
    const overheadValue = getOverheadValue(ingredientsTotal);
    const overheadItemsTotal = overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    if (summaryOverhead) {
      summaryOverhead.textContent = `R$ ${formatMoney(overheadValue)}`;
    }
    if (summaryOverheadLabel) {
      const percent = getOverheadPercentValue();
      if (percent > 0) {
        summaryOverheadLabel.textContent = `Gastos extras (${formatQuantity(percent)}%)`;
      } else if (overheadItemsTotal > 0) {
        summaryOverheadLabel.textContent = 'Gastos extras (itens)';
      } else {
        summaryOverheadLabel.textContent = 'Gastos extras (n\u00e3o informado)';
      }
    }
    const totalCost = ingredientsTotal + overheadValue;
    const yieldValue = toNumber(yieldInput.value, 0);
    const marginPercent = toNumber(marginInput.value, 0) || 0;
    const fixedProfit = toNumber(profitFixedInput.value, 0) || 0;
    const profitType = profitTypePercent && profitTypePercent.checked ? 'percent' : 'fixed';

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
      summaryYield.textContent = `${formatQuantity(yieldValue)} ${yieldTypeInput.value || ''}`.trim();
    } else {
      const placeholder = 'Preencha os dados acima';
      summaryUnit.textContent = placeholder;
      summarySuggested.textContent = placeholder;
      summaryProfit.textContent = placeholder;
      summaryYield.textContent = placeholder;
    }
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

  function setIngredientFormValues(item) {
    if (!item) return;
    if (ingredientName) ingredientName.value = item.name || '';
    if (ingredientQty) {
      const qtyValue = Number(item.quantity) || 0;
      ingredientQty.value = formatQuantity(qtyValue).replace(/,00$/, '');
    }
    if (ingredientUnit) ingredientUnit.value = item.unit || 'g';
    if (ingredientPackUnit) {
      ingredientPackUnit.value = item.packUnit || item.unit || 'g';
      packUnitTouched = true;
    }
    updatePackUnitDisplay();
    const hasPrice = Number(item.packageQuantity) > 0 || Number(item.cost) > 0;
    if (ingredientPack) {
      ingredientPack.value = hasPrice ? formatQuantity(Number(item.packageQuantity) || 0).replace(/,00$/, '') : '';
    }
    if (ingredientCost) {
      ingredientCost.value = hasPrice ? formatQuantity(Number(item.cost) || 0).replace(/,00$/, '') : '';
    }
    setIngredientAdvancedOpen(hasPrice);
  }

  function resetIngredientForm() {
    editingIngredientIndex = null;
    editingComponentName = null;
    if (ingredientName) ingredientName.value = '';
    if (ingredientQty) ingredientQty.value = '';
    if (ingredientPack) ingredientPack.value = '';
    if (ingredientCost) ingredientCost.value = '';
    if (addIngredientBtn && addIngredientLabel) addIngredientBtn.textContent = addIngredientLabel;
    setIngredientAdvancedOpen(false);
    packUnitTouched = false;
    updatePackUnitDisplay();
  }

  function startIngredientEdit(index) {
    const active = getActiveComponent();
    if (!Number.isInteger(index) || !active || !active.items || !active.items[index]) return;
    editingIngredientIndex = index;
    editingComponentName = active.name;
    if (addIngredientBtn) addIngredientBtn.textContent = 'Atualizar item';
    setIngredientFormValues(active.items[index]);
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
  function convertMonetaryInput(value) {
    if (!value || typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    // Remove caracteres não numéricos exceto vírgula e ponto
    const cleaned = trimmed.replace(/[^\d,.]/g, '');
    // Se não tem vírgula nem ponto, assume que são centavos
    if (!cleaned.includes(',') && !cleaned.includes('.')) {
      const num = parseInt(cleaned, 10);
      if (isNaN(num)) return value;
      // Sempre assume que são centavos quando não tem separador
      // Ex: 250 -> 2,50, 5 -> 0,05, 50 -> 0,50
      return (num / 100).toFixed(2).replace('.', ',');
    }
    // Se já tem vírgula ou ponto, verifica se precisa ajustar
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      if (parts.length === 2) {
        // Já tem formato correto, apenas garante que centavos têm 2 dígitos
        const reais = parts[0] || '0';
        const cents = parts[1].slice(0, 2).padEnd(2, '0');
        return `${reais},${cents}`;
      }
    }
    if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      if (parts.length === 2) {
        // Converte ponto para vírgula
        const reais = parts[0] || '0';
        const cents = parts[1].slice(0, 2).padEnd(2, '0');
        return `${reais},${cents}`;
      }
    }
    return value;
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
    return value.toFixed(2).replace('.', ',');
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

  /**
   * Calcula o custo do ingrediente usando a fórmula:
   * custo_item = (quantidade_usada / quantidade_pacote) × preco_pacote
   * 
   * IMPORTANTE: A unidade do item deve ser a mesma unidade do pacote.
   * Não faz conversão automática - unidades devem ser compatíveis (g com g, ml com ml, etc).
   */
  function calculateIngredientCost(item) {
    if (!item) return 0;
    
    // Valores diretos sem normalização (já devem estar na mesma unidade)
    const quantity = Number(item.quantity) || 0;
    const packageQuantity = Number(item.packageQuantity) || 0;
    const cost = Number(item.cost) || 0;
    
    // Validações: não calcular se valores inválidos
    if (quantity <= 0 || packageQuantity <= 0 || cost < 0) {
      return 0;
    }
    
    // Fórmula: (quantidade_usada / quantidade_pacote) × preco_pacote
    const result = (quantity / packageQuantity) * cost;
    
    // Garantir que não retorna NaN ou Infinity
    if (!Number.isFinite(result) || result < 0) {
      return 0;
    }
    
    return result;
  }

  function renderIngredients() {
    if (!ingredientsBody) return;
    ingredientsBody.innerHTML = '';
    const active = getActiveComponent();
    const items = active ? active.items || [] : [];
    if (!items.length) {
      const label = active
        ? `Nenhum item em ${active.name}. Use o formul\u00e1rio acima para incluir o primeiro.`
        : 'Nenhum item adicionado. Use o formul\u00e1rio acima para incluir o primeiro.';
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 4;
      emptyCell.textContent = label;
      emptyRow.appendChild(emptyCell);
      ingredientsBody.appendChild(emptyRow);
      updateComponentsTotal();
      updateComponentSubtotal();
      renderComponentsSummary();
      updateCostSummary();
      updateProfitTypeUI();
      enableSaveButton();
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
      const btnEdit = document.createElement('button');
      btnEdit.className = 'button is-light is-small';
      btnEdit.dataset.index = String(index);
      btnEdit.dataset.action = 'edit';
      btnEdit.type = 'button';
      btnEdit.textContent = 'Editar';
      const btnRemove = document.createElement('button');
      btnRemove.className = 'button is-light is-small';
      btnRemove.dataset.index = String(index);
      btnRemove.dataset.action = 'remove';
      btnRemove.type = 'button';
      btnRemove.textContent = 'Remover';
      tdActions.appendChild(btnEdit);
      tdActions.appendChild(document.createTextNode(' '));
      tdActions.appendChild(btnRemove);

      row.appendChild(tdName);
      row.appendChild(tdQty);
      row.appendChild(tdCost);
      row.appendChild(tdActions);
      ingredientsBody.appendChild(row);
    });
    updateComponentsTotal();
    updateComponentSubtotal();
    renderComponentsSummary();
    updateCostSummary();
    enableSaveButton();
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
    if (profitTypePercent && profitTypePercent.checked) return 'percent';
    return 'fixed';
  }

  function updateProfitTypeUI() {
    const profitType = getProfitType();
    const showFixed = profitType === 'fixed';
    const showPercent = profitType === 'percent';
    if (profitFixedSection) {
      profitFixedSection.hidden = !showFixed;
      profitFixedSection.style.display = showFixed ? '' : 'none';
      profitFixedSection.setAttribute('aria-hidden', showFixed ? 'false' : 'true');
    }
    if (profitPercentSection) {
      profitPercentSection.hidden = !showPercent;
      profitPercentSection.style.display = showPercent ? '' : 'none';
      profitPercentSection.setAttribute('aria-hidden', showPercent ? 'false' : 'true');
    }
    if (profitFixedInput) profitFixedInput.disabled = !showFixed;
    if (marginInput) marginInput.disabled = !showPercent;
    updateCostSummary();
    enableSaveButton();
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

  /**
   * Detecta e corrige valores muito pequenos para gramas
   * Ex: 0,001 g provavelmente significa 0,001 kg = 1 g
   */
  function detectAndFixSmallGrams(value, unit) {
    if (!Number.isFinite(value) || unit !== 'g') return { value, converted: false };
    
    // Se o valor for menor que 1 e maior que 0, provavelmente está em kg
    if (value > 0 && value < 1) {
      // Converte de kg para g: 0,001 kg = 1 g
      const convertedValue = value * 1000;
      return {
        value: convertedValue,
        converted: true,
        originalValue: value,
        message: `Detectei ${formatQuantity(value)} kg. Converti para ${formatQuantity(convertedValue)} g. Use valores inteiros para gramas (ex: 1, 10, 100).`
      };
    }
    
    // Se o valor for muito pequeno (menos de 0,1 g), avisa
    if (value > 0 && value < 0.1) {
      return {
        value,
        converted: false,
        warning: true,
        message: `Atenção: ${formatQuantity(value)} g é muito pouco. Se você quis dizer ${formatQuantity(value)} kg, troque a unidade para "kg" ou use ${formatQuantity(value * 1000)} g.`
      };
    }
    
    return { value, converted: false };
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

  /**
   * Normaliza e converte a unidade do pacote para corresponder à unidade usada
   * Regra: unidade do item = unidade do pacote (g com g, kg com kg, ml com ml, l com l)
   */
  function normalizePackUnit(quantityUnit, packUnit, packValue) {
    if (!quantityUnit || !packUnit || !Number.isFinite(packValue)) {
      return { packValue, packUnit, converted: false };
    }

    const qtyUnit = String(quantityUnit).toLowerCase();
    const pUnit = String(packUnit).toLowerCase();

    // Se as unidades já são compatíveis, não precisa converter
    if (qtyUnit === pUnit) {
      return { packValue, packUnit, converted: false };
    }

    // Conversões possíveis: kg ↔ g, l ↔ ml
    // Caso 1: Quantidade em g, pacote em kg → converter kg para g
    if (qtyUnit === 'g' && pUnit === 'kg') {
      const convertedValue = packValue * 1000;
      return {
        packValue: convertedValue,
        packUnit: 'g',
        converted: true,
        message: `A unidade do pacote foi convertida de ${formatQuantity(packValue)} kg para ${formatQuantity(convertedValue)} g para corresponder à unidade usada (g).`
      };
    }

    // Caso 2: Quantidade em kg, pacote em g → converter g para kg
    if (qtyUnit === 'kg' && pUnit === 'g') {
      const convertedValue = packValue / 1000;
      return {
        packValue: convertedValue,
        packUnit: 'kg',
        converted: true,
        message: `A unidade do pacote foi convertida de ${formatQuantity(packValue)} g para ${formatQuantity(convertedValue)} kg para corresponder à unidade usada (kg).`
      };
    }

    // Caso 3: Quantidade em ml, pacote em l → converter l para ml
    if (qtyUnit === 'ml' && pUnit === 'l') {
      const convertedValue = packValue * 1000;
      return {
        packValue: convertedValue,
        packUnit: 'ml',
        converted: true,
        message: `A unidade do pacote foi convertida de ${formatQuantity(packValue)} l para ${formatQuantity(convertedValue)} ml para corresponder à unidade usada (ml).`
      };
    }

    // Caso 4: Quantidade em l, pacote em ml → converter ml para l
    if (qtyUnit === 'l' && pUnit === 'ml') {
      const convertedValue = packValue / 1000;
      return {
        packValue: convertedValue,
        packUnit: 'l',
        converted: true,
        message: `A unidade do pacote foi convertida de ${formatQuantity(packValue)} ml para ${formatQuantity(convertedValue)} l para corresponder à unidade usada (l).`
      };
    }

    // Unidades incompatíveis (ex: g com ml, un com g)
    return {
      packValue,
      packUnit,
      converted: false,
      error: true,
      message: `Unidades incompatíveis: quantidade em "${quantityUnit}" e pacote em "${packUnit}". Use a mesma unidade para ambos (ex: g com g, ml com ml, un com un).`
    };
  }

  function applyRecipeData(recipe) {
    if (!recipe) return;
    if (nameInput) nameInput.value = recipe.name || '';
    if (descriptionInput) descriptionInput.value = recipe.description || '';
    if (yieldInput) yieldInput.value = recipe.yield || '';
    if (yieldTypeInput) yieldTypeInput.value = recipe.yieldType || 'UN';
    const ingredientsTotal = (recipe.ingredients || []).reduce((sum, item) => sum + calculateIngredientCost(item), 0);
    const overheadItemsLoaded = (recipe.overheadItems || []).map((item) => ({
      name: item.name,
      value: Number(item.cost) || 0,
    }));
    const overheadTotal = Number(recipe.overhead || 0);
    const overheadExtrasTotal = overheadItemsLoaded.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const overheadPercentValue = Math.max(0, overheadTotal - overheadExtrasTotal);
      if (overheadInput) {
        const overheadPercent = ingredientsTotal > 0
          ? (overheadPercentValue / ingredientsTotal) * 100
          : 0;
        setMaskedValue(overheadInput, overheadPercent, overheadMask);
      }
    const totalCost = Number(recipe.totalCost || 0);
    const marginFraction = Number(recipe.margin || 0);
    const marginPercentValue = marginFraction * 100;
      if (marginInput) setMaskedValue(marginInput, marginPercentValue || 0, marginMask);
      if (profitFixedInput) {
        const fixedProfitValue = totalCost > 0 ? totalCost * marginFraction : '';
        setMaskedValue(profitFixedInput, fixedProfitValue, profitFixedMask);
      }
    if (profitTypePercent && profitTypeFixed) {
      if (profitFixedInput && profitFixedInput.value) {
        profitTypeFixed.checked = true;
        profitTypePercent.checked = false;
      } else {
        profitTypePercent.checked = true;
        profitTypeFixed.checked = false;
      }
    }
    overheadItems = overheadItemsLoaded;
    components = buildComponentsFromIngredients(recipe.ingredients || []);
    renderComponentSelect();
    renderIngredients();
    updateComponentsTotal();
    updateComponentSubtotal();
    renderComponentsSummary();
    updateCostSummary();
    updatePackUnitDisplay();
    updateSaveState();
    renderOverheadItems();
  }

  function toggleDeleteModal(isOpen) {
    if (!deleteModal) return;
    deleteModal.classList.toggle('is-active', isOpen);
    deleteModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!ingredientName) {
        console.error('[RECIPE-EDIT] ingredientName não encontrado');
        return;
      }
      const name = ingredientName.value.trim();
      applyUnitNormalization(ingredientQty, ingredientUnit);
      applyUnitNormalization(ingredientPack, ingredientPackUnit, () => {
        packUnitTouched = true;
      });
      // Converter valores monetários automaticamente
      if (ingredientCost && ingredientCost.value) {
        const converted = convertMonetaryInput(ingredientCost.value);
        if (converted !== ingredientCost.value) {
          ingredientCost.value = converted;
          if (ingredientCostMask) {
            ingredientCostMask.set(converted);
          }
        }
      }
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
        if (!name) {
          if (ingredientName) ingredientName.focus();
        } else if (quantity == null) {
          if (ingredientQty) ingredientQty.focus();
        } else if (!unit) {
          if (ingredientUnit) ingredientUnit.focus();
        } else if (wantsPrice && pack == null) {
          if (ingredientPack) ingredientPack.focus();
        } else if (wantsPrice && cost == null) {
          if (ingredientCost) ingredientCost.focus();
        }
        return;
      }
      
      // Detectar e corrigir valores muito pequenos para gramas (ex: 0,001 g = provavelmente 0,001 kg = 1 g)
      if (unit === 'g' && quantity != null) {
        const fixResult = detectAndFixSmallGrams(quantity, unit);
        if (fixResult.converted) {
          quantity = fixResult.value;
          ingredientQty.value = formatQuantity(quantity);
          showIngredientWarning(fixResult.message, 'grams');
        } else if (fixResult.warning) {
          showIngredientWarning(fixResult.message, 'grams');
        }
      }
      
      if (!wantsPrice) {
        pack = 0;
        cost = 0;
      }
      
      // VALIDAÇÃO CRÍTICA: Normalizar unidade do pacote para corresponder à unidade usada
      // Regra de ouro: unidade do item = unidade do pacote (g com g, kg com kg, ml com ml, l com l)
      let finalPackUnit = packUnit;
      if (wantsPrice && pack != null && unit && packUnit) {
        const packNormalization = normalizePackUnit(unit, packUnit, pack);
        if (packNormalization.error) {
          // Unidades incompatíveis - bloquear e mostrar erro
          showIngredientWarning(packNormalization.message, 'unit-mismatch');
          if (ingredientPackUnit) ingredientPackUnit.focus();
          return;
        }
        if (packNormalization.converted) {
          // Converter automaticamente
          pack = packNormalization.packValue;
          finalPackUnit = packNormalization.packUnit;
          ingredientPack.value = formatQuantity(pack);
          if (ingredientPackUnit) ingredientPackUnit.value = finalPackUnit;
          showIngredientWarning(packNormalization.message, 'unit-conversion');
        }
      }
      
      if (unit === 'kg') {
        const adjustedQty = normalizeKgValue(quantity);
        if (adjustedQty !== quantity) {
          quantity = adjustedQty;
          ingredientQty.value = formatQuantity(quantity);
          showIngredientWarning(`Converti ${formatQuantity(adjustedQty * 1000)} g para ${formatQuantity(adjustedQty)} kg.`, 'kg');
        }
        const limitedQty = enforceKgLimits(quantity, 'quantidade usada', 10);
        if (limitedQty == null) {
          return;
        }
        quantity = limitedQty;
      }
      
      // Aplicar limites de kg apenas se a unidade do pacote for kg (após normalização)
      if (wantsPrice && finalPackUnit === 'kg') {
        const limitedPack = enforceKgLimits(pack, 'quantidade do pacote', 50);
        if (limitedPack == null) {
          return;
        }
        pack = limitedPack;
      }
      
      // Limpar avisos genéricos, mas manter avisos específicos de conversão
      if (unit === 'g' && quantity != null && quantity >= 1) {
        clearIngredientWarning('grams');
      }
      clearFieldError(ingredientName, ingredientError);
      const activeComponent = getActiveComponent();
      if (!activeComponent) {
        console.error('[RECIPE-EDIT] Nenhum componente ativo encontrado');
        if (ingredientError) {
          ingredientError.textContent = 'Selecione uma parte antes de adicionar itens.';
          ingredientError.hidden = false;
          ingredientError.style.display = '';
        }
        return;
      }
      if (!activeComponent.items) {
        activeComponent.items = [];
      }
      // Usar a unidade do pacote normalizada (pode ter sido convertida)
      const finalPackUnitForSave = wantsPrice ? finalPackUnit : (packUnit || unit);
      
      if (Number.isInteger(editingIngredientIndex) && editingComponentName === activeComponent.name) {
        if (activeComponent.items[editingIngredientIndex]) {
          activeComponent.items[editingIngredientIndex] = { name, quantity, packageQuantity: pack, cost, unit, packUnit: finalPackUnitForSave };
          showIngredientSuccess('Item atualizado.');
        } else {
          activeComponent.items.push({ name, ingredientId: (findCatalogIngredient(name) || {}).id, quantity, packageQuantity: pack, cost, unit, packUnit: finalPackUnitForSave });
          showIngredientSuccess('Item adicionado.');
        }
      } else {
        activeComponent.items.push({ name, ingredientId: (findCatalogIngredient(name) || {}).id, quantity, packageQuantity: pack, cost, unit, packUnit: finalPackUnitForSave });
        showIngredientSuccess('Item adicionado.');
      }
      resetIngredientForm();
      renderIngredients();
      updateCostSummary();
      enableSaveButton();
    });
  } else {
    console.error('[RECIPE-EDIT] addIngredientBtn não encontrado no DOM');
  }

  if (overheadAddBtn) {
    overheadAddBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      // Converter valores monetários automaticamente
      if (overheadItemValue && overheadItemValue.value) {
        const converted = convertMonetaryInput(overheadItemValue.value);
        if (converted !== overheadItemValue.value) {
          overheadItemValue.value = converted;
          if (overheadItemMask) {
            overheadItemMask.set(converted);
          }
        }
      }
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
      updateCostSummary();
      enableSaveButton();
    });
  } else {
    console.error('[RECIPE-EDIT] overheadAddBtn não encontrado no DOM');
  }

  if (overheadBody) {
    overheadBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      if (Number.isInteger(index)) {
        overheadItems.splice(index, 1);
        renderOverheadItems();
        updateCostSummary();
        enableSaveButton();
      }
    });
  }

  if (ingredientsBody) {
    ingredientsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      const action = btn.dataset.action || 'remove';
      if (!Number.isInteger(index)) return;
      if (action === 'edit') {
        startIngredientEdit(index);
        return;
      }
      const active = getActiveComponent();
      if (!active || !active.items) return;
      active.items.splice(index, 1);
      if (editingIngredientIndex === index && editingComponentName === active.name) {
        resetIngredientForm();
      } else if (Number.isInteger(editingIngredientIndex) && index < editingIngredientIndex && editingComponentName === active.name) {
        editingIngredientIndex -= 1;
      }
      renderIngredients();
      updateCostSummary();
      enableSaveButton();
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldError(nameInput, nameError);
      clearFieldError(yieldInput, yieldError);

      const name = nameInput.value.trim();
      const yieldValue = toNumber(yieldInput.value, 0.01);
      if (!validateName(name)) {
        setFieldError(nameInput, nameError, 'Informe um nome com pelo menos 3 letras.');
        enableSaveButton();
        return;
      }
      if (yieldValue == null) {
        setFieldError(yieldInput, yieldError, 'Informe um rendimento maior que zero.');
        enableSaveButton();
        return;
      }
      if (!getAllIngredients().length) {
        setFieldError(ingredientName, ingredientError, 'Adicione pelo menos um item.');
        enableSaveButton();
        return;
      }

      saveBtn.classList.add('is-loading');
      saveBtn.disabled = true;
      try {
        const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
        const overheadValue = getOverheadValue(ingredientsTotal);
        const baseTotal = ingredientsTotal + overheadValue;
        const profitType = getProfitType();
        let marginValue = 0;
        if (profitType === 'percent') {
          marginValue = (toNumber(marginInput.value, 0) || 0) / 100;
        } else {
          const fixedProfit = toNumber(profitFixedInput.value, 0) || 0;
          marginValue = baseTotal > 0 ? fixedProfit / baseTotal : 0;
        }
        const updated = await apiRequest(`/api/recipes/${recipeId}`, null, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            description: descriptionInput.value.trim() || undefined,
            yield: yieldValue,
            yieldType: yieldTypeInput.value,
            overhead: overheadValue,
            overheadItems: overheadItems.map((item) => ({
              name: item.name,
              cost: toNumber(item.value, 0) || 0,
            })),
            labor: 0,
            margin: marginValue,
            ingredients: getAllIngredients().map((item) => ({
              name: item.name,
              quantity: item.quantity,
              packageQuantity: item.packageQuantity,
              cost: item.cost,
              unit: item.unit,
              packUnit: item.packUnit,
              component: item.component || undefined,
          ingredientId: item.ingredientId || undefined,
            })),
          }),
        });
        if (updated && (updated.id || updated.name)) {
          applyRecipeData(updated);
        } else {
          const refreshed = await apiRequest(`/api/recipes/${recipeId}`, null);
          applyRecipeData(refreshed);
        }
        clearFormState(); // Limpar estado salvo após salvar com sucesso
        showMessage('Ficha de custo atualizada.', 'is-success');
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        saveBtn.classList.remove('is-loading');
        updateSaveState();
      }
    });
  }
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => toggleDeleteModal(true));
  }

  [deleteClose, deleteCloseBtn, deleteCancel].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => toggleDeleteModal(false));
  });

  if (deleteConfirm) {
    deleteConfirm.addEventListener('click', async () => {
      deleteConfirm.classList.add('is-loading');
      deleteConfirm.disabled = true;
      try {
        await apiRequest(`/api/recipes/${recipeId}`, null, {
          method: 'DELETE',
        });
        sessionStorage.setItem(DELETE_FLAG, 'true');
        showMessage('Ficha de custo removida.', 'is-success');
        setTimeout(() => {
          window.location.href = '/recipes.html';
        }, 500);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        deleteConfirm.classList.remove('is-loading');
        deleteConfirm.disabled = false;
        toggleDeleteModal(false);
      }
    });
  }

  [yieldInput, overheadInput, profitFixedInput, marginInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      updateCostSummary();
      enableSaveButton();
    });
  });

  if (yieldTypeInput) {
    yieldTypeInput.addEventListener('change', () => {
      updateCostSummary();
      enableSaveButton();
    });
  }

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
    componentRenameBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!componentRename) {
        console.error('[RECIPE-EDIT] componentRename não encontrado');
        return;
      }
      const name = componentRename.value.trim();
      if (!name) {
        if (componentRename) componentRename.focus();
        return;
      }
      renameActiveComponent(name);
      componentRename.value = '';
    });
  } else {
    console.error('[RECIPE-EDIT] componentRenameBtn não encontrado no DOM');
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
    componentRemoveBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeActiveComponent();
    });
  } else {
    console.error('[RECIPE-EDIT] componentRemoveBtn não encontrado no DOM');
  }

  if (componentDuplicateBtn) {
    componentDuplicateBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      duplicateActiveComponent();
    });
  } else {
    console.error('[RECIPE-EDIT] componentDuplicateBtn não encontrado no DOM');
  }

  if (componentMoveUpBtn) {
    componentMoveUpBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      moveActiveComponent(-1);
    });
  } else {
    console.error('[RECIPE-EDIT] componentMoveUpBtn não encontrado no DOM');
  }

  if (componentMoveDownBtn) {
    componentMoveDownBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      moveActiveComponent(1);
    });
  } else {
    console.error('[RECIPE-EDIT] componentMoveDownBtn não encontrado no DOM');
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
      
      // Validar compatibilidade de unidades em tempo real
      const unit = ingredientUnit ? ingredientUnit.value : '';
      const packUnit = ingredientPackUnit.value;
      if (unit && packUnit) {
        const packValue = toNumber(ingredientPack ? ingredientPack.value : null, 0);
        if (packValue != null) {
          const packNormalization = normalizePackUnit(unit, packUnit, packValue);
          if (packNormalization.error) {
            showIngredientWarning(packNormalization.message, 'unit-mismatch');
          } else if (packNormalization.converted) {
            // Mostrar aviso mas não converter ainda (aguardar o botão Adicionar)
            showIngredientWarning(packNormalization.message + ' Clique em "Adicionar" para aplicar a conversão.', 'unit-conversion');
          } else {
            clearIngredientWarning('unit-mismatch');
            clearIngredientWarning('unit-conversion');
          }
        }
      }
    });
  }
  if (ingredientAdvancedToggle) {
    ingredientAdvancedToggle.addEventListener('click', () => {
      setIngredientAdvancedOpen(!isIngredientAdvancedOpen());
    });
  }

  [nameInput, yieldInput, descriptionInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      if (input === nameInput) validateEditName(true);
      if (input === yieldInput) validateEditYield(true);
      enableSaveButton();
    });
    input.addEventListener('blur', () => {
      if (input === nameInput) validateEditName(true);
      if (input === yieldInput) validateEditYield(true);
      enableSaveButton();
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
      if (input === ingredientCost && ingredientCost.value) {
        const converted = convertMonetaryInput(ingredientCost.value);
        if (converted !== ingredientCost.value) {
          ingredientCost.value = converted;
          if (ingredientCostMask) {
            ingredientCostMask.set(converted);
          }
        }
      }
      validateIngredientFields(true);
    });
  });

  if (profitTypeFixed) {
    profitTypeFixed.addEventListener('change', () => updateProfitTypeUI());
  }
  if (profitTypePercent) {
    profitTypePercent.addEventListener('change', () => updateProfitTypeUI());
  }

  // Event listeners para overheadItemValue (gastos extras)
  if (overheadItemValue) {
    overheadItemValue.addEventListener('blur', () => {
      if (overheadItemValue.value) {
        const converted = convertMonetaryInput(overheadItemValue.value);
        if (converted !== overheadItemValue.value) {
          overheadItemValue.value = converted;
          if (overheadItemMask) {
            overheadItemMask.set(converted);
          }
        }
      }
    });
  }

  // Event listeners para profitFixedInput
  if (profitFixedInput) {
    profitFixedInput.addEventListener('blur', () => {
      if (profitFixedInput.value) {
        const converted = convertMonetaryInput(profitFixedInput.value);
        if (converted !== profitFixedInput.value) {
          profitFixedInput.value = converted;
          if (profitFixedMask) {
            profitFixedMask.set(converted);
          }
        }
      }
    });
  }

  initMasks();
  loadIngredientSuggestions().then(loadIngredientCatalog);
  bindQuickSuggestions(overheadSuggestions, overheadInput, overheadMask);
  bindQuickSuggestions(marginSuggestions, marginInput, marginMask, () => {
    if (profitTypePercent && !profitTypePercent.checked) {
      profitTypePercent.checked = true;
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
  renderComponentsSummary();
  updateComponentsTotal();
  updateComponentSubtotal();
  renderOverheadItems();
  updateCostSummary();

  /**
   * Coleta todos os ingredientes de todos os componentes
   */
  function getAllIngredients() {
    const all = [];
    (components || []).forEach((component) => {
      if (component.items && Array.isArray(component.items)) {
        component.items.forEach((item) => {
          all.push({
            ...item,
            component: component.name,
          });
        });
      }
    });
    return all;
  }

  /**
   * Habilita o botão Salvar se houver dados válidos
   */
  function enableSaveButton() {
    if (!saveBtn) return;
    
    // Não desabilitar se já está salvando (loading)
    if (saveBtn.classList.contains('is-loading')) {
      return;
    }
    
    const name = nameInput ? nameInput.value.trim() : '';
    const yieldValue = toNumber(yieldInput ? yieldInput.value : null, 0.01);
    const hasIngredients = getAllIngredients().length > 0;
    
    const isValid = name.length >= 3 && yieldValue != null && yieldValue > 0 && hasIngredients;
    
    saveBtn.disabled = !isValid;
  }

  // Função para aplicar dados da receita nos campos
  function toggleDeleteModal(isOpen) {
    if (!deleteModal) return;
    deleteModal.classList.toggle('is-active', isOpen);
    deleteModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    if (isOpen) {
      deleteConfirm && deleteConfirm.focus();
    } else {
      deleteBtn && deleteBtn.focus();
    }
  }

  function applyRecipeData(recipe) {
    if (!recipe) {
      console.warn('[RECIPE-EDIT] applyRecipeData chamado sem receita');
      return;
    }
    
    console.log('[RECIPE-EDIT] Aplicando dados da receita:', recipe);
    
    if (nameInput) nameInput.value = recipe.name || '';
    if (descriptionInput) descriptionInput.value = recipe.description || '';
    if (yieldInput) yieldInput.value = recipe.yield ? String(recipe.yield) : '';
    if (yieldTypeInput) yieldTypeInput.value = recipe.yieldType || 'UN';
    
    // Calcular overhead percentual a partir do overhead total e custo dos ingredientes
    const costIngredients = recipe.costIngredients || 0;
    const overheadTotal = recipe.overhead || 0;
    const overheadItemsTotal = (recipe.overheadItems || []).reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    const overheadPercentValue = costIngredients > 0 ? ((overheadTotal - overheadItemsTotal) / costIngredients) * 100 : 0;
    const overheadPercent = Math.max(0, Math.min(15, overheadPercentValue));
    
    console.log('[RECIPE-EDIT] Overhead calculado:', { costIngredients, overheadTotal, overheadItemsTotal, overheadPercent });
    
    if (overheadInput && overheadMask) {
      setMaskedValue(overheadInput, overheadPercent, overheadMask);
    } else if (overheadInput) {
      overheadInput.value = String(overheadPercent);
    }
    
    // Calcular margin a partir do preço sugerido e custo unitário
    // margin = (priceSuggested / costPerUnit) - 1
    const costPerUnit = recipe.costPerUnit || 0;
    const priceSuggested = recipe.priceSuggested || 0;
    let marginValue = 0;
    let marginPercent = 0;
    
    if (costPerUnit > 0 && priceSuggested > costPerUnit) {
      marginValue = (priceSuggested / costPerUnit) - 1;
      marginPercent = marginValue * 100;
    }
    
    if (marginInput && marginMask) {
      setMaskedValue(marginInput, marginPercent, marginMask);
    } else if (marginInput) {
      marginInput.value = String(marginPercent);
    }
    
    // Determinar profitType: se há margin > 0, assumimos que é percentual
    // Caso contrário, pode ser fixo ou percentual com 0%
    // Por padrão, vamos usar percentual se há margin, senão fixo
    if (marginPercent > 0) {
      // Se tem margin, é percentual
      if (profitTypePercent) {
        profitTypePercent.checked = true;
        if (profitTypeFixed) profitTypeFixed.checked = false;
      }
    } else {
      // Sem margin, verifica se há lucro total calculado
      const estimatedProfit = recipe.estimatedProfit || 0;
      if (estimatedProfit > 0 && profitTypeFixed) {
        profitTypeFixed.checked = true;
        if (profitTypePercent) profitTypePercent.checked = false;
        if (profitFixedInput && profitFixedMask) {
          setMaskedValue(profitFixedInput, estimatedProfit, profitFixedMask);
        }
      } else if (profitTypePercent) {
        profitTypePercent.checked = true;
        if (profitTypeFixed) profitTypeFixed.checked = false;
      }
    }
    updateProfitTypeUI();
    
    if (recipe.overheadItems && Array.isArray(recipe.overheadItems)) {
      overheadItems = recipe.overheadItems.map((item) => ({
        name: item.name || '',
        value: String(item.cost || item.value || 0),
      }));
      renderOverheadItems();
    }
    
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      components = buildComponentsFromIngredients(recipe.ingredients);
      if (!components.length) {
        ensureDefaultComponent();
      }
      renderComponentSelect();
      renderIngredients();
    } else {
      ensureDefaultComponent();
      renderComponentSelect();
      renderIngredients();
    }
    
    updateComponentsTotal();
    updateComponentSubtotal();
    renderComponentsSummary();
    updateCostSummary();
    enableSaveButton();
  }

  // Inicialização (auth via cookie HttpOnly)
  ensureAuthOrRedirect();

  const params = new URLSearchParams(window.location.search);
  recipeId = params.get('id');
  if (!recipeId) {
    window.location.href = '/recipes.html';
    return;
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/recipes.html';
    });
  }

  // Adicionar event listeners para atualizar o botão Salvar quando os campos mudarem
  if (nameInput) {
    nameInput.addEventListener('input', enableSaveButton);
    nameInput.addEventListener('blur', enableSaveButton);
  }
  if (yieldInput) {
    yieldInput.addEventListener('input', enableSaveButton);
    yieldInput.addEventListener('blur', enableSaveButton);
  }

  // Carregar receita da API - NÃO carregar rascunho primeiro para evitar sobrescrever dados
  apiRequest(`/api/recipes/${recipeId}`, null)
    .then((recipe) => {
      applyRecipeData(recipe);
      enableSaveButton(); // Garantir que o botão seja atualizado após carregar dados
      const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
      if (deletedFlag) {
        sessionStorage.removeItem(DELETE_FLAG);
        showMessage('Ficha técnica removida.', 'is-success');
      }
    })
    .catch((err) => {
      if (err.status === 404) {
        showMessage('Receita não encontrada.', 'is-danger');
        setTimeout(() => {
          window.location.href = '/recipes.html';
        }, 2000);
      } else {
        showMessage(err.message || 'Erro ao carregar receita.', 'is-danger');
      }
    });

  // Fechar modal com ESC
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal && deleteModal.classList.contains('is-active')) {
      toggleDeleteModal(false);
    }
  });

  function getProfitType() {
    if (profitTypePercent && profitTypePercent.checked) return 'percent';
    if (profitTypeFixed && profitTypeFixed.checked) return 'fixed';
    return 'fixed'; // default
  }

  // Função para coletar dados do formulário
  function collectRecipeData() {
    const ingredients = getAllIngredients();
    const overheadPercent = getOverheadPercentValue();
    const profitType = getProfitType();
    const marginValue = profitType === 'percent' ? toNumber(marginInput ? marginInput.value : null, 0) : null;
    const margin = marginValue != null ? marginValue / 100 : null;
    const fixedProfit = profitType === 'fixed' ? toNumber(profitFixedInput ? profitFixedInput.value : null, 0) : null;
    
    return {
      name: nameInput ? nameInput.value.trim() : '',
      description: descriptionInput ? descriptionInput.value.trim() : '',
      yield: toNumber(yieldInput ? yieldInput.value : null, 0.01),
      yieldType: yieldTypeInput ? yieldTypeInput.value : 'UN',
      ingredients: ingredients,
      overheadItems: overheadItems.filter(item => item.name && item.value),
      overhead: overheadPercent,
      margin: margin,
      profitType: profitType,
      fixedProfit: fixedProfit,
    };
  }

  // Função para salvar receita
  async function saveRecipe() {
    if (!recipeId || !session) {
      showMessage('Erro: ID da receita não encontrado.', 'is-danger');
      return;
    }

    const data = collectRecipeData();
    
    // Validações básicas
    if (!data.name || data.name.length < 3) {
      showMessage('Informe um nome válido (mínimo 3 caracteres).', 'is-danger');
      if (nameInput) nameInput.focus();
      return;
    }

    if (!data.yield || data.yield <= 0) {
      showMessage('Informe um rendimento válido.', 'is-danger');
      if (yieldInput) yieldInput.focus();
      return;
    }

    if (!data.ingredients || data.ingredients.length === 0) {
      showMessage('Adicione pelo menos um ingrediente.', 'is-danger');
      return;
    }

    // VALIDAÇÃO CRÍTICA: Verificar unidades compatíveis antes de salvar
    for (const item of data.ingredients) {
      const unit = item.unit || '';
      const packUnit = item.packUnit || item.unit || '';
      
      // Se tem preço, verificar unidades compatíveis
      if ((item.packageQuantity > 0 || item.cost > 0) && unit && packUnit && unit !== packUnit) {
        showMessage(`Unidades incompatíveis no item "${item.name}": quantidade em "${unit}" e pacote em "${packUnit}". Use a mesma unidade para ambos (ex: g com g, ml com ml).`, 'is-danger');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.classList.remove('is-loading');
        }
        return;
      }
      
      // Validar que valores são válidos
      if (item.quantity <= 0) {
        showMessage(`Quantidade inválida no item "${item.name}".`, 'is-danger');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.classList.remove('is-loading');
        }
        return;
      }
      
      if (item.packageQuantity > 0 && item.packageQuantity <= 0) {
        showMessage(`Quantidade do pacote inválida no item "${item.name}".`, 'is-danger');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.classList.remove('is-loading');
        }
        return;
      }
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add('is-loading');
    }

    try {
      const payload = {
        name: data.name,
        description: data.description || '',
        yield: data.yield,
        yieldType: data.yieldType,
        ingredients: data.ingredients.map(item => ({
          name: item.name,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || 'g',
          packageQuantity: Number(item.packageQuantity) || 0,
          packUnit: item.packUnit || item.unit || 'g',
          cost: Number(item.cost) || 0,
          component: item.component || null,
          ingredientId: item.ingredientId || undefined,
        })),
        overheadItems: data.overheadItems.map(item => ({
          name: item.name,
          cost: parseLocaleNumber(item.value) || 0,
        })),
        overhead: data.overhead || 0,
        margin: data.margin,
        profitType: data.profitType,
        fixedProfit: data.fixedProfit,
      };

      await apiRequest(`/api/recipes/${recipeId}`, null, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      // Limpar estado salvo após salvar com sucesso
      clearFormState();
      showMessage('Ficha de custo atualizada com sucesso!', 'is-success');
      
      // Redirecionar após 1.5 segundos
      setTimeout(() => {
        window.location.href = '/recipes.html';
      }, 1500);
    } catch (err) {
      showMessage(err.message || 'Erro ao salvar ficha de custo.', 'is-danger');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('is-loading');
      }
    }
  }

  // Função para remover receita
  async function removeRecipe() {
    if (!recipeId || !session) {
      showMessage('Erro: ID da receita não encontrado.', 'is-danger');
      return;
    }

    try {
      await apiRequest(`/api/recipes/${recipeId}`, null, {
        method: 'DELETE',
      });

      // Marcar flag de exclusão
      sessionStorage.setItem(DELETE_FLAG, 'true');
      
      showMessage('Ficha de custo removida com sucesso!', 'is-success');
      
      // Redirecionar após 1.5 segundos
      setTimeout(() => {
        window.location.href = '/recipes.html';
      }, 1500);
    } catch (err) {
      showMessage(err.message || 'Erro ao remover ficha de custo.', 'is-danger');
      toggleDeleteModal(false);
    }
  }

  // Event listeners para os botões
  const editForm = document.getElementById('edit-form');
  if (editForm) {
    editForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveRecipe();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', (event) => {
      event.preventDefault();
      saveRecipe();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', (event) => {
      event.preventDefault();
      toggleDeleteModal(true);
    });
  }

  if (deleteConfirm) {
    deleteConfirm.addEventListener('click', (event) => {
      event.preventDefault();
      toggleDeleteModal(false);
      removeRecipe();
    });
  }

  if (deleteCancel) {
    deleteCancel.addEventListener('click', (event) => {
      event.preventDefault();
      toggleDeleteModal(false);
    });
  }

  if (deleteClose) {
    deleteClose.addEventListener('click', () => {
      toggleDeleteModal(false);
    });
  }

  if (deleteCloseBtn) {
    deleteCloseBtn.addEventListener('click', () => {
      toggleDeleteModal(false);
    });
  }
})();

