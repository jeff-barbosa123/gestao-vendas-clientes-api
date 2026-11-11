/**
 * Utilitário centralizado para tratamento de erros da API
 * Traduz códigos técnicos para mensagens amigáveis ao usuário MEI
 */

(() => {
  // Mapeamento de códigos de erro para mensagens amigáveis
  const ERROR_MESSAGES = {
    // Erros de rede/conexão
    NETWORK_ERROR: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
    TIMEOUT_ERROR: 'A operação demorou muito para responder. Tente novamente.',
    
    // Códigos HTTP
    '400': 'Dados inválidos. Verifique as informações e tente novamente.',
    '401': 'Sua sessão expirou. Faça login novamente.',
    '403': 'Você não tem permissão para realizar esta ação.',
    '404': 'Item não encontrado.',
    '409': 'Este item já está cadastrado no sistema.',
    '415': 'Formato de dados inválido. Tente novamente.',
    '422': 'Não foi possível processar sua solicitação. Verifique os dados informados.',
    '423': 'Acesso temporariamente bloqueado. Aguarde alguns minutos e tente novamente.',
    '429': 'Muitas requisições. Aguarde alguns instantes antes de tentar novamente.',
    '500': 'Ops! Ocorreu um erro inesperado. Tente novamente em alguns instantes.',
    '503': 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
    
    // Códigos específicos do sistema
    'BAD_REQUEST': 'Dados inválidos. Verifique as informações e tente novamente.',
    'UNAUTHORIZED': 'Sua sessão expirou. Faça login novamente.',
    'FORBIDDEN': 'Você não tem permissão para realizar esta ação.',
    'NOT_FOUND': 'Item não encontrado.',
    'CONFLICT': 'Este item já está cadastrado no sistema.',
    'UNPROCESSABLE_ENTITY': 'Não foi possível processar sua solicitação. Verifique os dados informados.',
    'PAYLOAD_TOO_LARGE': 'Os dados enviados são muito grandes. Tente com menos informações.',
    'INTERNAL_ERROR': 'Ops! Ocorreu um erro inesperado. Tente novamente em alguns instantes.',
    'ACCESS_BLOCKED': 'Acesso temporariamente bloqueado por segurança. Aguarde 15 minutos e tente novamente.',
    'SESSION_EXPIRED': 'Sua sessão expirou por inatividade. Faça login novamente.',
    'INVALID_CREDENTIALS': 'E-mail ou senha incorretos. Verifique suas credenciais.',
    'USER_BLOCKED': 'Sua conta está bloqueada. Entre em contato com o suporte.',
    'EMAIL_ALREADY_EXISTS': 'Este e-mail já está cadastrado. Use outro e-mail ou recupere sua senha.',
    'CLIENT_EMAIL_EXISTS': 'Este e-mail já está cadastrado para outro cliente.',
    'CLIENT_CPF_EXISTS': 'Este CPF já está cadastrado para outro cliente.',
    'CLIENT_CNPJ_EXISTS': 'Este CNPJ já está cadastrado para outro cliente.',
    'CPF_INVALID': 'CPF inválido. Verifique os números informados.',
    'CNPJ_INVALID': 'CNPJ inválido. Verifique os números informados.',
    'RESET_TOKEN_INVALID': 'Link de recuperação inválido ou expirado. Solicite um novo link.',
    'RESET_TOKEN_EXPIRED': 'Link de recuperação expirado. Solicite um novo link.',
    'CEP_API_ERROR': 'Erro ao consultar CEP. Tente novamente ou preencha manualmente.',
    'INVALID_CONTENT_TYPE': 'Formato de dados inválido. Tente novamente.',
  };
  
  /**
   * Normaliza erro da API para mensagem amigável
   * @param {Error} err - Erro retornado pela API
   * @returns {string} Mensagem amigável ao usuário
   */
  function normalizeApiError(err) {
    if (!err) {
      return 'Erro desconhecido. Tente novamente.';
    }
    
    const status = err.status || 0;
    const payload = err.payload || {};
    const code = payload.code || '';
    const message = payload.message || payload.error || '';
    
    // Prioridade 1: Mensagem do backend (já deve ser amigável)
    if (message && typeof message === 'string' && message.trim()) {
      // Verifica se a mensagem não é técnica
      const isTechnical = /UNPROCESSABLE_ENTITY|BAD_REQUEST|INTERNAL_ERROR|500|422|409|stack|trace|exception/i.test(message);
      if (!isTechnical) {
        return message.trim();
      }
    }
    
    // Prioridade 2: Código de erro específico
    if (code && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }
    
    // Prioridade 3: Status HTTP
    if (status && ERROR_MESSAGES[status.toString()]) {
      return ERROR_MESSAGES[status.toString()];
    }
    
    // Prioridade 4: Fallback por faixa de status
    if (status === 0) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    
    if (status >= 500) {
      return ERROR_MESSAGES['500'];
    }
    
    if (status >= 400) {
      return ERROR_MESSAGES['400'];
    }
    
    // Último recurso
    return 'Erro ao processar sua solicitação. Tente novamente.';
  }
  
  /**
   * Extrai mensagem de erro de uma resposta da API
   * @param {Object} payload - Payload da resposta de erro
   * @param {number} status - Status HTTP
   * @returns {string} Mensagem amigável
   */
  function extractErrorMessage(payload, status) {
    if (!payload) {
      return normalizeApiError({ status });
    }
    
    return normalizeApiError({
      status: status || 0,
      payload: typeof payload === 'string' ? { message: payload } : payload,
    });
  }
  
  /**
   * Verifica se um erro é de rede/conexão
   * @param {Error} err - Erro
   * @returns {boolean}
   */
  function isNetworkError(err) {
    return err && (err.status === 0 || err.name === 'TypeError' || err.message === 'NETWORK_ERROR');
  }
  
  /**
   * Verifica se um erro é de autenticação
   * @param {Error} err - Erro
   * @returns {boolean}
   */
  function isAuthError(err) {
    const status = err && err.status;
    return status === 401 || status === 403;
  }
  
  /**
   * Verifica se um erro é de validação
   * @param {Error} err - Erro
   * @returns {boolean}
   */
  function isValidationError(err) {
    const status = err && err.status;
    return status === 400 || status === 422;
  }
  
  /**
   * Verifica se um erro é de conflito (duplicado)
   * @param {Error} err - Erro
   * @returns {boolean}
   */
  function isConflictError(err) {
    const status = err && err.status;
    const code = err && err.payload && err.payload.code;
    return status === 409 || code === 'CONFLICT' || code === 'EMAIL_ALREADY_EXISTS';
  }
  
  // Expõe funções globalmente
  window.SGVCErrorHandler = {
    normalizeApiError,
    extractErrorMessage,
    isNetworkError,
    isAuthError,
    isValidationError,
    isConflictError,
    ERROR_MESSAGES,
  };
})();
