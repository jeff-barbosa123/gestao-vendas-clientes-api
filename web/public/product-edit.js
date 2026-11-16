/**
 * Tela de edição de produto (entrada). MÃ³dulos em /product-edit/*.js.
 */
import { DELETE_FLAG, UPDATED_FLAG, productId } from './product-edit/constants.js';
import {
  backBtn,
  costUnitEl,
  deleteBtn,
  deleteCancel,
  deleteCloseBtn,
  deleteConfirm,
  deleteModal,
  descriptionInput,
  editResaleCalcMargin,
  editResaleCalcMarkup,
  editResalePercent,
  editResalePercentHelp,
  finalPriceHint,
  finalPriceInput,
  form,
  linkRecipeBtn,
  nameError,
  nameHelp,
  nameInput,
  priceError,
  priceInput,
  priceSuggestedEl,
  priceSuggestedHelp,
  priceSuggestion,
  productTypeProduced,
  productTypeResale,
  profitEl,
  purchasePriceError,
  purchasePriceInput,
  recipeError,
  recipeSearch,
  recipeSelect,
  saveBtn,
  statusSelect,
  unlinkRecipeBtn,
} from './product-edit/dom.js';
import { state } from './product-edit/state.js';
import {
  apiRequest,
  clearFieldError,
  ensureAuthOrRedirect,
  setFieldError,
  showMessage,
  toggleDeleteModal,
} from './product-edit/core.js';
import { standardizeText, updateNameGuidance, validateName } from './product-edit/text.js';
import {
  bindCurrencyInput,
  formatCurrency,
  parsePrice,
  resolveNumber,
} from './product-edit/money.js';
import { getSelectedProductType, setProductType } from './product-edit/product-type.js';
import { applyRecipeSearch, getSelectedRecipe, loadRecipes } from './product-edit/recipes.js';

function updateFinalPriceHint(customized) {
  if (!finalPriceHint) return;
  if (customized) {
    finalPriceHint.innerHTML = '<span class="final-price-badge">Pre\u00e7o personalizado</span>';
    return;
  }
  finalPriceHint.textContent = 'Se deixar vazio, o sistema usa o pre\u00e7o sugerido.';
}

function updateProducedSuggestionHelp(costUnit, suggested) {
  if (!priceSuggestedHelp) return;
  if (!Number.isFinite(costUnit) || !Number.isFinite(suggested) || suggested <= 0) {
    priceSuggestedHelp.textContent = 'O preço sugerido será calculado a partir da ficha técnica.';
    return;
  }
  if (costUnit > 0) {
    const margin = ((suggested - costUnit) / costUnit) * 100;
    const formattedMargin = Number.isFinite(margin) ? `${margin.toFixed(0)}%` : '';
    priceSuggestedHelp.textContent = `Base: custo ${formatCurrency(costUnit)} + ${formattedMargin} = ${formatCurrency(
        suggested
      )}.`;
    return;
  }
  priceSuggestedHelp.textContent = `Base calculada pela ficha: ${formatCurrency(suggested)}.`;
}

export function updateProducedPricing() {
  if (!costUnitEl || !priceSuggestedEl) return;
  const recipe = getSelectedRecipe() || state.linkedRecipe;
  if (!recipe) {
    costUnitEl.textContent = '-';
    priceSuggestedEl.textContent = '-';
    if (purchasePriceInput) purchasePriceInput.value = '';
    if (priceInput) priceInput.value = '';
    updateProducedSuggestionHelp(null, null);
    updateFinalPriceHint(false);
    return;
  }
  const costUnit = Number(recipe.costPerUnit ?? recipe.custoUnitarioFinal ?? 0);
  const suggested = Number(recipe.priceSuggested ?? recipe.preco_minimo_sugerido ?? 0);
  costUnitEl.textContent = formatCurrency(costUnit);
  priceSuggestedEl.textContent = formatCurrency(suggested);
  updateProducedSuggestionHelp(costUnit, suggested);
  if (purchasePriceInput) purchasePriceInput.value = formatCurrency(costUnit);
  const override = parsePrice(finalPriceInput ? finalPriceInput.value : null);
  const finalPrice = Number.isFinite(override) ? override : suggested;
  if (priceInput) priceInput.value = formatCurrency(finalPrice);
  updateFinalPriceHint(override != null && override !== suggested);
}

