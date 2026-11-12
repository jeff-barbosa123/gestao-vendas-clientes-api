(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

  const messageBox = document.getElementById('sim-message');
  const backBtn = document.getElementById('back-dashboard');
  const byIdForm = document.getElementById('by-id-form');
  const recipeId = document.getElementById('recipe-id');
  const recipeIdEmpty = document.getElementById('recipe-id-empty');
  const recipeIdError = document.getElementById('recipe-id-error');
  const recipeMargin = document.getElementById('recipe-margin');
  const recipeMarginError = document.getElementById('recipe-margin-error');
  const recipeFee = document.getElementById('recipe-fee');
  const byIdSubmit = document.getElementById('by-id-submit');

  const quickForm = document.getElementById('quick-form');
  const quickYield = document.getElementById('quick-yield');
  const quickYieldError = document.getElementById('quick-yield-error');
  const quickMargin = document.getElementById('quick-margin');
  const quickMarginError = document.getElementById('quick-margin-error');
  const quickFee = document.getElementById('quick-fee');
  const quickOverhead = document.getElementById('quick-overhead');
  const quickLabor = document.getElementById('quick-labor');
  const ingredientName = document.getElementById('ingredient-name');
  const ingredientQty = document.getElementById('ingredient-qty');
  const ingredientCost = document.getElementById('ingredient-cost');
  const addIngredientBtn = document.getElementById('add-ingredient');
  const ingredientError = document.getElementById('ingredient-error');
  const ingredientsBody = document.getElementById('ingredients-body');
  const quickSubmit = document.getElementById('quick-submit');

  const resultPrice = document.getElementById('result-price');
  const resultCost = document.getElementById('result-cost');
  const resultProfit = document.getElementById('result-profit');
  const resultMargin = document.getElementById('result-margin');
  const resultTotalCost = document.getElementById('result-total-cost');
  const resultMinPrice = document.getElementById('result-min-price');
  const resultIdealPrice = document.getElementById('result-ideal-price');
  const resultProfitDetail = document.getElementById('result-profit-detail');
  const marginContext = document.getElementById('margin-context');
  const quickSegment = document.getElementById('quick-segment');
  const marginHealth = document.getElementById('margin-health');

  const EMPTY_RESULT_MESSAGE = 'Informe os dados para visualizar o resultado.';

  let ingredientesSimulacao = [];
  let recipes = [];
  const preselectedRecipeId = new URLSearchParams(window.location.search).get('recipeId');

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
  }

  function setFieldError(el, message) {
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  function setInputError(input, errorEl, message) {
    if (input) input.classList.toggle('is-danger', Boolean(message));
    setFieldError(errorEl, message);
  }

  function clearFieldErrors() {
    setInputError(recipeId, recipeIdError, '');
    setInputError(recipeMargin, recipeMarginError, '');
    setInputError(quickYield, quickYieldError, '');
    setInputError(quickMargin, quickMarginError, '');
  }

  const CSRF_COOKIE_NAME = 'sgvc_csrf';
  const CSRF_HEADER_NAME = 'X-CSRF-Token';
  let csrfEnsured = false;

  function getCookieValue(name) {
    try {
      const parts = String(document.cookie || '').split(';');
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i].trim();
        if (!part) continue;
        const eq = part.indexOf('=');
        const key = eq >= 0 ? part.slice(0, eq).trim() : part;
        if (key !== name) continue;
        const raw = eq >= 0 ? part.slice(eq + 1) : '';
        return decodeURIComponent(raw);
      }
    } catch (_err) {
      // ignore
    }
    return null;
  }

  function getCsrfToken() {
    return getCookieValue(CSRF_COOKIE_NAME);
  }

  async function ensureCsrfCookie() {
    if (csrfEnsured) return;
    csrfEnsured = true;
    try {
      await fetch(buildUrl('/api/auth/csrf'), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
    } catch (_err) {
      // ignore
    }
  }

  async function apiRequest(path, _tokenIgnored, options = {}) {
    const url = buildUrl(path);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const method = String(options.method || 'GET').toUpperCase();
    const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
    if (isMutating) {
      await ensureCsrfCookie();
      const csrfToken = getCsrfToken();
      if (csrfToken) headers[CSRF_HEADER_NAME] = csrfToken;
    }
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

  function normalizeNumberInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.includes(',') && raw.includes('.')) {
      return raw.replace(/\./g, '').replace(',', '.');
    }
    return raw.replace(',', '.');
  }

  function toNumber(value, min = 0) {
    const parsed = Number(normalizeNumberInput(value));
    if (!Number.isFinite(parsed) || parsed < min) return null;
    return parsed;
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function resolveValue(data, keys) {
    if (!data) return null;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(data, key) && data[key] != null) {
        return data[key];
      }
    }
    return null;
  }

  function formatCurrencyField(element, value) {
    if (!element) return;
    element.textContent = value == null ? 'R$ --' : `R$ ${formatPrice(value)}`;
  }

  const marginDefaults = {
    alimentacao: 30,
    confeitaria: 35,
    revenda: 20,
  };

  function updateMarginHealth(marginValue) {
    if (!marginHealth) return;
    marginHealth.classList.remove('is-low', 'is-ok', 'is-high', 'is-empty');
    const numeric = Number.isFinite(marginValue) ? marginValue : 0;
    if (!numeric) {
      marginHealth.textContent = 'Informe uma margem para ver o resultado.';
      marginHealth.classList.add('is-empty');
      return;
    }
    if (numeric < 20) {
      marginHealth.textContent = 'Margem baixa (reavalie o preço).';
      marginHealth.classList.add('is-low');
      return;
    }
    if (numeric <= 40) {
      marginHealth.textContent = 'Margem saudável';
      marginHealth.classList.add('is-ok');
      return;
    }
    marginHealth.textContent = 'Margem alta (observe a concorrência).';
    marginHealth.classList.add('is-high');
  }

  function preventNegative(input) {
    if (!input) return;
    input.addEventListener('input', () => {
      if (!input.value) return;
      if (input.value.includes('-')) {
        input.value = input.value.replace(/-/g, '');
      }
    });
  }

  function formatCurrencyInput(input) {
    if (!input) return;
    input.addEventListener('blur', () => {
      const value = toNumber(input.value, 0);
      if (value == null) return;
      input.value = formatPrice(value);
    });
    input.addEventListener('focus', () => {
      if (!input.value) return;
      input.value = normalizeNumberInput(input.value);
    });
  }

  function attachBlurValidation(input, errorEl, message, minValue = 0) {
    if (!input || !errorEl) return;
    input.addEventListener('blur', () => {
      const value = toNumber(input.value, minValue);
      setInputError(input, errorEl, value == null ? message : '');
    });
  }

  function applyMarginSuggestion() {
    if (!quickSegment || !quickMargin) return;
    if (!quickMargin.value.trim()) {
      const suggested = marginDefaults[quickSegment.value];
      if (suggested) {
        quickMargin.value = String(suggested);
      }
    }
    calcularPrecoFinal();
  }

  function getRecipeName(recipe) {
    return recipe.name || recipe.nome || recipe.nomeReceita || recipe.titulo || 'Ficha t\u00e9cnica';
  }

  function getRecipeId(recipe) {
    return recipe.id ?? recipe.recipeId ?? recipe.receitaId;
  }

  function fillRecipeSelect(list) {
    if (!recipeId) return;
    recipeId.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    const hasItems = list.length > 0;
    placeholder.textContent = hasItems
      ? 'Selecione uma ficha t\u00e9cnica (opcional)'
      : 'Nenhuma ficha t\u00e9cnica cadastrada';
    placeholder.disabled = !hasItems;
    placeholder.selected = true;
    recipeId.appendChild(placeholder);
    recipeId.disabled = !hasItems;
    if (byIdSubmit) {
      byIdSubmit.disabled = !hasItems;
    }
    if (recipeIdEmpty) {
      recipeIdEmpty.textContent = hasItems
        ? 'Se preferir, siga sem ficha t\u00e9cnica usando a simula\u00e7\u00e3o r\u00e1pida.'
        : 'Sem fichas t\u00e9cnicas cadastradas. Cadastre uma ficha ou use a simula\u00e7\u00e3o r\u00e1pida.';
      recipeIdEmpty.hidden = false;
    }
    list.forEach((recipe) => {
      const id = getRecipeId(recipe);
      if (id == null) return;
      const option = document.createElement('option');
      option.value = String(id);
      option.textContent = getRecipeName(recipe);
      recipeId.appendChild(option);
    });
  }

  function renderIngredients() {
    if (!ingredientsBody) return;
    ingredientsBody.innerHTML = '';
    if (!ingredientesSimulacao.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.setAttribute('colspan', '4');
      emptyCell.textContent = 'Nenhum ingrediente adicionado.';
      emptyRow.appendChild(emptyCell);
      ingredientsBody.appendChild(emptyRow);
      return;
    }
    ingredientesSimulacao.forEach((item, index) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = item.nome;
      row.appendChild(nameCell);

      const qtyCell = document.createElement('td');
      qtyCell.classList.add('has-text-right');
      qtyCell.textContent = item.quantidade ?? '';
      row.appendChild(qtyCell);

      const costCell = document.createElement('td');
      costCell.classList.add('has-text-right');
      costCell.textContent = `R$ ${formatPrice(item.custoTotal ?? 0)}`;
      row.appendChild(costCell);

      const actionsCell = document.createElement('td');
      actionsCell.classList.add('has-text-right');
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'button is-light is-small';
      removeButton.dataset.index = String(index);
      removeButton.textContent = 'Remover';
      actionsCell.appendChild(removeButton);
      row.appendChild(actionsCell);

      ingredientsBody.appendChild(row);
    });
  }

  function renderResult(data) {
    if (!data) return;
    if (resultPrice) resultPrice.textContent = `R$ ${formatPrice(data.preco_final_simulado ?? data.precoFinalSimulado)}`;
    if (resultCost) resultCost.textContent = `R$ ${formatPrice(data.custo_por_unidade ?? data.custoUnitario)}`;
    if (resultProfit) resultProfit.textContent = `R$ ${formatPrice(data.lucro_estimado ?? data.lucroEstimado)}`;
    const marginValue = Number(data.margem ?? data.margemLucroPercentual);
    const normalizedMargin = Number.isFinite(marginValue) ? marginValue : 0;
    if (resultMargin) {
      resultMargin.textContent = `${normalizedMargin.toFixed(1).replace(".", ",")}%`;
    }
    updateMarginHealth(normalizedMargin);
    const totalCost = resolveValue(data, ['custo_total', 'custoTotal']);
    if (marginContext) {
      marginContext.textContent = Number.isFinite(normalizedMargin) && totalCost != null
        ? `Margem de ${normalizedMargin.toFixed(1).replace(".", ",")}% aplicada sobre um custo total de R$ ${formatPrice(totalCost)}.`
        : 'Informe os dados para visualizar o resultado.';
    }
    formatCurrencyField(resultTotalCost, totalCost);
    formatCurrencyField(resultMinPrice, resolveValue(data, ['preco_minimo', 'precoMinimo']));
    formatCurrencyField(resultIdealPrice, resolveValue(data, ['preco_ideal', 'precoIdeal']));
    formatCurrencyField(resultProfitDetail, resolveValue(data, ['lucro_estimado', 'lucroEstimado']));
  }

  function roundValue(value) {
    if (!Number.isFinite(value)) return 0;
    return Number(value.toFixed(2));
  }

  function parseOptionalNonNegativeInput(input) {
    if (!input) return 0;
    const raw = input.value ? input.value.trim() : '';
    if (!raw) return 0;
    const parsed = toNumber(raw, 0);
    return parsed == null ? null : parsed;
  }

  function resetDetailFields() {
    [resultTotalCost, resultMinPrice, resultIdealPrice, resultProfitDetail].forEach((el) => {
      if (!el) return;
      el.textContent = 'R$ --';
    });
  }

  function limparResultado(message = EMPTY_RESULT_MESSAGE) {
    if (resultPrice) resultPrice.textContent = 'R$ --';
    if (resultCost) resultCost.textContent = 'R$ --';
    if (resultProfit) resultProfit.textContent = 'R$ --';
    if (resultMargin) resultMargin.textContent = '--%';
    resetDetailFields();
    if (marginHealth) {
      marginHealth.classList.remove('is-low', 'is-ok', 'is-high', 'is-empty');
      marginHealth.classList.add('is-empty');
      marginHealth.textContent = message;
    }
    if (marginContext) {
      marginContext.textContent = message;
    }
  }

  function calcularCustoIngredientes() {
    const total = ingredientesSimulacao.reduce(
      (sum, item) => sum + (Number.isFinite(item.custoTotal) ? item.custoTotal : 0),
      0
    );
    return roundValue(total);
  }

  function buildQuickSimulationPayload(custoTotal, custoPorUnidade, margemPercent, taxaEntrega) {
    const precoMinimo = roundValue(custoPorUnidade);
    const precoIdeal = roundValue(custoPorUnidade * (1 + margemPercent / 100));
    const precoFinalSimulado = roundValue(precoIdeal + taxaEntrega);
    const valorLucro = roundValue(custoPorUnidade * (margemPercent / 100));
    const lucroEstimado = roundValue(precoFinalSimulado - custoPorUnidade);

    return {
      custo_total: roundValue(custoTotal),
      custo_por_unidade: roundValue(custoPorUnidade),
      preco_minimo: precoMinimo,
      preco_ideal: precoIdeal,
      margem: margemPercent,
      taxa_entrega: roundValue(taxaEntrega),
      preco_final_simulado: precoFinalSimulado,
      valor_lucro: valorLucro,
      lucro_estimado: lucroEstimado,
      custoUnitario: roundValue(custoPorUnidade),
      margemLucroPercentual: margemPercent,
      taxaEntrega: roundValue(taxaEntrega),
      precoFinalSimulado: precoFinalSimulado,
      valorLucro,
      lucroEstimado,
    };
  }

  function calcularPrecoFinal() {
    const rendimento = toNumber(quickYield?.value, 0.01);
    const margem = toNumber(quickMargin?.value, 0);
    const taxaEntrega = parseOptionalNonNegativeInput(quickFee);
    const overhead = parseOptionalNonNegativeInput(quickOverhead);
    const labor = parseOptionalNonNegativeInput(quickLabor);

    if (
      !ingredientesSimulacao.length ||
      rendimento == null ||
      margem == null ||
      taxaEntrega === null ||
      overhead === null ||
      labor === null
    ) {
      limparResultado();
      return;
    }

    const custoIngredientes = calcularCustoIngredientes();
    const custoTotal = roundValue(custoIngredientes + overhead + labor);
    const custoPorUnidade = rendimento > 0 ? roundValue(custoTotal / rendimento) : 0;

    if (!Number.isFinite(custoPorUnidade)) {
      limparResultado();
      return;
    }

    const payload = buildQuickSimulationPayload(custoTotal, custoPorUnidade, margem, taxaEntrega);
    renderResult(payload);
    if (messageBox) showMessage('');
  }

  function adicionarIngrediente() {
    const nome = ingredientName?.value.trim() || '';
    const quantidade = toNumber(ingredientQty?.value, 0.01);
    const custo = toNumber(ingredientCost?.value, 0);
    const hasName = Boolean(nome);
    const hasQty = quantidade != null;
    const hasCost = custo != null;
    if (ingredientName) ingredientName.classList.toggle('is-danger', !hasName);
    if (ingredientQty) ingredientQty.classList.toggle('is-danger', !hasQty);
    if (ingredientCost) ingredientCost.classList.toggle('is-danger', !hasCost);
    if (!hasName || !hasQty || !hasCost) {
      if (ingredientError) {
        ingredientError.textContent = 'Preencha nome, quantidade e custo do ingrediente.';
        ingredientError.hidden = false;
      }
      return;
    }
    if (ingredientError) {
      ingredientError.textContent = '';
      ingredientError.hidden = true;
    }
    const custoTotal = roundValue(quantidade * custo);
    ingredientesSimulacao.push({
      nome,
      quantidade: roundValue(quantidade),
      custo: roundValue(custo),
      custoTotal,
    });
    ingredientName.value = '';
    ingredientQty.value = '';
    ingredientCost.value = '';
    renderIngredients();
    calcularPrecoFinal();
  }

  function removerIngrediente(index) {
    if (!Number.isInteger(index) || index < 0 || index >= ingredientesSimulacao.length) return;
    ingredientesSimulacao.splice(index, 1);
    renderIngredients();
    calcularPrecoFinal();
  }

  ensureAuthOrRedirect().then((user) => {
    if (!user) return;
    apiRequest('/api/recipes', null)
      .then((data) => {
        recipes = Array.isArray(data) ? data : data.items || [];
        fillRecipeSelect(recipes);
        if (preselectedRecipeId && recipeId) {
          const exists = recipes.some((recipe) => String(getRecipeId(recipe)) === String(preselectedRecipeId));
          if (exists) {
            recipeId.value = String(preselectedRecipeId);
          }
        }
      })
      .catch(() => {
        fillRecipeSelect([]);
      });
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', () => {
      adicionarIngrediente();
    });
  }

  if (ingredientsBody) {
    ingredientsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      if (Number.isInteger(index)) {
        removerIngrediente(index);
      }
    });
  }

  if (byIdForm) {
    byIdForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      showMessage('');
      clearFieldErrors();
      const receitaId = recipeId.value.trim();
      const margem = toNumber(recipeMargin.value, 0);
      const taxaEntrega = toNumber(recipeFee.value, 0) || 0;
      let hasError = false;
      if (!receitaId) {
        setInputError(recipeId, recipeIdError, 'Selecione a ficha t\u00e9cnica.');
        hasError = true;
      }
      if (margem == null) {
        setInputError(recipeMargin, recipeMarginError, 'Informe a margem em porcentagem.');
        hasError = true;
      }
      if (hasError) {
        showMessage('Revise os campos obrigat\u00f3rios.', 'is-danger');
        return;
      }
      byIdSubmit.classList.add('is-loading');
      byIdSubmit.disabled = true;
      try {
        const result = await apiRequest('/api/simulacao/preco', null, {
          method: 'POST',
          body: JSON.stringify({ receitaId, margem: margem, taxaEntrega }),
        });
        renderResult(result);
        showMessage('Simulação concluída.', 'is-success');
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        byIdSubmit.classList.remove('is-loading');
        byIdSubmit.disabled = false;
      }
    });
  }

  if (quickSubmit) {
    quickSubmit.addEventListener('click', (event) => {
      event.preventDefault();
      calcularPrecoFinal();
    });
  }
  if (quickForm) {
    quickForm.addEventListener('submit', (event) => {
      event.preventDefault();
      calcularPrecoFinal();
    });
  }

  [recipeMargin, quickYield, quickMargin, quickFee, quickOverhead, quickLabor, ingredientQty, ingredientCost].forEach(preventNegative);
  [recipeFee, quickFee, quickOverhead, quickLabor, ingredientCost].forEach(formatCurrencyInput);
  attachBlurValidation(quickYield, quickYieldError, 'Informe o rendimento.', 0.01);
  attachBlurValidation(quickMargin, quickMarginError, 'Informe a margem em porcentagem.', 0);
  [quickYield, quickMargin, quickFee, quickOverhead, quickLabor].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', calcularPrecoFinal);
  });
  attachBlurValidation(recipeMargin, recipeMarginError, 'Informe a margem em porcentagem.', 0);
  if (quickSegment) {
    quickSegment.addEventListener('change', applyMarginSuggestion);
    applyMarginSuggestion();
  }
  updateMarginHealth(0);
  renderIngredients();
  limparResultado();

  [ingredientName, ingredientQty, ingredientCost].forEach((el) => {
    if (!el || !ingredientError) return;
    el.addEventListener('input', () => {
      ingredientError.textContent = '';
      ingredientError.hidden = true;
      el.classList.remove('is-danger');
    });
  });

  [recipeId, recipeMargin, quickYield, quickMargin].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => clearFieldErrors());
  });
})();

