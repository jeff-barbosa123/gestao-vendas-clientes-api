/**
 * Resumo de custos: gastos do dia a dia, lucro, preço e estado do botão salvar.
 */
import {
  calcStatus,
  createMargin,
  createName,
  createOverhead,
  createOverheadWarning,
  createProfitFixed,
  createProfitFixedSection,
  createProfitPercentSection,
  createProfitTypePercent,
  createSubmit,
  createYield,
  createYieldType,
  overheadBody,
  overheadTotalEl,
  summaryOverhead,
  summaryOverheadLabel,
  summaryProfit,
  summaryProfitType,
  summarySuggested,
  summaryTotal,
  summaryUnit,
  summaryYield,
} from './dom.js';
import { state } from './state.js';
import { calculateIngredientCost, formatMoney, formatQuantity, toNumber } from './calc.js';
import { getAllIngredients } from './components.js';

function getRecipeFormState() {
  const nameValue = createName ? String(createName.value || '').trim() : '';
  const yieldValue = toNumber(createYield ? createYield.value : null, 0.01);
  const hasName = nameValue.length >= 3;
  const hasYield = yieldValue != null;
  const hasItems = getAllIngredients().length > 0;
  return { nameValue, yieldValue, hasName, hasYield, hasItems };
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

export function getOverheadValue(ingredientsTotal) {
  const percent = getOverheadPercentValue();
  const base = Number.isFinite(ingredientsTotal) ? ingredientsTotal : 0;
  const percentValue = base * (percent / 100);
  const extraTotal = state.overheadItems.reduce((sum, item) => {
    const value = toNumber(item.value, 0);
    return sum + (value || 0);
  }, 0);
  return percentValue + extraTotal;
}

export function renderOverheadItems() {
  if (!overheadBody) return;
  overheadBody.innerHTML = '';
  if (!state.overheadItems.length) {
    overheadBody.innerHTML = '<tr class="empty-row"><td colspan="3">Nenhum custo extra informado.</td></tr>';
  } else {
    state.overheadItems.forEach((item, index) => {
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
  const itemsTotal = state.overheadItems.reduce((sum, item) => sum + (toNumber(item.value, 0) || 0), 0);
  if (overheadTotalEl) {
    overheadTotalEl.textContent = `R$ ${formatMoney(itemsTotal)}`;
  }
  updateCostSummary();
  updateSubmitState();
}

export function updateCostSummary() {
  if (!summaryTotal || !summaryUnit || !summarySuggested || !summaryYield || !summaryProfit || !summaryProfitType) {
    return;
  }
  const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  const overheadValue = getOverheadValue(ingredientsTotal);
  const overheadItemsTotal = state.overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
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
    summaryYield.textContent = `${formatQuantity(yieldValue)} ${(createYieldType.value || '').toLowerCase()}`.trim();
  } else {
    const placeholder = 'Preencha os dados acima';
    summaryUnit.textContent = placeholder;
    summarySuggested.textContent = placeholder;
    summaryProfit.textContent = placeholder;
    summaryYield.textContent = placeholder;
  }
}

export function updateSubmitState() {
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

export function getProfitType() {
  if (createProfitTypePercent && createProfitTypePercent.checked) return 'percent';
  return 'fixed';
}

export function updateProfitTypeUI() {
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
