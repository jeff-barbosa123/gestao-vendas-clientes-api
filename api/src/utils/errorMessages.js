/**
 * Mensagens de erro padronizadas e amigáveis para usuários MEI
 * Todas as mensagens são em linguagem de negócio, não técnica
 */

const ERROR_MESSAGES = {
  // Códigos genéricos
  BAD_REQUEST: 'Dados inválidos. Verifique as informações e tente novamente.',
  UNAUTHORIZED: 'Sua sessão expirou. Faça login novamente.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  NOT_FOUND: 'Item não encontrado.',
  CONFLICT: 'Este item já está cadastrado no sistema.',
  UNPROCESSABLE_ENTITY: 'Não foi possível processar sua solicitação. Verifique os dados informados.',
  PAYLOAD_TOO_LARGE: 'Os dados enviados são muito grandes. Tente com menos informações.',
  INTERNAL_ERROR: 'Ops! Ocorreu um erro inesperado. Tente novamente em alguns instantes.',
  
  // Autenticação
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos. Verifique suas credenciais.',
  ACCESS_BLOCKED: 'Acesso temporariamente bloqueado por segurança. Aguarde 15 minutos e tente novamente.',
  USER_BLOCKED: 'Sua conta está bloqueada. Entre em contato com o suporte.',
  SESSION_EXPIRED: 'Sua sessão expirou por inatividade. Faça login novamente.',
  TOKEN_INVALID: 'Sessão inválida. Faça login novamente.',
  
  // Validações comuns
  EMAIL_REQUIRED: 'E-mail é obrigatório.',
  EMAIL_INVALID: 'Digite um e-mail válido.',
  EMAIL_ALREADY_EXISTS: 'Este e-mail já está cadastrado. Use outro e-mail ou recupere sua senha.',
  PASSWORD_REQUIRED: 'Senha é obrigatória.',
  PASSWORD_SHORT: 'Senha muito curta. Use pelo menos 8 caracteres.',
  PASSWORD_LONG: 'Senha muito longa. Use no máximo 128 caracteres.',
  PASSWORD_WEAK: 'Senha muito fraca. Use pelo menos 8 caracteres incluindo letra maiúscula, minúscula, número e caractere especial.',
  PASSWORD_SAME: 'A nova senha deve ser diferente da senha atual.',
  CURRENT_PASSWORD_INVALID: 'Senha atual incorreta.',
  NAME_REQUIRED: 'Nome é obrigatório.',
  
  // Clientes
  CLIENT_NOT_FOUND: 'Cliente não encontrado.',
  CLIENT_EMAIL_EXISTS: 'Este e-mail já está cadastrado para outro cliente.',
  CLIENT_CPF_EXISTS: 'Este CPF já está cadastrado para outro cliente.',
  CLIENT_CNPJ_EXISTS: 'Este CNPJ já está cadastrado para outro cliente.',
  CPF_INVALID: 'CPF inválido. Verifique os números informados.',
  CNPJ_INVALID: 'CNPJ inválido. Verifique os números informados.',
  CPF_CNPJ_CONFLICT: 'Informe apenas CPF ou CNPJ, não ambos.',
  BIRTH_DATE_INVALID: 'Data de nascimento inválida.',
  BIRTH_DATE_FUTURE: 'Data de nascimento não pode ser futura.',
  
  // Produtos
  PRODUCT_NOT_FOUND: 'Produto não encontrado.',
  PRODUCT_NAME_REQUIRED: 'Nome do produto é obrigatório.',
  PRODUCT_PRICE_REQUIRED: 'Preço de venda é obrigatório.',
  PRODUCT_PRICE_INVALID: 'Preço inválido. Use números positivos.',
  PRODUCT_PURCHASE_PRICE_REQUIRED: 'Preço de compra é obrigatório.',
  PRODUCT_PURCHASE_PRICE_INVALID: 'Preço de compra inválido. Use números positivos.',
  
  // Vendas
  SALE_NOT_FOUND: 'Venda não encontrada.',
  SALE_ITEMS_REQUIRED: 'A venda deve conter pelo menos um item.',
  SALE_CLIENT_REQUIRED: 'Cliente é obrigatório para a venda.',
  SALE_PRODUCT_REQUIRED: 'Produto é obrigatório para o item da venda.',
  SALE_QUANTITY_INVALID: 'Quantidade inválida. Use números positivos.',
  SALE_ALREADY_CANCELLED: 'Esta venda já foi cancelada.',
  
  // Recuperação de senha
  RESET_TOKEN_INVALID: 'Link de recuperação inválido ou expirado. Solicite um novo link.',
  RESET_TOKEN_MISSING: 'Token de recuperação não informado.',
  RESET_TOKEN_EXPIRED: 'Link de recuperação expirado. Solicite um novo link.',
  
  // CEP e endereço
  CEP_INVALID: 'CEP inválido. Informe 8 dígitos.',
  CEP_NOT_FOUND: 'CEP não encontrado. Verifique o número informado.',
  CEP_API_ERROR: 'Erro ao consultar CEP. Tente novamente ou preencha manualmente.',
  ADDRESS_REQUIRED: 'Endereço incompleto. Preencha todos os campos obrigatórios.',
  
  // Geral
  REQUIRED_FIELDS: 'Campos obrigatórios não preenchidos.',
  INVALID_DATA: 'Dados inválidos. Verifique as informações.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  TIMEOUT_ERROR: 'Tempo de espera esgotado. Tente novamente.',
  DATABASE_ERROR: 'Erro ao conectar com o banco de dados. Verifique se o PostgreSQL está rodando e o DATABASE_URL está configurado corretamente.',
};

