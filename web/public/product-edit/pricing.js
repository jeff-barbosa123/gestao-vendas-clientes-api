/**
 * Preço de venda: sugestões do produzido e cálculo de margem/markup da revenda.
 */
import {
  costUnitEl,
  editResaleCalcMarkup,
  editResalePercent,
  editResalePercentHelp,
  finalPriceHint,
  finalPriceInput,
  priceInput,
  priceSuggestedEl,
  priceSuggestedHelp,
  priceSuggestion,
  profitEl,
  purchasePriceInput,
} from './dom.js';
import { state } from './state.js';
import { formatCurrency, parsePrice } from './money.js';
import { getSelectedRecipe } from './recipes.js';

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

export function updateResaleSuggestionHelp() {
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

export function syncPercentFromPrice() {
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
