/**
 * Tela de clientes (entrada). MÃ³dulos em /clients/*.js.
 */
import {
  CREATE_SUBMIT_SAVING_TEXT,
  DOCUMENT_CONFLICT_MESSAGE,
  session,
} from './clients/constants.js';
import {
  chipCity,
  chipUf,
  createAddressCity,
  createAddressCityError,
  createAddressComplement,
  createAddressNeighborhood,
  createAddressNeighborhoodError,
  createAddressNumber,
  createAddressNumberError,
  createAddressPostal,
  createAddressState,
  createAddressStateError,
  createAddressStreet,
  createAddressStreetError,
  createBirthDate,
  createBirthDateError,
  createBirthHint,
  createCnpj,
  createCnpjError,
  createCnpjField,
  createCpf,
  createCpfError,
  createCpfField,
  createEmail,
  createEmailError,
  createEmailSuggest,
  createEmailWarning,
  createForm,
  createName,
  createNameError,
  createNameLabelText,
  createNotes,
  createPhone,
  createPhoneError,
  createPhoneWhatsapp,
  createSubmit,
  createSubmitDefaultText,
  createTradeName,
  createTradeNameField,
  createType,
  filterButtons,
  locationChips,
  searchInput,
} from './clients/dom.js';
import { state } from './clients/state.js';
import {
  apiRequest,
  buildUrl,
  clearFieldError,
  handleAuthFailure,
  normalizeError,
  requireAuth,
  setFieldError,
  showMessage,
} from './clients/core.js';
import {
  getAddressCityValidationError,
  getAddressNeighborhoodValidationError,
  getAddressNumberValidationError,
  getAddressStateValidationError,
  getAddressStreetValidationError,
  getBirthDateValidationError,
  getCepValidationError,
  getEmailSuggestion,
  getEmailValidationError,
  getEmailWarning,
  getNameValidationError,
  getPhoneValidationError,
  sanitizeEmailInput,
  validateBirthDate,
  validateCnpj,
  validateCpf,
  validateName,
} from './clients/validators.js';
import {
  buildBirthHint,
  buildNotesWithMeta,
  formatCnpj,
  formatCpf,
  formatPhone,
  formatPostal,
  normalizeDigits,
  normalizeText,
} from './clients/formatters.js';
import {
  fillCnpjFromServer,
  loadCities,
  loadStates,
  lookupCep,
  resetCityOptions,
  setCepStatus,
  setCnpjMessage,
} from './clients/lookups.js';
import { handlePostNavigationFlags, initList, loadCustomers, renderPage } from './clients/list.js';

updateWhatsAppLink(createPhone ? createPhone.value : '');

function getCreateSnapshot() {
  return {
    name: createName ? createName.value.trim() : '',
    email: createEmail ? createEmail.value.trim() : '',
    type: createType ? createType.value.trim() : '',
    cpf: createCpf ? createCpf.value.trim() : '',
    cnpj: createCnpj ? createCnpj.value.trim() : '',
    phone: createPhone ? createPhone.value.trim() : '',
    birthDate: createBirthDate ? createBirthDate.value : '',
    addressStreet: createAddressStreet ? createAddressStreet.value.trim() : '',
    addressNumber: createAddressNumber ? createAddressNumber.value.trim() : '',
    addressComplement: createAddressComplement ? createAddressComplement.value.trim() : '',
    addressNeighborhood: createAddressNeighborhood ? createAddressNeighborhood.value.trim() : '',
    addressCity: createAddressCity ? createAddressCity.value.trim() : '',
    addressPostalCode: createAddressPostal ? createAddressPostal.value.trim() : '',
    tradeName: createTradeName ? createTradeName.value.trim() : '',
    notes: createNotes ? createNotes.value.trim() : '',
  };
}

function hasDocumentConflict(cpfDigits, cnpjDigits) {
  return Boolean(cpfDigits && cnpjDigits);
}

function handleDocumentConflict() {
  const cpfDigits = normalizeDigits(createCpf ? createCpf.value : '');
  const cnpjDigits = normalizeDigits(createCnpj ? createCnpj.value : '');
  const conflict = hasDocumentConflict(cpfDigits, cnpjDigits);
  if (conflict) {
    if (createCpf) setFieldError(createCpf, createCpfError, DOCUMENT_CONFLICT_MESSAGE);
    if (createCnpj) setFieldError(createCnpj, createCnpjError, DOCUMENT_CONFLICT_MESSAGE);
    return true;
  }
  if (createCpf && createCpfError && createCpfError.textContent === DOCUMENT_CONFLICT_MESSAGE) {
    clearFieldError(createCpf, createCpfError);
  }
  if (createCnpj && createCnpjError && createCnpjError.textContent === DOCUMENT_CONFLICT_MESSAGE) {
    clearFieldError(createCnpj, createCnpjError);
  }
  return false;
}

