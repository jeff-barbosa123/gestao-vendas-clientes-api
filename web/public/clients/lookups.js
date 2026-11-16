/**
 * IntegraÃ§Ãµes de UF/cidade, CEP (ViaCEP) e CNPJ.
 */
import {
  BASE_UF_CODES,
  BRAZIL_API_CNPJ_URL,
  CEP_SLOW_HINT,
  CNPJ_LOADING_TEXT,
  FALLBACK_UFS,
  UF_LOADING_PLACEHOLDER,
  VALID_UFS,
  VIA_CEP_URL,
  session,
} from './constants.js';
import {
  cityList,
  cnpjHintDefault,
  createAddressCity,
  createAddressCityError,
  createAddressNeighborhood,
  createAddressNumber,
  createAddressPostal,
  createAddressState,
  createAddressStateError,
  createAddressStreet,
  createCnpj,
  createCnpjError,
  createCnpjHint,
  createCnpjSuccess,
  createName,
  createPhone,
  createTradeName,
  createType,
  ufList,
  ufStatus,
} from './dom.js';
import { state } from './state.js';
import {
  apiRequest,
  clearFieldError,
  fetchWithTimeout,
  handleAuthFailure,
  normalizeError,
  showMessage,
} from './core.js';
import {
  formatPhone,
  formatPostal,
  normalizeCnpjPayload,
  normalizeText,
  safeValue,
} from './formatters.js';
import {
  setCreateMetaValue,
  updateCreateButtonState,
  updateCreateTypeFields,
  updateLocationChips,
  updateWhatsAppLink,
} from './form.js';

export function resetCityOptions() {
  state.currentCityUf = '';
  state.currentCitySet = null;
}

function updateCityOptions(uf, items) {
  const normalizedUf = String(uf || '').trim().toUpperCase();
  state.currentCityUf = normalizedUf;
  if (!items || !items.length) {
    state.currentCitySet = null;
    return;
  }
  state.currentCitySet = new Set(items.map((value) => String(value || '').trim().toLowerCase()));
}

/**
 * Define status de CEP
 */
export function setCepStatus(message, isError = false) {
  const cepStatusEl = document.getElementById('cep-status');
  if (!cepStatusEl) return;
  cepStatusEl.textContent = message || '';
  cepStatusEl.hidden = !message;
  if (message) {
    cepStatusEl.classList.toggle('is-danger', isError);
    cepStatusEl.classList.toggle('clients-field-hint', !isError);
  }
}

function displayUfStatus(text, duration = 0) {
  if (!ufStatus) return;
  if (state.ufStatusTimer) {
    clearTimeout(state.ufStatusTimer);
    state.ufStatusTimer = null;
  }
  const trimmed = text || '';
  ufStatus.textContent = trimmed;
  ufStatus.hidden = !trimmed;
  if (trimmed && duration > 0) {
    state.ufStatusTimer = setTimeout(() => {
      ufStatus.textContent = '';
      ufStatus.hidden = true;
      state.ufStatusTimer = null;
    }, duration);
  }
}

function setAddressStateLoading(isLoading) {
  if (!createAddressState) return;
  createAddressState.classList.toggle('is-loading', Boolean(isLoading));
  createAddressState.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

function renderUfOptions(items) {
  if (!ufList) return;
  const list = Array.isArray(items) ? items : [];
  ufList.textContent = '';
  list.forEach((item) => {
    if (!item || !item.sigla) return;
    const opt = document.createElement('option');
    opt.value = String(item.sigla);
    opt.textContent = String(item.nome || item.sigla);
    ufList.appendChild(opt);
  });
  VALID_UFS.clear();
  BASE_UF_CODES.forEach((code) => VALID_UFS.add(code));
  list.forEach((item) => {
    if (item && item.sigla) {
      VALID_UFS.add(item.sigla);
    }
  });
}

export async function loadStates() {
  if (!ufList) return;
  const cacheKey = 'ibge.states';
  const cached = sessionStorage.getItem(cacheKey);
  displayUfStatus(UF_LOADING_PLACEHOLDER);
  setAddressStateLoading(true);
  ufList.textContent = '';
  const loadingOpt = document.createElement('option');
  loadingOpt.value = '';
  loadingOpt.textContent = 'Carregando unidades federativas...';
  ufList.appendChild(loadingOpt);
  if (cached) {
    try {
      const items = JSON.parse(cached);
      if (Array.isArray(items) && items.length) {
        renderUfOptions(items);
        displayUfStatus('Unidades federativas carregadas. Você pode digitar manualmente.', 4000);
        setAddressStateLoading(false);
        return;
      }
    } catch (_err) {
      sessionStorage.removeItem(cacheKey);
    }
  }
  try {
    const data = await fetchWithTimeout(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
      5000
    );
    const items = Array.isArray(data)
      ? data.map((state) => ({ sigla: state.sigla, nome: state.nome }))
      : [];
    if (items.length) {
      sessionStorage.setItem(cacheKey, JSON.stringify(items));
      renderUfOptions(items);
      displayUfStatus('Unidades federativas carregadas. Você pode digitar manualmente.', 4000);
      return;
    }
    throw new Error('empty_states');
  } catch (_err) {
    renderUfOptions(FALLBACK_UFS);
    displayUfStatus('Não foi possível carregar o IBGE. Lista fixa disponível como fallback.', 0);
  } finally {
    setAddressStateLoading(false);
  }
}

export async function loadCities(uf) {
  if (!cityList) return;
  const normalized = String(uf || '').trim().toUpperCase();
  if (normalized.length !== 2) {
    resetCityOptions();
    return;
  }
  const cacheKey = `ibge.cities.${normalized}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const items = JSON.parse(cached);
      cityList.textContent = '';
      items.forEach((name) => {
        const opt = document.createElement('option');
        opt.value = String(name || '');
        cityList.appendChild(opt);
      });
      updateCityOptions(normalized, items);
      return;
    } catch (_err) {
      sessionStorage.removeItem(cacheKey);
    }
  }
  try {
    const data = await fetchWithTimeout(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normalized}/municipios?orderBy=nome`,
      6000
    );
    const items = Array.isArray(data) ? data.map((city) => city.nome) : [];
    sessionStorage.setItem(cacheKey, JSON.stringify(items));
    cityList.textContent = '';
    items.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = String(name || '');
      cityList.appendChild(opt);
    });
    updateCityOptions(normalized, items);
  } catch (_err) {
    // Silencioso: nao bloqueia o cadastro.
  }
}

