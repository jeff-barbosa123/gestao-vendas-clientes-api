/**
 * Eventos dos campos: validação, máscaras e estado de alteração.
 */
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
  cnpjInput,
  editAddressComplement,
  editCpf,
  editCpfError,
  editTradeName,
  editType,
  emailError,
  emailInput,
  nameError,
  nameInput,
  notesInput,
  phoneError,
  phoneInput,
} from './dom.js';
import { apiRequest, clearFieldError, setFieldError } from './core.js';
import {
  formatCnpj,
  formatCpf,
  formatPhone,
  formatPostal,
  updateWhatsAppLink,
} from './formatters.js';
import {
  getAddressNumberValidationError,
  getAddressStreetValidationError,
  normalizeText,
  updateEditBirthHint,
  validateBirthDate,
  validateCnpj,
  validateCpf,
  validateEmail,
  validateName,
  validatePhone,
} from './validators.js';
import { setEditMetaValue, updateEditTypeFields } from './notes-meta.js';
import { applyCnpjData, setCnpjMessage } from './cnpj.js';
import { updateDirtyState } from './dirty.js';

export function initEventsFields() {
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      if (validateName(nameInput.value)) {
        clearFieldError(nameInput, nameError);
      }
      updateDirtyState();
    });
    nameInput.addEventListener('blur', () => {
      if (!validateName(nameInput.value)) {
        setFieldError(
          nameInput,
          nameError,
          'Nome deve ter 3 a 120 letras, sem números.'
        );
      }
    });
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      if (!emailInput.value.trim() || validateEmail(emailInput.value.trim())) {
        clearFieldError(emailInput, emailError);
      }
      updateDirtyState();
    });
    emailInput.addEventListener('blur', () => {
      const value = emailInput.value.trim();
      if (!value) return;
      if (!validateEmail(value)) {
        setFieldError(emailInput, emailError, 'Digite um e-mail válido.');
      }
    });
  }

  if (cnpjInput) {
    cnpjInput.addEventListener('input', () => {
      cnpjInput.value = formatCnpj(cnpjInput.value);
      setCnpjMessage('', true);
      updateDirtyState();
    });
    cnpjInput.addEventListener('blur', async () => {
      const value = cnpjInput.value.trim();
      if (!value) {
        setCnpjMessage('', true);
        return;
      }
      if (!validateCnpj(value)) {
        setCnpjMessage('CNPJ inválido.', true);
        return;
      }
      try {
        const data = await apiRequest(`/api/cnpj/${value.replace(/\D/g, '')}`, null);
        applyCnpjData(data);
        setCnpjMessage('Dados preenchidos a partir do CNPJ.', false);
      } catch (err) {
        if (err.status === 404) {
          setCnpjMessage('CNPJ não encontrado.', true);
          return;
        }
        setCnpjMessage('Não foi possível consultar o CNPJ agora.', true);
      }
      updateDirtyState();
    });
  }

  if (editType) {
    editType.addEventListener('change', () => {
      const value = editType.value;
      updateEditTypeFields(value);
      updateDirtyState();
    });
    updateEditTypeFields(editType.value);
  }

  if (editTradeName) {
    editTradeName.addEventListener('input', () => {
      setEditMetaValue('tradeName', editTradeName.value);
      updateDirtyState();
    });
    editTradeName.addEventListener('blur', () => {
      editTradeName.value = normalizeText(editTradeName.value);
      setEditMetaValue('tradeName', editTradeName.value);
      updateDirtyState();
    });
  }

  if (editAddressComplement) {
    editAddressComplement.addEventListener('input', () => {
      setEditMetaValue('complement', editAddressComplement.value);
      updateDirtyState();
    });
  }

  if (editCpf) {
    editCpf.addEventListener('input', () => {
      editCpf.value = formatCpf(editCpf.value);
      updateDirtyState();
    });
    editCpf.addEventListener('blur', () => {
      const value = editCpf.value.trim();
      if (value && !validateCpf(value)) {
        setFieldError(editCpf, editCpfError, 'CPF inválido.');
      } else {
        clearFieldError(editCpf, editCpfError);
      }
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener('blur', () => {
      phoneInput.value = formatPhone(phoneInput.value);
      if (!phoneInput.value.trim() || validatePhone(phoneInput.value)) {
        clearFieldError(phoneInput, phoneError);
      } else {
        setFieldError(phoneInput, phoneError, 'Digite um telefone com DDD (10 ou 11 dígitos).');
      }
      updateWhatsAppLink(phoneInput.value);
      updateDirtyState();
    });
    phoneInput.addEventListener('input', () => {
      if (!phoneInput.value.trim() || validatePhone(phoneInput.value)) {
        clearFieldError(phoneInput, phoneError);
      }
      updateWhatsAppLink(phoneInput.value);
      updateDirtyState();
    });
  }

  if (birthDateInput) {
    birthDateInput.addEventListener('blur', () => {
      if (!validateBirthDate(birthDateInput.value)) {
        setFieldError(birthDateInput, birthDateError, 'Data de nascimento inválida.');
        updateEditBirthHint('');
      } else {
        clearFieldError(birthDateInput, birthDateError);
        updateEditBirthHint(birthDateInput.value);
      }
      updateDirtyState();
    });
    birthDateInput.addEventListener('input', () => {
      if (validateBirthDate(birthDateInput.value)) {
        clearFieldError(birthDateInput, birthDateError);
        updateEditBirthHint(birthDateInput.value);
      } else {
        updateEditBirthHint('');
      }
      updateDirtyState();
    });
  }

  [addressStreetInput, addressNumberInput, addressNeighborhoodInput, addressCityInput, addressPostalInput, notesInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => updateDirtyState());
  });

  if (addressStreetInput) {
    addressStreetInput.addEventListener('blur', () => {
      const rawValue = addressStreetInput.value;
      const error = getAddressStreetValidationError(rawValue);
      addressStreetInput.value = normalizeText(rawValue);
      if (error) {
        setFieldError(addressStreetInput, addressStreetError, error);
      } else {
        clearFieldError(addressStreetInput, addressStreetError);
      }
      updateDirtyState();
    });
  }

  if (addressNumberInput) {
    addressNumberInput.addEventListener('blur', () => {
      addressNumberInput.value = addressNumberInput.value.trim();
      const error = getAddressNumberValidationError(addressNumberInput.value);
      if (error) {
        setFieldError(addressNumberInput, addressNumberError, error);
      } else {
        clearFieldError(addressNumberInput, addressNumberError);
      }
      updateDirtyState();
    });
  }

  if (addressPostalInput) {
    addressPostalInput.addEventListener('blur', () => {
      addressPostalInput.value = formatPostal(addressPostalInput.value);
      updateDirtyState();
    });
  }
}
