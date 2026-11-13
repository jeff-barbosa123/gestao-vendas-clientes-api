const { v4: uuidv4 } = require("uuid");
const { query } = require("../index");
const { isUuid } = require("./shared");

async function listCustomers(ownerId, pagination = null, filters = {}) {
  const hasPagination = pagination && typeof pagination.limit === 'number' && typeof pagination.offset === 'number';
  
  // Construir condições de filtro
  const filterConditions = [];
  const filterParams = [];
  let paramIndex = ownerId ? 1 : 0;

  // Filtro por tipo (all, birthdays, loyal, new, old)
  if (filters.type) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (filters.type === 'birthdays') {
      // Aniversários nos próximos 30 dias
      filterConditions.push(`
        EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM c.birth_date) >= EXTRACT(DAY FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM c.birth_date) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '30 days')
      `);
    } else if (filters.type === 'new') {
      // Clientes criados nos últimos 30 dias
      filterConditions.push(`c.created_at >= $${++paramIndex}`);
      filterParams.push(thirtyDaysAgo.toISOString());
    } else if (filters.type === 'old') {
      // Clientes criados há mais de 1 ano
      filterConditions.push(`c.created_at < $${++paramIndex}`);
      filterParams.push(oneYearAgo.toISOString());
    } else if (filters.type === 'loyal') {
      // Clientes fiéis (com muitas compras ou alto valor total)
      filterConditions.push(`(
        (SELECT COUNT(*) FROM sales s2 WHERE s2.customer_id = c.id AND (s2.status IS NULL OR s2.status = 'ACTIVE')) >= 5
        OR (SELECT COALESCE(SUM(s3.total), 0) FROM sales s3 WHERE s3.customer_id = c.id AND (s3.status IS NULL OR s3.status = 'ACTIVE')) >= 1000
      )`);
    }
  }

  // Filtro por busca (nome, email, telefone)
  if (filters.search) {
    const searchTerm = `%${filters.search.toLowerCase()}%`;
    paramIndex++;
    filterConditions.push(`(
      LOWER(c.name) LIKE $${paramIndex}
      OR LOWER(c.email) LIKE $${paramIndex}
      OR LOWER(c.phone) LIKE $${paramIndex}
    )`);
    filterParams.push(searchTerm);
  }

  // Filtro por data de criação
  if (filters.createdFrom) {
    filterConditions.push(`c.created_at >= $${++paramIndex}`);
    filterParams.push(filters.createdFrom);
  }
  if (filters.createdTo) {
    filterConditions.push(`c.created_at <= $${++paramIndex}`);
    filterParams.push(filters.createdTo);
  }

  // Construir WHERE clause
  const whereClause = [];
  if (ownerId) {
    whereClause.push(`c.owner_id = $1`);
  }
  if (filterConditions.length > 0) {
    whereClause.push(...filterConditions);
  }
  const whereSql = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

  // Query para contar total (com filtros)
  const countSql = `
    SELECT COUNT(DISTINCT c.id) AS total
      FROM customers c
     ${whereSql}
  `;
  const countParams = ownerId ? [ownerId, ...filterParams] : filterParams;
  const countResult = await query(countSql, countParams);
  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  // Query principal com paginação e filtros
  const orderBy = filters.sortBy === 'spent' 
    ? 'total_spent DESC, c.name ASC'
    : filters.sortBy === 'name_desc'
    ? 'c.name DESC'
    : 'c.name ASC';

  // Calcular índices finais para LIMIT e OFFSET
  const limitIndex = paramIndex + 1;
  const offsetIndex = paramIndex + 2;

  const sql = `
    SELECT c.*,
           COALESCE(SUM(s.total), 0) AS total_spent,
           COUNT(s.id) AS purchases,
           MIN(s.date) AS first_purchase,
           MAX(s.date) AS last_purchase
      FROM customers c
      LEFT JOIN sales s
        ON s.customer_id = c.id
       AND (s.status IS NULL OR s.status = 'ACTIVE')
     ${whereSql}
     GROUP BY c.id
     ORDER BY ${orderBy}
     ${hasPagination ? `LIMIT $${limitIndex} OFFSET $${offsetIndex}` : ''}
  `;
  
  const params = ownerId 
    ? (hasPagination 
        ? [ownerId, ...filterParams, pagination.limit, pagination.offset]
        : [ownerId, ...filterParams])
    : (hasPagination 
        ? [...filterParams, pagination.limit, pagination.offset]
        : filterParams);
    
  const result = await query(sql, params);
  
  if (hasPagination) {
    return {
      rows: result.rows,
      total,
    };
  }
  
  return result.rows;
}