export function setCnpjMessage(message, isError) {
  if (createCnpjError) {
    createCnpjError.textContent = isError ? message : '';
    createCnpjError.hidden = !isError;
  }
  if (createCnpjSuccess) {
    createCnpjSuccess.textContent = !isError ? message : '';
    createCnpjSuccess.hidden = isError || !message;
  }
}

function toggleCnpjLoading(isLoading) {
  if (createCnpj) {
    createCnpj.classList.toggle('is-loading', Boolean(isLoading));
    createCnpj.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }
  if (createCnpjHint) {
    createCnpjHint.textContent = isLoading ? CNPJ_LOADING_TEXT : cnpjHintDefault;
  }
}

function applyCnpjData(data) {
  if (!data) return;
  const nameValue = safeValue(data.name);
  if (createName && nameValue) createName.value = normalizeText(nameValue);
  const phoneValue = safeValue(data.phone);
  if (createPhone && phoneValue) createPhone.value = formatPhone(phoneValue);
  const streetValue = normalizeText(safeValue(data.addressStreet));
  if (createAddressStreet && streetValue) {
    createAddressStreet.value = streetValue;
  }
  const numberValue = safeValue(data.addressNumber);
  if (createAddressNumber && numberValue) {
    createAddressNumber.value = numberValue;
  }
  const neighborhoodValue = normalizeText(safeValue(data.addressNeighborhood));
  if (createAddressNeighborhood && neighborhoodValue) {
    createAddressNeighborhood.value = neighborhoodValue;
  }
  const cityValue = normalizeText(safeValue(data.addressCity));
  if (createAddressCity && cityValue) {
    createAddressCity.value = cityValue;
  }
  const stateValue = safeValue(data.addressState);
  if (createAddressState && stateValue) {
    createAddressState.value = stateValue.toUpperCase();
    createAddressState.dataset.lastUf = createAddressState.value;
    loadCities(createAddressState.value);
  }
  const postalValue = safeValue(data.addressPostalCode);
  if (createAddressPostal && postalValue) {
    createAddressPostal.value = formatPostal(postalValue);
  }
  const tradeValue = normalizeText(safeValue(data.tradeName));
  if (tradeValue) {
    if (createTradeName) {
      createTradeName.value = tradeValue;
    }
    setCreateMetaValue('tradeName', tradeValue);
  }
  if (createType) {
    createType.value = 'PJ';
    updateCreateTypeFields('PJ');
  }
  updateLocationChips();
  updateWhatsAppLink(createPhone ? createPhone.value : '');
}

export async function fillCnpjFromServer(digits) {
  toggleCnpjLoading(true);
  try {
    const data = await apiRequest(`/api/cnpj/${digits}`, session.token);
    applyCnpjData(data);
    setCnpjMessage('Dados preenchidos a partir do CNPJ.', false);
    return true;
    } catch (err) {
      if (handleAuthFailure(err)) throw err;
      if (err.status === 404) {
        setCnpjMessage('CNPJ não encontrado. Verifique o número informado.', true);
        throw err;
      }
      try {
        const directData = await fetchCnpjDirect(digits);
        applyCnpjData(directData);
        setCnpjMessage('Dados preenchidos a partir do CNPJ.', false);
        return true;
      } catch (_fallbackErr) {
        const friendlyMessage = normalizeError(err);
        setCnpjMessage(friendlyMessage, true);
        throw err;
      }
    } finally {
      toggleCnpjLoading(false);
    }
}

