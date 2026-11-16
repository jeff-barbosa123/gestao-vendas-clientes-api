/**
 * Estado mutável compartilhado da tela de clientes.
 */
export const state = {
  messageTimer: null,
  ufStatusTimer: null,
  isSubmitting: false,
  createMeta: { type: '', tradeName: '', complement: '' },
  createInitialState: undefined,
  currentPage: 1,
  customersCache: [],
  sortAsc: true,
  sortField: 'name',
  activeFilter: 'all',
  birthdayWindowDays: 14,
  currentCitySet: null,
  currentCityUf: '',
};
