const repo = require("../db/repository");

const VALID_STATUS = ["ATIVO", "INATIVO"];
const VALID_PRODUCT_TYPES = ["PRODUCED", "RESALE"];

function hasSqlInjectionRisk(value) {
  if (typeof value !== "string") return false;
  const riskKeywords = /(select|insert|update|delete|drop|truncate|alter)\s+/i;
  return /(--|;)/.test(value) || riskKeywords.test(value);
}

function hasXssRisk(value) {
  if (typeof value !== "string") return false;
  return /<\s*script[\s>]/i.test(value);
}

function ensureSafeText(value, fieldName) {
  if (value == null) return;
  if (hasSqlInjectionRisk(value) || hasXssRisk(value)) {
    const err = new Error(`${fieldName || "Campo"} contém conteúdo inválido`);
    err.status = 400;
    throw err;
  }
}

function normalizeStatusProduto(value) {
  if (value == null) return null;
  const status = String(value).trim().toUpperCase();
  if (!VALID_STATUS.includes(status)) {
    const err = new Error("Status do produto inválido");
    err.status = 422;
    throw err;
  }
  return status;
}

function normalizeProductType(value) {
  if (value == null) return null;
  const type = String(value).trim().toUpperCase();
  if (!VALID_PRODUCT_TYPES.includes(type)) {
    const err = new Error("Tipo de produto inválido");
    err.status = 422;
    throw err;
  }
  return type;
}

function calcularCmvPrevisto(product) {
  if (!product || product.price == null || product.price === 0 || product.purchase_price == null) {
    return null;
  }
  const ratio = product.purchase_price / product.price;
  return Number(ratio.toFixed(2));
}

async function getAll(user, pagination = null) {
  const result = await repo.listProducts(user ? user.id : null, pagination);
  
  // Se tem paginação, retorna formato paginado
  if (pagination && result.total !== undefined) {
    const { createPaginatedResponse } = require('../utils/pagination');
    return createPaginatedResponse(result.rows, result.total, pagination.page, pagination.limit);
  }
  
  // Sem paginação (backward compatibility)
  return Array.isArray(result) ? result : result.rows || [];
}

async function getById(id, user) {
  const product = await repo.getProductById(id);
  if (!product) {
    const err = new Error("Produto não encontrado");
    err.status = 404;
    throw err;
  }
  if (product.owner_id && user && product.owner_id !== user.id) {
    const err = new Error("Acesso negado ao produto solicitado");
    err.status = 403;
    throw err;
  }
  return product;
}

async function create(data, user) {
  if (!data.name || data.price == null) {
    const err = new Error("Nome e preço do produto são obrigatórios");
    err.status = 422;
    throw err;
  }

  const description = data.description ?? data.descricao ?? null;
  ensureSafeText(description, "Descrição");

  const statusProduto = normalizeStatusProduto(data.statusProduto) || "ATIVO";
  const inferredType = data.fichaTecnicaId || data.ficha_tecnica_id ? "PRODUCED" : "RESALE";
  const productType =
    normalizeProductType(data.productType || data.product_type || inferredType) || inferredType;

  const price = Number(data.price);
  if (Number.isNaN(price) || price < 0) {
    const err = new Error("Preço informado é inválido");
    err.status = 422;
    throw err;
  }

  if (data.purchase_price == null) {
    const err = new Error("O custo de compra é obrigatório");
    err.status = 422;
    throw err;
  }

  const purchase_price = Number(data.purchase_price);
  if (Number.isNaN(purchase_price) || purchase_price < 0) {
    const err = new Error("Custo de compra inválido");
    err.status = 422;
    throw err;
  }

  if (productType === "PRODUCED" && !data.fichaTecnicaId && !data.ficha_tecnica_id) {
    const err = new Error("Produtos produzidos devem possuir ficha técnica vinculada");
    err.status = 422;
    throw err;
  }

  if (productType === "RESALE" && (data.fichaTecnicaId || data.ficha_tecnica_id)) {
    const err = new Error("Produtos de revenda não podem possuir ficha técnica");
    err.status = 422;
    throw err;
  }

  return repo.createProduct({
    ...data,
    description,
    price,
    purchase_price,
    statusProduto,
    productType,
    ownerId: user ? user.id : null,
    fichaTecnicaId: data.fichaTecnicaId || null,
  });
}

