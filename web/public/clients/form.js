/**
 * Formulário de cadastro: snapshot, campos condicionais, chips e estado do botão.
 */
import { DOCUMENT_CONFLICT_MESSAGE } from './constants.js';
import {
  chipCity,
  chipUf,
  createAddressCity,
  createAddressComplement,
  createAddressNeighborhood,
  createAddressNumber,
  createAddressPostal,
  createAddressState,
  createAddressStreet,
  createBirthDate,
  createBirthHint,
  createCnpj,
  createCnpjError,
  createCnpjField,
  createCpf,
  createCpfError,
  createCpfField,
  createEmail,
  createEmailSuggest,
  createEmailWarning,
  createName,
  createNameLabelText,
  createNotes,
  createPhone,
  createPhoneWhatsapp,
  createSubmit,
  createTradeName,
  createTradeNameField,
  createType,
  locationChips,
} from './dom.js';
import { state } from './state.js';
import { clearFieldError, setFieldError } from './core.js';
import {
  getAddressCityValidationError,
  getAddressNeighborhoodValidationError,
  getAddressNumberValidationError,
  getAddressStateValidationError,
  getAddressStreetValidationError,
  getBirthDateValidationError,
  getCepValidationError,
  getEmailValidationError,
  getPhoneValidationError,
  validateBirthDate,
  validateCnpj,
  validateCpf,
  validateName,
} from './validators.js';
import { buildBirthHint, normalizeDigits, normalizeText } from './formatters.js';
import { loadStates, setCnpjMessage } from './lookups.js';

export function getCreateSnapshot() {
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

export function handleDocumentConflict() {
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

export function prioritizeFormTabOrder() {
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

export function showEmailSuggest(suggestion) {
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

export function showEmailWarning(text) {
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

export function updateBirthHint(value) {
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

export function updateDirtyState() {
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

export function initForm() {
  loadStates();
}
