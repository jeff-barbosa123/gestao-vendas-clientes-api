/**
 * Consulta de CNPJ: mensagem, chip de nome fantasia e preenchimento de dados.
 */
import {
  addressCityInput,
  addressNeighborhoodInput,
  addressNumberInput,
  addressPostalInput,
  addressStreetInput,
  cnpjError,
  cnpjSuccess,
  editTradeName,
  editType,
  nameInput,
  phoneInput,
  tradeChipLabel,
  tradeChipRow,
} from './dom.js';
import { formatPhone, formatPostal, updateWhatsAppLink } from './formatters.js';
import { normalizeText } from './validators.js';
import { setEditMetaValue, updateEditTypeFields } from './notes-meta.js';

export function setCnpjMessage(message, isError) {
  if (cnpjError) {
    cnpjError.textContent = isError ? message : '';
    cnpjError.hidden = !isError;
  }
  if (cnpjSuccess) {
    cnpjSuccess.textContent = !isError ? message : '';
    cnpjSuccess.hidden = isError || !message;
  }
}

export function showTradeChip(tradeName) {
  if (!tradeChipRow || !tradeChipLabel) return;
  const value = String(tradeName || '').trim();
  if (!value) {
    tradeChipRow.hidden = true;
    tradeChipLabel.textContent = '';
    return;
  }
  tradeChipLabel.textContent = `Nome fantasia: ${value}`;
  tradeChipRow.hidden = false;
}

export function applyCnpjData(data) {
  if (!data) return;
  if (nameInput && data.name) nameInput.value = normalizeText(data.name);
  if (phoneInput && data.phone) phoneInput.value = formatPhone(data.phone);
  if (addressStreetInput && data.addressStreet) {
    addressStreetInput.value = normalizeText(data.addressStreet);
  }
  if (addressNumberInput && data.addressNumber) {
    addressNumberInput.value = data.addressNumber;
  }
  if (addressNeighborhoodInput && data.addressNeighborhood) {
    addressNeighborhoodInput.value = normalizeText(data.addressNeighborhood);
  }
  if (addressCityInput && data.addressCity) {
    addressCityInput.value = normalizeText(data.addressCity);
  }
  if (addressPostalInput && data.addressPostalCode) {
    addressPostalInput.value = formatPostal(data.addressPostalCode);
  }
  if (data.tradeName) {
    const normalizedTrade = normalizeText(data.tradeName);
    if (editTradeName) editTradeName.value = normalizedTrade;
    setEditMetaValue('tradeName', normalizedTrade);
    showTradeChip(normalizedTrade);
  }
  if (editType) {
    editType.value = 'PJ';
    updateEditTypeFields('PJ');
  }
  updateWhatsAppLink(phoneInput ? phoneInput.value : '');
}
