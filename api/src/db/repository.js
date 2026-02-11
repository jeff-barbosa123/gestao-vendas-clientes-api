const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("./index");

function toNumber(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeProduct(row) {
  if (!row) return row;
  return {
    ...row,
    productType: row.product_type || row.productType || null,
    price: toNumber(row.price),
    purchase_price: toNumber(row.purchase_price),
    custo_por_unidade: toNumber(row.custo_por_unidade),
    preco_minimo: toNumber(row.preco_minimo),
    preco_minimo_sugerido: toNumber(row.preco_minimo_sugerido),
    cmv_previsto: toNumber(row.cmv_previsto),
    cmv_futuro: toNumber(row.cmv_futuro),
    stock: row.stock == null ? null : Number(row.stock),
  };
}

function normalizeRecipe(row) {
  if (!row) return row;
  return {
    ...row,
    yield_qty: toNumber(row.yield_qty),
    overhead: toNumber(row.overhead),
    labor: toNumber(row.labor),
    cost_ingredients: toNumber(row.cost_ingredients),
    total_cost: toNumber(row.total_cost),
    cost_per_unit: toNumber(row.cost_per_unit),
    price_minimum: toNumber(row.price_minimum),
    price_suggested: toNumber(row.price_suggested),
    estimated_profit: toNumber(row.estimated_profit),
  };
}

function normalizeSale(row) {
  if (!row) return row;
  return {
    ...row,
    total: toNumber(row.total),
    cmv: toNumber(row.cmv),
  };
}

async function getUserByEmail(email) {
  const result = await query(
    "SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email]
  );
  return result.rows[0] || null;
}

async function getUserById(id) {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function createUser(data) {
  const payload = {
    id: data.id || uuidv4(),
    email: data.email,
    password: data.password,
    name: data.name,
    status_usuario: data.statusUsuario || "ATIVO",
    data_ultimo_login: data.dataUltimoLogin || null,
    tentativas_falha: data.tentativasFalha || 0,
    blocked: !!data.blocked,
  };
  const result = await query(
    `INSERT INTO users
      (id, email, password, name, status_usuario, data_ultimo_login, tentativas_falha, blocked, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     RETURNING *`,
    [
      payload.id,
      payload.email,
      payload.password,
      payload.name,
      payload.status_usuario,
      payload.data_ultimo_login,
      payload.tentativas_falha,
      payload.blocked,
    ]
  );
  return result.rows[0];
}

async function updateUserLogin(id, dataUltimoLogin, tentativasFalha, statusUsuario) {
  const result = await query(
    `UPDATE users
       SET data_ultimo_login = $2,
           tentativas_falha = $3,
           status_usuario = $4,
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, dataUltimoLogin, tentativasFalha, statusUsuario]
  );
  return result.rows[0] || null;
}

async function updateUserPassword(id, password) {
  const result = await query(
    `UPDATE users
       SET password = $2,
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, password]
  );
  return result.rows[0] || null;
}

async function updateUserProfile(id, name, email) {
  const result = await query(
    `UPDATE users
       SET name = $2,
           email = $3,
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name, email]
  );
  return result.rows[0] || null;
}

async function createPasswordReset(userId, tokenHash, expiresAt) {
  const result = await query(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
     VALUES ($1,$2,$3,$4,NOW())
     RETURNING *`,
    [uuidv4(), userId, tokenHash, expiresAt]
  );
  return result.rows[0] || null;
}

async function getPasswordResetByTokenHash(tokenHash) {
  const result = await query(
    `SELECT * FROM password_resets
      WHERE token_hash = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function markPasswordResetUsed(id) {
  const result = await query(
    `UPDATE password_resets
       SET used_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

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

async function listProducts(ownerId, pagination = null) {
  const hasPagination = pagination && typeof pagination.limit === 'number' && typeof pagination.offset === 'number';
  
  // Query para contar total
  const countSql = ownerId
    ? "SELECT COUNT(*) AS total FROM products WHERE owner_id = $1"
    : "SELECT COUNT(*) AS total FROM products";
  const countParams = ownerId ? [ownerId] : [];
  const countResult = await query(countSql, countParams);
  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  // Query principal com paginação
  const sql = ownerId
    ? `SELECT * FROM products WHERE owner_id = $1 ORDER BY name ASC ${hasPagination ? 'LIMIT $2 OFFSET $3' : ''}`
    : `SELECT * FROM products ORDER BY name ASC ${hasPagination ? 'LIMIT $1 OFFSET $2' : ''}`;
  
  const params = ownerId
    ? (hasPagination ? [ownerId, pagination.limit, pagination.offset] : [ownerId])
    : (hasPagination ? [pagination.limit, pagination.offset] : []);
    
  const result = await query(sql, params);
  
  if (hasPagination) {
    return {
      rows: result.rows.map(normalizeProduct),
      total,
    };
  }
  
  return result.rows.map(normalizeProduct);
}

async function getProductById(id) {
  const result = await query("SELECT * FROM products WHERE id = $1", [id]);
  return normalizeProduct(result.rows[0] || null);
}

async function createProduct(data) {
  const payload = {
    id: data.id || uuidv4(),
    name: data.name,
    description: data.description || data.descricao || null,
    price: data.price,
    purchase_price: data.purchase_price,
    product_type: data.product_type || data.productType || null,
    owner_id: data.ownerId || null,
    ficha_tecnica_id: data.fichaTecnicaId || null,
    custo_por_unidade: data.custo_por_unidade || null,
    preco_minimo: data.preco_minimo || null,
    preco_minimo_sugerido: data.preco_minimo_sugerido || null,
    cmv_previsto: data.cmv_previsto || null,
    cmv_futuro: data.cmv_futuro || null,
    data_vinculo: data.data_vinculo || null,
    status_produto: data.statusProduto || "ATIVO",
    stock: data.stock != null ? data.stock : null,
  };

  const result = await query(
    `INSERT INTO products
      (id, name, description, price, purchase_price, product_type, owner_id, ficha_tecnica_id,
       custo_por_unidade, preco_minimo, preco_minimo_sugerido, cmv_previsto, cmv_futuro,
       data_vinculo, status_produto, stock, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
     RETURNING *`,
    [
      payload.id,
      payload.name,
      payload.description,
      payload.price,
      payload.purchase_price,
      payload.product_type,
      payload.owner_id,
      payload.ficha_tecnica_id,
      payload.custo_por_unidade,
      payload.preco_minimo,
      payload.preco_minimo_sugerido,
      payload.cmv_previsto,
      payload.cmv_futuro,
      payload.data_vinculo,
      payload.status_produto,
      payload.stock,
    ]
  );
  return normalizeProduct(result.rows[0]);
}

async function updateProduct(id, payload) {
  const result = await query(
    `UPDATE products
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           purchase_price = COALESCE($5, purchase_price),
           product_type = COALESCE($6, product_type),
           owner_id = COALESCE($7, owner_id),
           ficha_tecnica_id = COALESCE($8, ficha_tecnica_id),
           custo_por_unidade = COALESCE($9, custo_por_unidade),
           preco_minimo = COALESCE($10, preco_minimo),
           preco_minimo_sugerido = COALESCE($11, preco_minimo_sugerido),
           cmv_previsto = COALESCE($12, cmv_previsto),
           cmv_futuro = COALESCE($13, cmv_futuro),
           data_vinculo = COALESCE($14, data_vinculo),
           status_produto = COALESCE($15, status_produto),
           stock = COALESCE($16, stock),
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.name,
      payload.description,
      payload.price,
      payload.purchase_price,
      payload.product_type ?? payload.productType,
      payload.owner_id ?? payload.ownerId,
      payload.ficha_tecnica_id ?? payload.fichaTecnicaId,
      payload.custo_por_unidade,
      payload.preco_minimo,
      payload.preco_minimo_sugerido,
      payload.cmv_previsto,
      payload.cmv_futuro,
      payload.data_vinculo,
      payload.status_produto ?? payload.statusProduto,
      payload.stock,
    ]
  );
  return normalizeProduct(result.rows[0] || null);
}

async function deleteProduct(id) {
  const result = await query("DELETE FROM products WHERE id = $1 RETURNING *", [id]);
  return normalizeProduct(result.rows[0] || null);
}

async function listRecipes(ownerId, includeInactive = false) {
  const result = await query(
    `SELECT * FROM recipes
      WHERE ($1::uuid IS NULL OR owner_id = $1)
        AND ($2 = TRUE OR status <> 'INACTIVE')`,
    [ownerId || null, includeInactive]
  );
  const recipes = result.rows.map(normalizeRecipe);
  if (recipes.length === 0) return [];
  const ids = recipes.map((r) => r.id);
  const ingRows = await query(
    "SELECT * FROM recipe_ingredients WHERE recipe_id = ANY($1)",
    [ids]
  );
  const overheadRows = await query(
    "SELECT * FROM recipe_overheads WHERE recipe_id = ANY($1)",
    [ids]
  );
  const ingredientsByRecipe = new Map();
  ingRows.rows.forEach((row) => {
    const list = ingredientsByRecipe.get(row.recipe_id) || [];
    list.push(row);
    ingredientsByRecipe.set(row.recipe_id, list);
  });
  const overheadByRecipe = new Map();
  overheadRows.rows.forEach((row) => {
    const list = overheadByRecipe.get(row.recipe_id) || [];
    list.push(row);
    overheadByRecipe.set(row.recipe_id, list);
  });
  return recipes.map((recipe) => ({
    ...recipe,
    yield: recipe.yield_qty,
    yieldType: recipe.yield_type,
    costIngredients: recipe.cost_ingredients,
    totalCost: recipe.total_cost,
    costPerUnit: recipe.cost_per_unit,
    priceMinimum: recipe.price_minimum,
    priceSuggested: recipe.price_suggested,
    marginLabel: recipe.margin_label,
    estimatedProfit: recipe.estimated_profit,
    overheadItems: (overheadByRecipe.get(recipe.id) || []).map((row) => ({
      id: row.id,
      name: row.name,
      cost: Number(row.cost),
    })),
    ingredients: (ingredientsByRecipe.get(recipe.id) || []).map((row) => ({
      id: row.id,
      name: row.name,
      quantity: Number(row.quantity),
      unit: row.unit,
      packUnit: row.pack_unit,
      component: row.component,
      packageQuantity: Number(row.package_quantity),
      cost: Number(row.cost),
      unitCost: Number(row.unit_cost),
      totalCost: Number(row.total_cost),
    })),
  }));
}

async function getRecipeById(id) {
  const list = await listRecipes(null, true);
  return list.find((item) => item.id === id) || null;
}

async function createRecipe(recipe, ingredients, overheadItems) {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO recipes
        (id, owner_id, name, description, yield_qty, yield_type, overhead, labor,
         cost_ingredients, total_cost, cost_per_unit, price_minimum, price_suggested,
         margin_label, estimated_profit, status, link_product_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())`,
      [
        recipe.id,
        recipe.ownerId,
        recipe.name,
        recipe.description,
        recipe.yield,
        recipe.yieldType,
        recipe.overhead,
        recipe.labor,
        recipe.costIngredients,
        recipe.totalCost,
        recipe.costPerUnit,
        recipe.priceMinimum,
        recipe.priceSuggested,
        recipe.marginLabel,
        recipe.estimatedProfit,
        recipe.status || "ACTIVE",
        recipe.linkProductId,
      ]
    );

    for (const ing of ingredients || []) {
      await client.query(
        `INSERT INTO recipe_ingredients
          (id, recipe_id, name, quantity, unit, component, package_quantity, pack_unit, cost, unit_cost, total_cost)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          ing.id || uuidv4(),
          recipe.id,
          ing.name,
          ing.quantity,
          ing.unit,
          ing.component || null,
          ing.packageQuantity,
          ing.packUnit || null,
          ing.cost,
          ing.unitCost,
          ing.totalCost,
        ]
      );
    }

    for (const overhead of overheadItems || []) {
      await client.query(
        `INSERT INTO recipe_overheads (id, recipe_id, name, cost)
         VALUES ($1,$2,$3,$4)`,
        [overhead.id || uuidv4(), recipe.id, overhead.name, overhead.cost]
      );
    }

    const created = await client.query("SELECT * FROM recipes WHERE id = $1", [recipe.id]);
    return created.rows[0];
  });
}

async function updateRecipe(id, recipe, ingredients, overheadItems) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE recipes
         SET name = $2,
             description = $3,
             yield_qty = $4,
             yield_type = $5,
             overhead = $6,
             labor = $7,
             cost_ingredients = $8,
             total_cost = $9,
             cost_per_unit = $10,
             price_minimum = $11,
             price_suggested = $12,
             margin_label = $13,
             estimated_profit = $14,
             status = $15,
             link_product_id = $16,
             updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        recipe.name,
        recipe.description,
        recipe.yield,
        recipe.yieldType,
        recipe.overhead,
        recipe.labor,
        recipe.costIngredients,
        recipe.totalCost,
        recipe.costPerUnit,
        recipe.priceMinimum,
        recipe.priceSuggested,
        recipe.marginLabel,
        recipe.estimatedProfit,
        recipe.status || "ACTIVE",
        recipe.linkProductId,
      ]
    );

    await client.query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [id]);
    await client.query("DELETE FROM recipe_overheads WHERE recipe_id = $1", [id]);

    for (const ing of ingredients || []) {
      await client.query(
        `INSERT INTO recipe_ingredients
          (id, recipe_id, name, quantity, unit, component, package_quantity, pack_unit, cost, unit_cost, total_cost)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          ing.id || uuidv4(),
          id,
          ing.name,
          ing.quantity,
          ing.unit,
          ing.component || null,
          ing.packageQuantity,
          ing.packUnit || null,
          ing.cost,
          ing.unitCost,
          ing.totalCost,
        ]
      );
    }

    for (const overhead of overheadItems || []) {
      await client.query(
        `INSERT INTO recipe_overheads (id, recipe_id, name, cost)
         VALUES ($1,$2,$3,$4)`,
        [overhead.id || uuidv4(), id, overhead.name, overhead.cost]
      );
    }

    const updated = await client.query("SELECT * FROM recipes WHERE id = $1", [id]);
    return updated.rows[0];
  });
}

