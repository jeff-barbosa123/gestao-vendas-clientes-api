/**
 * Eventos do formulário de ficha: campos, ingredientes, componentes e envio.
 */
import {
  addIngredientBtn,
  componentAddAcabamento,
  componentAddAviamentos,
  componentAddBtn,
  componentAddCobertura,
  componentAddEmbalagem,
  componentAddMaoObra,
  componentAddMassa,
  componentAddMateriaPrima,
  componentDuplicateBtn,
  componentMoveDownBtn,
  componentMoveUpBtn,
  componentName,
  componentRemoveBtn,
  componentRename,
  componentRenameBtn,
  componentSelect,
  createDescription,
  createForm,
  createMargin,
  createName,
  createNameError,
  createOverhead,
  createProfitFixed,
  createProfitTypeFixed,
  createProfitTypePercent,
  createSubmit,
  createYield,
  createYieldError,
  createYieldType,
  fillExample,
  ingredientAdvancedToggle,
  ingredientCost,
  ingredientError,
  ingredientName,
  ingredientPack,
  ingredientPackUnit,
  ingredientQty,
  ingredientUnit,
  ingredientsBody,
  overheadAddBtn,
  overheadBody,
  overheadError,
  overheadItemName,
  overheadItemValue,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, clearFieldError, setFieldError, showMessage } from './core.js';
import {
  applyUnitNormalization,
  calculateIngredientCost,
  formatQuantity,
  normalizeKgValue,
  toNumber,
} from './calc.js';
import {
  validateCreateName,
  validateCreateYield,
  validateIngredientFields,
  validateName,
} from './validators.js';
import { findCatalogIngredient, setMaskedValue } from './catalog.js';
import {
  addComponent,
  duplicateActiveComponent,
  ensureDefaultComponent,
  getActiveComponent,
  getAllIngredients,
  moveActiveComponent,
  removeActiveComponent,
  renameActiveComponent,
  renderComponentSelect,
  setActiveComponent,
} from './components.js';
import {
  getOverheadValue,
  getProfitType,
  renderOverheadItems,
  updateCostSummary,
  updateProfitTypeUI,
  updateSubmitState,
} from './summary.js';
import {
  clearIngredientWarning,
  enforceKgLimits,
  isIngredientAdvancedOpen,
  renderIngredients,
  setIngredientAdvancedOpen,
  showIngredientSuccess,
  showIngredientWarning,
  updateIngredientUnitHints,
  updatePackQuantityWarning,
  updatePackUnitDisplay,
  updatePackUnitHints,
} from './ingredients.js';
import { loadRecipes } from './list.js';