function isCreateFormValid(snapshot = getCreateSnapshot()) {
  const normalizedName = normalizeText(snapshot.name);
  if (!validateName(normalizedName)) return false;
  const emailError = getEmailValidationError(snapshot.email || '');
  if (emailError) return false;
  const birthError = getBirthDateValidationError(snapshot.birthDate || '');
  if (birthError) return false;
  const phoneError = getPhoneValidationError(snapshot.phone || '');
  if (phoneError) return false;
  const streetError = getAddressStreetValidationError(snapshot.addressStreet || '');
  if (streetError) return false;
  const numberError = getAddressNumberValidationError(snapshot.addressNumber || '');
  if (numberError) return false;
  const neighborhoodError = getAddressNeighborhoodValidationError(
    snapshot.addressNeighborhood || ''
  );
  if (neighborhoodError) return false;
  const stateError = getAddressStateValidationError(snapshot.addressState || '');
  if (stateError) return false;
  const cityError = getAddressCityValidationError(
    snapshot.addressCity || '',
    snapshot.addressState || ''
  );
  if (cityError) return false;
  const cepError = getCepValidationError(snapshot.addressPostalCode || '');
  if (cepError) return false;
  const cpfDigits = normalizeDigits(snapshot.cpf);
  const cnpjDigits = normalizeDigits(snapshot.cnpj);
  if (hasDocumentConflict(cpfDigits, cnpjDigits)) return false;
  if (cpfDigits && !validateCpf(cpfDigits)) return false;
  if (cnpjDigits && !validateCnpj(cnpjDigits)) return false;
  return true;
}

state.createInitialState = getCreateSnapshot();

prioritizeFormTabOrder();

updateCreateButtonState(false, state.createInitialState);

function prioritizeFormTabOrder() {
  if (!createType) return;
  let handled = false;
  const listener = (event) => {
    if (
      handled ||
      event.key !== 'Tab' ||
      event.shiftKey ||
      event.altKey ||
      event.metaKey
    ) {
      return;
    }
    const active = document.activeElement;
    // Se o foco está no body, documentElement, ou em elementos do header (antes do formulário)
    const isBeforeForm = active === document.body || 
                        active === document.documentElement || 
                        !active ||
                        (active.closest && active.closest('.clients-header'));
    
    if (isBeforeForm) {
      event.preventDefault();
      createType.focus();
      handled = true;
      document.removeEventListener('keydown', listener, true);
    }
  };
  document.addEventListener('keydown', listener, true);
}

function showEmailSuggest(suggestion) {
  if (!createEmailSuggest) return;
  createEmailSuggest.textContent = '';
  const value = String(suggestion || '').trim();
  if (!value) {
    createEmailSuggest.hidden = true;
    return;
  }
  const prefix = document.createElement('span');
  prefix.textContent = 'Quis dizer ';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'clients-email-chip';
  btn.dataset.email = value;
  btn.textContent = value;
  const suffix = document.createElement('span');
  suffix.textContent = '?';
  createEmailSuggest.appendChild(prefix);
  createEmailSuggest.appendChild(btn);
  createEmailSuggest.appendChild(suffix);
  createEmailSuggest.hidden = false;
}

function showEmailWarning(text) {
  if (!createEmailWarning) return;
  createEmailWarning.textContent = text || '';
  createEmailWarning.hidden = !text;
}

export function updateWhatsAppLink(value) {
  if (!createPhoneWhatsapp) return;
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 11) {
    createPhoneWhatsapp.href = '#';
    createPhoneWhatsapp.setAttribute('aria-disabled', 'true');
    createPhoneWhatsapp.classList.add('is-disabled');
    return;
  }
  const phone = `55${digits}`;
  createPhoneWhatsapp.href = `https://wa.me/${phone}`;
  createPhoneWhatsapp.setAttribute('aria-disabled', 'false');
  createPhoneWhatsapp.classList.remove('is-disabled');
}