async function softDeleteRecipe(id) {
  const result = await query(
    "UPDATE recipes SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] || null;
}

async function listSales(ownerId, pagination = null) {
  const hasPagination = pagination && typeof pagination.limit === 'number' && typeof pagination.offset === 'number';
  
  // Query para contar total
  const countSql = ownerId
    ? "SELECT COUNT(*) AS total FROM sales WHERE owner_id = $1"
    : "SELECT COUNT(*) AS total FROM sales";
  const countParams = ownerId ? [ownerId] : [];
  const countResult = await query(countSql, countParams);
  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  // Query principal com paginação
  const sql = ownerId
    ? `SELECT * FROM sales WHERE owner_id = $1 ORDER BY date DESC, id DESC ${hasPagination ? 'LIMIT $2 OFFSET $3' : ''}`
    : `SELECT * FROM sales ORDER BY date DESC, id DESC ${hasPagination ? 'LIMIT $1 OFFSET $2' : ''}`;
  
  const params = ownerId
    ? (hasPagination ? [ownerId, pagination.limit, pagination.offset] : [ownerId])
    : (hasPagination ? [pagination.limit, pagination.offset] : []);
    
  const result = await query(sql, params);
  const sales = result.rows.map(normalizeSale);
  
  if (sales.length === 0) {
    return hasPagination ? { rows: [], total } : [];
  }
  
  const ids = sales.map((row) => row.id);
  const items = await query("SELECT * FROM sale_items WHERE sale_id = ANY($1)", [ids]);
  const itemsBySale = new Map();
  items.rows.forEach((row) => {
    const list = itemsBySale.get(row.sale_id) || [];
    list.push(row);
    itemsBySale.set(row.sale_id, list);
  });
  
  const salesWithItems = sales.map((sale) => ({
    ...sale,
    items: (itemsBySale.get(sale.id) || []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      cmv: row.cmv == null ? null : Number(row.cmv),
    })),
  }));
  
  if (hasPagination) {
    return {
      rows: salesWithItems,
      total,
    };
  }
  
  return salesWithItems;
}

