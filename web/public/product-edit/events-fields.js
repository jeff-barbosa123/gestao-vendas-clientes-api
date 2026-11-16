/**
 * Eventos dos campos: nome, preços, status, tipo e revenda.
 */
import {
  descriptionInput,
  editResaleCalcMargin,
  editResaleCalcMarkup,
  editResalePercent,
  finalPriceInput,
  nameError,
  nameHelp,
  nameInput,
  priceError,
  priceInput,
  productTypeProduced,
  productTypeResale,
  purchasePriceError,
  purchasePriceInput,
  statusSelect,
} from './dom.js';
import { state } from './state.js';
import { clearFieldError, setFieldError } from './core.js';
import { standardizeText, updateNameGuidance, validateName } from './text.js';
import { bindCurrencyInput, parsePrice } from './money.js';
import { getSelectedProductType, setProductType } from './product-type.js';
import {
  applyResalePricingRule,
  syncPercentFromPrice,
  updateProducedPricing,
  updateResalePercentHelp,
  updateResaleProfit,
  updateResaleSuggestionHelp,
} from './pricing.js';
import { updateDirtyState } from './dirty.js';

export function initEventsFields() {
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