function toggleConditionalField(element, shouldShow) {
  if (!element) return;
  element.classList.toggle('is-hidden', !shouldShow);
  element.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  const focusables = element.querySelectorAll('input, select, textarea, button, a');
  focusables.forEach((focusable) => {
    if ('disabled' in focusable) {
      focusable.disabled = !shouldShow;
    }
    if (typeof focusable.tabIndex === 'number') {
      focusable.tabIndex = shouldShow ? 0 : -1;
    }
  });
}

function resetCpfField() {
  if (!createCpf) return;
  createCpf.value = '';
  clearFieldError(createCpf, createCpfError);
}

function resetCnpjField() {
  if (!createCnpj) return;
  createCnpj.value = '';
  clearFieldError(createCnpj, createCnpjError);
  setCnpjMessage('', true);
}

export function updateCreateTypeFields(type) {
  const normalized = String(type || '').trim().toUpperCase();
  const showCpf = normalized === 'PF';
  const showCnpj = normalized === 'PJ';
  toggleConditionalField(createCpfField, showCpf);
  toggleConditionalField(createTradeNameField, showCnpj);
  toggleConditionalField(createCnpjField, showCnpj);
  if (createNameLabelText) {
    if (normalized === 'PF') createNameLabelText.textContent = 'Nome da pessoa';
    else if (normalized === 'PJ') createNameLabelText.textContent = 'Razão social';
    else createNameLabelText.textContent = 'Nome';
  }
  if (showCpf) {
    resetCnpjField();
  } else if (showCnpj) {
    resetCpfField();
  } else {
    resetCpfField();
    resetCnpjField();
  }
  setCreateMetaValue('type', normalized);
}

export function setCreateMetaValue(key, value) {
  if (!key) return;
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    delete state.createMeta[key];
    return;
  }
  state.createMeta[key] = trimmed;
}

function updateBirthHint(value) {
  if (!createBirthHint) return;
  if (!validateBirthDate(value)) {
    createBirthHint.textContent = '';
    createBirthHint.hidden = true;
    return;
  }
  const hint = buildBirthHint(value);
  createBirthHint.textContent = hint;
  createBirthHint.hidden = !hint;
}

export function updateLocationChips() {
  if (!locationChips || !chipUf || !chipCity) return;
  const ufValue = createAddressState ? createAddressState.value.trim().toUpperCase() : '';
  const cityValue = createAddressCity ? createAddressCity.value.trim() : '';
  if (!ufValue && !cityValue) {
    locationChips.hidden = true;
    chipUf.textContent = '';
    chipCity.textContent = '';
    return;
  }
  if (ufValue) {
    chipUf.textContent = `UF ${ufValue}`;
    chipUf.hidden = false;
  } else {
    chipUf.textContent = '';
    chipUf.hidden = true;
  }
  if (cityValue) {
    chipCity.textContent = normalizeText(cityValue);
    chipCity.hidden = false;
  } else {
    chipCity.textContent = '';
    chipCity.hidden = true;
  }
  locationChips.hidden = false;
}

initList();

requireAuth()
  .then((user) => {
    if (!user) return;
    return loadCustomers(null).then(handlePostNavigationFlags);
  })
  .catch((err) => {
    if (handleAuthFailure(err)) return;
    const friendlyMessage = normalizeError(err);
    showMessage(friendlyMessage, 'is-danger');
  });