/**
 * Mapeia códigos de erro técnicos para mensagens amigáveis
 */
const CODE_TO_MESSAGE_MAP = {
  // Códigos HTTP padrão
  'BAD_REQUEST': ERROR_MESSAGES.BAD_REQUEST,
  'UNAUTHORIZED': ERROR_MESSAGES.UNAUTHORIZED,
  'FORBIDDEN': ERROR_MESSAGES.FORBIDDEN,
  'NOT_FOUND': ERROR_MESSAGES.NOT_FOUND,
  'CONFLICT': ERROR_MESSAGES.CONFLICT,
  'UNPROCESSABLE_ENTITY': ERROR_MESSAGES.UNPROCESSABLE_ENTITY,
  'PAYLOAD_TOO_LARGE': ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
  'INTERNAL_ERROR': ERROR_MESSAGES.INTERNAL_ERROR,
  
  // Códigos específicos do sistema
  'INVALID_CREDENTIALS': ERROR_MESSAGES.INVALID_CREDENTIALS,
  'ACCESS_BLOCKED': ERROR_MESSAGES.ACCESS_BLOCKED,
  'USER_BLOCKED': ERROR_MESSAGES.USER_BLOCKED,
  'SESSION_EXPIRED': ERROR_MESSAGES.SESSION_EXPIRED,
  'TOKEN_INVALID': ERROR_MESSAGES.TOKEN_INVALID,
  'EMAIL_REQUIRED': ERROR_MESSAGES.EMAIL_REQUIRED,
  'EMAIL_INVALID': ERROR_MESSAGES.EMAIL_INVALID,
  'EMAIL_ALREADY_EXISTS': ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
  'PASSWORD_REQUIRED': ERROR_MESSAGES.PASSWORD_REQUIRED,
  'PASSWORD_SHORT': ERROR_MESSAGES.PASSWORD_SHORT,
  'PASSWORD_LONG': ERROR_MESSAGES.PASSWORD_LONG,
  'PASSWORD_WEAK': ERROR_MESSAGES.PASSWORD_WEAK,
  'PASSWORD_SAME': ERROR_MESSAGES.PASSWORD_SAME,
  'CURRENT_PASSWORD_INVALID': ERROR_MESSAGES.CURRENT_PASSWORD_INVALID,
  'NAME_REQUIRED': ERROR_MESSAGES.NAME_REQUIRED,
  'CLIENT_NOT_FOUND': ERROR_MESSAGES.CLIENT_NOT_FOUND,
  'CLIENT_EMAIL_EXISTS': ERROR_MESSAGES.CLIENT_EMAIL_EXISTS,
  'CLIENT_CPF_EXISTS': ERROR_MESSAGES.CLIENT_CPF_EXISTS,
  'CLIENT_CNPJ_EXISTS': ERROR_MESSAGES.CLIENT_CNPJ_EXISTS,
  'CPF_INVALID': ERROR_MESSAGES.CPF_INVALID,
  'CNPJ_INVALID': ERROR_MESSAGES.CNPJ_INVALID,
  'CPF_CNPJ_CONFLICT': ERROR_MESSAGES.CPF_CNPJ_CONFLICT,
  'BIRTH_DATE_INVALID': ERROR_MESSAGES.BIRTH_DATE_INVALID,
  'BIRTH_DATE_FUTURE': ERROR_MESSAGES.BIRTH_DATE_FUTURE,
  'NAME_TOO_LONG': 'Nome muito longo. O nome deve ter no máximo 255 caracteres.',
  'INVALID_NAME': 'Nome contém caracteres inválidos.',
  'INVALID_PHONE': 'Telefone contém caracteres inválidos.',
  'REQUIRED_FIELDS': ERROR_MESSAGES.REQUIRED_FIELDS,
  'PRODUCT_NOT_FOUND': ERROR_MESSAGES.PRODUCT_NOT_FOUND,
  'PRODUCT_NAME_REQUIRED': ERROR_MESSAGES.PRODUCT_NAME_REQUIRED,
  'PRODUCT_PRICE_REQUIRED': ERROR_MESSAGES.PRODUCT_PRICE_REQUIRED,
  'PRODUCT_PRICE_INVALID': ERROR_MESSAGES.PRODUCT_PRICE_INVALID,
  'PRODUCT_PURCHASE_PRICE_REQUIRED': ERROR_MESSAGES.PRODUCT_PURCHASE_PRICE_REQUIRED,
  'PRODUCT_PURCHASE_PRICE_INVALID': ERROR_MESSAGES.PRODUCT_PURCHASE_PRICE_INVALID,
  'SALE_NOT_FOUND': ERROR_MESSAGES.SALE_NOT_FOUND,
  'SALE_ITEMS_REQUIRED': ERROR_MESSAGES.SALE_ITEMS_REQUIRED,
  'SALE_CLIENT_REQUIRED': ERROR_MESSAGES.SALE_CLIENT_REQUIRED,
  'SALE_PRODUCT_REQUIRED': ERROR_MESSAGES.SALE_PRODUCT_REQUIRED,
  'SALE_QUANTITY_INVALID': ERROR_MESSAGES.SALE_QUANTITY_INVALID,
  'SALE_ALREADY_CANCELLED': ERROR_MESSAGES.SALE_ALREADY_CANCELLED,
  'RESET_TOKEN_INVALID': ERROR_MESSAGES.RESET_TOKEN_INVALID,
  'RESET_TOKEN_MISSING': ERROR_MESSAGES.RESET_TOKEN_MISSING,
  'RESET_TOKEN_EXPIRED': ERROR_MESSAGES.RESET_TOKEN_EXPIRED,
  'CEP_INVALID': ERROR_MESSAGES.CEP_INVALID,
  'CEP_NOT_FOUND': ERROR_MESSAGES.CEP_NOT_FOUND,
  'CEP_API_ERROR': ERROR_MESSAGES.CEP_API_ERROR,
  'ADDRESS_REQUIRED': ERROR_MESSAGES.ADDRESS_REQUIRED,
  'REQUIRED_FIELDS': ERROR_MESSAGES.REQUIRED_FIELDS,
  'INVALID_DATA': ERROR_MESSAGES.INVALID_DATA,
  'DATABASE_ERROR': ERROR_MESSAGES.DATABASE_ERROR,
  'NETWORK_ERROR': ERROR_MESSAGES.NETWORK_ERROR,
  'TIMEOUT_ERROR': ERROR_MESSAGES.TIMEOUT_ERROR,
};

