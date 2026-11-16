/**
 * Metadados nas observações e campos condicionais por tipo de cliente.
 */
import { META_CLOSE, META_OPEN } from './constants.js';
import { editCnpjField, editCpfField, editNameLabelText, editTradeNameField } from './dom.js';
import { state } from './state.js';

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

export function updateEditTypeFields(type) {
  const normalized = String(type || '').trim().toUpperCase();
  toggleConditionalField(editCpfField, normalized === 'PF');
  toggleConditionalField(editTradeNameField, normalized === 'PJ');
  toggleConditionalField(editCnpjField, normalized !== 'PF');
  if (editNameLabelText) {
    if (normalized === 'PF') editNameLabelText.textContent = 'Nome da pessoa';
    else if (normalized === 'PJ') editNameLabelText.textContent = 'Razão social';
    else editNameLabelText.textContent = 'Nome';
  }
  setEditMetaValue('type', normalized);
}

export function setEditMetaValue(key, value) {
  if (!key) return;
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    delete state.editMeta[key];
    return;
  }
  state.editMeta[key] = trimmed;
}