async function update(id, data, user) {
  const current = await repo.getProductById(id);
  if (!current) {
    const err = new Error("Produto não encontrado");
    err.status = 404;
    throw err;
  }

  if (current.owner_id && user && current.owner_id !== user.id) {
    const err = new Error("Acesso negado ao produto solicitado");
    err.status = 403;
    throw err;
  }

  if (data.purchase_price != null) {
    const recipes = await repo.listRecipes(user ? user.id : null, true);
    const hasLinkedRecipe =
      recipes.some((r) => r.link_product_id === id) || current.ficha_tecnica_id;

    if (hasLinkedRecipe) {
      const err = new Error(
        "O custo do produto é controlado pela ficha técnica vinculada. Atualize a ficha técnica para recalcular o CMV."
      );
      err.status = 400;
      throw err;
    }
  }

  if (data.price != null) {
    const p = Number(data.price);
    if (Number.isNaN(p) || p < 0) {
      const err = new Error("Preço informado é inválido");
      err.status = 400;
      throw err;
    }
    data.price = p;
  }

  if (data.description != null || data.descricao != null) {
    data.description = data.description ?? data.descricao ?? null;
    ensureSafeText(data.description, "Descrição");
  }

  if (data.productType != null || data.product_type != null) {
    data.productType = normalizeProductType(data.productType || data.product_type);
  }

  if (data.statusProduto != null) {
    data.statusProduto = normalizeStatusProduto(data.statusProduto);
  }

  if (data.purchase_price != null) {
    const pp = Number(data.purchase_price);
    if (Number.isNaN(pp) || pp < 0) {
      const err = new Error("Custo de compra inválido");
      err.status = 400;
      throw err;
    }
    data.purchase_price = pp;
  }

  const nextType = data.productType || data.product_type || current.product_type || "PRODUCED";
  const nextFicha =
    data.fichaTecnicaId ??
    data.ficha_tecnica_id ??
    current.ficha_tecnica_id ??
    null;

  if (nextType === "PRODUCED" && !nextFicha) {
    const err = new Error("Produtos produzidos devem possuir ficha técnica vinculada");
    err.status = 422;
    throw err;
  }

  if (nextType === "RESALE" && nextFicha) {
    const err = new Error("Produtos de revenda não podem possuir ficha técnica");
    err.status = 422;
    throw err;
  }

  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
    dataAtualizacao: new Date().toISOString(),
  };

  return repo.updateProduct(id, payload);
}

async function remove(id, user) {
  const product = await repo.getProductById(id);
  if (!product) {
    const err = new Error("Produto não encontrado");
    err.status = 404;
    throw err;
  }
  if (product.owner_id && user && product.owner_id !== user.id) {
    const err = new Error("Acesso negado ao produto solicitado");
    err.status = 403;
    throw err;
  }
  return repo.deleteProduct(id);
}

