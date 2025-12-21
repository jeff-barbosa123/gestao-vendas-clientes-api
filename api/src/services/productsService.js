const { db, createProduct } = require('../models/db');

const VALID_STATUS = ['ATIVO', 'INATIVO'];

function hasSqlInjectionRisk(value) {
  if (typeof value !== 'string') return false;
  const riskKeywords = /(select|insert|update|delete|drop|truncate|alter)\s+/i;
  return /(--|;)/.test(value) || riskKeywords.test(value);
}

function hasXssRisk(value) {
  if (typeof value !== 'string') return false;
  return /<\s*script[\s>]/i.test(value);
}

function ensureSafeText(value, fieldName) {
  if (value == null) return;
  if (hasSqlInjectionRisk(value) || hasXssRisk(value)) {
    const err = new Error(`${fieldName || 'Campo'} invalido`);
    err.status = 400;
    throw err;
  }
}

function normalizeStatusProduto(value) {
  if (value == null) return null;
  const status = String(value).trim().toUpperCase();
  if (!VALID_STATUS.includes(status)) {
    const err = new Error('statusProduto invalido');
    err.status = 422;
    throw err;
  }
  return status;
}

function filterByOwner(list, user) {
  if (!user || !user.id) return list;
  return list.filter((item) => !item.ownerId || item.ownerId === user.id);
}

function getAll(user) {
  return filterByOwner(db.products, user);
}

function getById(id, user) {
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }
  if (product.ownerId && user && product.ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    throw err;
  }
  return product;
}

function create(data, user) {
  if (!data.name || data.price == null) {
    const err = new Error('Campos obrigatórios ausentes');
    err.status = 422;
    throw err;
  }

  const description = data.description ?? data.descricao ?? null;
  ensureSafeText(description, 'descricao');
  const statusProduto = normalizeStatusProduto(data.statusProduto) || 'ATIVO';

  const price = Number(data.price);
  if (Number.isNaN(price) || price < 0) {
    const err = new Error('Preço inválido');
    err.status = 422;
    throw err;
  }

  if (data.purchase_price == null) {
    const err = new Error('purchase_price é obrigatório');
    err.status = 422;
    throw err;
  }

  const purchase_price = Number(data.purchase_price);
  if (Number.isNaN(purchase_price) || purchase_price < 0) {
    const err = new Error('purchase_price inválido');
    err.status = 422;
    throw err;
  }

  return createProduct({
    ...data,
    description,
    price,
    purchase_price,
    statusProduto,
    ownerId: user ? user.id : null,
    fichaTecnicaId: data.fichaTecnicaId || null,
  });
}

function update(id, data, user) {
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }

  const current = db.products[index];
  if (current.ownerId && user && current.ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    throw err;
  }

  if (data.purchase_price != null) {
    const hasLinkedRecipe = db.recipes.some((r) => r.linkProductId === id) || current.fichaTecnicaId;
    if (hasLinkedRecipe) {
      const err = new Error(
        'purchase_price controlado por ficha tecnica vinculada; atualize a receita para recalcular o CMV'
      );
      err.status = 400;
      throw err;
    }
  }

  if (data.price != null) {
    const p = Number(data.price);
    if (Number.isNaN(p) || p < 0) {
      const err = new Error('Preço inválido');
      err.status = 400;
      throw err;
    }
    data.price = p;
  }

  if (data.description != null || data.descricao != null) {
    data.description = data.description ?? data.descricao ?? null;
    ensureSafeText(data.description, 'descricao');
  }

  if (data.statusProduto != null) {
    data.statusProduto = normalizeStatusProduto(data.statusProduto);
  }

  if (data.purchase_price != null) {
    const pp = Number(data.purchase_price);
    if (Number.isNaN(pp) || pp < 0) {
      const err = new Error('purchase_price inválido');
      err.status = 400;
      throw err;
    }
    data.purchase_price = pp;
  }

  db.products[index] = {
    ...current,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
    dataAtualizacao: new Date().toISOString(),
  };

  return db.products[index];
}

function remove(id, user) {
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }
  if (db.products[index].ownerId && user && db.products[index].ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    throw err;
  }
  return db.products.splice(index, 1)[0];
}

function calcularCmvPrevisto(product) {
  if (!product || product.price == null || product.price === 0 || product.purchase_price == null) {
    return null;
  }
  const ratio = product.purchase_price / product.price;
  return Number(ratio.toFixed(2));
}

