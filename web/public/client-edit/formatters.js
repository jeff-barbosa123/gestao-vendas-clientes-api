/**
 * Formatação de telefone, WhatsApp, CEP, CNPJ, CPF e documento.
 */
import { phoneWhatsapp } from './dom.js';

export function formatPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').trim();
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3').trim();
}

export function updateWhatsAppLink(value) {
  if (!phoneWhatsapp) return;
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 11) {
    phoneWhatsapp.href = '#';
    phoneWhatsapp.setAttribute('aria-disabled', 'true');
    phoneWhatsapp.classList.add('is-disabled');
    return;
  }
  const phone = `55${digits}`;
  phoneWhatsapp.href = `https://wa.me/${phone}`;
  phoneWhatsapp.setAttribute('aria-disabled', 'false');
  phoneWhatsapp.classList.remove('is-disabled');
}

export function formatPostal(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return digits.replace(/^(\d{5})(\d{0,3}).*/, '$1-$2').trim();
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

function formatDocument(value, type) {
  if (!value) return '-';
  if (type === 'PF') {
    const formatted = formatCpf(value);
    return formatted || '-';
  }
  const formatted = formatCnpj(value);
  return formatted || '-';
}
