/**
 * Tela de edição de cliente (entrada). MÃ³dulos em /client-edit/*.js.
 */
import { DELETE_FLAG, UPDATED_FLAG, params, safeValue } from './client-edit/constants.js';
import {
  addressCityInput,
  addressNeighborhoodInput,
  addressNumberError,
  addressNumberInput,
  addressPostalInput,
  addressStreetError,
  addressStreetInput,
  backBtn,
  birthDateError,
  birthDateInput,
  cancelEditBtn,
  cnpjError,
  cnpjInput,
  cnpjSuccess,
  deleteBtn,
  deleteCancel,
  deleteClose,
  deleteCloseBtn,
  deleteConfirm,
  deleteModal,
  editAddressComplement,
  editCpf,
  editCpfError,
  editTradeName,
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
  tradeChipLabel,
  tradeChipRow,
} from './client-edit/dom.js';
import { state } from './client-edit/state.js';
import {
  apiRequest,
  clearFieldError,
  closeDeleteModal,
  ensureAuthOrRedirect,
  navigateToClientList,
  setFieldError,
  showMessage,
  toggleDeleteModal,
} from './client-edit/core.js';
import {
  formatCnpj,
  formatCpf,
  formatPhone,
  formatPostal,
  updateWhatsAppLink,
} from './client-edit/formatters.js';
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
} from './client-edit/validators.js';
import {
  buildNotesWithMeta,
  parseNotesMeta,
  setEditMetaValue,
  updateEditTypeFields,
} from './client-edit/notes-meta.js';

function setCnpjMessage(message, isError) {
  if (cnpjError) {
    cnpjError.textContent = isError ? message : '';
    cnpjError.hidden = !isError;
  }
  if (cnpjSuccess) {
    cnpjSuccess.textContent = !isError ? message : '';
    cnpjSuccess.hidden = isError || !message;
  }
}

function showTradeChip(tradeName) {
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

function applyCnpjData(data) {
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

function updateDirtyState() {
  if (!saveBtn) return;
  const current = {
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
  const isDirty =
    current.name !== state.original.name ||
    current.email !== state.original.email ||
    current.cnpj !== state.original.cnpj ||
    current.phone !== state.original.phone ||
    current.type !== state.original.type ||
    current.cpf !== state.original.cpf ||
    current.birthDate !== state.original.birthDate ||
    current.addressStreet !== state.original.addressStreet ||
    current.addressNumber !== state.original.addressNumber ||
    current.addressNeighborhood !== state.original.addressNeighborhood ||
    current.addressCity !== state.original.addressCity ||
    current.addressPostalCode !== state.original.addressPostalCode ||
    current.tradeName !== state.original.tradeName ||
    current.complement !== state.original.complement ||
    current.notes !== state.original.notes;
  saveBtn.disabled = !isDirty;
}

// Auth via cookie HttpOnly
ensureAuthOrRedirect();

state.customerId = params.get('id');

function bootstrap() {
  if (!state.customerId) {
    // Se não houver ID, redirecionar para a lista de clientes
    console.warn('[CLIENT-EDIT] ID do cliente não fornecido. Redirecionando para /clients.html');
    window.location.href = '/clients.html';
    return;
  }

  if (window.UnsavedChangesGuard && form) {
    state.unsavedGuard = new window.UnsavedChangesGuard('#edit-form');
  }

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

  if (backBtn) {
    backBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateToClientList();
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateToClientList();
    });
  }

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

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      toggleDeleteModal(true);
    });
  }

  [deleteCloseBtn, deleteCancel].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => toggleDeleteModal(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal && deleteModal.classList.contains('is-active')) {
      event.preventDefault();
      toggleDeleteModal(false);
    }
  });

  if (deleteConfirm) {
    deleteConfirm.addEventListener('click', async (event) => {
      event.preventDefault();
      deleteConfirm.classList.add('is-loading');
      deleteConfirm.disabled = true;
      try {
        await apiRequest(`/api/customers/${state.customerId}`, null, {
          method: 'DELETE',
        });
        sessionStorage.setItem(DELETE_FLAG, 'true');
        showMessage('Cliente removido com sucesso.', 'is-success');
        setTimeout(() => {
          navigateToClientList();
        }, 500);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        deleteConfirm.classList.remove('is-loading');
        deleteConfirm.disabled = false;
        toggleDeleteModal(false);
      }
    });
  }

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

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/clients.html';
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      if (saveBtn && !saveBtn.disabled) {
        const shouldCancel = window.confirm('Você tem alterações não salvas. Deseja realmente cancelar?');
        if (!shouldCancel) return;
      }
      window.location.href = '/clients.html';
    });
  }

  if (deleteClose) {
    deleteClose.addEventListener('click', closeDeleteModal);
  }

  if (deleteCloseBtn) {
    deleteCloseBtn.addEventListener('click', closeDeleteModal);
  }

  if (deleteCancel) {
    deleteCancel.addEventListener('click', closeDeleteModal);
  }

  // Fechar modal com ESC
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal && deleteModal.classList.contains('is-active')) {
      closeDeleteModal();
    }
  });
}

bootstrap();
