/**
 * Tipo de produto (produzido ou revenda): cartões, dicas de fluxo e seleção.
 */
import {
  createFlowHint,
  createPrice,
  createPurchasePrice,
  createRecipeError,
  createRecipeId,
  producedSection,
  productTypeCards,
  productTypeResale,
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

export function updateProductTypeCards() {
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

export function setProductType(type) {
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
