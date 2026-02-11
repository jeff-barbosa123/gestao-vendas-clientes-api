/**
 * Middleware global para validar Content-Type em requisições POST/PUT/PATCH
 * Garante que apenas requisições com Content-Type correto são processadas
 */
const { ERROR_MESSAGES } = require("../utils/errorMessages");

function validateContentType(req, res, next) {
  // Apenas valida métodos que tipicamente enviam body
  const methodsToValidate = ['POST', 'PUT', 'PATCH'];
  
  if (!methodsToValidate.includes(req.method)) {
    return next();
  }

  // Content-Type esperado
  const contentType = req.get('content-type') || '';
  const expectedContentType = 'application/json';

  // Verifica se Content-Type está presente e correto
  if (!contentType.includes(expectedContentType)) {
    return res.status(415).json({
      success: false,
      code: 'INVALID_CONTENT_TYPE',
      message: 'Content-Type deve ser application/json',
      error: ERROR_MESSAGES.BAD_REQUEST,
    });
  }

  // Valida charset se especificado (deve ser utf-8)
  if (contentType.includes('charset')) {
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    if (charsetMatch && charsetMatch[1].toLowerCase() !== 'utf-8') {
      return res.status(415).json({
        success: false,
        code: 'INVALID_CHARSET',
        message: 'Charset deve ser UTF-8',
        error: ERROR_MESSAGES.BAD_REQUEST,
      });
    }
  }

  next();
}

module.exports = { validateContentType };
