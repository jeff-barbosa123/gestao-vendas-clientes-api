/**
 * Estado de alterações não salvas e habilitação do botão Salvar.
 */
import {
  addressCityInput,
  addressNeighborhoodInput,
  addressNumberInput,
  addressPostalInput,
  addressStreetInput,
  birthDateInput,
  cnpjInput,
  editAddressComplement,
  editCpf,
  editTradeName,
  editType,
  emailInput,
  nameInput,
  notesInput,
  phoneInput,
  saveBtn,
} from './dom.js';
import { state } from './state.js';

export function updateDirtyState() {
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
  saveBtn.disabled = !(isDirty || (window.SGVC && window.SGVC.customFields && window.SGVC.customFields.isDirty(document.getElementById('edit-form'))));
}