export function updateResaleProfit() {
  if (!profitEl) return;
  const purchase = parsePrice(purchasePriceInput ? purchasePriceInput.value : null);
  const price = parsePrice(priceInput ? priceInput.value : null);
  if (purchase == null || price == null) {
    profitEl.textContent = '-';
    return;
  }
  const profit = price - purchase;
  const percentOnCost = purchase > 0 ? (profit / purchase) * 100 : 0;
  const percentOnSale = price > 0 ? (profit / price) * 100 : 0;
  const mode = editResaleCalcMarkup && editResaleCalcMarkup.checked ? 'markup' : 'margin';
  const percentValue = mode === 'markup' ? percentOnCost : percentOnSale;
  const label = mode === 'markup' ? 'sobre custo' : 'sobre venda';
  profitEl.textContent = `${formatCurrency(profit)} (${percentValue.toFixed(0)}% ${label})`;
}

function getResaleCalcMode() {
  return editResaleCalcMarkup && editResaleCalcMarkup.checked ? 'markup' : 'margin';
}

export function updateResalePercentHelp() {
  if (!editResalePercentHelp) return;
  const mode = getResaleCalcMode();
  editResalePercentHelp.textContent =
    mode === 'markup'
      ? 'Percentual sobre o custo de compra.'
      : 'Margem sobre o pre\u00e7o de venda.';
}

function updateResaleSuggestionHelp() {
  if (!priceSuggestion) return;
  const purchase = parsePrice(purchasePriceInput ? purchasePriceInput.value : null);
  const percent = parsePrice(editResalePercent ? editResalePercent.value : null);
  const price = parsePrice(priceInput ? priceInput.value : null);
  if (purchase == null || percent == null) {
    priceSuggestion.textContent = 'Informe o custo e o percentual para visualizar a sugestao.';
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
    priceSuggestion.textContent = '';
    return;
  }
  const label = mode === 'markup' ? 'markup' : 'margem';
  priceSuggestion.textContent = `Sugestao: compra ${formatCurrency(purchase)} + ${label} ${percent.toFixed(
      0
    )}% = ${formatCurrency(suggestedPrice)}.`;
}

export function applyResalePricingRule() {
  const purchase = parsePrice(purchasePriceInput ? purchasePriceInput.value : null);
  const percent = parsePrice(editResalePercent ? editResalePercent.value : null);
  if (purchase == null || percent == null) return;
  const mode = getResaleCalcMode();
  let price = null;
  if (mode === 'markup') {
    price = purchase * (1 + percent / 100);
  } else {
    if (percent >= 100) return;
    price = purchase / (1 - percent / 100);
  }
  if (priceInput) priceInput.value = formatCurrency(price);
  updateResaleProfit();
  updateResaleSuggestionHelp();
}

function syncPercentFromPrice() {
  const purchase = parsePrice(purchasePriceInput ? purchasePriceInput.value : null);
  const price = parsePrice(priceInput ? priceInput.value : null);
  if (purchase == null || price == null || !editResalePercent) return;
  const profit = price - purchase;
  const mode = getResaleCalcMode();
  const percent = mode === 'markup'
    ? purchase > 0 ? (profit / purchase) * 100 : 0
    : price > 0 ? (profit / price) * 100 : 0;
  editResalePercent.value = percent.toFixed(0);
  updateResaleProfit();
  updateResaleSuggestionHelp();
}

function updateDirtyState() {
  if (!saveBtn) return;
  const current = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
    purchasePrice: purchasePriceInput ? purchasePriceInput.value.trim() : '',
    price: priceInput.value.trim(),
    status: statusSelect.value,
    recipeId: recipeSelect ? recipeSelect.value : '',
    finalPrice: finalPriceInput ? finalPriceInput.value.trim() : '',
    productType: getSelectedProductType(),
  };
  const isDirty =
    current.name !== state.original.name ||
    current.description !== state.original.description ||
    current.purchasePrice !== state.original.purchasePrice ||
    current.price !== state.original.price ||
    current.status !== state.original.status ||
    current.recipeId !== state.original.recipeId ||
    current.finalPrice !== state.original.finalPrice ||
    current.productType !== state.original.productType;
  saveBtn.disabled = !isDirty;
}

