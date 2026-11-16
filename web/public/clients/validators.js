/**
 * ValidaÃ§Ãµes dos campos do cadastro (e-mail, nome, telefone, nascimento, CEP, endereÃ§o, CPF/CNPJ).
 */
import {
  ADDRESS_CITY_INVALID,
  ADDRESS_NUMBER_INVALID,
  ADDRESS_STATE_INVALID,
  ADDRESS_STREET_INVALID_MESSAGE,
  ADDRESS_STREET_INVALID_PATTERN,
  ADDRESS_STREET_LENGTH_MESSAGE,
  ADDRESS_STREET_MIN_LENGTH,
  BIRTH_FORMAT_MESSAGE,
  BIRTH_FUTURE_MESSAGE,
  CEP_DIGITS_MESSAGE,
  CEP_INVALID_CHAR_MESSAGE,
  EMAIL_INVALID_MESSAGE,
  EMAIL_MISSING_AT_MESSAGE,
  EMAIL_MISSING_DOMAIN_MESSAGE,
  EMAIL_REQUIRED_MESSAGE,
  EMAIL_SPACE_MESSAGE,
  NAME_ALLOWED_REGEX,
  NAME_INVALID_CHARS_MESSAGE,
  NAME_LENGTH_MESSAGE,
  NAME_LETTER_MESSAGE,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PHONE_DDD_MESSAGE,
  PHONE_INVALID_MESSAGE,
  PHONE_LETTER_MESSAGE,
  PHONE_REQUIRED_MESSAGE,
  VALID_UFS,
} from './constants.js';
import { state } from './state.js';
import { parseBirthDate } from './formatters.js';

function validateEmail(value) {
  const candidate = String(value || '');
  if (/\s/.test(candidate)) return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

export function sanitizeEmailInput(value) {
  const raw = String(value || '').trim();
  return raw.toLowerCase();
}

export function getEmailValidationError(value) {
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

export function getEmailWarning(value) {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed || !validateEmail(trimmed)) return '';
  if (/\.\./.test(trimmed)) return 'E-mail com pontos consecutivos. Confira se está correto.';
  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'E-mail incompleto. Verifique.';
  const [local, domain] = parts;
  if (!local || local.length < 2) return 'E-mail muito curto. Verifique se está correto.';
  if (!domain || domain.length < 4 || !domain.includes('.')) {
    return 'Domínio do e-mail incompleto. Verifique.';
  }
  if (domain.startsWith('-') || domain.endsWith('-')) {
    return 'Domínio do e-mail inválido. Verifique.';
  }
  const tld = domain.split('.').pop() || '';
  if (tld.length < 2) return 'Domínio do e-mail inválido. Verifique.';
  const disposableDomains = new Set([
    'mailinator.com',
    '10minutemail.com',
    'guerrillamail.com',
    'temp-mail.org',
    'yopmail.com',
  ]);
  if (disposableDomains.has(domain)) {
    return 'E-mail temporário detectado. Prefira um e-mail válido.';
  }
  return '';
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

export function getEmailSuggestion(value) {
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

export function getNameValidationError(value) {
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

export function getPhoneValidationError(value) {
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

export function getBirthDateValidationError(value) {
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

export function getCepValidationError(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/[A-Za-z]/.test(raw)) return CEP_INVALID_CHAR_MESSAGE;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 8) return CEP_DIGITS_MESSAGE;
  return '';
}

export function getAddressStreetValidationError(value) {
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

export function getAddressNumberValidationError(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (!/^\d+$/.test(trimmed) && !isSnAddressNumber(trimmed)) return ADDRESS_NUMBER_INVALID;
  return '';
}

export function getAddressNeighborhoodValidationError(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return '';
}

export function getAddressStateValidationError(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return '';
  if (!VALID_UFS.has(normalized)) return ADDRESS_STATE_INVALID;
  return '';
}

export function getAddressCityValidationError(value, uf) {
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
  if (state.currentCitySet && state.currentCityUf === normalizedUf && state.currentCitySet.size > 0) {
    const normalizedCity = trimmed.toLowerCase();
    // Busca exata ou parcial no conjunto do IBGE (case-insensitive)
    const foundInSet = state.currentCitySet.has(normalizedCity) || 
      Array.from(state.currentCitySet).some((city) => {
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

export function validateName(value) {
  return !getNameValidationError(value);
}

export function getPhoneLib() {
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

export function validateCpf(value) {
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

export function validateCnpj(value) {
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

export function validateBirthDate(value) {
  return !getBirthDateValidationError(value);
}
