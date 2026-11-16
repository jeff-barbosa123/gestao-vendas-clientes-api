/**
 * ReferÃªncias de DOM da tela de clientes.
 */
// Auth via cookie HttpOnly (não usar token no browser storage)

export const messageBox = document.getElementById('clients-message');

export const backBtn = document.getElementById('back-dashboard');

export const refreshBtn = document.getElementById('refresh-list');

export const tableBody = document.getElementById('clients-body');

export const nameHeader = document.getElementById('name-header');

export const spentHeader = document.getElementById('spent-header');

export const searchInput = document.getElementById('search-input');

export const pagination = document.getElementById('clients-pagination');

export const prevPage = document.getElementById('prev-page');

export const nextPage = document.getElementById('next-page');

export const pageInfo = document.getElementById('page-info');

export const pageList = document.getElementById('page-list');

export const clientsTotal = document.getElementById('clients-total');

const pageIndicator = document.getElementById('page-indicator');

export const pageJumpInput = document.getElementById('page-jump-input');

export const pageJumpBtn = document.getElementById('page-jump-btn');

export const birthdayInsight = document.getElementById('birthday-insight');

export const birthdayWindowSelect = document.getElementById('birthday-window');

export const filterButtons = document.querySelectorAll('[data-filter]');

export const createForm = document.getElementById('create-form');

export const createName = document.getElementById('create-name');

export const createEmail = document.getElementById('create-email');

export const createEmailWarning = document.getElementById('create-email-warning');

export const createEmailSuggest = document.getElementById('create-email-suggest');

export const createCnpj = document.getElementById('create-cnpj');

export const createCnpjError = document.getElementById('create-cnpj-error');

export const createCnpjSuccess = document.getElementById('create-cnpj-success');

export const createCnpjHint = document.getElementById('create-cnpj-hint');

export const cnpjHintDefault = createCnpjHint ? createCnpjHint.textContent : '';

export const createType = document.getElementById('create-type');

export const createCpf = document.getElementById('create-cpf');

export const createTradeName = document.getElementById('create-trade-name');

export const createAddressComplement = document.getElementById('create-address-complement');

export const createCpfError = document.getElementById('create-cpf-error');

export const createCpfField = document.getElementById('create-cpf-field');

export const createCnpjField = document.getElementById('create-cnpj-field');

export const createTradeNameField = document.getElementById('create-trade-name-field');

export const createNameLabelText = document.querySelector('.clients-name-label-text');

export const createPhone = document.getElementById('create-phone');

export const createPhoneWhatsapp = document.getElementById('create-phone-whatsapp');

export const createBirthDate = document.getElementById('create-birth-date');

export const createBirthHint = document.getElementById('create-birth-hint');

export const createAddressStreet = document.getElementById('create-address-street');

export const createAddressNumber = document.getElementById('create-address-number');

export const createAddressNeighborhood = document.getElementById('create-address-neighborhood');

export const createAddressCity = document.getElementById('create-address-city');

export const createAddressState = document.getElementById('create-address-state');

export const createAddressPostal = document.getElementById('create-address-postal');

export const locationChips = document.getElementById('location-chips');

export const chipUf = document.getElementById('chip-uf');

export const chipCity = document.getElementById('chip-city');

export const ufList = document.getElementById('uf-list');

export const cityList = document.getElementById('city-list');

export const ufStatus = document.getElementById('uf-status');

const cepStatus = document.getElementById('cep-status');

export const createNotes = document.getElementById('create-notes');

export const createSubmit = document.getElementById('create-submit');

export const createNameError = document.getElementById('create-name-error');

export const createEmailError = document.getElementById('create-email-error');

export const createPhoneError = document.getElementById('create-phone-error');

export const createBirthDateError = document.getElementById('create-birth-date-error');

export const createAddressStreetError = document.getElementById('create-address-street-error');

export const createAddressNumberError = document.getElementById('create-address-number-error');

export const createAddressNeighborhoodError = document.getElementById('create-address-neighborhood-error');

export const createAddressCityError = document.getElementById('create-address-city-error');

export const createAddressStateError = document.getElementById('create-address-state-error');

export const createSubmitDefaultText = createSubmit ? createSubmit.textContent.trim() : 'Criar cliente';