function setRecipeState(recipe) {
  state.linkedRecipe = recipe || null;
  if (recipeSelect) {
    recipeSelect.value = recipe && recipe.id ? recipe.id : '';
  }
  if (purchasePriceInput) {
    purchasePriceInput.disabled = Boolean(recipe);
  }
  updateProducedPricing();
}

async function loadLinkedRecipe(token, productId) {
  if (!productId) return;
  try {
    const recipe = await apiRequest(`/api/products/${productId}/ficha-tecnica`, token);
    setRecipeState(recipe);
  } catch (err) {
    if (err.status === 404) {
      setRecipeState(null);
      return;
    }
    showMessage(err.message, 'is-danger');
  }
}

// Auth via cookie HttpOnly
ensureAuthOrRedirect();

function bootstrap() {
  if (!productId) {
    window.location.href = '/products.html';
    return;
  }

  loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));

  apiRequest(`/api/products/${productId}`, null)
    .then((product) => {
      const priceValue = resolveNumber(
        product.price,
        product.precoVenda,
        product.preco,
        product.priceFinal,
        product.preco_final
      );
      const purchaseValue = resolveNumber(
        product.purchase_price,
        product.precoCompra,
        product.purchasePrice,
        product.preco_compra
      );
      const typeValue = (product.productType || product.product_type || '').toString().toLowerCase();
      const hasRecipe = Boolean(product.fichaTecnicaId || product.ficha_tecnica_id);
      const isProduced = typeValue === 'produced' ? true : typeValue === 'resale' ? false : hasRecipe;
      nameInput.value = product.name || '';
      descriptionInput.value = product.description || '';
      updateNameGuidance(nameInput, nameHelp);
      if (purchasePriceInput) {
        purchasePriceInput.value = purchaseValue != null ? formatCurrency(purchaseValue) : '';
      }
      priceInput.value = priceValue != null ? formatCurrency(priceValue) : '';
      statusSelect.value = (product.status || product.status_produto || 'ATIVO').toUpperCase();
      if (productTypeProduced) productTypeProduced.checked = isProduced;
      if (productTypeResale) productTypeResale.checked = !isProduced;
      setProductType(isProduced ? 'produced' : 'resale');
      if (!isProduced && editResalePercent) {
        updateResalePercentHelp();
        syncPercentFromPrice();
      }
      state.original = {
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
        purchasePrice: purchasePriceInput ? purchasePriceInput.value.trim() : '',
        price: priceInput.value.trim(),
        status: statusSelect.value,
        recipeId: product.fichaTecnicaId || product.ficha_tecnica_id || '',
        finalPrice: finalPriceInput ? finalPriceInput.value.trim() : '',
        productType: isProduced ? 'produced' : 'resale',
      };
      updateDirtyState();
      loadLinkedRecipe(null, productId);
    })
    .catch((err) => {
      showMessage(err.message, 'is-danger');
    });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/products.html';
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      showMessage('');
      clearFieldError(nameInput, nameError);
      if (purchasePriceInput) clearFieldError(purchasePriceInput, purchasePriceError);
      clearFieldError(priceInput, priceError);

      const standardizedName = standardizeText(nameInput.value, 'name');
      const standardizedDescription = standardizeText(descriptionInput.value, 'description');
      nameInput.value = standardizedName;
      descriptionInput.value = standardizedDescription;

      const productType = getSelectedProductType();
      const payload = {
        name: standardizedName,
        description: standardizedDescription,
        purchase_price: purchasePriceInput ? parsePrice(purchasePriceInput.value) : null,
        price: parsePrice(priceInput.value),
        status: statusSelect.value,
        statusProduto: statusSelect.value,
        productType,
      };
      if (!validateName(payload.name)) {
        setFieldError(nameInput, nameError, 'Nome deve ter 3 a 120 caracteres.');
        return;
      }
      if (productType === 'produced') {
        const recipe = state.linkedRecipe || getSelectedRecipe();
        if (!recipe) {
          if (recipeError) {
            recipeError.textContent = 'Selecione e vincule uma ficha t\u00e9cnica.';
            recipeError.hidden = false;
          }
          if (recipeSelect) {
            recipeSelect.classList.add('is-danger');
            recipeSelect.focus();
          }
          return;
        }
        updateProducedPricing();
        payload.purchase_price = null;
        payload.price = parsePrice(priceInput.value);
        if (payload.price == null) {
          setFieldError(priceInput, priceError, 'Informe o pre\u00e7o de venda.');
          return;
        }
      } else {
        if (purchasePriceInput && payload.purchase_price == null) {
          setFieldError(purchasePriceInput, purchasePriceError, 'Informe o pre\u00e7o de compra.');
          return;
        }
        if (payload.price == null) {
          setFieldError(priceInput, priceError, 'Informe o pre\u00e7o de venda.');
          return;
        }
      }

      saveBtn.classList.add('is-loading');
      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Salvando...';
      try {
        await apiRequest(`/api/products/${productId}`, null, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showMessage('Produto atualizado.', 'is-success');
        sessionStorage.setItem(UPDATED_FLAG, 'true');
        state.original = {
          name: payload.name,
          description: payload.description,
          purchasePrice: purchasePriceInput ? formatCurrency(payload.purchase_price) : '',
          price: formatCurrency(payload.price),
          status: payload.status,
          recipeId: recipeSelect ? recipeSelect.value : '',
          finalPrice: finalPriceInput ? finalPriceInput.value.trim() : '',
          productType,
        };
        if (purchasePriceInput) purchasePriceInput.value = state.original.purchasePrice;
        priceInput.value = state.original.price;
        updateDirtyState();
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        saveBtn.classList.remove('is-loading');
        saveBtn.textContent = originalText;
        updateDirtyState();
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      toggleDeleteModal(true);
    });
  }

  [deleteCloseBtn, deleteCancel].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => toggleDeleteModal(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal && deleteModal.classList.contains('is-active')) {
      event.preventDefault();
      toggleDeleteModal(false);
    }
  });

  if (deleteConfirm) {
    deleteConfirm.addEventListener('click', async () => {
      deleteConfirm.classList.add('is-loading');
      deleteConfirm.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}`, null, {
          method: 'DELETE',
        });
        sessionStorage.setItem(DELETE_FLAG, 'true');
        showMessage('Produto removido com sucesso.', 'is-success');
        setTimeout(() => {
          window.location.href = '/products.html';
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

  if (linkRecipeBtn && recipeSelect) {
    linkRecipeBtn.addEventListener('click', async () => {
      if (recipeError) {
        recipeError.textContent = '';
        recipeError.hidden = true;
      }
      const fichaTecnicaId = recipeSelect.value;
      if (!fichaTecnicaId) {
        if (recipeError) {
          recipeError.textContent = 'Selecione uma ficha t\u00e9cnica.';
          recipeError.hidden = false;
        }
        return;
      }
      linkRecipeBtn.classList.add('is-loading');
      linkRecipeBtn.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}/vincular-ficha`, null, {
          method: 'POST',
          body: JSON.stringify({ fichaTecnicaId }),
        });
        showMessage('Ficha t\u00e9cnica vinculada com sucesso.', 'is-success');
        if (productTypeProduced) productTypeProduced.checked = true;
        if (productTypeResale) productTypeResale.checked = false;
        setProductType('produced');
        await loadLinkedRecipe(null, productId);
        state.original.recipeId = recipeSelect ? recipeSelect.value : '';
        updateDirtyState();
      } catch (err) {
        if (recipeError) {
          recipeError.textContent = err.message || 'Erro ao vincular ficha t\u00e9cnica.';
          recipeError.hidden = false;
        } else {
          showMessage(err.message, 'is-danger');
        }
      } finally {
        linkRecipeBtn.classList.remove('is-loading');
        linkRecipeBtn.disabled = false;
      }
    });
  }

  if (unlinkRecipeBtn) {
    unlinkRecipeBtn.addEventListener('click', async () => {
      if (recipeError) {
        recipeError.textContent = '';
        recipeError.hidden = true;
      }
      unlinkRecipeBtn.classList.add('is-loading');
      unlinkRecipeBtn.disabled = true;
      try {
        await apiRequest(`/api/products/${productId}/remover-ficha`, null, {
          method: 'DELETE',
        });
        showMessage('Vínculo removido com sucesso.', 'is-success');
        setRecipeState(null);
        if (productTypeResale) productTypeResale.checked = true;
        if (productTypeProduced) productTypeProduced.checked = false;
        setProductType('resale');
        state.original.recipeId = '';
        updateDirtyState();
      } catch (err) {
        if (recipeError) {
          recipeError.textContent = err.message || 'Erro ao remover vínculo.';
          recipeError.hidden = false;
        } else {
          showMessage(err.message, 'is-danger');
        }
      } finally {
        unlinkRecipeBtn.classList.remove('is-loading');
        unlinkRecipeBtn.disabled = false;
      }
    });
  }

  if (nameInput) {

    nameInput.addEventListener('input', () => {
      if (validateName(nameInput.value)) {
        clearFieldError(nameInput, nameError);
      }
      updateNameGuidance(nameInput, nameHelp);
      updateDirtyState();
    });
    nameInput.addEventListener('blur', () => {
      const standardized = standardizeText(nameInput.value, 'name');
      if (standardized !== nameInput.value) {
        nameInput.value = standardized;
      }
      updateNameGuidance(nameInput, nameHelp);
      updateDirtyState();
    });
    updateNameGuidance(nameInput, nameHelp);
  }

  if (descriptionInput) {
    descriptionInput.addEventListener('blur', () => {
      const standardized = standardizeText(descriptionInput.value, 'description');
      if (standardized !== descriptionInput.value) {
        descriptionInput.value = standardized;
      }
      updateDirtyState();
    });
  }

  if (priceInput) {
    bindCurrencyInput(priceInput, () => {
      state.resaleCalcSource = 'price';
      if (parsePrice(priceInput.value)) {
        clearFieldError(priceInput, priceError);
      } else if (priceInput.value.trim()) {
        setFieldError(priceInput, priceError, 'Informe o pre\u00e7o de venda.');
      }
      syncPercentFromPrice();
      updateResaleProfit();
      updateDirtyState();
    });
  }

  if (purchasePriceInput) {
    bindCurrencyInput(purchasePriceInput, () => {
      if (parsePrice(purchasePriceInput.value) != null) {
        clearFieldError(purchasePriceInput, purchasePriceError);
      } else if (purchasePriceInput.value.trim()) {
        setFieldError(purchasePriceInput, purchasePriceError, 'Informe o pre\u00e7o de compra.');
      }
      if (state.resaleCalcSource === 'price') {
        syncPercentFromPrice();
      } else {
        applyResalePricingRule();
      }
      updateResaleProfit();
      updateDirtyState();
    });
  }

  if (finalPriceInput) {
    bindCurrencyInput(finalPriceInput, () => {
      updateProducedPricing();
      updateDirtyState();
    });
  }

  if (recipeSearch) {
    recipeSearch.addEventListener('input', () => {
      applyRecipeSearch();
    });
  }

  if (recipeSelect) {
    recipeSelect.addEventListener('change', () => {
      if (recipeError) {
        recipeError.textContent = '';
        recipeError.hidden = true;
      }
      recipeSelect.classList.remove('is-danger');
      updateProducedPricing();
      updateDirtyState();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      updateDirtyState();
    });
  }

  if (productTypeProduced) {
    productTypeProduced.addEventListener('change', () => setProductType('produced'));
  }

  if (productTypeResale) {
    productTypeResale.addEventListener('change', () => setProductType('resale'));
  }

  [editResaleCalcMargin, editResaleCalcMarkup].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      state.resaleCalcSource = 'percent';
      updateResalePercentHelp();
      applyResalePricingRule();
      updateDirtyState();
    });
  });

  if (editResalePercent) {
    editResalePercent.addEventListener('input', () => {
      state.resaleCalcSource = 'percent';
      applyResalePricingRule();
      updateDirtyState();
    });
    editResalePercent.addEventListener('blur', () => {
      const parsed = parsePrice(editResalePercent.value);
      if (parsed != null) {
        editResalePercent.value = parsed.toFixed(0);
      }
      applyResalePricingRule();
      updateDirtyState();
    });
  }

  setProductType(getSelectedProductType());

  updateResaleProfit();

  updateResalePercentHelp();

  updateResaleSuggestionHelp();
}

bootstrap();
