/**
 * Validações de e-mail, nome, documentos, telefone, nascimento e endereço.
 */
import {
  ADDRESS_NUMBER_INVALID,
  ADDRESS_NUMBER_REQUIRED,
  ADDRESS_STREET_INVALID_MESSAGE,
  ADDRESS_STREET_INVALID_PATTERN,
  ADDRESS_STREET_LENGTH_MESSAGE,
  ADDRESS_STREET_MIN_LENGTH,
  ADDRESS_STREET_REQUIRED,
} from './constants.js';
import { editBirthHint } from './dom.js';

export function validateEmail(value) {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return value.length <= 254 && emailRegex.test(value);
}

export function validateName(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  const nameRegex = /^[\p{L}\d\s&().'\/-]+$/u;
  return nameRegex.test(trimmed);
}

export function validateCnpj(value) {
  if (!value) return true;
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

export function validatePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  return digits.length === 10 || digits.length === 11;
}

export function validateBirthDate(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseBirthDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
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

function buildBirthHint(value) {
  if (!value || !validateBirthDate(value)) return '';
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

export function updateEditBirthHint(value) {
  if (!editBirthHint) return;
  const hint = buildBirthHint(value);
  editBirthHint.textContent = hint;
  editBirthHint.hidden = !hint;
}

export function normalizeText(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

export function getAddressStreetValidationError(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return ADDRESS_STREET_REQUIRED;
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
  if (!trimmed) return ADDRESS_NUMBER_REQUIRED;
  if (!/^\d+$/.test(trimmed) && !isSnAddressNumber(trimmed)) return ADDRESS_NUMBER_INVALID;
  return '';
}

export function validateCpf(value) {
  if (!value) return true;
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 11;
}