if (createForm) {
  createForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = createName.value.trim();
    const rawEmail = createEmail.value;
    const phone = createPhone.value.trim();

    clearFieldError(createName, createNameError);
    clearFieldError(createEmail, createEmailError);
    clearFieldError(createPhone, createPhoneError);
    clearFieldError(createBirthDate, createBirthDateError);
    clearFieldError(createCnpj, createCnpjError);
    clearFieldError(createAddressStreet, createAddressStreetError);
    clearFieldError(createAddressNumber, createAddressNumberError);
    clearFieldError(createAddressNeighborhood, createAddressNeighborhoodError);
    clearFieldError(createAddressCity, createAddressCityError);
    clearFieldError(createAddressState, createAddressStateError);
    setCepStatus('');

    const nameError = getNameValidationError(name);
    if (nameError) {
      setFieldError(createName, createNameError, nameError);
      if (createName) createName.focus();
      return;
    }
    const emailError = getEmailValidationError(rawEmail);
    if (emailError) {
      setFieldError(createEmail, createEmailError, emailError);
      if (createEmail) createEmail.focus();
      return;
    }
    const email = sanitizeEmailInput(rawEmail);
    const phoneError = getPhoneValidationError(createPhone.value);
    if (phoneError) {
      setFieldError(createPhone, createPhoneError, phoneError);
      if (createPhone) createPhone.focus();
      return;
    }
    const birthDate = createBirthDate ? createBirthDate.value : '';
    const birthError = getBirthDateValidationError(birthDate);
    if (birthError) {
      setFieldError(createBirthDate, createBirthDateError, birthError);
      if (createBirthDate) createBirthDate.focus();
      return;
    }
    const streetValue = createAddressStreet ? createAddressStreet.value : '';
    const streetError = getAddressStreetValidationError(streetValue);
    if (streetError) {
      setFieldError(createAddressStreet, createAddressStreetError, streetError);
      if (createAddressStreet) createAddressStreet.focus();
      return;
    }
    const numberValue = createAddressNumber ? createAddressNumber.value : '';
    const numberError = getAddressNumberValidationError(numberValue);
    if (numberError) {
      setFieldError(createAddressNumber, createAddressNumberError, numberError);
      if (createAddressNumber) createAddressNumber.focus();
      return;
    }
    const neighborhoodValue = createAddressNeighborhood ? createAddressNeighborhood.value : '';
    const neighborhoodError = getAddressNeighborhoodValidationError(neighborhoodValue);
    if (neighborhoodError) {
      setFieldError(createAddressNeighborhood, createAddressNeighborhoodError, neighborhoodError);
      if (createAddressNeighborhood) createAddressNeighborhood.focus();
      return;
    }
    const stateValue = createAddressState ? createAddressState.value : '';
    const stateError = getAddressStateValidationError(stateValue);
    if (stateError) {
      setFieldError(createAddressState, createAddressStateError, stateError);
      if (createAddressState) createAddressState.focus();
      return;
    }
    const cityValue = createAddressCity ? createAddressCity.value : '';
    const cityError = getAddressCityValidationError(cityValue, stateValue);
    if (cityError) {
      setFieldError(createAddressCity, createAddressCityError, cityError);
      if (createAddressCity) createAddressCity.focus();
      return;
    }
    const cepValue = createAddressPostal ? createAddressPostal.value : '';
    const cepError = getCepValidationError(cepValue);
    if (cepError) {
      setCepStatus(cepError, true);
      if (createAddressPostal) createAddressPostal.focus();
      return;
    }

    // Todas as validações passaram, inicia submissão
    createSubmit.classList.add('is-loading');
    createSubmit.disabled = true;
    createSubmit.setAttribute('aria-busy', 'true');
    if (createSubmit) {
      createSubmit.textContent = CREATE_SUBMIT_SAVING_TEXT;
    }
    try {
      const typeValue = createType ? createType.value.trim().toUpperCase() : '';
      const documentDigits = (() => {
        if (typeValue === 'PF') return null;
        if (!createCnpj) return null;
        const digits = createCnpj.value.replace(/\D/g, '');
        return digits ? digits : null;
      })();
      if (typeValue === 'PJ' && !documentDigits) {
        setFieldError(createCnpj, createCnpjError, 'CNPJ obrigatório para pessoa jurídica.');
        createSubmit.classList.remove('is-loading');
        createSubmit.disabled = false;
        createSubmit.setAttribute('aria-busy', 'false');
        if (createSubmit) {
          createSubmit.textContent = createSubmitDefaultText;
        }
        if (createCnpj) createCnpj.focus();
        return;
      }
      const cpfDigits = (() => {
        if (typeValue !== 'PF') return null;
        if (!createCpf) return null;
        const digits = createCpf.value.replace(/\D/g, '');
        return digits ? digits : null;
      })();
      const notesPayload = buildNotesWithMeta(createNotes ? createNotes.value : '', state.createMeta);
      await apiRequest('/api/customers', session.token, {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          phone,
          cpf: cpfDigits,
          cnpj: documentDigits,
          birthDate: birthDate || null,
          addressStreet: createAddressStreet ? createAddressStreet.value.trim() : null,
          addressNumber: createAddressNumber ? createAddressNumber.value.trim() : null,
          addressNeighborhood: createAddressNeighborhood ? createAddressNeighborhood.value.trim() : null,
          addressCity: createAddressCity ? createAddressCity.value.trim() : null,
          addressPostalCode: createAddressPostal ? createAddressPostal.value.trim() : null,
          notes: notesPayload,
        }),
      });
      showMessage('Cliente criado com sucesso.', 'is-success');
      createForm.reset();
      state.createMeta = { type: '', tradeName: '', complement: '' };
      if (createType) {
        createType.value = '';
        updateCreateTypeFields('');
      }
      await loadCustomers(null);
      if (searchInput) {
        searchInput.value = name;
        state.currentPage = 1;
        renderPage();
        searchInput.focus();
      }
    } catch (err) {
      // Usa o error-handler se disponível, senão usa mensagem do erro
      const friendlyMessage = window.SGVCErrorHandler && window.SGVCErrorHandler.normalizeApiError
        ? window.SGVCErrorHandler.normalizeApiError(err)
        : (err.message || 'Erro ao criar cliente. Tente novamente.');
      showMessage(friendlyMessage, 'is-danger');
      
      // Se for erro de autenticação, redireciona
      if (handleAuthFailure(err)) return;
      
      // Trata erros específicos de validação
      if (err.payload && err.payload.errors && Array.isArray(err.payload.errors)) {
        err.payload.errors.forEach((errorDetail) => {
          if (errorDetail.field === 'email' && createEmailError) {
            setFieldError(createEmail, createEmailError, errorDetail.message || friendlyMessage);
          } else if (errorDetail.field === 'cpf' && createCpfError) {
            setFieldError(createCpf, createCpfError, errorDetail.message || friendlyMessage);
          } else if (errorDetail.field === 'cnpj' && createCnpjError) {
            setFieldError(createCnpj, createCnpjError, errorDetail.message || friendlyMessage);
          }
        });
      }
    } finally {
      createSubmit.classList.remove('is-loading');
      createSubmit.disabled = false;
      createSubmit.setAttribute('aria-busy', 'false');
      if (createSubmit) {
        createSubmit.textContent = createSubmitDefaultText;
      }
    }
  });
}

