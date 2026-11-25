/**
 * Resumo de custos: gastos do dia a dia, lucro, preço e estado do botão salvar.
 */
import {
  calcStatus,
  marginInput,
  nameInput,
  overheadBody,
  overheadInput,
  overheadTotalEl,
  profitFixedInput,
  profitFixedSection,
  profitPercentSection,
  profitTypePercent,
  saveBtn,
  summaryOverhead,
  summaryOverheadLabel,
  summaryProfit,
  summaryProfitType,
  summarySuggested,
  summaryTotal,
  summaryUnit,
  summaryYield,
  yieldInput,
  yieldTypeInput,
} from './dom.js';
import { state } from './state.js';
import {
  calculateIngredientCost,
  formatMoney,
  formatQuantity,
  normalizeOverheadPercent,
  toNumber,
} from './calc.js';
import { validateName } from './validators.js';
import { getAllIngredients } from './components.js';

export function updateSaveState() {
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

function getOverheadPercentValue() {
  const raw = toNumber(overheadInput ? overheadInput.value : null, 0);
  return normalizeOverheadPercent(raw || 0);
}

export function getOverheadValue(ingredientsTotal) {
  const percent = getOverheadPercentValue();
  const percentValue = ingredientsTotal * (percent / 100);
  const detailed = state.overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  return percentValue + detailed;
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
          <td class="has-text-right">R$ ${formatMoney(Number(item.value) || 0)}</td>
          <td class="has-text-right"><button class="button is-light is-small" data-index="${index}">Remover</button></td>
        `;
      overheadBody.appendChild(row);
    });
  }
  const total = state.overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  if (overheadTotalEl) overheadTotalEl.textContent = `R$ ${formatMoney(total)}`;
  updateCostSummary();
}

export function updateCostSummary() {
  if (!summaryTotal || !summaryUnit || !summarySuggested || !summaryYield || !summaryProfit || !summaryProfitType) {
    return;
  }
  const ingredientsTotal = getAllIngredients().reduce((sum, item) => sum + calculateIngredientCost(item), 0);
  const overheadValue = getOverheadValue(ingredientsTotal);
  const overheadItemsTotal = state.overheadItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
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
    summaryYield.textContent = `${formatQuantity(yieldValue)} ${(yieldTypeInput.value || '').toLowerCase()}`.trim();
  } else {
    const placeholder = 'Preencha os dados acima';
    summaryUnit.textContent = placeholder;
    summarySuggested.textContent = placeholder;
    summaryProfit.textContent = placeholder;
    summaryYield.textContent = placeholder;
  }
}

export function getProfitType() {
  if (profitTypePercent && profitTypePercent.checked) return 'percent';
  return 'fixed';
}

export function updateProfitTypeUI() {
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

/**
 * Habilita o botão Salvar se houver dados válidos
 */
export function enableSaveButton() {
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
