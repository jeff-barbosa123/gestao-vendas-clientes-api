/**
 * Carga do cliente e preenchimento do formulário.
 */
import { safeValue } from './constants.js';
import {
  addressCityInput,
  addressNeighborhoodInput,
  addressNumberInput,
  addressPostalInput,
  addressStreetInput,
  birthDateInput,
  cnpjInput,
  editAddressComplement,
  editCpf,
  editTradeName,
  editType,
  emailInput,
  nameInput,
  notesInput,
  phoneInput,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, showMessage } from './core.js';
import { formatCnpj, updateWhatsAppLink } from './formatters.js';
import { updateEditBirthHint } from './validators.js';
import { parseNotesMeta, updateEditTypeFields } from './notes-meta.js';
import { showTradeChip } from './cnpj.js';
import { updateDirtyState } from './dirty.js';

export function initLoad() {
  // Carregar dados do cliente apenas se a sessão for válida
  apiRequest(`/api/customers/${state.customerId}`, null)
    .then((customer) => {
      if (!customer) {
        console.error('[CLIENT-EDIT] Cliente não encontrado');
        showMessage('Cliente não encontrado.', 'is-danger');
        setTimeout(() => {
          window.location.href = '/clients.html';
        }, 2000);
        return;
      }
      
      const safeName = safeValue(customer.name);
      if (nameInput) nameInput.value = safeName;
      const safeEmail = safeValue(customer.email);
      if (emailInput) emailInput.value = safeEmail;
      const safePhone = safeValue(customer.phone);
      if (phoneInput) phoneInput.value = safePhone;
      if (birthDateInput) {
        const birthValue = safeValue(customer.birth_date, customer.birthDate);
        birthDateInput.value = birthValue;
        updateEditBirthHint(birthValue);
      }
      if (addressStreetInput) {
        addressStreetInput.value = safeValue(customer.address_street, customer.addressStreet);
      }
      if (addressNumberInput) {
        addressNumberInput.value = safeValue(customer.address_number, customer.addressNumber);
      }
      if (addressNeighborhoodInput) {
        addressNeighborhoodInput.value = safeValue(
          customer.address_neighborhood,
          customer.addressNeighborhood
        );
      }
      if (addressCityInput) {
        addressCityInput.value = safeValue(customer.address_city, customer.addressCity);
      }
      if (addressPostalInput) {
        addressPostalInput.value = safeValue(customer.address_postal_code, customer.addressPostalCode);
      }
      if (cnpjInput) {
        const cnpjValue = safeValue(customer.cnpj);
        cnpjInput.value = cnpjValue ? formatCnpj(cnpjValue) : '';
      }
      const notesCandidate = safeValue(customer.notes, customer.note);
      const notesData = parseNotesMeta(notesCandidate);
      if (notesInput) notesInput.value = notesData.text || '';
      state.editMeta = {
        type: notesData.metadata.type || '',
        tradeName: notesData.metadata.tradeName || '',
        complement: notesData.metadata.complement || '',
      };
      if (editTradeName) editTradeName.value = state.editMeta.tradeName || '';
      if (editAddressComplement) editAddressComplement.value = state.editMeta.complement || '';
      if (editType) {
        editType.value = state.editMeta.type || '';
        updateEditTypeFields(editType.value);
      }
      showTradeChip(state.editMeta.tradeName || '');
      updateWhatsAppLink(phoneInput ? phoneInput.value : '');
      state.original = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        cnpj: cnpjInput ? cnpjInput.value.trim() : '',
        phone: phoneInput.value.trim(),
        type: editType ? editType.value : '',
        cpf: editCpf ? editCpf.value.trim() : '',
        birthDate: birthDateInput ? birthDateInput.value : '',
        addressStreet: addressStreetInput ? addressStreetInput.value.trim() : '',
        addressNumber: addressNumberInput ? addressNumberInput.value.trim() : '',
        addressNeighborhood: addressNeighborhoodInput ? addressNeighborhoodInput.value.trim() : '',
        addressCity: addressCityInput ? addressCityInput.value.trim() : '',
        addressPostalCode: addressPostalInput ? addressPostalInput.value.trim() : '',
        tradeName: editTradeName ? editTradeName.value.trim() : '',
        complement: editAddressComplement ? editAddressComplement.value.trim() : '',
        notes: notesInput ? notesInput.value.trim() : '',
      };
      updateDirtyState();
    })
    .catch((err) => {
      console.error('[CLIENT-EDIT] Erro ao carregar cliente:', err);
      
      // Se for erro de autenticação (401 ou 403), redirecionar para login
      if (err && (err.status === 401 || err.status === 403)) {
        console.warn('[CLIENT-EDIT] Sessão expirada ou sem permissão. Redirecionando para /');
        window.location.href = '/';
        return;
      }
      
      // Outros erros: mostrar mensagem e redirecionar para lista após 2 segundos
      showMessage(err.message || 'Erro ao carregar cliente. Tente novamente.', 'is-danger');
      setTimeout(() => {
        window.location.href = '/clients.html';
      }, 2000);
    });
}