if (createName) {
  createName.addEventListener('input', () => {
    if (validateName(createName.value)) {
      clearFieldError(createName, createNameError);
    }
    updateCreateButtonState();
  });
  createName.addEventListener('blur', () => {
    createName.value = normalizeText(createName.value);
    const error = getNameValidationError(createName.value);
    if (error) {
      setFieldError(createName, createNameError, error);
    } else {
      clearFieldError(createName, createNameError);
    }
    updateCreateButtonState();
  });
}

if (createEmail) {
  // Previne validação nativa do HTML5 para usar validação customizada
  createEmail.addEventListener('invalid', (e) => {
    e.preventDefault();
  });
  
  createEmail.addEventListener('blur', () => {
    const sanitized = sanitizeEmailInput(createEmail.value);
    if (createEmail.value !== sanitized) {
      createEmail.value = sanitized;
    }
    const value = sanitized;
    if (!value) {
      clearFieldError(createEmail, createEmailError);
      showEmailWarning('');
      showEmailSuggest('');
      updateCreateButtonState();
      return;
    }
    const error = getEmailValidationError(value);
    if (error) {
      setFieldError(createEmail, createEmailError, error);
      showEmailWarning('');
      showEmailSuggest('');
    } else {
      clearFieldError(createEmail, createEmailError);
      showEmailWarning(getEmailWarning(value));
      const suggestion = getEmailSuggestion(value);
      showEmailSuggest(suggestion || '');
    }
    updateCreateButtonState();
  });
  createEmail.addEventListener('input', () => {
    const sanitized = sanitizeEmailInput(createEmail.value);
    if (createEmail.value !== sanitized) {
      createEmail.value = sanitized;
    }
    const value = sanitized;
    const error = value ? getEmailValidationError(value) : '';
    if (!value || !error) {
      clearFieldError(createEmail, createEmailError);
    } else if (error) {
      // Mostra erro em tempo real se houver
      setFieldError(createEmail, createEmailError, error);
    }
    if (!value) {
      showEmailWarning('');
      showEmailSuggest('');
    }
    updateCreateButtonState();
  });
}

if (createEmailSuggest) {
  createEmailSuggest.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-email]');
    if (!btn) return;
    const value = btn.getAttribute('data-email') || '';
    if (createEmail) {
      const sanitized = sanitizeEmailInput(value);
      createEmail.value = sanitized;
      showEmailSuggest('');
      showEmailWarning(getEmailWarning(sanitized));
      clearFieldError(createEmail, createEmailError);
      createEmail.focus();
      updateCreateButtonState();
    }
  });
}