/**
 * Obtém mensagem amigável baseada no código de erro
 */
function getFriendlyMessage(code, defaultMessage) {
  if (code && CODE_TO_MESSAGE_MAP[code]) {
    return CODE_TO_MESSAGE_MAP[code];
  }
  
  // Se a mensagem padrão já é amigável, usa ela
  if (defaultMessage && !isTechnicalMessage(defaultMessage)) {
    return defaultMessage;
  }
  
  // Caso contrário, retorna mensagem genérica baseada no código
  return CODE_TO_MESSAGE_MAP[code] || ERROR_MESSAGES.INTERNAL_ERROR;
}

/**
 * Verifica se uma mensagem é técnica (contém termos técnicos)
 */
function isTechnicalMessage(message) {
  if (!message || typeof message !== 'string') return false;
  
  const technicalTerms = [
    'UNPROCESSABLE_ENTITY',
    'BAD_REQUEST',
    'INTERNAL_ERROR',
    '500',
    '422',
    '409',
    'stack trace',
    'undefined',
    'null',
    'error code',
  ];
  
  const upperMessage = message.toUpperCase();
  return technicalTerms.some(term => upperMessage.includes(term));
}

/**
 * Traduz mensagem de erro para linguagem de negócio
 */
function translateError(message, code, status) {
  // Se já tem código, usa o mapeamento
  if (code) {
    const friendly = getFriendlyMessage(code, message);
    if (friendly) return friendly;
  }
  
  // Tenta inferir do status HTTP
  if (status) {
    const statusMap = {
      400: ERROR_MESSAGES.BAD_REQUEST,
      401: ERROR_MESSAGES.UNAUTHORIZED,
      403: ERROR_MESSAGES.FORBIDDEN,
      404: ERROR_MESSAGES.NOT_FOUND,
      409: ERROR_MESSAGES.CONFLICT,
      422: ERROR_MESSAGES.UNPROCESSABLE_ENTITY,
      413: ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
      423: ERROR_MESSAGES.ACCESS_BLOCKED,
      500: ERROR_MESSAGES.INTERNAL_ERROR,
    };
    
    if (statusMap[status] && isTechnicalMessage(message)) {
      return statusMap[status];
    }
  }
  
  // Se mensagem já é amigável, retorna ela
  if (!isTechnicalMessage(message)) {
    return message;
  }
  
  // Último recurso: mensagem genérica
  return ERROR_MESSAGES.INTERNAL_ERROR;
}

module.exports = {
  ERROR_MESSAGES,
  CODE_TO_MESSAGE_MAP,
  getFriendlyMessage,
  isTechnicalMessage,
  translateError,
};
