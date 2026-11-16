/**
 * Carga do produto e preenchimento do formulário.
 */
import { productId } from './constants.js';
import {
  descriptionInput,
  editResalePercent,
  finalPriceInput,
  nameHelp,
  nameInput,
  priceInput,
  productTypeProduced,
  productTypeResale,
  purchasePriceInput,
  statusSelect,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, showMessage } from './core.js';
import { updateNameGuidance } from './text.js';
import { formatCurrency, resolveNumber } from './money.js';
import { setProductType } from './product-type.js';
import { syncPercentFromPrice, updateResalePercentHelp } from './pricing.js';
import { updateDirtyState } from './dirty.js';
import { loadLinkedRecipe } from './linked-recipe.js';

export function initLoad() {
  apiRequest(`/api/products/${productId}`, null)
    .then((product) => {
      const priceValue = resolveNumber(
        product.price,
        product.precoVenda,
        product.preco,
        product.priceFinal,
        product.preco_final
      );
      const purchaseValue = resolveNumber(
        product.purchase_price,
        product.precoCompra,
        product.purchasePrice,
        product.preco_compra
      );
      const typeValue = (product.productType || product.product_type || '').toString().toLowerCase();
      const hasRecipe = Boolean(product.fichaTecnicaId || product.ficha_tecnica_id);
      const isProduced = typeValue === 'produced' ? true : typeValue === 'resale' ? false : hasRecipe;
      nameInput.value = product.name || '';
      descriptionInput.value = product.description || '';
      updateNameGuidance(nameInput, nameHelp);
      if (purchasePriceInput) {
        purchasePriceInput.value = purchaseValue != null ? formatCurrency(purchaseValue) : '';
      }
      priceInput.value = priceValue != null ? formatCurrency(priceValue) : '';
      statusSelect.value = (product.status || product.status_produto || 'ATIVO').toUpperCase();
      if (productTypeProduced) productTypeProduced.checked = isProduced;
      if (productTypeResale) productTypeResale.checked = !isProduced;
      setProductType(isProduced ? 'produced' : 'resale');
      if (!isProduced && editResalePercent) {
        updateResalePercentHelp();
        syncPercentFromPrice();
      }
      state.original = {
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
        purchasePrice: purchasePriceInput ? purchasePriceInput.value.trim() : '',
        price: priceInput.value.trim(),
        status: statusSelect.value,
        recipeId: product.fichaTecnicaId || product.ficha_tecnica_id || '',
        finalPrice: finalPriceInput ? finalPriceInput.value.trim() : '',
        productType: isProduced ? 'produced' : 'resale',
      };
      updateDirtyState();
      loadLinkedRecipe(null, productId);
    })
    .catch((err) => {
      showMessage(err.message, 'is-danger');
    });
}
