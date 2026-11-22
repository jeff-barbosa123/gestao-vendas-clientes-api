/**
 * Estado de alterações não salvas e habilitação do botão Salvar.
 */
import {
  descriptionInput,
  finalPriceInput,
  nameInput,
  priceInput,
  purchasePriceInput,
  recipeSelect,
  saveBtn,
  statusSelect,
} from './dom.js';
import { state } from './state.js';
import { getSelectedProductType } from './product-type.js';

export function updateDirtyState() {
  if (!saveBtn) return;
  const current = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
    purchasePrice: purchasePriceInput ? purchasePriceInput.value.trim() : '',
    price: priceInput.value.trim(),
    status: statusSelect.value,
    recipeId: recipeSelect ? recipeSelect.value : '',
    finalPrice: finalPriceInput ? finalPriceInput.value.trim() : '',
    productType: getSelectedProductType(),
  };
  const isDirty =
    current.name !== state.original.name ||
    current.description !== state.original.description ||
    current.purchasePrice !== state.original.purchasePrice ||
    current.price !== state.original.price ||
    current.status !== state.original.status ||
    current.recipeId !== state.original.recipeId ||
    current.finalPrice !== state.original.finalPrice ||
    current.productType !== state.original.productType;
  saveBtn.disabled = !(isDirty || (window.SGVC && window.SGVC.customFields && window.SGVC.customFields.isDirty(document.getElementById('edit-form'))));
}
