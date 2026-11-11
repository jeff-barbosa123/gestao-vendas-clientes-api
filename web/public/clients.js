(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;
  // Auth via cookie HttpOnly (não usar token no browser storage)

  const messageBox = document.getElementById('clients-message');
  const SEVERITY_CLASSES = ['is-success', 'is-danger', 'is-warning', 'is-info'];
  const backBtn = document.getElementById('back-dashboard');
  const refreshBtn = document.getElementById('refresh-list');
  const tableBody = document.getElementById('clients-body');
  const nameHeader = document.getElementById('name-header');
  const spentHeader = document.getElementById('spent-header');
  const searchInput = document.getElementById('search-input');
  const pagination = document.getElementById('clients-pagination');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const pageList = document.getElementById('page-list');
  const clientsTotal = document.getElementById('clients-total');
  const pageIndicator = document.getElementById('page-indicator');
  const pageJumpInput = document.getElementById('page-jump-input');
  const pageJumpBtn = document.getElementById('page-jump-btn');
  const birthdayInsight = document.getElementById('birthday-insight');
  const birthdayWindowSelect = document.getElementById('birthday-window');
  const filterButtons = document.querySelectorAll('[data-filter]');

  const createForm = document.getElementById('create-form');
  const createName = document.getElementById('create-name');
  const createEmail = document.getElementById('create-email');
  const createEmailWarning = document.getElementById('create-email-warning');
  const createEmailSuggest = document.getElementById('create-email-suggest');
  const createCnpj = document.getElementById('create-cnpj');
  const createCnpjError = document.getElementById('create-cnpj-error');
  const createCnpjSuccess = document.getElementById('create-cnpj-success');
  const createCnpjHint = document.getElementById('create-cnpj-hint');
  const cnpjHintDefault = createCnpjHint ? createCnpjHint.textContent : '';
  const createType = document.getElementById('create-type');
  const createCpf = document.getElementById('create-cpf');
  const createTradeName = document.getElementById('create-trade-name');
  const createAddressComplement = document.getElementById('create-address-complement');
  const createCpfError = document.getElementById('create-cpf-error');
  const createCpfField = document.getElementById('create-cpf-field');
  const createCnpjField = document.getElementById('create-cnpj-field');
  const createTradeNameField = document.getElementById('create-trade-name-field');
  const createNameLabelText = document.querySelector('.clients-name-label-text');
  const createPhone = document.getElementById('create-phone');
  const createPhoneWhatsapp = document.getElementById('create-phone-whatsapp');
  const createBirthDate = document.getElementById('create-birth-date');
  const createBirthHint = document.getElementById('create-birth-hint');
  const createAddressStreet = document.getElementById('create-address-street');
  const createAddressNumber = document.getElementById('create-address-number');
  const createAddressNeighborhood = document.getElementById('create-address-neighborhood');
  const createAddressCity = document.getElementById('create-address-city');
  const createAddressState = document.getElementById('create-address-state');
  const createAddressPostal = document.getElementById('create-address-postal');
  const locationChips = document.getElementById('location-chips');
  const chipUf = document.getElementById('chip-uf');
  const chipCity = document.getElementById('chip-city');
  const ufList = document.getElementById('uf-list');
  const cityList = document.getElementById('city-list');
  const ufStatus = document.getElementById('uf-status');
  const cepStatus = document.getElementById('cep-status');
  const createNotes = document.getElementById('create-notes');
  const createSubmit = document.getElementById('create-submit');
  const createNameError = document.getElementById('create-name-error');
  const createEmailError = document.getElementById('create-email-error');
  const createPhoneError = document.getElementById('create-phone-error');
  const createBirthDateError = document.getElementById('create-birth-date-error');
  const createAddressStreetError = document.getElementById('create-address-street-error');
  const createAddressNumberError = document.getElementById('create-address-number-error');
  const createAddressNeighborhoodError = document.getElementById('create-address-neighborhood-error');
  const createAddressCityError = document.getElementById('create-address-city-error');
  const createAddressStateError = document.getElementById('create-address-state-error');
  const createSubmitDefaultText = createSubmit ? createSubmit.textContent.trim() : 'Criar cliente';
  const CREATE_SUBMIT_SAVING_TEXT = 'Salvando...';
  const DOCUMENT_CONFLICT_MESSAGE = 'Informe apenas CPF ou CNPJ.';
  const EMAIL_REQUIRED_MESSAGE = 'E-mail obrigatorio.';
  const EMAIL_SPACE_MESSAGE = 'E-mail nao pode conter espacos.';
  const EMAIL_MISSING_AT_MESSAGE = 'E-mail deve conter "@".';
  const EMAIL_MISSING_DOMAIN_MESSAGE = 'Dominio do e-mail obrigatorio.';
  const EMAIL_INVALID_MESSAGE = 'Digite um e-mail valido.';
  const PHONE_REQUIRED_MESSAGE = 'Telefone obrigatorio.';
  const PHONE_DDD_MESSAGE = 'Telefone deve incluir DDD (10 ou 11 digitos).';
  const PHONE_LETTER_MESSAGE = 'Telefone deve conter apenas digitos.';
  const PHONE_INVALID_MESSAGE = 'Telefone invalido.';
  const BIRTH_REQUIRED_MESSAGE = 'Data de nascimento obrigatoria.';
  const BIRTH_FORMAT_MESSAGE = 'Data de nascimento invalida.';
  const BIRTH_FUTURE_MESSAGE = 'Data de nascimento nao pode ser futura.';
  const CEP_REQUIRED_MESSAGE = 'CEP obrigatorio.';
  const CEP_DIGITS_MESSAGE = 'CEP deve conter 8 digitos.';
  const CEP_INVALID_CHAR_MESSAGE = 'CEP deve conter apenas numeros.';
  const ADDRESS_STREET_REQUIRED = 'Rua obrigatoria.';
  const ADDRESS_STREET_LENGTH_MESSAGE = 'Informe o logradouro com pelo menos 3 caracteres.';
  const ADDRESS_STREET_INVALID_MESSAGE = 'Informe um logradouro valido.';
  const ADDRESS_STREET_INVALID_PATTERN = /<\s*\/?\s*script\b|<|>|--|;/i;
  const ADDRESS_STREET_MIN_LENGTH = 3;
  const ADDRESS_NUMBER_REQUIRED = 'Numero obrigatorio.';
  const ADDRESS_NUMBER_INVALID = 'Numero invalido.';
  const ADDRESS_NEIGHBORHOOD_REQUIRED = 'Bairro obrigatorio.';
  const ADDRESS_STATE_REQUIRED = 'UF obrigatoria.';
  const ADDRESS_CITY_REQUIRED = 'Cidade obrigatoria.';
  const ADDRESS_STATE_INVALID = 'UF invalida.';
  const ADDRESS_CITY_INVALID = 'Cidade invalida para a UF.';
  const NAME_MIN_LENGTH = 3;
  const NAME_MAX_LENGTH = 120;
  const NAME_LENGTH_MESSAGE = 'Nome deve ter 3 a 120 caracteres.';
  const NAME_LETTER_MESSAGE = 'Nome deve conter pelo menos uma letra.';
  const NAME_INVALID_CHARS_MESSAGE = 'Nome contem caracteres invalidos.';
  const NAME_ALLOWED_REGEX = /^[\p{L}\d\s&().'\/-]+$/u;
  const DELETE_FLAG = 'sgvc.clientDeleted';
  const UPDATED_FLAG = 'sgvc.clientUpdated';
  let messageTimer = null;
  let ufStatusTimer = null;
  let isSubmitting = false;
  let createMeta = { type: '', tradeName: '', complement: '' };
  
  // Constantes para validação de UF e cidades
  const BASE_UF_CODES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  const FALLBACK_UFS = BASE_UF_CODES.map((sigla) => ({ sigla, nome: sigla }));
  const VALID_UFS = new Set(BASE_UF_CODES);
  const UF_LOADING_PLACEHOLDER = 'Carregando unidades federativas...';
  const CEP_SLOW_HINT = 'A consulta está demorando. Isso pode ocorrer em algumas situações.';
  const safeString = window.safeString || ((value) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  });
  const safeValue = window.safeValue || ((value, fallback = '') => {
    const normalized = safeString(value);
    if (normalized !== '') return normalized;
    return safeString(fallback);
  });
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
  function normalizeDigits(value) {
    return String(value || '').replace(/\D/g, '');
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
  let createInitialState = getCreateSnapshot();
  prioritizeFormTabOrder();
  updateCreateButtonState(false, createInitialState);

  const PAGE_SIZE = 10;
  let currentPage = 1;
  let customersCache = [];
  let sortAsc = true;
  let sortField = 'name';
  let activeFilter = 'all';
  const FILTER_NEW_DAYS = 60;
  const FILTER_OLD_DAYS = 15;
  const LOYAL_PURCHASES = 3;
  const LOYAL_TOTAL = 1500;
  const FREQUENT_MIN = 2;
  const BIRTHDAY_WINDOW_KEY = 'sgvc.birthdayWindowDays';
  const BIRTHDAY_WINDOW_OPTIONS = [7, 14, 30];
  let birthdayWindowDays = 14;
  // REMOVIDO: UF_LOADING_PLACEHOLDER já declarado anteriormente (linha ~120)
  // REMOVIDO: CEP_SLOW_HINT já declarado anteriormente (linha ~121)
  const CNPJ_LOADING_TEXT = 'Consultando CNPJâ¦';
  // REMOVIDO: FALLBACK_UFS, BASE_UF_CODES e VALID_UFS já foram declarados anteriormente (linha ~117-119)
  let currentCitySet = null;
  let currentCityUf = '';

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`;
    }
    return `${base}${normalizedPath}`;
  }

  async function requireAuth() {
    if (!window.apiGetMe) {
      window.location.href = '/';
      return null;
    }
    try {
      const me = await window.apiGetMe({ force: true });
      return me && me.user ? me.user : me;
    } catch (_err) {
      if (_err && _err.name === 'AbortError') {
        return null;
      }
      window.location.href = '/';
      return null;
    }
  }

  function showMessage(text, type) {
    if (!messageBox) return;
    messageBox.textContent = text || '';
    SEVERITY_CLASSES.forEach((cls) => messageBox.classList.remove(cls));
    if (type) messageBox.classList.add(type);
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }
    if (text) {
      messageBox.hidden = false;
      messageBox.focus();
      const timeout = type === 'is-danger' ? 6500 : 4500;
      messageTimer = setTimeout(() => {
        messageBox.hidden = true;
        messageBox.textContent = '';
        messageBox.classList.remove('is-success', 'is-danger');
      }, timeout);
    } else {
      messageBox.hidden = true;
    }
  }

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

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    // Se base já termina com /api e path começa com /api, remove uma das duplicatas
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`; // Remove /api do início do path
    }
    // Se base não termina com /api mas path começa com /api/, usa direto
    if (normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath}`;
    }
    // Se path não começa com /api, adiciona /api
    if (!normalizedPath.startsWith('/api')) {
      return `${base}/api${normalizedPath}`;
    }
    return `${base}${normalizedPath}`;
  }

  async function apiRequest(path, _tokenIgnored, options = {}) {
    const url = buildUrl(path);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    
    let response;
    try {
      response = await fetch(url, { ...options, headers, credentials: 'include' });
    } catch (err) {
      const networkError = new Error('NETWORK_ERROR');
      networkError.status = 0;
      networkError.payload = null;
      networkError.name = 'NetworkError';
      throw networkError;
    }
    
    const contentType = response.headers.get('content-type') || '';
    let payload = null;
    
    try {
      payload = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch (err) {
      const parseError = new Error('INVALID_RESPONSE');
      parseError.status = response.status;
      parseError.payload = null;
      throw parseError;
    }
    
    if (
      response.ok &&
      payload &&
      typeof payload === 'object' &&
      payload.error === false &&
      Object.prototype.hasOwnProperty.call(payload, 'data')
    ) {
      payload = payload.data;
    }
    
    if (!response.ok) {
      const error = new Error('API_ERROR');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    
    return payload;
  }

  function validateEmail(value) {
    const candidate = String(value || '');
    if (/\s/.test(candidate)) return false;
    const trimmed = candidate.trim();
    if (!trimmed) return false;
    if (trimmed.length > 254) return false;
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmed);
  }

  function sanitizeEmailInput(value) {
    const raw = String(value || '').trim();
    return raw.toLowerCase();
  }

  function getEmailValidationError(value) {
    const raw = String(value || '');
    const trimmed = raw.trim();
    if (!trimmed) {
      return EMAIL_REQUIRED_MESSAGE;
    }
    if (/\s/.test(raw)) {
      return EMAIL_SPACE_MESSAGE;
    }
    if (!trimmed.includes('@')) {
      return EMAIL_MISSING_AT_MESSAGE;
    }
    const domain = trimmed.split('@')[1] || '';
    if (!domain.trim()) {
      return EMAIL_MISSING_DOMAIN_MESSAGE;
    }
    if (!validateEmail(trimmed)) {
      return EMAIL_INVALID_MESSAGE;
    }
    return '';
  }

  function getEmailWarning(value) {
    const trimmed = String(value || '').trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) return '';
    if (/\.\./.test(trimmed)) return 'E-mail com pontos consecutivos. Confira se esta correto.';
    const parts = trimmed.split('@');
    if (parts.length !== 2) return 'E-mail incompleto. Verifique.';
    const [local, domain] = parts;
    if (!local || local.length < 2) return 'E-mail muito curto. Verifique se esta correto.';
    if (!domain || domain.length < 4 || !domain.includes('.')) {
      return 'Dominio do e-mail incompleto. Verifique.';
    }
    if (domain.startsWith('-') || domain.endsWith('-')) {
      return 'Dominio do e-mail invalido. Verifique.';
    }
    const tld = domain.split('.').pop() || '';
    if (tld.length < 2) return 'Dominio do e-mail invalido. Verifique.';
    const disposableDomains = new Set([
      'mailinator.com',
      '10minutemail.com',
      'guerrillamail.com',
      'temp-mail.org',
      'yopmail.com',
    ]);
    if (disposableDomains.has(domain)) {
      return 'E-mail temporario detectado. Prefira um e-mail valido.';
    }
    return '';
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

  function levenshtein(a, b) {
    const s = String(a || '');
    const t = String(b || '');
    const m = s.length;
    const n = t.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  function getEmailSuggestion(value) {
    const trimmed = String(value || '').trim().toLowerCase();
    if (!trimmed) return '';
    const parts = trimmed.split('@');
    if (parts.length !== 2) return '';
    const [local, domain] = parts;
    if (!local || !domain) return '';
    const commonDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];
    if (commonDomains.includes(domain)) return '';
    let best = '';
    let bestScore = Infinity;
    commonDomains.forEach((candidate) => {
      const score = levenshtein(domain, candidate);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    });
    if (best && bestScore <= 2) {
      return `${local}@${best}`;
    }
    return '';
  }

  const META_OPEN = '<sgvc-meta>';
  const META_CLOSE = '</sgvc-meta>';

  function parseNotesMeta(value) {
    const payload = String(value || '');
    const start = payload.indexOf(META_OPEN);
    if (start === -1) {
      return { text: payload.trim(), metadata: {} };
    }
    const end = payload.indexOf(META_CLOSE, start);
    if (end === -1) {
      return { text: payload.trim(), metadata: {} };
    }
    const metaPart = payload.slice(start + META_OPEN.length, end).trim();
    let metadata = {};
    try {
      metadata = JSON.parse(metaPart);
    } catch (_err) {
      metadata = {};
    }
    const textOnly = payload.slice(0, start).trim();
    return { text: textOnly, metadata };
  }

  function buildNotesWithMeta(notes, metadata) {
    const cleanNotes = String(notes || '').trim();
    const safeMeta = {};
    if (metadata && typeof metadata === 'object') {
      Object.keys(metadata).forEach((key) => {
        const value = metadata[key];
        if (value == null) return;
        const textValue = String(value).trim();
        if (textValue) safeMeta[key] = textValue;
      });
    }
    if (!Object.keys(safeMeta).length) {
      return cleanNotes || null;
    }
    const metaPayload = `${META_OPEN}${JSON.stringify(safeMeta)}${META_CLOSE}`;
    return cleanNotes ? `${cleanNotes}\n${metaPayload}` : metaPayload;
  }

  function getNameValidationError(value) {
    const trimmed = String(value || '').trim();
    if (trimmed.length < NAME_MIN_LENGTH || trimmed.length > NAME_MAX_LENGTH) {
      return NAME_LENGTH_MESSAGE;
    }
    if (!NAME_ALLOWED_REGEX.test(trimmed)) {
      return NAME_INVALID_CHARS_MESSAGE;
    }
    if (!/\p{L}/u.test(trimmed)) {
      return NAME_LETTER_MESSAGE;
    }
    return '';
  }

  function getPhoneValidationError(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return PHONE_REQUIRED_MESSAGE;
    if (/[A-Za-z]/.test(trimmed)) return PHONE_LETTER_MESSAGE;
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return PHONE_REQUIRED_MESSAGE;
    if (digits.length < 10) return PHONE_DDD_MESSAGE;
    if (digits.length > 11) return PHONE_INVALID_MESSAGE;
    if (!validatePhone(trimmed)) return PHONE_INVALID_MESSAGE;
    return '';
  }

  function getBirthDateValidationError(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return BIRTH_FORMAT_MESSAGE;
    const parsed = parseBirthDate(raw);
    if (!parsed) return BIRTH_FORMAT_MESSAGE;
    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (parsed.getTime() > normalizedToday.getTime()) return BIRTH_FUTURE_MESSAGE;
    return '';
  }

  function getCepValidationError(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/[A-Za-z]/.test(raw)) return CEP_INVALID_CHAR_MESSAGE;
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return CEP_DIGITS_MESSAGE;
    return '';
  }

  function getAddressStreetValidationError(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (trimmed.length < ADDRESS_STREET_MIN_LENGTH) return ADDRESS_STREET_LENGTH_MESSAGE;
    if (ADDRESS_STREET_INVALID_PATTERN.test(trimmed)) return ADDRESS_STREET_INVALID_MESSAGE;
    return '';
  }

  function isSnAddressNumber(value) {
    const normalized = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[\s\\/.\-]/g, '');
    return normalized === 'SN';
  }

  function getAddressNumberValidationError(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (!/^\d+$/.test(trimmed) && !isSnAddressNumber(trimmed)) return ADDRESS_NUMBER_INVALID;
    return '';
  }

  function getAddressNeighborhoodValidationError(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return '';
  }

  function getAddressStateValidationError(value) {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return '';
    if (!VALID_UFS.has(normalized)) return ADDRESS_STATE_INVALID;
    return '';
  }

  function getAddressCityValidationError(value, uf) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const normalizedUf = String(uf || '').trim().toUpperCase();
    
    // Se a UF não está definida ou é inválida, requer UF antes de validar cidade
    if (!normalizedUf || !VALID_UFS.has(normalizedUf)) {
      return ''; // Não valida cidade se UF não está válida (a validação de UF já trata isso)
    }
    
    // Validação básica: cidade deve ter pelo menos 3 caracteres e conter pelo menos uma letra
    if (trimmed.length < 3) {
      return ADDRESS_CITY_INVALID;
    }
    
    if (!/\p{L}/u.test(trimmed)) {
      return ADDRESS_CITY_INVALID;
    }
    
    // CORREÇÃO APLICADA: Aceita qualquer cidade válida quando a UF está válida
    // Permite entrada manual tanto para PF quanto PJ
    // O conjunto IBGE é apenas uma ajuda (autocomplete), não uma restrição obrigatória
    // Isso resolve o problema onde "Recife" para "PE" era rejeitado mesmo sendo válido
    
    // Se o conjunto IBGE estiver disponível, faz uma verificação opcional
    // mas NÃO bloqueia se não encontrar - permite entrada manual sempre
    if (currentCitySet && currentCityUf === normalizedUf && currentCitySet.size > 0) {
      const normalizedCity = trimmed.toLowerCase();
      // Busca exata ou parcial no conjunto do IBGE (case-insensitive)
      const foundInSet = currentCitySet.has(normalizedCity) || 
        Array.from(currentCitySet).some((city) => {
          const cityLower = String(city || '').trim().toLowerCase();
          return cityLower === normalizedCity || 
                 cityLower.includes(normalizedCity) || 
                 normalizedCity.includes(cityLower);
        });
      
      // Se encontrou no conjunto IBGE, aceita
      if (foundInSet) {
        return '';
      }
    }
    
    // Aceita entrada manual: qualquer cidade válida (3+ caracteres com letras) é aceita
    // quando a UF está válida, tanto para PF quanto PJ
    // Isso permite casos onde:
    // - Cidade foi digitada manualmente
    // - Cidade foi preenchida via CEP (ex: Recife/PE)
    // - Conjunto IBGE não foi carregado ainda
    // - Cidade existe mas não está no conjunto carregado
    return ''; // Cidade válida - aceita entrada manual
  }

  // REMOVIDO: currentCityUf e currentCitySet já foram declarados anteriormente (linha ~231-232)

  function resetCityOptions() {
    currentCityUf = '';
    currentCitySet = null;
  }

  function updateCityOptions(uf, items) {
    const normalizedUf = String(uf || '').trim().toUpperCase();
    currentCityUf = normalizedUf;
    if (!items || !items.length) {
      currentCitySet = null;
      return;
    }
    currentCitySet = new Set(items.map((value) => String(value || '').trim().toLowerCase()));
  }

  function validateName(value) {
    return !getNameValidationError(value);
  }

  function showEmailWarning(text) {
    if (!createEmailWarning) return;
    createEmailWarning.textContent = text || '';
    createEmailWarning.hidden = !text;
  }

  function handleAuthFailure(err) {
    if (!err || (err.status !== 401 && err.status !== 403)) return false;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (_e) {
      // Ignora erros ao limpar storage
    }
    window.location.href = '/';
    return true;
  }

  /**
   * Normaliza erro da API para mensagem amigável
   */
  function normalizeError(err) {
    if (window.SGVCErrorHandler && window.SGVCErrorHandler.normalizeApiError) {
      return window.SGVCErrorHandler.normalizeApiError(err);
    }
    return err && err.message ? err.message : 'Erro ao processar solicitação. Tente novamente.';
  }

  /**
   * Define erro em um campo do formulário
   */
  function setFieldError(input, errorEl, message) {
    if (!input) return;
    input.classList.add('is-danger');
    input.classList.remove('is-success', 'is-valid');
    input.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
    }
  }

  /**
   * Limpa erro de um campo do formulário
   */
  function clearFieldError(input, errorEl) {
    if (!input) return;
    input.classList.remove('is-danger', 'is-success', 'is-valid');
    input.setAttribute('aria-invalid', 'false');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  /**
   * Define status de CEP
   */
  function setCepStatus(message, isError = false) {
    const cepStatusEl = document.getElementById('cep-status');
    if (!cepStatusEl) return;
    cepStatusEl.textContent = message || '';
    cepStatusEl.hidden = !message;
    if (message) {
      cepStatusEl.classList.toggle('is-danger', isError);
      cepStatusEl.classList.toggle('clients-field-hint', !isError);
    }
  }

  async function fetchWithTimeout(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('request_failed');
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function displayUfStatus(text, duration = 0) {
    if (!ufStatus) return;
    if (ufStatusTimer) {
      clearTimeout(ufStatusTimer);
      ufStatusTimer = null;
    }
    const trimmed = text || '';
    ufStatus.textContent = trimmed;
    ufStatus.hidden = !trimmed;
    if (trimmed && duration > 0) {
      ufStatusTimer = setTimeout(() => {
        ufStatus.textContent = '';
        ufStatus.hidden = true;
        ufStatusTimer = null;
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

  async function loadStates() {
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
          displayUfStatus('Unidades federativas carregadas. VocÃª pode digitar manualmente.', 4000);
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
        displayUfStatus('Unidades federativas carregadas. VocÃª pode digitar manualmente.', 4000);
        return;
      }
      throw new Error('empty_states');
    } catch (_err) {
      renderUfOptions(FALLBACK_UFS);
      displayUfStatus('NÃ£o foi possÃ­vel carregar o IBGE. Lista fixa disponÃ­vel como fallback.', 0);
    } finally {
      setAddressStateLoading(false);
    }
  }

  async function loadCities(uf) {
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

  function getPhoneLib() {
    return window.libphonenumber || {};
  }

  function validatePhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }
    const lib = getPhoneLib();
    if (lib.parsePhoneNumberFromString) {
      const phone = lib.parsePhoneNumberFromString(digits, 'BR');
      return Boolean(phone && phone.isValid());
    }
    return digits.length === 10 || digits.length === 11;
  }

  function updateWhatsAppLink(value) {
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

  function formatCnpj(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  function formatCpf(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  function validateCpf(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return true;
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    const calcDigit = (base, factorStart) => {
      let sum = 0;
      for (let i = 0; i < base.length; i += 1) {
        sum += Number(base[i]) * (factorStart - i);
      }
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const baseNine = digits.slice(0, 9);
    const digit1 = calcDigit(baseNine, 10);
    const digit2 = calcDigit(baseNine + digit1, 11);
    return digits === `${baseNine}${digit1}${digit2}`;
  }

  function formatDocument(value, type) {
    if (!value) return '-';
    if (type === 'PF') {
      const formatted = formatCpf(value);
      return formatted || '-';
    }
    const formatted = formatCnpj(value);
    return formatted || '-';
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

  function updateCreateTypeFields(type) {
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

  function setCreateMetaValue(key, value) {
    if (!key) return;
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      delete createMeta[key];
      return;
    }
    createMeta[key] = trimmed;
  }

  function validateCnpj(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length !== 14) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const calcDigit = (base, weights) => {
      const sum = base.split('').reduce((acc, digit, idx) => acc + Number(digit) * weights[idx], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const base12 = digits.slice(0, 12);
    const digit1 = calcDigit(base12, weights1);
    const digit2 = calcDigit(base12 + digit1, weights2);
    return digits === base12 + String(digit1) + String(digit2);
  }

  function setCnpjMessage(message, isError) {
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

  const BRAZIL_API_CNPJ_URL = 'https://brasilapi.com.br/api/cnpj/v1';

  function normalizeCnpjPayload(payload) {
    if (!payload || typeof payload !== 'object') return null;
    return {
      name: String(payload.razao_social || payload.nome || '').trim(),
      tradeName: String(payload.nome_fantasia || payload.fantasia || '').trim(),
      phone: normalizePhoneDigits(payload.ddd_telefone_1 || payload.telefone_1 || payload.telefone),
      addressStreet: String(payload.logradouro || '').trim(),
      addressNumber: String(payload.numero || '').trim(),
      addressComplement: String(payload.complemento || '').trim(),
      addressNeighborhood: String(payload.bairro || '').trim(),
      addressCity: String(payload.municipio || payload.cidade || '').trim(),
      addressState: String(payload.uf || '').trim(),
      addressPostalCode: String(payload.cep || '').trim(),
    };
  }

  function normalizePhoneDigits(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 8) return digits;
    if (digits.length === 10 || digits.length === 11) return digits;
    return '';
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

  async function fillCnpjFromServer(digits) {
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
      const err = new Error('CNPJ nao encontrado');
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

  function validateBirthDate(value) {
    return !getBirthDateValidationError(value);
  }

  function buildBirthHint(value) {
    if (!value) return '';
    const date = parseBirthDate(value);
    if (!date) return '';
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const m = now.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < date.getDate())) {
      age -= 1;
    }
    if (age < 0) {
      return 'Data de nascimento no futuro.';
    }
    if (age > 120) {
      return 'Data de nascimento fora do intervalo esperado.';
    }
    return `Idade aproximada: ${age} anos.`;
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

  function formatMoney(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return '-';
    return numberValue.toFixed(2).replace('.', ',');
  }

  function formatDateBR(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function parseBirthDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const raw = String(value);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const localDate = new Date(year, month, day);
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatBirthday(value) {
    const date = parseBirthDate(value);
    if (!date) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  function isBirthdaySoon(value, days = birthdayWindowDays) {
    const date = parseBirthDate(value);
    if (!date) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
    if (next < today) {
      next.setFullYear(next.getFullYear() + 1);
    }
    const diffDays = Math.round((next - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  }

  function getBirthdayFlag(customer) {
    if (customer && typeof customer.isBirthdaySoon === 'boolean') {
      return customer.isBirthdaySoon;
    }
    const value = customer ? customer.birth_date || customer.birthDate : '';
    return isBirthdaySoon(value);
  }

  function getCustomerAgeTag(customer) {
    if (!customer) return '';
    if (customer.isNew) return 'Novo';
    const createdAt = customer.created_at || customer.createdAt;
    if (!createdAt) return '';
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return '';
    const diffDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return 'Novo';
    if (diffDays >= 365) return 'Antigo';
    return '';
  }

  function getLoyaltyTag(customer) {
    const purchases = Number(customer.purchases || 0);
    const totalSpent = Number(customer.totalSpent || 0);
    if (purchases >= LOYAL_PURCHASES || totalSpent >= LOYAL_TOTAL) return 'Fiel';
    if (purchases >= FREQUENT_MIN) return 'Frequente';
    if (purchases >= 1) return 'Ativo';
    return '';
  }

  function updateBirthdayInsight() {
    if (!birthdayInsight) return;
    const count = customersCache.filter((customer) => getBirthdayFlag(customer)).length;
    birthdayInsight.textContent =
      count > 0
        ? `Aniversariantes nos pr\u00f3ximos ${birthdayWindowDays} dias: ${count}`
        : `Sem aniversariantes nos pr\u00f3ximos ${birthdayWindowDays} dias`;
  }

  function matchesFilter(customer) {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'birthdays') {
      return getBirthdayFlag(customer);
    }
    if (activeFilter === 'loyal') {
      const tag = getLoyaltyTag(customer);
      return tag === 'Fiel' || tag === 'Frequente';
    }
    if (activeFilter === 'new') {
      if (typeof customer.isNew === 'boolean') return customer.isNew;
      return getCustomerAgeTag(customer) === 'Novo';
    }
    if (activeFilter === 'old') {
      return getCustomerAgeTag(customer) === 'Antigo';
    }
    return true;
  }

  function formatPhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }
    const lib = getPhoneLib();
    if (lib.AsYouType) {
      const typer = new lib.AsYouType('BR');
      return typer.input(digits);
    }
    if (digits.length <= 10) {
      return digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').trim();
    }
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3').trim();
  }

  function formatPostal(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (!digits) return '';
    if (digits.length <= 5) return digits;
    return digits.replace(/^(\d{5})(\d{0,3}).*/, '$1-$2').trim();
  }

  const MINOR_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

  function normalizeText(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (index > 0 && MINOR_WORDS.has(lower)) return lower;
        return lower
          .split('-')
          .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
          .join('-');
      })
      .join(' ');
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

  function updateLocationChips() {
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

  const VIA_CEP_URL = 'https://viacep.com.br/ws';

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
      const err = new Error('CEP nao encontrado');
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

  async function lookupCep(cep, token) {
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
        showMessage('CEP invalido. Digite 8 digitos.', 'is-danger');
        setCepStatus('CEP invalido. Digite 8 digitos.', true);
        return;
      }
      if (err.status === 404) {
        showMessage('CEP nao encontrado. Preencha manualmente.', 'is-danger');
        setCepStatus('CEP nao encontrado. Preencha manualmente.', true);
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

  function setFieldError(input, errorEl, message) {
    if (!input) return;
    input.classList.add('is-danger');
    input.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
    }
  }

  function clearFieldError(input, errorEl) {
    if (!input) return;
    input.classList.remove('is-danger');
    input.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  // Função setCepStatus já definida anteriormente (linha ~754)
  // Removida duplicata para evitar conflito

  function normalizeQuery(value) {
    return String(value || '').toLowerCase();
  }

  function compareByNameThenId(a, b) {
    const aName = String(a.name || '');
    const bName = String(b.name || '');
    const nameOrder = aName.localeCompare(bName, 'pt-BR', { sensitivity: 'base' });
    if (nameOrder !== 0) return nameOrder;
    return String(a.id || '').localeCompare(String(b.id || ''), 'en', { sensitivity: 'base' });
  }

  function updateSortLabel() {
    if (!nameHeader) return;
    if (sortField === 'name') {
      nameHeader.textContent = sortAsc ? 'Nome A-Z' : 'Nome Z-A';
      nameHeader.setAttribute('aria-sort', sortAsc ? 'ascending' : 'descending');
    } else {
      nameHeader.textContent = 'Nome';
      nameHeader.setAttribute('aria-sort', 'none');
    }
    if (spentHeader) {
      spentHeader.setAttribute('aria-sort', sortField === 'spent' ? (sortAsc ? 'ascending' : 'descending') : 'none');
    }
  }

  function getFilteredItems() {
    const query = normalizeQuery(searchInput ? searchInput.value : '');
    const validCache = Array.isArray(customersCache) ? customersCache : [];
    const baseList = validCache.slice().sort((a, b) => {
      if (sortField === 'spent') {
        const aSpent = Number(a.totalSpent || a.total_spent || 0);
        const bSpent = Number(b.totalSpent || b.total_spent || 0);
        const order = aSpent - bSpent;
        if (order === 0) {
          const tie = compareByNameThenId(a, b);
          return sortAsc ? tie : -tie;
        }
        return sortAsc ? order : -order;
      }
      const nameOrder = compareByNameThenId(a, b);
      return sortAsc ? nameOrder : -nameOrder;
    });
    const filteredByQuery = !query ? baseList : baseList.filter((customer) => {
      const name = normalizeQuery(customer.name);
      const email = normalizeQuery(customer.email);
      const phone = normalizeQuery(customer.phone);
      const cpf = normalizeQuery(customer.cpf || '');
      const cnpj = normalizeQuery(customer.cnpj || '');
      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        cpf.includes(query) ||
        cnpj.includes(query)
      );
    });
    return filteredByQuery.filter(matchesFilter);
  }

  function updatePagination(total) {
    if (!pagination) return;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    pagination.hidden = totalPages <= 1;
    if (pageInfo) {
      const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
      const end = Math.min(currentPage * PAGE_SIZE, total);
      pageInfo.textContent = `Mostrando ${start}-${end} de ${total} clientes`;
    }
    if (pageList) {
      pageList.innerHTML = '';
      const maxButtons = 5;
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxButtons - 1);
      if (end - start < maxButtons - 1) {
        start = Math.max(1, end - maxButtons + 1);
      }
      if (start > 1) {
        const first = document.createElement('button');
        first.className = 'button is-light is-small';
        first.textContent = '1';
        first.addEventListener('click', () => {
          currentPage = 1;
          renderPage();
        });
        pageList.appendChild(first);
        if (start > 2) {
          const dots = document.createElement('span');
          dots.className = 'clients-page-ellipsis';
          dots.textContent = '...';
          pageList.appendChild(dots);
        }
      }
      for (let page = start; page <= end; page += 1) {
        const btn = document.createElement('button');
        btn.className = 'button is-light is-small';
        btn.textContent = String(page);
        btn.setAttribute('aria-label', `P\u00e1gina ${page}`);
        if (page === currentPage) {
          btn.classList.add('is-link');
          btn.setAttribute('aria-current', 'page');
        }
        btn.addEventListener('click', () => {
          currentPage = page;
          renderPage();
        });
        pageList.appendChild(btn);
      }
      if (end < totalPages) {
        if (end < totalPages - 1) {
          const dots = document.createElement('span');
          dots.className = 'clients-page-ellipsis';
          dots.textContent = '...';
          pageList.appendChild(dots);
        }
        const last = document.createElement('button');
        last.className = 'button is-light is-small';
        last.textContent = String(totalPages);
        last.setAttribute('aria-label', `P\u00e1gina ${totalPages}`);
        last.addEventListener('click', () => {
          currentPage = totalPages;
          renderPage();
        });
        pageList.appendChild(last);
      }
    }
    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage === totalPages;
    if (pageJumpInput) {
      pageJumpInput.value = String(currentPage);
      pageJumpInput.max = String(totalPages);
      pageJumpInput.disabled = totalPages <= 1;
    }
    if (pageJumpBtn) {
      pageJumpBtn.disabled = totalPages <= 1;
    }
  }

  function renderTable(items) {
    tableBody.innerHTML = '';
    if (!items || !items.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 8;
      emptyCell.textContent = 'Nenhum cliente encontrado. Tente buscar por outro nome ou e-mail.';
      emptyRow.appendChild(emptyCell);
      tableBody.appendChild(emptyRow);
      return;
    }
    items.forEach((customer) => {
      const row = document.createElement('tr');
      row.classList.add('clients-row');
      const safeName = String(customer.name || 'Sem nome');
      const notesCandidate = customer.notes || customer.note || '';
      const notesData = parseNotesMeta(notesCandidate);
      const notesText = notesData.text;
      const meta = notesData.metadata;
      const docValue = customer.cpf || customer.cnpj || '';
      const numericDoc = String(docValue || '').replace(/\D/g, '');
      let docTypeGuess = '';
      if (numericDoc.length === 11) {
        docTypeGuess = 'PF';
      } else if (numericDoc.length === 14) {
        docTypeGuess = 'PJ';
      }
      const docType = meta.type || docTypeGuess;
      const hasNotes = Boolean(notesText);
      const birthdayValue = customer.birth_date || customer.birthDate;
      const birthday = formatBirthday(birthdayValue);
      const birthdaySoon = getBirthdayFlag(customer);
      const since = formatDateBR(customer.created_at || customer.createdAt);
      const totalSpentValue = Number(customer.totalSpent || customer.total_spent || 0);
      const totalSpent = formatMoney(totalSpentValue);
      const isTopBuyer = totalSpentValue >= LOYAL_TOTAL;
      const loyaltyTag = getLoyaltyTag(customer);
      const ageTag = getCustomerAgeTag(customer);
      const tags = [loyaltyTag, ageTag].filter(Boolean);

      const tdName = document.createElement('td');
      const nameBtn = document.createElement('button');
      nameBtn.className = 'clients-name-link';
      nameBtn.type = 'button';
      nameBtn.dataset.id = String(customer.id ?? '');
      nameBtn.setAttribute('aria-label', `Editar cliente ${safeName}`);
      nameBtn.appendChild(document.createTextNode(safeName));
      if (isTopBuyer) {
        const star = document.createElement('span');
        star.className = 'top-buyer';
        star.setAttribute('aria-label', 'Cliente que compra mais');
        star.textContent = '⭐';
        nameBtn.appendChild(document.createTextNode(' '));
        nameBtn.appendChild(star);
      }
      if (hasNotes) {
        const notes = document.createElement('span');
        notes.className = 'notes-badge';
        notes.setAttribute('aria-label', 'Cliente com observações');
        notes.textContent = '📝';
        nameBtn.appendChild(document.createTextNode(' '));
        nameBtn.appendChild(notes);
      }
      tdName.appendChild(nameBtn);

      const tdEmail = document.createElement('td');
      tdEmail.textContent = String(customer.email || '-');

      const tdDoc = document.createElement('td');
      tdDoc.textContent = String(formatDocument(docValue, docType) || '-');

      const tdPhone = document.createElement('td');
      tdPhone.className = 'has-text-right';
      tdPhone.textContent = String(customer.phone || '-');

      const tdSpent = document.createElement('td');
      tdSpent.className = `has-text-right ${isTopBuyer ? 'top-buyer-total' : ''}`.trim();
      tdSpent.textContent = `R$ ${totalSpent}`;

      const tdBirthday = document.createElement('td');
      if (birthdaySoon) tdBirthday.classList.add('birthday-soon');
      tdBirthday.appendChild(document.createTextNode(String(birthday || '-')));
      if (birthdaySoon) {
        const badge = document.createElement('span');
        badge.className = 'birthday-badge';
        badge.setAttribute('aria-label', 'Aniversário próximo');
        badge.textContent = '🎁';
        tdBirthday.appendChild(document.createTextNode(' '));
        tdBirthday.appendChild(badge);
      }

      const tdSince = document.createElement('td');
      tdSince.textContent = String(since || '-');

      const tdTags = document.createElement('td');
      if (tags.length) {
        tags.forEach((tag) => {
          const span = document.createElement('span');
          span.className = 'client-tag';
          span.textContent = String(tag);
          tdTags.appendChild(span);
        });
      } else {
        const span = document.createElement('span');
        span.className = 'client-tag is-muted';
        span.textContent = 'Sem compras';
        tdTags.appendChild(span);
      }

      row.appendChild(tdName);
      row.appendChild(tdEmail);
      row.appendChild(tdDoc);
      row.appendChild(tdPhone);
      row.appendChild(tdSpent);
      row.appendChild(tdBirthday);
      row.appendChild(tdSince);
      row.appendChild(tdTags);
      tableBody.appendChild(row);
    });
  }

  function renderPage() {
    const filtered = getFilteredItems();
    const total = filtered.length;
    if (clientsTotal) {
      clientsTotal.textContent = `(${total})`;
    }
    updateBirthdayInsight();
    updatePagination(total);
    updateSortLabel();
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    renderTable(pageItems);
  }


  async function loadCustomers(token, showSkeleton = true) {
    // Mostra skeleton loading se solicitado
    if (showSkeleton && window.SGVCSkeleton && tableBody) {
      const skeleton = window.SGVCSkeleton.createTableSkeleton(5, 8);
      tableBody.innerHTML = '';
      tableBody.appendChild(skeleton.querySelector('tbody'));
    }
    
    try {
      // Tenta usar paginação se disponível, senão usa formato antigo
      // currentPage e PAGE_SIZE podem estar definidos globalmente no escopo
      const page = typeof currentPage !== 'undefined' ? currentPage : 1;
      const limit = typeof PAGE_SIZE !== 'undefined' ? PAGE_SIZE : 10;
      const url = `/api/customers?page=${page}&limit=${limit}`;
      
      const data = await apiRequest(url, token);
      
      // Suporta tanto formato paginado quanto formato antigo (backward compatibility)
      if (data && data.items && data.pagination) {
        // Dados paginados do servidor
        customersCache = data.items || [];
        const total = data.pagination.total || 0;
        if (clientsTotal) {
          clientsTotal.textContent = `(${total})`;
        }
        updateBirthdayInsight();
        // Atualiza paginação baseada no total do servidor
        // Atualiza currentPage se necessário
        if (typeof currentPage !== 'undefined') {
          const serverPage = data.pagination.page || 1;
          if (currentPage !== serverPage) {
            // Ajusta currentPage se necessário (por exemplo, se mudou no servidor)
            currentPage = serverPage;
          }
        }
        updatePagination(total);
        updateSortLabel();
        renderTable(customersCache);
      } else {
        // Formato antigo (array simples) - usa paginação client-side
        customersCache = Array.isArray(data) ? data : (data && data.items && Array.isArray(data.items) ? data.items : []);
        if (typeof currentPage !== 'undefined') {
          currentPage = 1;
        }
        renderPage();
      }
    } catch (err) {
      // Remove skeleton em caso de erro
      if (showSkeleton && window.SGVCSkeleton && tableBody) {
        window.SGVCSkeleton.removeSkeletons(tableBody);
      }
      
      if (handleAuthFailure(err)) throw err;
      const friendlyMessage = normalizeError(err);
      throw new Error(friendlyMessage);
    } finally {
      // Remove skeleton após carregamento
      if (showSkeleton && window.SGVCSkeleton && tableBody) {
        window.SGVCSkeleton.removeSkeletons(tableBody);
      }
    }
  }

  const flagCleanupTimers = {};

  function scheduleFlagRemoval(flag, delayMs = 1200) {
    if (flagCleanupTimers[flag]) {
      clearTimeout(flagCleanupTimers[flag]);
    }
    flagCleanupTimers[flag] = setTimeout(() => {
      sessionStorage.removeItem(flag);
      delete flagCleanupTimers[flag];
    }, delayMs);
  }

  function handlePostNavigationFlags() {
    const deletedFlag = sessionStorage.getItem(DELETE_FLAG);
    if (deletedFlag) {
      showMessage('Cliente removido com sucesso.', 'is-success');
      scheduleFlagRemoval(DELETE_FLAG);
      // Recarrega a lista para atualizar os dados
      loadCustomers(null).catch((err) => {
        if (handleAuthFailure(err)) return;
        const friendlyMessage = normalizeError(err);
        console.error('Erro ao recarregar lista após remoção:', friendlyMessage);
      });
    }
    const updatedFlag = sessionStorage.getItem(UPDATED_FLAG);
    if (updatedFlag) {
      showMessage('Cliente atualizado com sucesso.', 'is-success');
      scheduleFlagRemoval(UPDATED_FLAG);
      // Recarrega a lista para atualizar os dados (incluindo CPF/CNPJ)
      loadCustomers(null).catch((err) => {
        if (handleAuthFailure(err)) return;
        const friendlyMessage = normalizeError(err);
        console.error('Erro ao recarregar lista após atualização:', friendlyMessage);
      });
    }
  }

  // Auth: valida sessão via /api/auth/me (cookie HttpOnly)
  const session = { token: null };

  const storedWindow = Number(localStorage.getItem(BIRTHDAY_WINDOW_KEY));
  if (BIRTHDAY_WINDOW_OPTIONS.includes(storedWindow)) {
    birthdayWindowDays = storedWindow;
  }
  if (birthdayWindowSelect) {
    birthdayWindowSelect.value = String(birthdayWindowDays);
    birthdayWindowSelect.addEventListener('change', () => {
      const value = Number(birthdayWindowSelect.value);
      birthdayWindowDays = BIRTHDAY_WINDOW_OPTIONS.includes(value) ? value : 7;
      localStorage.setItem(BIRTHDAY_WINDOW_KEY, String(birthdayWindowDays));
      renderPage();
    });
  }

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

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showMessage('');
      refreshBtn.classList.add('is-loading');
      refreshBtn.disabled = true;
      requireAuth()
        .then((user) => {
          if (!user) return;
          return loadCustomers(null);
        })
        .catch((err) => {
          if (handleAuthFailure(err)) return;
          const friendlyMessage = normalizeError(err);
          showMessage(friendlyMessage, 'is-danger');
        })
        .finally(() => {
          refreshBtn.classList.remove('is-loading');
          refreshBtn.disabled = false;
        });
    });
  }

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
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
        const notesPayload = buildNotesWithMeta(createNotes ? createNotes.value : '', createMeta);
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
        createMeta = { type: '', tradeName: '', complement: '' };
        if (createType) {
          createType.value = '';
          updateCreateTypeFields('');
        }
        await loadCustomers(null);
        if (searchInput) {
          searchInput.value = name;
          currentPage = 1;
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

  if (tableBody) {
    tableBody.addEventListener('click', (event) => {
      const btn = event.target.closest('.clients-name-link');
      if (!btn) return;
      const id = btn.dataset.id;
      window.location.href = `/client-edit.html?id=${encodeURIComponent(id)}`;
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1;
      renderPage();
    });
  }

  if (filterButtons && filterButtons.length) {
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter || 'all';
        filterButtons.forEach((item) => {
          const isActive = item === btn;
          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        currentPage = 1;
        renderPage();
      });
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
        setCnpjMessage('CNPJ invalido. Use 14 digitos.', true);
        return;
      }
      const digits = value.replace(/\D/g, '');
      try {
        await fillCnpjFromServer(digits);
      } catch (err) {
        if (handleAuthFailure(err)) return;
        if (err.status === 404) {
          setCnpjMessage('CNPJ nao encontrado.', true);
          return;
        }
        setCnpjMessage('Nao foi possivel consultar o CNPJ agora.', true);
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
        // Garante que a sessão está disponível
        if (!session || !session.token) {
          setCepStatus('Sessão inválida. Faça login novamente.', true);
          return;
        }
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
    const isDirty = Object.keys(current).some((key) => current[key] !== createInitialState[key]);
    updateCreateButtonState(isDirty, current);
  }

  function updateCreateButtonState(isDirtyOverride, snapshotOverride) {
    if (!createSubmit) return;
    const snapshot = snapshotOverride || getCreateSnapshot();
    const dirty =
      typeof isDirtyOverride === 'boolean'
        ? isDirtyOverride
        : Object.keys(snapshot).some((key) => snapshot[key] !== createInitialState[key]);
    createSubmit.disabled = isSubmitting || !dirty;
  }

  loadStates();

  if (nameHeader) {
    nameHeader.addEventListener('click', () => {
      sortField = 'name';
      sortAsc = !sortAsc;
      currentPage = 1;
      renderPage();
    });
  }

  if (spentHeader) {
    spentHeader.addEventListener('click', () => {
      if (sortField !== 'spent') {
        sortField = 'spent';
        sortAsc = false;
      } else {
        sortAsc = !sortAsc;
      }
      currentPage = 1;
      renderPage();
    });
  }

  if (prevPage) {
    prevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderPage();
      }
    });
  }

  if (nextPage) {
    nextPage.addEventListener('click', () => {
      const totalPages = Math.ceil(getFilteredItems().length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderPage();
      }
    });
  }

  function goToPage(targetPage) {
    const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / PAGE_SIZE));
    const next = Math.min(Math.max(1, targetPage), totalPages);
    if (next !== currentPage) {
      currentPage = next;
      renderPage();
    }
  }

  if (pageJumpBtn) {
    pageJumpBtn.addEventListener('click', () => {
      if (!pageJumpInput) return;
      const value = Number(pageJumpInput.value);
      if (Number.isFinite(value)) {
        goToPage(Math.trunc(value));
      }
    });
  }

  if (pageJumpInput) {
    pageJumpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = Number(pageJumpInput.value);
        if (Number.isFinite(value)) {
          goToPage(Math.trunc(value));
        }
      }
    });
  }

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
      
      if (!session || !session.token) {
        console.error('[EXPORT] ❌ Sessão inválida');
        showMessage('Sessão inválida. Faça login novamente.', 'is-danger');
        return;
      }

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
})();