export function initEvents() {
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', () => {
      const name = ingredientName.value.trim();
      applyUnitNormalization(ingredientQty, ingredientUnit);
      applyUnitNormalization(ingredientPack, ingredientPackUnit, () => {
        state.packUnitTouched = true;
      });
      let quantity = toNumber(ingredientQty.value, 0.01);
      let pack = toNumber(ingredientPack.value, 0.01);
      let cost = toNumber(ingredientCost.value, 0);
      const unit = ingredientUnit ? ingredientUnit.value : '';
      const packUnit = ingredientPackUnit ? ingredientPackUnit.value : unit;
      const advancedOpen = isIngredientAdvancedOpen();
      const wantsPrice = advancedOpen || pack != null || cost != null;
      if (!name || quantity == null || !unit || (wantsPrice && (pack == null || cost == null))) {
        validateIngredientFields(true);
        showIngredientSuccess('');
        return;
      }
      if (!wantsPrice) {
        pack = 0;
        cost = 0;
      }
      if (unit === 'kg') {
        const adjustedQty = normalizeKgValue(quantity);
        if (adjustedQty !== quantity) {
          quantity = adjustedQty;
          ingredientQty.value = formatQuantity(quantity);
          showIngredientWarning(`Converti ${formatQuantity(adjustedQty * 1000)} g para ${formatQuantity(adjustedQty)} kg.`);
        }
        const limitedQty = enforceKgLimits(quantity, 'quantidade usada', 10);
        if (limitedQty == null) {
          return;
        }
      }
      if (wantsPrice && packUnit === 'kg') {
        const adjustedPack = normalizeKgValue(pack);
        if (adjustedPack !== pack) {
          pack = adjustedPack;
          ingredientPack.value = formatQuantity(pack);
          showIngredientWarning(`Converti ${formatQuantity(adjustedPack * 1000)} g para ${formatQuantity(adjustedPack)} kg.`);
        }
        const limitedPack = enforceKgLimits(pack, 'quantidade do pacote', 50);
        if (limitedPack == null) {
          return;
        }
        pack = limitedPack;
      }
      clearIngredientWarning();
      clearFieldError(ingredientName, ingredientError);
      showIngredientSuccess('Item adicionado.');
      const activeComponent = getActiveComponent();
      if (activeComponent) {
        activeComponent.items.push({ name, ingredientId: (findCatalogIngredient(name) || {}).id, quantity, packageQuantity: pack, cost, unit, packUnit, component: activeComponent.name });
      }
      ingredientName.value = '';
      ingredientQty.value = '';
      ingredientPack.value = '';
      ingredientCost.value = '';
      renderIngredients();
    });
  }

  if (overheadAddBtn) {
    overheadAddBtn.addEventListener('click', () => {
      const name = overheadItemName ? overheadItemName.value.trim() : '';
      const value = toNumber(overheadItemValue ? overheadItemValue.value : null, 0.01);
      if (!name || value == null) {
        if (overheadError) {
          overheadError.textContent = 'Informe descri\u00e7\u00e3o e valor.';
          overheadError.hidden = false;
        }
        return;
      }
      if (overheadError) {
        overheadError.textContent = '';
        overheadError.hidden = true;
      }
      state.overheadItems.push({ name, value });
      if (overheadItemName) overheadItemName.value = '';
      if (overheadItemValue) overheadItemValue.value = '';
      renderOverheadItems();
    });
  }

  if (overheadBody) {
    overheadBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      if (Number.isInteger(index)) {
        state.overheadItems.splice(index, 1);
        renderOverheadItems();
      }
    });
  }

  if (ingredientsBody) {
    ingredientsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      const activeComponent = getActiveComponent();
      if (Number.isInteger(index) && activeComponent && Array.isArray(activeComponent.items)) {
        activeComponent.items.splice(index, 1);
        renderIngredients();
      }
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldError(createName, createNameError);
      clearFieldError(createYield, createYieldError);

      const name = createName.value.trim();
      const yieldValue = toNumber(createYield.value, 0.01);
      if (!validateName(name)) {
        setFieldError(createName, createNameError, 'Informe um nome com pelo menos 3 letras.');
        return;
      }
      if (yieldValue == null) {
        setFieldError(createYield, createYieldError, 'Informe um rendimento maior que zero.');
        return;
      }
      if (!getAllIngredients().length) {
        setFieldError(ingredientName, ingredientError, 'Adicione pelo menos um item em alguma parte.');
        return;
      }

      createSubmit.classList.add('is-loading');
      createSubmit.disabled = true;
      try {
        const ingredientsAll = getAllIngredients();
        const ingredientsTotal = ingredientsAll.reduce((sum, item) => sum + calculateIngredientCost(item), 0);
        const overheadValue = getOverheadValue(ingredientsTotal);
        const baseTotal = ingredientsTotal + overheadValue;
        const profitType = getProfitType();
        let marginValue = 0;
        if (profitType === 'percent') {
          marginValue = (toNumber(createMargin.value, 0) || 0) / 100;
        } else {
          const fixedProfit = toNumber(createProfitFixed.value, 0) || 0;
          marginValue = baseTotal > 0 ? fixedProfit / baseTotal : 0;
        }
        const ingredientsPayload = ingredientsAll.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          packageQuantity: item.packageQuantity,
          cost: item.cost,
          unit: item.unit,
          packUnit: item.packUnit,
          component: item.component || undefined,
          ingredientId: item.ingredientId || undefined,
        }));
        await apiRequest('/api/recipes', null, {
          method: 'POST',
          body: JSON.stringify({
            name,
            description: createDescription.value.trim() || undefined,
            yield: yieldValue,
            yieldType: createYieldType.value,
            overhead: overheadValue,
            overheadItems: state.overheadItems.map((item) => ({
              name: item.name,
              cost: toNumber(item.value, 0) || 0,
            })),
            labor: 0,
            margin: marginValue,
            ingredients: ingredientsPayload,
          }),
        });
        showMessage('Ficha t\u00e9cnica salva com sucesso.', 'is-success');
        createForm.reset();
        state.components = [];
        state.overheadItems = [];
        ensureDefaultComponent();
        renderComponentSelect();
        renderIngredients();
        renderOverheadItems();
        updateCostSummary();
        await loadRecipes(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        createSubmit.classList.remove('is-loading');
        createSubmit.disabled = false;
      }
    });
  }

  [createYield, createOverhead, createProfitFixed, createMargin].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      updateCostSummary();
      updateSubmitState();
    });
  });

  if (createYieldType) {
    createYieldType.addEventListener('change', () => {
      updateCostSummary();
      updateSubmitState();
    });
  }

  if (ingredientUnit) {
    ingredientUnit.addEventListener('change', () => {
      if (ingredientPackUnit && !state.packUnitTouched) {
        ingredientPackUnit.value = ingredientUnit.value;
      }
      updatePackUnitDisplay();
      updateIngredientUnitHints();
      updatePackUnitHints();
    });
    ingredientUnit.addEventListener('change', () => validateIngredientFields(false));
  }

      if (ingredientPackUnit) {
      ingredientPackUnit.addEventListener('change', () => {
        state.packUnitTouched = true;
        updatePackUnitHints();
        updatePackQuantityWarning();
      });
    }

    if (ingredientAdvancedToggle) {
    ingredientAdvancedToggle.addEventListener('click', () => {
      setIngredientAdvancedOpen(!isIngredientAdvancedOpen());
    });
  }

  [createName, createYield].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      if (input === createName) validateCreateName(true);
      if (input === createYield) validateCreateYield(true);
      updateSubmitState();
    });
    input.addEventListener('blur', () => {
      if (input === createName) validateCreateName(true);
      if (input === createYield) validateCreateYield(true);
      updateSubmitState();
    });
  });

  [ingredientName, ingredientQty, ingredientPack, ingredientCost].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      if (input === ingredientQty || input === ingredientPack || input === ingredientCost) {
        clearIngredientWarning('parse');
        clearIngredientWarning('kg');
      }
      if (input === ingredientPack) {
        updatePackQuantityWarning();
      }
      validateIngredientFields(false);
    });
    input.addEventListener('blur', () => {
      if (input === ingredientQty) {
        applyUnitNormalization(ingredientQty, ingredientUnit);
      }
      if (input === ingredientPack) {
        applyUnitNormalization(ingredientPack, ingredientPackUnit, () => {
          state.packUnitTouched = true;
        });
      }
      validateIngredientFields(true);
    });
  });

  if (componentAddBtn) {
    componentAddBtn.addEventListener('click', () => {
      if (!componentName) return;
      addComponent(componentName.value);
      componentName.value = '';
    });
  }

  if (componentName) {
    componentName.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addComponent(componentName.value);
        componentName.value = '';
      }
    });
  }

  if (componentAddMassa) {
    componentAddMassa.addEventListener('click', () => addComponent('Base'));
  }

    if (componentAddCobertura) {
      componentAddCobertura.addEventListener('click', () => addComponent('Complemento'));
    }

    if (componentAddEmbalagem) {
      componentAddEmbalagem.addEventListener('click', () => addComponent('Embalagem'));
    }

  if (componentAddMaoObra) {
    componentAddMaoObra.addEventListener('click', () => addComponent('M\u00e3o de obra'));
  }

  if (componentAddAviamentos) {
    componentAddAviamentos.addEventListener('click', () => addComponent('Acess\u00f3rios'));
  }

  if (componentAddMateriaPrima) {
    componentAddMateriaPrima.addEventListener('click', () => addComponent('Mat\u00e9ria-prima'));
  }

    if (componentAddAcabamento) {
      componentAddAcabamento.addEventListener('click', () => addComponent('Acabamento'));
    }

  if (componentSelect) {
    componentSelect.addEventListener('change', () => {
      setActiveComponent(componentSelect.value);
    });
  }

    if (componentRenameBtn) {
      componentRenameBtn.addEventListener('click', () => {
        if (!componentRename) return;
        renameActiveComponent(componentRename.value);
        componentRename.value = '';
      });
    }

    if (componentRename) {
      componentRename.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          renameActiveComponent(componentRename.value);
          componentRename.value = '';
        }
      });
    }

    if (componentRemoveBtn) {
      componentRemoveBtn.addEventListener('click', () => {
        removeActiveComponent();
      });
    }

    if (componentDuplicateBtn) {
      componentDuplicateBtn.addEventListener('click', () => {
        duplicateActiveComponent();
      });
    }

    if (componentMoveUpBtn) {
      componentMoveUpBtn.addEventListener('click', () => {
        moveActiveComponent(-1);
      });
    }

    if (componentMoveDownBtn) {
      componentMoveDownBtn.addEventListener('click', () => {
        moveActiveComponent(1);
      });
    }

  if (fillExample) {
    fillExample.addEventListener('click', () => {
      if (createName) createName.value = 'Bolo de Chocolate 1kg';
      if (createDescription) createDescription.value = 'Bolo simples com recheio';
      if (createYield) createYield.value = '10';
      if (createYieldType) createYieldType.value = 'UN';
      setMaskedValue(createOverhead, 5, state.overheadMask);
      setMaskedValue(createProfitFixed, 10, state.profitFixedMask);
      setMaskedValue(createMargin, 30, state.marginMask);
      if (createProfitTypeFixed) createProfitTypeFixed.checked = true;
      state.components = [
        {
          name: 'Massa',
          items: [
            { name: 'Farinha de trigo', quantity: 200, packageQuantity: 1000, cost: 6, unit: 'g', component: 'Massa' },
            { name: 'Acucar', quantity: 150, packageQuantity: 1000, cost: 5, unit: 'g', component: 'Massa' },
            { name: 'Ovos', quantity: 3, packageQuantity: 30, cost: 18, unit: 'un', component: 'Massa' },
          ],
        },
        {
          name: 'Cobertura',
          items: [
            { name: 'Chocolate', quantity: 200, packageQuantity: 1000, cost: 18, unit: 'g', component: 'Cobertura' },
          ],
        },
      ];
      renderComponentSelect();
      if (componentSelect) componentSelect.value = 'Massa';
      renderIngredients();
      showIngredientSuccess('Exemplo carregado.');
      validateCreateName(false);
      validateCreateYield(false);
      setIngredientAdvancedOpen(true);
    });
  }

  if (createProfitTypeFixed) {
    createProfitTypeFixed.addEventListener('change', () => updateProfitTypeUI());
  }

  if (createProfitTypePercent) {
    createProfitTypePercent.addEventListener('change', () => updateProfitTypeUI());
  }
}