if (createType) {
  createType.addEventListener('change', () => {
    const value = createType.value;
    updateCreateTypeFields(value);
    updateDirtyState();
  });
  updateCreateTypeFields(createType.value);
}

if (createTradeName) {
  createTradeName.addEventListener('input', () => {
    setCreateMetaValue('tradeName', createTradeName.value);
    updateDirtyState();
  });
  createTradeName.addEventListener('blur', () => {
    createTradeName.value = normalizeText(createTradeName.value);
    setCreateMetaValue('tradeName', createTradeName.value);
    updateDirtyState();
  });
}

// Observações também contam como alteração do formulário (antes não liberavam o botão)
if (createNotes) {
  createNotes.addEventListener('input', () => updateDirtyState());
}

if (createAddressComplement) {
  createAddressComplement.addEventListener('input', () => {
    setCreateMetaValue('complement', createAddressComplement.value);
    updateDirtyState();
  });
}

if (createPhone) {
  createPhone.addEventListener('blur', () => {
    createPhone.value = formatPhone(createPhone.value);
    const error = getPhoneValidationError(createPhone.value);
    if (error) {
      setFieldError(createPhone, createPhoneError, error);
    } else {
      clearFieldError(createPhone, createPhoneError);
    }
    updateWhatsAppLink(createPhone.value);
    updateCreateButtonState();
  });
  createPhone.addEventListener('input', () => {
    const formatted = formatPhone(createPhone.value);
    if (formatted) {
      createPhone.value = formatted;
    }
    const error = getPhoneValidationError(createPhone.value);
    if (!error) {
      clearFieldError(createPhone, createPhoneError);
    }
    updateWhatsAppLink(createPhone.value);
    updateCreateButtonState();
  });
}

if (createCnpj) {
  createCnpj.addEventListener('input', () => {
    createCnpj.value = formatCnpj(createCnpj.value);
    setCnpjMessage('', true);
  });
  createCnpj.addEventListener('blur', async () => {
    const value = createCnpj.value.trim();
    if (!value) {
      setCnpjMessage('', true);
      handleDocumentConflict();
      updateCreateButtonState();
      return;
    }
    if (!validateCnpj(value)) {
      setCnpjMessage('CNPJ inválido. Use 14 dígitos.', true);
      return;
    }
    const digits = value.replace(/\D/g, '');
    try {
      await fillCnpjFromServer(digits);
    } catch (err) {
      if (handleAuthFailure(err)) return;
      if (err.status === 404) {
        setCnpjMessage('CNPJ não encontrado.', true);
        return;
      }
      setCnpjMessage('Não foi possível consultar o CNPJ agora.', true);
    }
  });
}

if (createCpf) {
  createCpf.addEventListener('input', () => {
    createCpf.value = formatCpf(createCpf.value);
    setCreateMetaValue('cpf', createCpf.value);
    updateDirtyState();
  });
  createCpf.addEventListener('blur', () => {
    const value = createCpf.value.trim();
    if (value && !validateCpf(value)) {
      setFieldError(createCpf, createCpfError, 'CPF inválido.');
    } else {
      clearFieldError(createCpf, createCpfError);
    }
  });
}

if (createBirthDate) {
  createBirthDate.addEventListener('blur', () => {
    const error = getBirthDateValidationError(createBirthDate.value);
    if (error) {
      setFieldError(createBirthDate, createBirthDateError, error);
    } else {
      clearFieldError(createBirthDate, createBirthDateError);
      updateBirthHint(createBirthDate.value);
    }
    updateCreateButtonState();
  });
  createBirthDate.addEventListener('input', () => {
    const error = getBirthDateValidationError(createBirthDate.value);
    if (!error) {
      clearFieldError(createBirthDate, createBirthDateError);
      updateBirthHint(createBirthDate.value);
    }
    updateCreateButtonState();
  });
}

if (createAddressStreet) {
  createAddressStreet.addEventListener('blur', () => {
    const rawValue = createAddressStreet.value;
    const normalizedValue = normalizeText(rawValue);
    createAddressStreet.value = normalizedValue;
    const error = getAddressStreetValidationError(rawValue);
    if (error) {
      setFieldError(createAddressStreet, createAddressStreetError, error);
    } else {
      clearFieldError(createAddressStreet, createAddressStreetError);
    }
    updateCreateButtonState();
  });
}

