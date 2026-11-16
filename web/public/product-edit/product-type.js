/**
 * Tipo de produto (produzido ou revenda): dicas de fluxo e seleção.
 */
import {
  flowHint,
  priceInput,
  producedSection,
  productTypeResale,
  purchasePriceInput,
  recipeError,
  recipeSelect,
  resaleSection,
} from './dom.js';
import {
  applyResalePricingRule,
  updateProducedPricing,
  updateResalePercentHelp,
  updateResaleProfit,
} from './pricing.js';

export function getSelectedProductType() {
  if (productTypeResale && productTypeResale.checked) return 'resale';
  return 'produced';
}

function updateFlowHint(type) {
  if (!flowHint) return;
  if (type === 'produced') {
    flowHint.innerHTML =
      '<strong>Fluxo guiado:</strong> selecione a ficha tecnica, valide o preco sugerido e ajuste se necessario.';
    return;
  }
  flowHint.innerHTML =
    '<strong>Fluxo guiado:</strong> informe o custo de compra, escolha a regra e confirme o preco de venda.';
}

export function setProductType(type) {
  const isProduced = type === 'produced';
  if (producedSection) producedSection.hidden = !isProduced;
  if (resaleSection) resaleSection.hidden = isProduced;
  if (recipeSelect) {
    recipeSelect.toggleAttribute('required', isProduced);
    if (isProduced) {
      recipeSelect.setAttribute('aria-required', 'true');
    } else {
      recipeSelect.removeAttribute('aria-required');
      recipeSelect.classList.remove('is-danger');
    }
  }
  if (purchasePriceInput) purchasePriceInput.toggleAttribute('required', !isProduced);
  if (priceInput) priceInput.toggleAttribute('required', !isProduced);
  if (recipeError) {
    recipeError.textContent = '';
    recipeError.hidden = true;
  }
  updateFlowHint(type);
  if (isProduced) {
    updateProducedPricing();
  } else {
    updateResalePercentHelp();
    applyResalePricingRule();
    updateResaleProfit();
  }
}