async function getSaleById(id) {
  const list = await listSales();
  return list.find((item) => item.id === id) || null;
}

async function createSale(sale, items) {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO sales
        (id, customer_id, customer_name, owner_id, total, cmv, date, status, status_venda, canceled_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
      [
        sale.id,
        sale.customerId,
        sale.customerName,
        sale.ownerId,
        sale.total,
        sale.cmv,
        sale.date,
        sale.status,
        sale.statusVenda,
        sale.canceledAt,
      ]
    );

    for (const item of items || []) {
      await client.query(
        `INSERT INTO sale_items
          (id, sale_id, product_id, quantity, unit_price, cmv)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          item.id || uuidv4(),
          sale.id,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.cmv,
        ]
      );
    }

    const created = await client.query("SELECT * FROM sales WHERE id = $1", [sale.id]);
    return normalizeSale(created.rows[0]);
  });
}

async function updateSale(id, sale, items) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE sales
         SET customer_id = COALESCE($2, customer_id),
             customer_name = COALESCE($3, customer_name),
             owner_id = COALESCE($4, owner_id),
             total = COALESCE($5, total),
             cmv = COALESCE($6, cmv),
             date = COALESCE($7, date),
             status = COALESCE($8, status),
             status_venda = COALESCE($9, status_venda),
             canceled_at = COALESCE($10, canceled_at)
       WHERE id = $1`,
      [
        id,
        sale.customerId,
        sale.customerName,
        sale.ownerId,
        sale.total,
        sale.cmv,
        sale.date,
        sale.status,
        sale.statusVenda,
        sale.canceledAt,
      ]
    );

    if (Array.isArray(items)) {
      await client.query("DELETE FROM sale_items WHERE sale_id = $1", [id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO sale_items
            (id, sale_id, product_id, quantity, unit_price, cmv)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            item.id || uuidv4(),
            id,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.cmv,
          ]
        );
      }
    }

    const updated = await client.query("SELECT * FROM sales WHERE id = $1", [id]);
    return normalizeSale(updated.rows[0]);
  });
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUserLogin,
  updateUserPassword,
  updateUserProfile,
  createPasswordReset,
  getPasswordResetByTokenHash,
  markPasswordResetUsed,
  listCustomers,
  getCustomerById,
  customerEmailExists,
  customerCpfExists,
  customerCnpjExists,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  softDeleteRecipe,
  listSales,
  getSaleById,
  createSale,
  updateSale,
};