if (createAddressNumber) {
  createAddressNumber.addEventListener('blur', () => {
    createAddressNumber.value = createAddressNumber.value.trim();
    const error = getAddressNumberValidationError(createAddressNumber.value);
    if (error) {
      setFieldError(createAddressNumber, createAddressNumberError, error);
    } else {
      clearFieldError(createAddressNumber, createAddressNumberError);
    }
    updateCreateButtonState();
  });
}

if (createAddressNeighborhood) {
  createAddressNeighborhood.addEventListener('blur', () => {
    createAddressNeighborhood.value = normalizeText(createAddressNeighborhood.value);
    const error = getAddressNeighborhoodValidationError(createAddressNeighborhood.value);
    if (error) {
      setFieldError(createAddressNeighborhood, createAddressNeighborhoodError, error);
    } else {
      clearFieldError(createAddressNeighborhood, createAddressNeighborhoodError);
    }
    updateCreateButtonState();
  });
}

if (createAddressCity) {
  createAddressCity.addEventListener('input', () => {
    // Limpa erro enquanto digita
    const stateValue = createAddressState ? createAddressState.value : '';
    const error = getAddressCityValidationError(createAddressCity.value, stateValue);
    if (!error && createAddressCity.value.trim().length >= 3) {
      clearFieldError(createAddressCity, createAddressCityError);
    }
    updateLocationChips();
    updateCreateButtonState();
  });
  createAddressCity.addEventListener('blur', () => {
    createAddressCity.value = normalizeText(createAddressCity.value);
    const stateValue = createAddressState ? createAddressState.value : '';
    const error = getAddressCityValidationError(createAddressCity.value, stateValue);
    if (error) {
      setFieldError(createAddressCity, createAddressCityError, error);
    } else {
      clearFieldError(createAddressCity, createAddressCityError);
    }
    updateLocationChips();
    updateCreateButtonState();
  });
}

if (createAddressState) {
  createAddressState.addEventListener('input', () => {
    createAddressState.value = createAddressState.value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    const error = getAddressStateValidationError(createAddressState.value);
    if (!error) {
      clearFieldError(createAddressState, createAddressStateError);
    }
    updateCreateButtonState();
  });
  createAddressState.addEventListener('blur', async () => {
    createAddressState.value = createAddressState.value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    const error = getAddressStateValidationError(createAddressState.value);
    if (error) {
      setFieldError(createAddressState, createAddressStateError, error);
      resetCityOptions();
    } else {
      clearFieldError(createAddressState, createAddressStateError);
      // Trocou a UF: a cidade anterior é de outro estado
      if (createAddressState.dataset.lastUf && createAddressState.dataset.lastUf !== createAddressState.value && createAddressCity) {
        createAddressCity.value = '';
        clearFieldError(createAddressCity, createAddressCityError);
      }
      createAddressState.dataset.lastUf = createAddressState.value;
      try {
        await loadCities(createAddressState.value);
      } catch (_err) {
        // Ignora erro ao carregar cidades - permite entrada manual
      }
      // Revalida cidade após carregar cidades da UF
      if (createAddressCity && createAddressCity.value.trim()) {
        // Aguarda um pouco para garantir que as cidades foram processadas
        setTimeout(() => {
          const cityError = getAddressCityValidationError(createAddressCity.value, createAddressState.value);
          if (!cityError) {
            clearFieldError(createAddressCity, createAddressCityError);
          }
        }, 800);
      }
    }
    updateLocationChips();
    updateCreateButtonState();
  });
}

if (createAddressPostal) {
  createAddressPostal.addEventListener('input', () => {
    setCepStatus('');
    createAddressPostal.value = formatPostal(createAddressPostal.value);
  });
  createAddressPostal.addEventListener('blur', async () => {
    const formatted = formatPostal(createAddressPostal.value);
    createAddressPostal.value = formatted;
    const error = getCepValidationError(formatted);
    if (error) {
      setCepStatus(error, true);
      return;
    }
    setCepStatus('');
    const cep = formatted.replace(/\D/g, '');
    if (cep.length === 8) {
      // A sessão vai no cookie HttpOnly (não há token no navegador); se expirou, a API devolve 401
      try {
        await lookupCep(cep, session.token);
      } catch (err) {
        console.error('[CEP] Erro ao consultar CEP:', err);
        setCepStatus('Erro ao consultar CEP. Preencha manualmente.', true);
      }
    }
  });
  // Também permite consulta ao pressionar Enter
  createAddressPostal.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createAddressPostal.blur(); // Dispara o evento blur que faz a consulta
    }
  });
}

