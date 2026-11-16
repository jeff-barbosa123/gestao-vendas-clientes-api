/**
 * Validações do formulário de edição e de ingrediente.
 */
import {
  ingredientCost,
  ingredientError,
  ingredientName,
  ingredientPack,
  ingredientQty,
  ingredientUnit,
  nameError,
  nameInput,
  yieldError,
  yieldInput,
} from './dom.js';
import { clearFieldError, setFieldError } from './core.js';
import { toNumber } from './calc.js';
import {
  isIngredientAdvancedOpen,
  setIngredientAdvancedOpen,
  showIngredientSuccess,
} from '../recipe-edit.js';

export function validateEditName(showMessage) {
  const value = nameInput ? nameInput.value.trim() : '';
  if (value.length < 3) {
    if (showMessage) {
      setFieldError(nameInput, nameError, 'Informe um nome com pelo menos 3 letras.');
    } else if (nameInput) {
      nameInput.classList.add('is-danger');
    }
    return false;
  }
  clearFieldError(nameInput, nameError);
  return true;
}

export function validateEditYield(showMessage) {
  const value = toNumber(yieldInput ? yieldInput.value : null, 0.01);
  if (value == null) {
    if (showMessage) {
      setFieldError(yieldInput, yieldError, 'Informe um rendimento maior que zero.');
    } else if (yieldInput) {
      yieldInput.classList.add('is-danger');
    }
    return false;
  }
  clearFieldError(yieldInput, yieldError);
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

export function validateName(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  return true;
}
