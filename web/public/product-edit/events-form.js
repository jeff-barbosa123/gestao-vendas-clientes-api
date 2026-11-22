/**
 * Eventos do formulário: envio da edição.
 */
import { UPDATED_FLAG, productId } from './constants.js';
import {
  descriptionInput,
  finalPriceInput,
  form,
  nameError,
  nameInput,
  priceError,
  priceInput,
  purchasePriceError,
  purchasePriceInput,
  recipeError,
  recipeSelect,
  saveBtn,
  statusSelect,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, clearFieldError, setFieldError, showMessage } from './core.js';
import { standardizeText, validateName } from './text.js';
import { formatCurrency, parsePrice } from './money.js';
import { getSelectedProductType } from './product-type.js';
import { getSelectedRecipe } from './recipes.js';
import { updateProducedPricing } from './pricing.js';
import { updateDirtyState } from './dirty.js';

export function initEventsForm() {
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      showMessage('');
      clearFieldError(nameInput, nameError);
      if (purchasePriceInput) clearFieldError(purchasePriceInput, purchasePriceError);
      clearFieldError(priceInput, priceError);

      const standardizedName = standardizeText(nameInput.value, 'name');
      const standardizedDescription = standardizeText(descriptionInput.value, 'description');
      nameInput.value = standardizedName;
      descriptionInput.value = standardizedDescription;

      const productType = getSelectedProductType();
      const payload = {
        name: standardizedName,
        description: standardizedDescription,
        purchase_price: purchasePriceInput ? parsePrice(purchasePriceInput.value) : null,
        price: parsePrice(priceInput.value),
        status: statusSelect.value,
        statusProduto: statusSelect.value,
        productType,
      };
      if (window.SGVC && window.SGVC.stockFields) Object.assign(payload, window.SGVC.stockFields.read(document.getElementById('edit-form'), { editing: true }));
      if (!validateName(payload.name)) {
        setFieldError(nameInput, nameError, 'Nome deve ter 3 a 120 caracteres.');
        return;
      }
      if (productType === 'produced') {
        const recipe = state.linkedRecipe || getSelectedRecipe();
        if (!recipe) {
          if (recipeError) {
            recipeError.textContent = 'Selecione e vincule uma ficha t\u00e9cnica.';
            recipeError.hidden = false;
          }
          if (recipeSelect) {
            recipeSelect.classList.add('is-danger');
            recipeSelect.focus();
          }
          return;
        }
        updateProducedPricing();
        payload.purchase_price = null;
        payload.price = parsePrice(priceInput.value);
        if (payload.price == null) {
          setFieldError(priceInput, priceError, 'Informe o pre\u00e7o de venda.');
          return;
        }
      } else {
        if (purchasePriceInput && payload.purchase_price == null) {
          setFieldError(purchasePriceInput, purchasePriceError, 'Informe o pre\u00e7o de compra.');
          return;
        }
        if (payload.price == null) {
          setFieldError(priceInput, priceError, 'Informe o pre\u00e7o de venda.');
          return;
        }
      }

      saveBtn.classList.add('is-loading');
      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Salvando...';
      try {
        await apiRequest(`/api/products/${productId}`, null, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (window.SGVC && window.SGVC.customFields) await window.SGVC.customFields.save('product', productId, document.getElementById('edit-form'));
        if (window.SGVC && window.SGVC.stockFields) window.SGVC.stockFields.rebase(document.getElementById('edit-form'));
        showMessage('Produto atualizado.', 'is-success');
        sessionStorage.setItem(UPDATED_FLAG, 'true');
        state.original = {
          name: payload.name,
          description: payload.description,
          purchasePrice: purchasePriceInput ? formatCurrency(payload.purchase_price) : '',
          price: formatCurrency(payload.price),
          status: payload.status,
          recipeId: recipeSelect ? recipeSelect.value : '',
          finalPrice: finalPriceInput ? finalPriceInput.value.trim() : '',
          productType,
        };
        if (purchasePriceInput) purchasePriceInput.value = state.original.purchasePrice;
        priceInput.value = state.original.price;
        updateDirtyState();
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        saveBtn.classList.remove('is-loading');
        saveBtn.textContent = originalText;
        updateDirtyState();
      }
    });
  }
}
