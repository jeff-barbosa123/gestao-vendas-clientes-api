/**
 * Eventos do formulário de criação de produto.
 */
import {
  createDescription,
  createFinalPrice,
  createForm,
  createName,
  createNameError,
  createNameHelp,
  createPrice,
  createPriceError,
  createPurchasePrice,
  createPurchasePriceError,
  createRecipeError,
  createRecipeId,
  createRecipeSearch,
  createStatus,
  createSubmit,
  productTypeProduced,
  productTypeResale,
  resaleCalcMargin,
  resaleCalcMarkup,
  resalePercent,
} from './dom.js';
import { state } from './state.js';
import {
  apiRequest,
  clearFieldError,
  handleAuthFailure,
  setFieldError,
  showMessage,
} from './core.js';
import { standardizeText, updateNameGuidance, validateName } from './text.js';
import { bindCurrencyInput, parsePrice } from './money.js';
import { getSelectedProductType, setProductType, updateProductTypeCards } from './product-type.js';
import { applyRecipeSearch, getSelectedRecipe, loadRecipes } from './recipes.js';
import {
  applyResalePricingRule,
  syncPercentFromPrice,
  updateProducedPricing,
  updateResalePercentHelp,
  updateResaleProfit,
  updateResaleSuggestionHelp,
} from './pricing.js';
import { loadProducts } from './list.js';

export function initEventsForm() {
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
        if (typeof updateProductTypeCards === 'function') updateProductTypeCards();
        await loadProducts(null);
        await loadRecipes(null);
      } catch (err) {
        if (handleAuthFailure(err)) return;
        showMessage((err && err.message ? err.message : 'Erro ao cadastrar produto.'), 'is-danger');
      } finally {
        createSubmit.classList.remove('is-loading');
        createSubmit.disabled = false;
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
      state.resaleCalcSource = 'price';
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
      if (state.resaleCalcSource === 'price') {
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
      state.resaleCalcSource = 'percent';
      updateResalePercentHelp();
      applyResalePricingRule();
    });
  });

  if (resalePercent) {
    resalePercent.addEventListener('input', () => {
      state.resaleCalcSource = 'percent';
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

  setProductType(getSelectedProductType());

  updateResaleProfit();

  updateResalePercentHelp();

  updateResaleSuggestionHelp();

  updateProductTypeCards();
}
