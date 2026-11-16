/**
 * Formatadores, parsers e tags (documentos, telefone, datas, aniversário, fidelidade).
 */
import {
  FREQUENT_MIN,
  LOYAL_PURCHASES,
  LOYAL_TOTAL,
  META_CLOSE,
  META_OPEN,
  MINOR_WORDS,
} from './constants.js';
import { state } from './state.js';
import { getPhoneLib } from './validators.js';

const safeString = window.safeString || ((value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
});

export const safeValue = window.safeValue || ((value, fallback = '') => {
  const normalized = safeString(value);
  if (normalized !== '') return normalized;
  return safeString(fallback);
});

export function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function parseNotesMeta(value) {
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

export function buildNotesWithMeta(notes, metadata) {
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

export function formatCnpj(value) {
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

export function formatCpf(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatDocument(value, type) {
  if (!value) return '-';
  if (type === 'PF') {
    const formatted = formatCpf(value);
    return formatted || '-';
  }
  const formatted = formatCnpj(value);
  return formatted || '-';
}

export function normalizeCnpjPayload(payload) {
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

export function buildBirthHint(value) {
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

export function formatMoney(value) {
  return window.SGVC.utils.formatMoney(value);
}

export function formatDateBR(value) {
  if (!value) return '-';
  // Datas "só data" (ex.: nascimento) vêm como YYYY-MM-DD ou meia-noite UTC:
  // ler os componentes em UTC evita exibir o dia anterior no fuso do Brasil.
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(dateOnly ? date.getUTCDate() : date.getDate()).padStart(2, '0');
  const month = String((dateOnly ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, '0');
  const year = dateOnly ? date.getUTCFullYear() : date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseBirthDate(value) {
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

export function formatBirthday(value) {
  const date = parseBirthDate(value);
  if (!date) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function isBirthdaySoon(value, days = state.birthdayWindowDays) {
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

export function getBirthdayFlag(customer) {
  if (customer && typeof customer.isBirthdaySoon === 'boolean') {
    return customer.isBirthdaySoon;
  }
  const value = customer ? customer.birth_date || customer.birthDate : '';
  return isBirthdaySoon(value);
}

export function getCustomerAgeTag(customer) {
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

export function getLoyaltyTag(customer) {
  const purchases = Number(customer.purchases || 0);
  const totalSpent = Number(customer.totalSpent || 0);
  if (purchases >= LOYAL_PURCHASES || totalSpent >= LOYAL_TOTAL) return 'Fiel';
  if (purchases >= FREQUENT_MIN) return 'Frequente';
  if (purchases >= 1) return 'Ativo';
  return '';
}

export function formatPhone(value) {
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

export function formatPostal(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return digits.replace(/^(\d{5})(\d{0,3}).*/, '$1-$2').trim();
}

export function normalizeText(value) {
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

// Função setCepStatus já definida anteriormente (linha ~754)
// Removida duplicata para evitar conflito

export function normalizeQuery(value) {
  return String(value || '').toLowerCase();
}
