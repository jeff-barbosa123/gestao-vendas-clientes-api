const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL n\u00e3o configurado");
}

const pool = new Pool({ connectionString: DATABASE_URL });

const CUSTOMER_COLUMN_UPGRADES = [
  { name: "cnpj", definition: "TEXT" },
  { name: "cpf", definition: "TEXT" },
];

async function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(handler) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function seedDefaults() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@negocio.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const otherEmail = process.env.OTHER_USER_EMAIL || "user@negocio.com";
  const otherPassword = process.env.OTHER_USER_PASSWORD || "user123";
  const placeholderEmail = "<EMAIL>".toLowerCase();
  const placeholderPassword = "<PASSWORD>";
  const adminId = "11111111-1111-1111-1111-111111111111";
  const otherId = "22222222-2222-2222-2222-222222222222";
  const placeholderId = "33333333-3333-3333-3333-333333333333";
  const blockedId = "44444444-4444-4444-4444-444444444444";
  const uuidRegex = /^[0-9a-fA-F-]{36}$/;

  function normalizeOwnerId(value) {
    if (!value) return null;
    const raw = String(value).trim();
    return uuidRegex.test(raw) ? raw : adminId;
  }

  const usersCount = await pool.query("SELECT COUNT(*) FROM users");
  if (Number(usersCount.rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO users
        (id, email, password, name, status_usuario, data_ultimo_login, tentativas_falha, blocked, created_at)
       VALUES
        ($7, $1, $2, 'Admin', 'ATIVO', NULL, 0, FALSE, NOW()),
        ($8, $3, $4, 'User', 'ATIVO', NULL, 0, FALSE, NOW()),
        ($9, $5, $6, 'Placeholder User', 'ATIVO', NULL, 0, FALSE, NOW()),
        ($10, 'bloqueado@teste.com', '123456', 'Bloqueado', 'BLOQUEADO', NULL, 0, TRUE, NOW())`,
      [
        adminEmail,
        adminPassword,
        otherEmail,
        otherPassword,
        placeholderEmail,
        placeholderPassword,
        adminId,
        otherId,
        placeholderId,
        blockedId,
      ]
    );
  }

  const customersCount = await pool.query("SELECT COUNT(*) FROM customers");
  if (Number(customersCount.rows[0].count) === 0) {
    const customersPath = path.join(__dirname, "../../fixtures/customers.json");
    if (fs.existsSync(customersPath)) {
      const customers = JSON.parse(fs.readFileSync(customersPath, "utf8"));
      for (const customer of customers) {
        await pool.query(
          `INSERT INTO customers (id, name, email, phone, owner_id, created_at)
           VALUES ($1,$2,$3,$4,$5,NOW())`,
          [
            customer.id || uuidv4(),
            customer.name,
            customer.email,
            customer.phone || null,
            normalizeOwnerId(customer.ownerId || customer.owner_id),
          ]
        );
      }
    }
  }

  const productsCount = await pool.query("SELECT COUNT(*) FROM products");
  if (Number(productsCount.rows[0].count) === 0) {
    const productsPath = path.join(__dirname, "../../fixtures/products.json");
    if (fs.existsSync(productsPath)) {
      const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
      for (const product of products) {
        const productType =
          product.productType ||
          product.product_type ||
          (product.fichaTecnicaId || product.ficha_tecnica_id ? "PRODUCED" : "RESALE");
        await pool.query(
          `INSERT INTO products
            (id, name, description, price, purchase_price, product_type, stock, owner_id, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [
            product.id || uuidv4(),
            product.name,
            product.description || null,
            product.price,
            product.purchase_price,
            productType,
            product.stock || null,
            normalizeOwnerId(product.ownerId || product.owner_id),
          ]
        );
      }
    }
  }

  const recipesCount = await pool.query("SELECT COUNT(*) FROM recipes");
  if (Number(recipesCount.rows[0].count) === 0) {
    const defaultRecipesPath = path.join(__dirname, "../../fixtures/recipes.json");
    const recipesPath = process.env.RECIPES_FIXTURE_PATH || defaultRecipesPath;
    if (fs.existsSync(recipesPath)) {
      const raw = fs.readFileSync(recipesPath, "utf8");
      const payload = JSON.parse(raw);
      const recipes = Array.isArray(payload) ? payload : payload.recipes;
      if (Array.isArray(recipes)) {
        for (const recipe of recipes) {
          const recipeId = recipe.id || uuidv4();
          const yieldQty = Number(
            recipe.yield ?? recipe.yieldQty ?? recipe.yield_qty ?? recipe.rendimento ?? 0
          );
          const costIngredients = Number(
            recipe.costIngredients ?? recipe.cost_ingredients ?? recipe.custoIngredientes ?? 0
          );
          const totalCost = Number(recipe.totalCost ?? recipe.total_cost ?? 0);
          const costPerUnit = Number(recipe.costPerUnit ?? recipe.cost_per_unit ?? 0);
          const priceMinimum = Number(recipe.priceMinimum ?? recipe.price_minimum ?? 0);
          const priceSuggested = Number(recipe.priceSuggested ?? recipe.price_suggested ?? 0);
          const estimatedProfit = Number(
            recipe.estimatedProfit ?? recipe.estimated_profit ?? 0
          );
          const overhead = Number(recipe.overhead ?? recipe.custos_indiretos ?? 0);
          const labor = Number(recipe.labor ?? recipe.mao_de_obra ?? 0);

          await pool.query(
            `INSERT INTO recipes
              (id, owner_id, name, description, yield_qty, yield_type, overhead, labor,
               cost_ingredients, total_cost, cost_per_unit, price_minimum, price_suggested,
               margin_label, estimated_profit, status, link_product_id, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW())`,
            [
              recipeId,
              normalizeOwnerId(recipe.ownerId || recipe.owner_id),
              recipe.name,
              recipe.description || null,
              Number.isFinite(yieldQty) ? yieldQty : 0,
              recipe.yieldType || recipe.yield_type || "UN",
              Number.isFinite(overhead) ? overhead : 0,
              Number.isFinite(labor) ? labor : 0,
              Number.isFinite(costIngredients) ? costIngredients : 0,
              Number.isFinite(totalCost) ? totalCost : 0,
              Number.isFinite(costPerUnit) ? costPerUnit : 0,
              Number.isFinite(priceMinimum) ? priceMinimum : 0,
              Number.isFinite(priceSuggested) ? priceSuggested : 0,
              recipe.marginLabel || recipe.margin_label || "0%",
              Number.isFinite(estimatedProfit) ? estimatedProfit : 0,
              recipe.status || "ACTIVE",
              recipe.linkProductId || recipe.link_product_id || null,
            ]
          );

          const ingredients =
            recipe.ingredients || recipe.ingredientes || recipe.items || [];
          for (const ing of ingredients) {
            const quantity = Number(ing.quantity ?? ing.qtd ?? ing.quantidade ?? 0);
            const packageQuantityRaw = Number(
              ing.packageQuantity ?? ing.package_quantity ?? ing.qtdPacote ?? 1
            );
            const packUnit =
              ing.packUnit ?? ing.pack_unit ?? ing.unidadePacote ?? ing.unit ?? ing.unidade ?? null;
            const packageQuantity = packageQuantityRaw > 0 ? packageQuantityRaw : 1;
            const cost = Number(ing.cost ?? ing.preco ?? ing.price ?? 0);
            const unitCost = Number(ing.unitCost ?? ing.unit_cost ?? 0);
            const totalCostIng = Number(ing.totalCost ?? ing.total_cost ?? 0);

            await pool.query(
              `INSERT INTO recipe_ingredients
                (id, recipe_id, name, quantity, unit, component, package_quantity, pack_unit, cost, unit_cost, total_cost)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [
                ing.id || uuidv4(),
                recipeId,
                ing.name,
                Number.isFinite(quantity) ? quantity : 0,
                ing.unit || ing.unidade || null,
                ing.component || null,
                packageQuantity,
                packUnit,
                Number.isFinite(cost) ? cost : 0,
                Number.isFinite(unitCost) ? unitCost : 0,
                Number.isFinite(totalCostIng) ? totalCostIng : 0,
              ]
            );
          }

          const overheadItems =
            recipe.overheadItems || recipe.overheads || recipe.custosIndiretos || [];
          for (const item of overheadItems) {
            const itemCost = Number(item.cost ?? item.valor ?? 0);
            await pool.query(
              `INSERT INTO recipe_overheads (id, recipe_id, name, cost)
               VALUES ($1,$2,$3,$4)`,
              [
                item.id || uuidv4(),
                recipeId,
                item.name || item.descricao || "Custo indireto",
                Number.isFinite(itemCost) ? itemCost : 0,
              ]
            );
          }
        }
      }
    }
  }
}

async function ensureCustomerColumns() {
  for (const column of CUSTOMER_COLUMN_UPGRADES) {
    await pool.query(
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${column.name} ${column.definition}`
    );
  }
}

async function initDb() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
  await ensureCustomerColumns();
  await seedDefaults();
}

module.exports = { pool, query, withTransaction, initDb };