function linkFichaTecnica(productId, fichaTecnicaId, user) {
  ensureSafeText(String(productId), 'produto');
  ensureSafeText(String(fichaTecnicaId), 'fichaTecnicaId');
  if (!productId || !fichaTecnicaId) {
    const err = new Error('Campos obrigatórios ausentes');
    err.status = 400;
    throw err;
  }

  const product = getById(productId, user);
  if (product.fichaTecnicaId) {
    const err = new Error('O produto já possui ficha técnica vinculada');
    err.status = 409;
    throw err;
  }

  const recipe = db.recipes.find((r) => r.id === fichaTecnicaId && r.status !== 'INACTIVE');
  if (!recipe) {
    const err = new Error('Ficha técnica não encontrada');
    err.status = 404;
    throw err;
  }
  if (recipe.ownerId && user && recipe.ownerId !== user.id) {
    const err = new Error('Você não tem permissão para usar esta ficha técnica');
    err.status = 403;
    throw err;
  }
  if (recipe.yield <= 0) {
    const err = new Error('É proibido vincular ficha técnica com rendimento igual a zero');
    err.status = 400;
    throw err;
  }
  if (recipe.linkProductId && recipe.linkProductId !== productId) {
    const err = new Error('O produto já possui ficha técnica vinculada');
    err.status = 409;
    throw err;
  }

  const recipeIndex = db.recipes.findIndex((r) => r.id === recipe.id);
  if (recipeIndex !== -1) {
    db.recipes[recipeIndex] = { ...recipe, linkProductId: productId, updatedAt: new Date().toISOString() };
  }

  const now = new Date().toISOString();
  product.fichaTecnicaId = recipe.id;
  product.purchase_price = recipe.costPerUnit;
  product.custo_por_unidade = recipe.costPerUnit;
  product.preco_minimo = recipe.priceMinimum;
  product.preco_minimo_sugerido = recipe.priceSuggested ?? recipe.priceMinimum;
  product.cmv_previsto = calcularCmvPrevisto(product);
  product.cmv_futuro = product.cmv_previsto;
  product.data_vinculo = now;

  const index = db.products.findIndex((p) => p.id === productId);
  db.products[index] = product;
  return product;
}

function removerFichaTecnica(productId, user) {
  const product = getById(productId, user);
  const hasSales = db.sales.some((sale) => sale.status === 'ACTIVE' && Array.isArray(sale.items) && sale.items.some((item) => item.productId === productId));
  if (hasSales) {
    const err = new Error('Produto possui vendas registradas');
    err.status = 409;
    throw err;
  }
  product.fichaTecnicaId = null;
  product.custo_por_unidade = null;
  product.preco_minimo = null;
  product.preco_minimo_sugerido = null;
  product.cmv_previsto = null;
  product.cmv_futuro = null;
  product.data_vinculo = null;

  const index = db.products.findIndex((p) => p.id === productId);
  db.products[index] = product;

  db.recipes = db.recipes.map((r) => (r.linkProductId === productId ? { ...r, linkProductId: null } : r));

  return product;
}

function obterFichaTecnica(productId, user) {
  const product = getById(productId, user);
  if (!product.fichaTecnicaId) {
    const err = new Error('Ficha técnica não encontrada');
    err.status = 404;
    throw err;
  }
  const recipe = db.recipes.find((r) => r.id === product.fichaTecnicaId && r.status !== 'INACTIVE');
  if (!recipe) {
    const err = new Error('Ficha técnica não encontrada');
    err.status = 404;
    throw err;
  }
  if (recipe.ownerId && user && recipe.ownerId !== user.id) {
    const err = new Error('Você não tem permissão para usar esta ficha técnica');
    err.status = 403;
    throw err;
  }
  return recipe;
}

function syncProductFromRecipe(recipe) {
  if (!recipe || !recipe.id) return null;
  const product = db.products.find((p) => p.fichaTecnicaId === recipe.id || p.id === recipe.linkProductId);
  if (!product) {
    return null;
  }
  product.fichaTecnicaId = recipe.id;
  product.purchase_price = recipe.costPerUnit;
  product.custo_por_unidade = recipe.costPerUnit;
  product.preco_minimo = recipe.priceMinimum;
  product.preco_minimo_sugerido = recipe.priceSuggested ?? recipe.priceMinimum;
  product.cmv_previsto = calcularCmvPrevisto(product);
  product.cmv_futuro = product.cmv_previsto;
  return product;
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