async function linkFichaTecnica(productId, fichaTecnicaId, user) {
  ensureSafeText(String(productId), "Produto");
  ensureSafeText(String(fichaTecnicaId), "Ficha técnica");

  if (!productId || !fichaTecnicaId) {
    const err = new Error("Produto e ficha técnica são obrigatórios");
    err.status = 400;
    throw err;
  }

  const product = await getById(productId, user);
  if (product.ficha_tecnica_id) {
    const err = new Error("Este produto já possui uma ficha técnica vinculada");
    err.status = 409;
    throw err;
  }

  const recipe = await repo.getRecipeById(fichaTecnicaId);
  if (!recipe || recipe.status === "INACTIVE") {
    const err = new Error("Ficha técnica não encontrada ou inativa");
    err.status = 404;
    throw err;
  }

  if (recipe.owner_id && user && recipe.owner_id !== user.id) {
    const err = new Error("Você não tem permissão para utilizar esta ficha técnica");
    err.status = 403;
    throw err;
  }

  if (recipe.yield <= 0) {
    const err = new Error("Não é permitido vincular ficha técnica com rendimento igual ou inferior a zero");
    err.status = 400;
    throw err;
  }

  if (recipe.link_product_id && recipe.link_product_id != productId) {
    const err = new Error("Esta ficha técnica já está vinculada a outro produto");
    err.status = 409;
    throw err;
  }

  const now = new Date().toISOString();

  const updated = await repo.updateProduct(productId, {
    ficha_tecnica_id: recipe.id,
    product_type: "PRODUCED",
    purchase_price: recipe.cost_per_unit,
    custo_por_unidade: recipe.cost_per_unit,
    preco_minimo: recipe.price_minimum,
    preco_minimo_sugerido: recipe.price_suggested ?? recipe.price_minimum,
    cmv_previsto: calcularCmvPrevisto({
      price: product.price,
      purchase_price: recipe.cost_per_unit,
    }),
    cmv_futuro: calcularCmvPrevisto({
      price: product.price,
      purchase_price: recipe.cost_per_unit,
    }),
    data_vinculo: now,
  });

  await repo.updateRecipe(
    recipe.id,
    { ...recipe, linkProductId: productId },
    recipe.ingredients || [],
    recipe.overheadItems || []
  );

  return updated;
}

async function removerFichaTecnica(productId, user) {
  const product = await getById(productId, user);
  const sales = await repo.listSales(user ? user.id : null);

  const hasSales = sales.some(
    (sale) =>
      sale.status === "ACTIVE" &&
      Array.isArray(sale.items) &&
      sale.items.some((item) => item.productId === productId)
  );

  if (hasSales) {
    const err = new Error("Não é possível remover a ficha técnica de um produto com vendas registradas");
    err.status = 409;
    throw err;
  }

  const updated = await repo.updateProduct(productId, {
    ficha_tecnica_id: null,
    product_type: "RESALE",
    custo_por_unidade: null,
    preco_minimo: null,
    preco_minimo_sugerido: null,
    cmv_previsto: null,
    cmv_futuro: null,
    data_vinculo: null,
  });

  const recipes = await repo.listRecipes(user ? user.id : null, true);
  const linked = recipes.find((r) => r.link_product_id === productId);

  if (linked) {
    await repo.updateRecipe(
      linked.id,
      { ...linked, linkProductId: null },
      linked.ingredients || [],
      linked.overheadItems || []
    );
  }

  return updated;
}

async function obterFichaTecnica(productId, user) {
  const product = await getById(productId, user);

  if (!product.ficha_tecnica_id) {
    const err = new Error("Este produto não possui ficha técnica vinculada");
    err.status = 404;
    throw err;
  }

  const recipe = await repo.getRecipeById(product.ficha_tecnica_id);
  if (!recipe || recipe.status === "INACTIVE") {
    const err = new Error("Ficha técnica não encontrada ou inativa");
    err.status = 404;
    throw err;
  }

  if (recipe.owner_id && user && recipe.owner_id !== user.id) {
    const err = new Error("Você não tem permissão para acessar esta ficha técnica");
    err.status = 403;
    throw err;
  }

  return recipe;
}

async function syncProductFromRecipe(recipe) {
  if (!recipe || !recipe.id) return null;

  const products = await repo.listProducts();
  const product = products.find(
    (p) => p.ficha_tecnica_id === recipe.id || p.id === recipe.link_product_id
  );

  if (!product) return null;

  return repo.updateProduct(product.id, {
    ficha_tecnica_id: recipe.id,
    product_type: "PRODUCED",
    purchase_price: recipe.cost_per_unit,
    custo_por_unidade: recipe.cost_per_unit,
    preco_minimo: recipe.price_minimum,
    preco_minimo_sugerido: recipe.price_suggested ?? recipe.price_minimum,
    cmv_previsto: calcularCmvPrevisto({
      price: product.price,
      purchase_price: recipe.cost_per_unit,
    }),
    cmv_futuro: calcularCmvPrevisto({
      price: product.price,
      purchase_price: recipe.cost_per_unit,
    }),
  });
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  linkFichaTecnica,
  removerFichaTecnica,
  obterFichaTecnica,
  syncProductFromRecipe,
};