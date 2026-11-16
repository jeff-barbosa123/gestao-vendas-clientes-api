/**
 * Constantes e mensagens da tela de clientes.
 */
// Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
export const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

export const SEVERITY_CLASSES = ['is-success', 'is-danger', 'is-warning', 'is-info'];

export const CREATE_SUBMIT_SAVING_TEXT = 'Salvando...';

export const DOCUMENT_CONFLICT_MESSAGE = 'Informe apenas CPF ou CNPJ.';

export const EMAIL_REQUIRED_MESSAGE = 'E-mail obrigatório.';

export const EMAIL_SPACE_MESSAGE = 'E-mail não pode conter espaços.';

export const EMAIL_MISSING_AT_MESSAGE = 'E-mail deve conter "@".';

export const EMAIL_MISSING_DOMAIN_MESSAGE = 'Domínio do e-mail obrigatório.';

export const EMAIL_INVALID_MESSAGE = 'Digite um e-mail válido.';

export const PHONE_REQUIRED_MESSAGE = 'Telefone obrigatório.';

export const PHONE_DDD_MESSAGE = 'Telefone deve incluir DDD (10 ou 11 dígitos).';

export const PHONE_LETTER_MESSAGE = 'Telefone deve conter apenas dígitos.';

export const PHONE_INVALID_MESSAGE = 'Telefone inválido.';

const BIRTH_REQUIRED_MESSAGE = 'Data de nascimento obrigatória.';

export const BIRTH_FORMAT_MESSAGE = 'Data de nascimento inválida.';

export const BIRTH_FUTURE_MESSAGE = 'Data de nascimento não pode ser futura.';

const CEP_REQUIRED_MESSAGE = 'CEP obrigatório.';

export const CEP_DIGITS_MESSAGE = 'CEP deve conter 8 dígitos.';

export const CEP_INVALID_CHAR_MESSAGE = 'CEP deve conter apenas números.';

const ADDRESS_STREET_REQUIRED = 'Rua obrigatória.';

export const ADDRESS_STREET_LENGTH_MESSAGE = 'Informe o logradouro com pelo menos 3 caracteres.';

export const ADDRESS_STREET_INVALID_MESSAGE = 'Informe um logradouro válido.';

export const ADDRESS_STREET_INVALID_PATTERN = /<\s*\/?\s*script\b|<|>|--|;/i;

export const ADDRESS_STREET_MIN_LENGTH = 3;

const ADDRESS_NUMBER_REQUIRED = 'Número obrigatório.';

export const ADDRESS_NUMBER_INVALID = 'Número inválido.';

const ADDRESS_NEIGHBORHOOD_REQUIRED = 'Bairro obrigatório.';

const ADDRESS_STATE_REQUIRED = 'UF obrigatória.';

const ADDRESS_CITY_REQUIRED = 'Cidade obrigatória.';

export const ADDRESS_STATE_INVALID = 'UF inválida.';

export const ADDRESS_CITY_INVALID = 'Cidade inválida para a UF.';

export const NAME_MIN_LENGTH = 3;

export const NAME_MAX_LENGTH = 120;

export const NAME_LENGTH_MESSAGE = 'Nome deve ter 3 a 120 caracteres.';

export const NAME_LETTER_MESSAGE = 'Nome deve conter pelo menos uma letra.';

export const NAME_INVALID_CHARS_MESSAGE = 'Nome contém caracteres inválidos.';

export const NAME_ALLOWED_REGEX = /^[\p{L}\d\s&().'\/-]+$/u;

export const DELETE_FLAG = 'sgvc.clientDeleted';

export const UPDATED_FLAG = 'sgvc.clientUpdated';

// Constantes para validação de UF e cidades
export const BASE_UF_CODES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export const FALLBACK_UFS = BASE_UF_CODES.map((sigla) => ({ sigla, nome: sigla }));

export const VALID_UFS = new Set(BASE_UF_CODES);

export const UF_LOADING_PLACEHOLDER = 'Carregando unidades federativas...';

export const CEP_SLOW_HINT = 'A consulta está demorando. Isso pode ocorrer em algumas situações.';

export const PAGE_SIZE = 10;

const FILTER_NEW_DAYS = 60;

const FILTER_OLD_DAYS = 15;

export const LOYAL_PURCHASES = 3;

export const LOYAL_TOTAL = 1500;

export const FREQUENT_MIN = 2;

export const BIRTHDAY_WINDOW_KEY = 'sgvc.birthdayWindowDays';

export const BIRTHDAY_WINDOW_OPTIONS = [7, 14, 30];

export const CNPJ_LOADING_TEXT = 'Consultando CNPJâ¦';

export const META_OPEN = '<sgvc-meta>';

export const META_CLOSE = '</sgvc-meta>';

export const BRAZIL_API_CNPJ_URL = 'https://brasilapi.com.br/api/cnpj/v1';

export const MINOR_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export const VIA_CEP_URL = 'https://viacep.com.br/ws';

// Auth: valida sessão via /api/auth/me (cookie HttpOnly)
export const session = { token: null };