async function getCustomerById(id) {
  if (!isUuid(id)) return null;
  const result = await query("SELECT * FROM customers WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function customerEmailExists(email, excludeId) {
  const result = excludeId
    ? await query(
        "SELECT 1 FROM customers WHERE lower(email) = lower($1) AND id <> $2 LIMIT 1",
        [email, excludeId]
      )
    : await query(
        "SELECT 1 FROM customers WHERE lower(email) = lower($1) LIMIT 1",
        [email]
      );
  return result.rows.length > 0;
}

async function customerCpfExists(cpf, excludeId) {
  if (!cpf) return false;
  const result = excludeId
    ? await query("SELECT 1 FROM customers WHERE cpf = $1 AND id <> $2 LIMIT 1", [cpf, excludeId])
    : await query("SELECT 1 FROM customers WHERE cpf = $1 LIMIT 1", [cpf]);
  return result.rows.length > 0;
}

async function customerCnpjExists(cnpj, excludeId) {
  if (!cnpj) return false;
  const result = excludeId
    ? await query("SELECT 1 FROM customers WHERE cnpj = $1 AND id <> $2 LIMIT 1", [cnpj, excludeId])
    : await query("SELECT 1 FROM customers WHERE cnpj = $1 LIMIT 1", [cnpj]);
  return result.rows.length > 0;
}

async function createCustomer(data) {
  const payload = {
    id: data.id || uuidv4(),
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    cnpj: data.cnpj || null,
    cpf: data.cpf || null,
    birth_date: data.birthDate || null,
    address_street: data.addressStreet || null,
    address_number: data.addressNumber || null,
    address_neighborhood: data.addressNeighborhood || null,
    address_city: data.addressCity || null,
    address_postal_code: data.addressPostalCode || null,
    notes: data.notes || null,
    owner_id: data.ownerId || null,
  };
  const result = await query(
    `INSERT INTO customers
      (id, name, email, phone, cnpj, cpf, birth_date, address_street, address_number, address_neighborhood,
       address_city, address_postal_code, notes, owner_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
     RETURNING *`,
    [
      payload.id,
      payload.name,
      payload.email,
      payload.phone,
      payload.cnpj,
      payload.cpf,
      payload.birth_date,
      payload.address_street,
      payload.address_number,
      payload.address_neighborhood,
      payload.address_city,
      payload.address_postal_code,
      payload.notes,
      payload.owner_id,
    ]
  );
  return result.rows[0];
}

async function updateCustomer(id, payload) {
  const result = await query(
    `UPDATE customers
       SET name = COALESCE($2, name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           cnpj = COALESCE($5, cnpj),
           cpf = COALESCE($6, cpf),
           birth_date = COALESCE($7, birth_date),
           address_street = COALESCE($8, address_street),
           address_number = COALESCE($9, address_number),
           address_neighborhood = COALESCE($10, address_neighborhood),
           address_city = COALESCE($11, address_city),
           address_postal_code = COALESCE($12, address_postal_code),
           notes = COALESCE($13, notes)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.name,
      payload.email,
      payload.phone,
      payload.cnpj,
      payload.cpf,
      payload.birthDate,
      payload.addressStreet,
      payload.addressNumber,
      payload.addressNeighborhood,
      payload.addressCity,
      payload.addressPostalCode,
      payload.notes,
    ]
  );
  return result.rows[0] || null;
}

async function deleteCustomer(id) {
  const result = await query("DELETE FROM customers WHERE id = $1 RETURNING *", [id]);
  return result.rows[0] || null;
}

module.exports = {
  listCustomers,
  getCustomerById,
  customerEmailExists,
  customerCpfExists,
  customerCnpjExists,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
