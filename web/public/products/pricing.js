/**
 * Preço de venda: sugestões do produzido e cálculo de margem/markup da revenda.
 */
import {
  createCostUnit,
  createFinalPrice,
  createFinalPriceHint,
  createPrice,
  createPriceSuggested,
  createPriceSuggestedHelp,
  createPriceSuggestion,
  createProfit,
  createPurchasePrice,
  createRecipeError,
  createRecipeId,
  resaleCalcMarkup,
  resalePercent,
  resalePercentHelp,
} from './dom.js';
import { formatCurrency, parsePrice } from './money.js';
import { getSelectedRecipe } from './recipes.js';

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
    createPriceSuggestedHelp.textContent = 'O preço sugerido será calculado a partir da ficha técnica.';
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

export function updateProducedPricing() {
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

export function updateResaleProfit() {
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

export function updateResalePercentHelp() {
  if (!resalePercentHelp) return;
  const mode = getResaleCalcMode();
  resalePercentHelp.textContent =
    mode === 'markup'
      ? 'Percentual sobre o custo de compra.'
      : 'Margem sobre o pre\u00e7o de venda.';
}

export function updateResaleSuggestionHelp() {
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

export function applyResalePricingRule() {
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

export function syncPercentFromPrice() {
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
