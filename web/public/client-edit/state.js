/**
 * Estado mutável compartilhado da tela de edição de cliente.
 */
export const state = {
  original: {
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    addressStreet: '',
    addressNumber: '',
    addressNeighborhood: '',
    addressCity: '',
    addressPostalCode: '',
    cnpj: '',
    type: '',
    cpf: '',
    tradeName: '',
    complement: '',
    notes: '',
  },
  editMeta: { type: '', tradeName: '', complement: '' },
  messageTimer: null,
  customerId: undefined,
  unsavedGuard: null,
};
