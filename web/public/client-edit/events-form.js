/**
 * Eventos do formulário: envio da edição.
 */
import { UPDATED_FLAG } from './constants.js';
import {
  addressCityInput,
  addressNeighborhoodInput,
  addressNumberError,
  addressNumberInput,
  addressPostalInput,
  addressStreetError,
  addressStreetInput,
  birthDateError,
  birthDateInput,
  cnpjError,
  cnpjInput,
  editCpf,
  editCpfError,
  editType,
  emailError,
  emailInput,
  form,
  nameError,
  nameInput,
  notesInput,
  phoneError,
  phoneInput,
  saveBtn,
} from './dom.js';
import { state } from './state.js';
import {
  apiRequest,
  clearFieldError,
  navigateToClientList,
  setFieldError,
  showMessage,
} from './core.js';
import {
  getAddressNumberValidationError,
  getAddressStreetValidationError,
  normalizeText,
  validateBirthDate,
  validateCnpj,
  validateCpf,
  validateEmail,
  validateName,
  validatePhone,
} from './validators.js';
import { buildNotesWithMeta } from './notes-meta.js';
import { updateDirtyState } from './dirty.js';

export function initEventsForm() {
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      showMessage('');
      clearFieldError(nameInput, nameError);
      clearFieldError(emailInput, emailError);
      clearFieldError(phoneInput, phoneError);
      clearFieldError(birthDateInput, birthDateError);
      clearFieldError(cnpjInput, cnpjError);
      clearFieldError(addressStreetInput, addressStreetError);
      clearFieldError(addressNumberInput, addressNumberError);

      const typeValue = editType ? editType.value.trim().toUpperCase() : '';
      const cpfDigits = (() => {
        if (typeValue === 'PF' && editCpf) {
          const digits = editCpf.value.replace(/\D/g, '');
          return digits ? digits : null;
        }
        return null;
      })();
      const cnpjDigits = (() => {
        if (typeValue === 'PJ' && cnpjInput) {
          const digits = cnpjInput.value.replace(/\D/g, '');
          return digits ? digits : null;
        }
        return null;
      })();
      if (typeValue === 'PJ' && !cnpjDigits) {
        setFieldError(cnpjInput, cnpjError, 'CNPJ obrigatório para pessoa jurídica.');
        return;
      }
      const streetRaw = addressStreetInput ? addressStreetInput.value : '';
      const streetError = getAddressStreetValidationError(streetRaw);
      if (streetError) {
        setFieldError(addressStreetInput, addressStreetError, streetError);
        return;
      }
      if (addressStreetInput) {
        addressStreetInput.value = normalizeText(streetRaw);
      }
      const numberRaw = addressNumberInput ? addressNumberInput.value : '';
      const numberError = getAddressNumberValidationError(numberRaw);
      if (numberError) {
        setFieldError(addressNumberInput, addressNumberError, numberError);
        return;
      }
      if (addressNumberInput) {
        addressNumberInput.value = numberRaw.trim();
      }
      const notesPayload = buildNotesWithMeta(notesInput ? notesInput.value : '', state.editMeta);
      const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        birthDate: birthDateInput ? birthDateInput.value : '',
        addressStreet: addressStreetInput ? addressStreetInput.value.trim() : '',
        addressNumber: addressNumberInput ? addressNumberInput.value.trim() : '',
        addressNeighborhood: addressNeighborhoodInput ? addressNeighborhoodInput.value.trim() : '',
        addressCity: addressCityInput ? addressCityInput.value.trim() : '',
        addressPostalCode: addressPostalInput ? addressPostalInput.value.trim() : '',
        notes: notesPayload,
      };
      // Incluir CPF ou CNPJ conforme o tipo
      if (typeValue === 'PF' && cpfDigits) {
        payload.cpf = cpfDigits;
        payload.cnpj = null; // Limpa CNPJ se existir
      } else if (typeValue === 'PJ' && cnpjDigits) {
        payload.cnpj = cnpjDigits;
        payload.cpf = null; // Limpa CPF se existir
      } else if (!typeValue) {
        // Se não há tipo definido, manter o que já existe ou enviar ambos se preenchidos
        if (cpfDigits) payload.cpf = cpfDigits;
        if (cnpjDigits) payload.cnpj = cnpjDigits;
      }
      const originalCnpjDigits = state.original.cnpj ? state.original.cnpj.replace(/\D/g, '') : '';
      const originalCpfDigits = state.original.cpf ? state.original.cpf.replace(/\D/g, '') : '';
      const cnpjChanged = cnpjDigits !== originalCnpjDigits;
      const cpfChanged = cpfDigits !== originalCpfDigits;
      if (!validateName(payload.name)) {
        setFieldError(nameInput, nameError, 'Nome deve ter 3 a 120 caracteres.');
        return;
      }
      if (!payload.email) {
        setFieldError(emailInput, emailError, 'E-mail obrigatório.');
        return;
      }
      if (!validateEmail(payload.email)) {
        setFieldError(emailInput, emailError, 'Digite um e-mail válido.');
        return;
      }
      if (cpfDigits && cpfChanged && !validateCpf(cpfDigits)) {
        setFieldError(editCpf, editCpfError, 'CPF inválido.');
        return;
      }
      if (cnpjDigits && cnpjChanged && !validateCnpj(cnpjDigits)) {
        setFieldError(cnpjInput, cnpjError, 'CNPJ inválido.');
        return;
      }
      if (payload.phone && !validatePhone(payload.phone)) {
        setFieldError(phoneInput, phoneError, 'Digite um telefone com DDD (10 ou 11 dígitos).');
        return;
      }
      if (!validateBirthDate(payload.birthDate)) {
        setFieldError(birthDateInput, birthDateError, 'Data de nascimento inválida.');
        return;
      }
      saveBtn.classList.add('is-loading');
      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Salvando...';
      try {
        await apiRequest(`/api/customers/${state.customerId}`, null, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (window.SGVC && window.SGVC.customFields) await window.SGVC.customFields.save('customer', state.customerId, document.getElementById('edit-form'));
        showMessage('Cliente atualizado com sucesso!', 'is-success');
        sessionStorage.setItem(UPDATED_FLAG, 'true');
        // Atualiza o objeto original com os valores salvos
        state.original = {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          birthDate: payload.birthDate,
          addressStreet: payload.addressStreet,
          addressNumber: payload.addressNumber,
          addressNeighborhood: payload.addressNeighborhood,
          addressCity: payload.addressCity,
          addressPostalCode: payload.addressPostalCode,
          notes: payload.notes,
          cpf: payload.cpf || '',
          cnpj: payload.cnpj || '',
          type: typeValue || '',
          tradeName: state.editMeta.tradeName || '',
          complement: state.editMeta.complement || '',
        };
        updateDirtyState();
        // Redireciona para a lista após salvar com sucesso
        setTimeout(() => {
          navigateToClientList();
        }, 1000);
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
