/**
 * Validações do formulário de ficha e de ingrediente.
 */
import {
  createName,
  createNameError,
  createYield,
  createYieldError,
  ingredientCost,
  ingredientError,
  ingredientName,
  ingredientPack,
  ingredientQty,
  ingredientUnit,
} from './dom.js';
import { clearFieldError, setFieldError } from './core.js';
import { toNumber } from './calc.js';
import {
  isIngredientAdvancedOpen,
  setIngredientAdvancedOpen,
  showIngredientSuccess,
} from './ingredients.js';
import { validateName } from '../shared/recipe-validators.js';
export { validateName };

export function validateCreateName(showMessage) {
  const value = createName ? createName.value.trim() : '';
  if (value.length < 3) {
    if (showMessage) {
      setFieldError(createName, createNameError, 'Informe um nome com pelo menos 3 letras.');
    } else if (createName) {
      createName.classList.add('is-danger');
    }
    return false;
  }
  clearFieldError(createName, createNameError);
  return true;
}

export function validateCreateYield(showMessage) {
  const value = toNumber(createYield ? createYield.value : null, 0.01);
  if (value == null) {
    if (showMessage) {
      setFieldError(createYield, createYieldError, 'Informe um rendimento maior que zero.');
    } else if (createYield) {
      createYield.classList.add('is-danger');
    }
    return false;
  }
  clearFieldError(createYield, createYieldError);
  return true;
}

    export function validateIngredientFields(showMessage) {
  const name = ingredientName ? ingredientName.value.trim() : '';
  const quantity = toNumber(ingredientQty ? ingredientQty.value : null, 0.01);
  const pack = toNumber(ingredientPack ? ingredientPack.value : null, 0.01);
  const cost = toNumber(ingredientCost ? ingredientCost.value : null, 0);
  const unit = ingredientUnit ? ingredientUnit.value : '';
  const advancedOpen = isIngredientAdvancedOpen();
  const wantsPrice = advancedOpen || pack != null || cost != null;
  const packValid = !wantsPrice || pack != null;
  const costValid = !wantsPrice || cost != null;
  const fields = [
    { input: ingredientName, valid: Boolean(name) },
    { input: ingredientQty, valid: quantity != null },
    { input: ingredientPack, valid: packValid },
    { input: ingredientCost, valid: costValid },
  ];
  let isValid = Boolean(name && quantity != null && unit && packValid && costValid);
  fields.forEach((field) => {
    if (!field.input) return;
    if (!wantsPrice && (field.input === ingredientPack || field.input === ingredientCost)) {
      field.input.classList.remove('is-danger');
      field.input.removeAttribute('aria-invalid');
      return;
    }
    if (field.valid) {
      field.input.classList.remove('is-danger');
      field.input.removeAttribute('aria-invalid');
    } else {
      field.input.classList.add('is-danger');
      field.input.setAttribute('aria-invalid', 'true');
    }
  });
  if (showMessage) {
    if (!isValid) {
      if (!advancedOpen) {
        setIngredientAdvancedOpen(true);
      }
      setFieldError(
        ingredientName,
        ingredientError,
        'Informe item, quantidade usada e a unidade.',
      );
    } else {
      clearFieldError(ingredientName, ingredientError);
    }
  }
  if (!isValid) showIngredientSuccess('');
  return isValid;
}