function updateDirtyState() {
  if (!createSubmit) return;
  const current = getCreateSnapshot();
  const isDirty = Object.keys(current).some((key) => current[key] !== state.createInitialState[key]);
  updateCreateButtonState(isDirty, current);
}

export function updateCreateButtonState(isDirtyOverride, snapshotOverride) {
  if (!createSubmit) return;
  const snapshot = snapshotOverride || getCreateSnapshot();
  const dirty =
    typeof isDirtyOverride === 'boolean'
      ? isDirtyOverride
      : Object.keys(snapshot).some((key) => snapshot[key] !== state.createInitialState[key]);
  createSubmit.disabled = state.isSubmitting || !dirty;
}

loadStates();

// ============================================
// EXPORTAÇÃO DE CLIENTES
// ============================================
const clientsExportBtn = document.getElementById('clients-export-btn');

const clientsExportFormat = document.getElementById('clients-export-format');

if (clientsExportBtn) {
  clientsExportBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[EXPORT] 🖱️ Clique detectado no botão de exportação');
    

    const format = clientsExportFormat ? clientsExportFormat.value : 'csv';
    const currentSearch = searchInput ? searchInput.value.trim() : '';
    
    console.log('[EXPORT] 📋 Parâmetros:', { format, currentSearch });
    
    // Construir query com filtros atuais
    const params = new URLSearchParams();
    params.set('format', format);
    
    if (currentSearch) {
      params.set('search', currentSearch);
    }
    
    // Adicionar filtros
    const activeFilterBtn = Array.from(filterButtons || []).find(b => b && b.classList.contains('is-active'));
    if (activeFilterBtn && activeFilterBtn.dataset.filter) {
      const filter = activeFilterBtn.dataset.filter;
      if (filter !== 'all') {
        params.set('filter', filter);
        console.log('[EXPORT] 🔍 Filtro ativo:', filter);
      }
    }

    // Construir URL da API usando buildUrl para consistência
    const url = buildUrl(`/api/export/customers?${params.toString()}`);
    
    console.log('[EXPORT] 🌐 URL da requisição:', url);
    
    const originalText = clientsExportBtn.textContent;
    clientsExportBtn.disabled = true;
    clientsExportBtn.classList.add('is-loading');
    clientsExportBtn.textContent = 'Exportando...';

    try {
      // Define Accept header baseado no formato
      let acceptHeader = 'text/csv';
      if (format === 'json') acceptHeader = 'application/json';
      else if (format === 'pdf') acceptHeader = 'application/pdf';
      else if (format === 'excel') acceptHeader = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': acceptHeader,
        },
      });

      console.log('[EXPORT] 📡 Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        let errorMessage = 'Falha ao gerar o arquivo.';
        const text = await response.text();
        console.error('[EXPORT] ❌ Erro na resposta:', text);
        try {
          const payload = JSON.parse(text);
          errorMessage = payload.message || payload.error || errorMessage;
        } catch (_err) {
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      let filename = 'clientes.csv';
      
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^"]+)"?/);
        if (match) {
          filename = decodeURIComponent(match[1] || match[2]).trim();
        }
      } else {
        let extension = 'csv';
        if (format === 'json') extension = 'json';
        else if (format === 'pdf') extension = 'pdf';
        else if (format === 'excel') extension = 'xlsx';
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        filename = `clientes_${timestamp}.${extension}`;
      }

      console.log('[EXPORT] 💾 Arquivo gerado:', filename, 'Tamanho:', blob.size, 'bytes');

      const link = document.createElement('a');
      const urlBlob = URL.createObjectURL(blob);
      link.href = urlBlob;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(urlBlob);
      }, 100);
      
      console.log('[EXPORT] ✅ Download iniciado com sucesso');
      showMessage('Download iniciado com sucesso.', 'is-success');
    } catch (err) {
      console.error('[EXPORT] ❌ Erro completo:', err);
      showMessage(err.message || 'Erro ao exportar clientes. Verifique o console para mais detalhes.', 'is-danger');
    } finally {
      clientsExportBtn.disabled = false;
      clientsExportBtn.classList.remove('is-loading');
      clientsExportBtn.textContent = originalText;
    }
  });
  console.log('[EXPORT] ✅ Evento de exportação configurado com sucesso');
} else {
  console.warn('[EXPORT] ⚠️ Botão de exportação não encontrado no DOM');
}

// Garantir que a navegação por teclado priorize o formulário
prioritizeFormTabOrder();
