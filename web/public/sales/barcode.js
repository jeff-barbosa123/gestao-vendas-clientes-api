/**
 * Busca de produto por código de barras.
 */
import { state } from './state.js';
import { apiRequest, setInlineMessage } from './core.js';
import { getProductIdByName, setPriceFromProduct } from './catalog.js';
import { updateAddItemState } from '../sales.js';

export function showBarcodeMessage(el, text, type) {
  if (!el) return;
  setInlineMessage(el, text, type);
  if (state.barcodeMessageTimer) {
    clearTimeout(state.barcodeMessageTimer);
    state.barcodeMessageTimer = null;
  }
  if (text) {
    state.barcodeMessageTimer = setTimeout(() => {
      setInlineMessage(el, '');
    }, 6000);
  }
}

function normalizeBarcode(value) {
  return String(value || '').replace(/\D/g, '');
}

async function lookupBarcode(code, token) {
  try {
    return await apiRequest(`/api/barcodes/${code}`, token);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function handleBarcodeLookup(inputEl, messageEl, selectEl, qtyEl, priceEl, buttonEl, token) {
  if (!inputEl) return;
  const code = normalizeBarcode(inputEl.value);
  if (!code) {
    showBarcodeMessage(messageEl, '');
    return;
  }
  if (code.length < 8) {
    showBarcodeMessage(messageEl, 'Código de barras incompleto.', 'is-warning');
    return;
  }
  showBarcodeMessage(messageEl, 'Buscando produto pelo código de barras...', 'is-success');
  try {
    const data = await lookupBarcode(code, token);
    if (!data || (!data.name && !data.brand)) {
      showBarcodeMessage(messageEl, 'Produto não encontrado pelo código informado.', 'is-warning');
      return;
    }
    const displayName = data.name || data.brand;
    const productId = getProductIdByName(displayName);
    if (productId && selectEl) {
      selectEl.value = String(productId);
      setPriceFromProduct(selectEl, priceEl);
      updateAddItemState(selectEl, qtyEl, priceEl, buttonEl);
      showBarcodeMessage(messageEl, `Produto sugerido: ${displayName}. Selecionado automaticamente.`, 'is-success');
      return;
    }
    showBarcodeMessage(messageEl, `Produto sugerido: ${displayName}. Selecione manualmente.`, 'is-warning');
  } catch (_err) {
    showBarcodeMessage(messageEl, 'Não foi possível consultar o código agora.', 'is-warning');
  }
}
