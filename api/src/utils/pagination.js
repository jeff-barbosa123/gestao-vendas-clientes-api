/**
 * Utilitários para paginação
 */

/**
 * Valida e normaliza parâmetros de paginação da query string
 * @param {object} query - Query parameters da requisição
 * @param {object} options - Opções de paginação
 * @param {number} options.defaultLimit - Limite padrão (default: 20)
 * @param {number} options.maxLimit - Limite máximo permitido (default: 100)
 * @param {number} options.minLimit - Limite mínimo permitido (default: 1)
 * @returns {object} { page, limit, offset } normalizados
 */
function parsePagination(query = {}, options = {}) {
  const {
    defaultLimit = 20,
    maxLimit = 100,
    minLimit = 1,
  } = options;

  // Parse page (1-indexed)
  let page = parseInt(query.page || query.p || '1', 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Parse limit
  let limit = parseInt(query.limit || query.l || String(defaultLimit), 10);
  if (isNaN(limit) || limit < minLimit) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  // Calculate offset (0-indexed)
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Cria resposta paginada padronizada
 * @param {array} items - Array de itens da página atual
 * @param {number} total - Total de itens
 * @param {number} page - Página atual (1-indexed)
 * @param {number} limit - Itens por página
 * @returns {object} Resposta paginada
 */
function createPaginatedResponse(items, total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 0;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    items: Array.isArray(items) ? items : [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

/**
 * Valida parâmetros de paginação e retorna erro se inválidos
 * @param {object} query - Query parameters
 * @returns {object|null} Erro se inválido, null se válido
 */
function validatePagination(query) {
  if (query.page !== undefined) {
    const page = parseInt(query.page, 10);
    if (isNaN(page) || page < 1) {
      return {
        status: 400,
        code: 'INVALID_PAGE',
        message: 'Página inválida. Use um número maior ou igual a 1.',
      };
    }
  }

  if (query.limit !== undefined) {
    const limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return {
        status: 400,
        code: 'INVALID_LIMIT',
        message: 'Limite inválido. Use um número entre 1 e 100.',
      };
    }
  }

  return null;
}

module.exports = {
  parsePagination,
  createPaginatedResponse,
  validatePagination,
};
