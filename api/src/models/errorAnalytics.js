/**
 * Modelo para Analytics de Erros
 * Armazena e analisa erros frequentes
 */

// Lazy require para evitar problemas de inicialização
let pool;
function getPool() {
  if (!pool) {
    const db = require('../db');
    pool = db.pool;
  }
  return pool;
}

/**
 * Registra um erro para analytics
 */
async function logErrorForAnalytics(errorData) {
  const {
    code,
    status,
    message,
    path,
    method,
    userId,
    userAgent,
    ip,
    stack,
    timestamp = new Date(),
  } = errorData;

  try {
    const dbPool = getPool();
    await dbPool.query(
      `INSERT INTO error_analytics 
       (error_code, status_code, message, path, method, user_id, user_agent, ip_address, stack_trace, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [code, status, message, path, method, userId, userAgent, ip, stack, timestamp]
    );
  } catch (err) {
    // Não queremos que erro no log de analytics quebre a aplicação
    console.error('Erro ao registrar analytics de erro:', err);
  }
}

/**
 * Busca erros mais frequentes
 */
async function getMostFrequentErrors(options = {}) {
  const {
    limit = 10,
    startDate,
    endDate,
    statusCode,
    errorCode,
  } = options;

  let query = `
    SELECT 
      error_code,
      status_code,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT path) as affected_endpoints,
      MAX(occurred_at) as last_occurrence,
      MIN(occurred_at) as first_occurrence,
      array_agg(DISTINCT path) as paths
    FROM error_analytics
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND occurred_at >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND occurred_at <= $${paramIndex++}`;
    params.push(endDate);
  }

  if (statusCode) {
    query += ` AND status_code = $${paramIndex++}`;
    params.push(statusCode);
  }

  if (errorCode) {
    query += ` AND error_code = $${paramIndex++}`;
    params.push(errorCode);
  }

  query += `
    GROUP BY error_code, status_code
    ORDER BY count DESC
    LIMIT $${paramIndex}
  `;
  params.push(limit);

  const dbPool = getPool();
  const result = await dbPool.query(query, params);
  return result.rows;
}

/**
 * Busca erros por período (agrupado por dia/hora)
 */
async function getErrorsByTimePeriod(period = 'day', startDate, endDate) {
  const dateFormat = period === 'hour' 
    ? "to_char(occurred_at, 'YYYY-MM-DD HH24:00')"
    : "to_char(occurred_at, 'YYYY-MM-DD')";

  let query = `
    SELECT 
      ${dateFormat} as period,
      COUNT(*) as count,
      COUNT(DISTINCT error_code) as unique_errors,
      COUNT(DISTINCT user_id) as affected_users
    FROM error_analytics
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND occurred_at >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND occurred_at <= $${paramIndex++}`;
    params.push(endDate);
  }

  query += `
    GROUP BY period
    ORDER BY period ASC
  `;

  const dbPool = getPool();
  const result = await dbPool.query(query, params);
  return result.rows;
}

/**
 * Busca endpoints com mais erros
 */
async function getEndpointsWithMostErrors(limit = 10, startDate, endDate) {
  let query = `
    SELECT 
      path,
      method,
      COUNT(*) as error_count,
      COUNT(DISTINCT error_code) as unique_errors,
      COUNT(DISTINCT user_id) as affected_users
    FROM error_analytics
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND occurred_at >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND occurred_at <= $${paramIndex++}`;
    params.push(endDate);
  }

  query += `
    GROUP BY path, method
    ORDER BY error_count DESC
    LIMIT $${paramIndex}
  `;
  params.push(limit);

  const dbPool = getPool();
  const result = await dbPool.query(query, params);
  return result.rows;
}

/**
 * Busca erros recentes (últimas N horas)
 */
async function getRecentErrors(hours = 24, limit = 100) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  const dbPool = getPool();
  const result = await dbPool.query(
    `SELECT 
      id,
      error_code,
      status_code,
      message,
      path,
      method,
      user_id,
      occurred_at
    FROM error_analytics
    WHERE occurred_at >= $1
    ORDER BY occurred_at DESC
    LIMIT $2`,
    [startDate, limit]
  );

  return result.rows;
}

/**
 * Estatísticas gerais de erros
 */
async function getErrorStatistics(startDate, endDate) {
  let query = `
    SELECT 
      COUNT(*) as total_errors,
      COUNT(DISTINCT error_code) as unique_error_codes,
      COUNT(DISTINCT user_id) as affected_users,
      COUNT(DISTINCT path) as affected_endpoints,
      AVG(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) * 100 as server_error_percentage
    FROM error_analytics
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND occurred_at >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND occurred_at <= $${paramIndex++}`;
    params.push(endDate);
  }

  const dbPool = getPool();
  const result = await dbPool.query(query, params);
  return result.rows[0] || {};
}

module.exports = {
  logErrorForAnalytics,
  getMostFrequentErrors,
  getErrorsByTimePeriod,
  getEndpointsWithMostErrors,
  getRecentErrors,
  getErrorStatistics,
};