async function fetchCnpjDirect(cnpj) {
  const response = await fetch(`${BRAZIL_API_CNPJ_URL}/${cnpj}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (response.status === 404) {
    const err = new Error('CNPJ não encontrado');
    err.status = 404;
    throw err;
  }
  if (!response.ok) {
    const err = new Error('Erro ao consultar CNPJ diretamente');
    err.status = response.status;
    throw err;
  }
  const payload = await response.json();
  const normalized = normalizeCnpjPayload(payload);
  if (!normalized) {
    const err = new Error('CNPJ sem dados');
    err.status = 502;
    throw err;
  }
  return normalized;
}

async function applyCepData(data) {
  if (!data) return;
  const streetValue = normalizeText(safeValue(data.logradouro));
  if (createAddressStreet) createAddressStreet.value = streetValue;
  const neighborhoodValue = normalizeText(safeValue(data.bairro));
  if (createAddressNeighborhood) createAddressNeighborhood.value = neighborhoodValue;
  const cityValue = normalizeText(safeValue(data.localidade));
  const stateValue = safeValue(data.uf);
  
  // Primeiro atualiza a UF e carrega cidades
  if (createAddressState && stateValue) {
    createAddressState.value = stateValue.toUpperCase();
    createAddressState.dataset.lastUf = createAddressState.value;
    clearFieldError(createAddressState, createAddressStateError);
    try {
      await loadCities(createAddressState.value);
    } catch (_err) {
      // Ignora erro ao carregar cidades - permite entrada manual
    }
    // Aguarda um pouco para garantir que as cidades foram processadas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Depois preenche a cidade e limpa erros (cidades já carregadas ou entrada manual permitida)
  if (createAddressCity && cityValue) {
    createAddressCity.value = cityValue;
    // Limpa qualquer erro de validação - cidade do CEP é sempre válida
    clearFieldError(createAddressCity, createAddressCityError);
  }
  
  updateLocationChips();
  updateCreateButtonState();
}

async function lookupViaCepDirect(cep) {
  const response = await fetch(`${VIA_CEP_URL}/${cep}/json/`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    const err = new Error('ViaCEP indisponivel');
    err.status = response.status;
    throw err;
  }
  const payload = await response.json();
  if (payload && payload.erro) {
    const err = new Error('CEP não encontrado');
    err.status = 404;
    throw err;
  }
  return {
    logradouro: payload.logradouro || '',
    bairro: payload.bairro || '',
    localidade: payload.localidade || '',
    uf: payload.uf || '',
  };
}

export async function lookupCep(cep, token) {
  const slowTimer = setTimeout(() => {
    setCepStatus(CEP_SLOW_HINT);
  }, 2200);
  setCepStatus('Consultando CEP...');
  try {
    console.log('[CEP] Consultando CEP:', cep);
    const response = await apiRequest(`/api/cep/${cep}`, token);
    console.log('[CEP] Resposta da API:', response);
    
    // A API pode retornar os dados diretamente ou dentro de um objeto 'data'
    let data = response;
    if (response && response.data) {
      data = response.data;
    }
    
    console.log('[CEP] Dados processados:', data);
    const hasStreet = Boolean(safeValue(data && data.logradouro));
    const hasCity = Boolean(safeValue(data && data.localidade));
    const hasUf = Boolean(safeValue(data && data.uf));
    
    console.log('[CEP] Validação:', { hasStreet, hasCity, hasUf });
    
    if (!hasStreet || !hasCity || !hasUf) {
      console.warn('[CEP] Dados incompletos:', { hasStreet, hasCity, hasUf, data });
      showMessage('Erro ao consultar CEP. Preencha manualmente.', 'is-danger');
      setCepStatus('Erro ao consultar CEP. Preencha manualmente.', true);
      return;
    }
    await applyCepData(data);
    showMessage('CEP consultado com sucesso!', 'is-success');
    setCepStatus('');
  } catch (err) {
    console.error('[CEP] Erro ao consultar:', err);
    if (handleAuthFailure(err)) return;
    if (err.status === 400) {
      showMessage('CEP inválido. Digite 8 dígitos.', 'is-danger');
      setCepStatus('CEP inválido. Digite 8 dígitos.', true);
      return;
    }
    if (err.status === 404) {
      showMessage('CEP não encontrado. Preencha manualmente.', 'is-danger');
      setCepStatus('CEP não encontrado. Preencha manualmente.', true);
      return;
    }
    try {
      console.log('[CEP] Tentando fallback ViaCEP...');
      const fallback = await lookupViaCepDirect(cep);
      console.log('[CEP] Fallback bem-sucedido:', fallback);
      await applyCepData(fallback);
      showMessage('CEP consultado com sucesso!', 'is-success');
      setCepStatus('');
      return;
    } catch (fallbackErr) {
      console.error('[CEP] Erro no fallback:', fallbackErr);
      showMessage('Erro ao consultar CEP. Preencha manualmente.', 'is-danger');
      setCepStatus('Erro ao consultar CEP. Preencha manualmente.', true);
    }
  } finally {
    clearTimeout(slowTimer);
  }
}
