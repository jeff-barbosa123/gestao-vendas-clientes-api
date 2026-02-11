/**
 * Utilitários para exportação de dados (CSV, PDF)
 */

const { ERROR_MESSAGES } = require('./errorMessages');

/**
 * Converte array de objetos para CSV
 * @param {array} data - Array de objetos
 * @param {array} columns - Array de {key, label} para colunas
 * @returns {string} CSV formatado
 */
function toCSV(data, columns) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Headers
  const headers = columns.map(col => col.label || col.key).join(',');
  
  // Rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      // Escapa vírgulas e aspas
      if (value == null) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  // BOM para Excel reconhecer UTF-8
  return '\ufeff' + [headers, ...rows].join('\n');
}

/**
 * Formata dados paginados para exportação
 * @param {object} paginatedData - Dados paginados {items, pagination}
 * @param {array} columns - Colunas para exportação
 * @param {function} fetchAllFn - Função para buscar todas as páginas
 * @returns {Promise<array>} Todos os dados
 */
async function getAllPagesForExport(paginatedData, columns, fetchAllFn) {
  if (!paginatedData || !paginatedData.pagination) {
    // Se não é paginado, retorna direto
    return Array.isArray(paginatedData) ? paginatedData : paginatedData.items || [];
  }

  const { total, limit } = paginatedData.pagination;
  const totalPages = Math.ceil(total / limit);
  
  if (totalPages <= 1) {
    return paginatedData.items || [];
  }

  // Busca todas as páginas
  const allItems = [...(paginatedData.items || [])];
  
  for (let page = 2; page <= totalPages; page++) {
    try {
      const pageData = await fetchAllFn(page);
      if (pageData && pageData.items) {
        allItems.push(...pageData.items);
      }
    } catch (err) {
      console.error(`Erro ao buscar página ${page} para exportação:`, err);
      // Continua mesmo se uma página falhar
    }
  }

  return allItems;
}

/**
 * Valida formato de exportação
 * @param {string} format - Formato solicitado
 * @returns {boolean} Se é válido
 */
function validateExportFormat(format) {
  const validFormats = ['csv', 'pdf', 'xlsx', 'json'];
  return validFormats.includes(format ? format.toLowerCase() : '');
}

/**
 * Gera nome de arquivo com timestamp
 * @param {string} prefix - Prefixo do arquivo
 * @param {string} format - Formato (csv, pdf, etc)
 * @returns {string} Nome do arquivo
 */
function generateExportFilename(prefix, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.${format}`;
}

/**
 * Middleware para validar parâmetros de exportação
 */
function validateExportParams(req, res, next) {
  const format = req.query.format || req.params.format;
  
  if (format && !validateExportFormat(format)) {
    const err = new Error('Formato de exportação inválido. Use CSV, PDF, XLSX ou JSON.');
    err.status = 400;
    err.code = 'INVALID_EXPORT_FORMAT';
    return next(err);
  }

  next();
}

module.exports = {
  toCSV,
  getAllPagesForExport,
  validateExportFormat,
  generateExportFilename,
  validateExportParams,
};
