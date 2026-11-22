// Papeis, matriz de permissoes e modulos opcionais. Fonte unica: o backend decide; o frontend so espelha.

const ROLES = ['owner', 'manager', 'seller', 'stockist'];
const INVITABLE_ROLES = ['manager', 'seller', 'stockist'];

const ROLE_LABELS = {
  owner: 'Dono',
  manager: 'Gerente',
  seller: 'Vendedor/Caixa',
  stockist: 'Estoquista',
};

const ALL_PERMISSIONS = [
  'customers:read', 'customers:write',
  'products:read', 'products:write',
  'sales:read', 'sales:write',
  'orders:read', 'orders:write',
  'recipes:read', 'recipes:write',
  'ingredients:read', 'ingredients:write',
  'analytics:read',
  'finance:view', // CMV, lucro, margem, preco minimo, relatorios e simulacao de preco
  'cost:view', // custo de compra / custo por unidade
  'export:use',
  'branding:write',
  'team:manage',
  'modules:manage',
];

const MATRIX = {
  owner: ALL_PERMISSIONS,
  manager: ALL_PERMISSIONS.filter((p) => !['branding:write', 'team:manage', 'modules:manage'].includes(p)),
  seller: [
    'customers:read', 'customers:write',
    'products:read',
    'sales:read', 'sales:write',
    'orders:read', 'orders:write',
    'analytics:read',
  ],
  stockist: [
    'products:read', 'products:write',
    'ingredients:read', 'ingredients:write',
    'recipes:read',
    'analytics:read',
    'cost:view',
  ],
};

// Modulos opcionais por empresa (chave ausente = ligado).
const MODULES = {
  producao: {
    label: 'Produção e fichas técnicas',
    description: 'Insumos, fichas técnicas e vínculo com produtos. Ideal para alimentação e produção artesanal.',
  },
  encomendas: {
    label: 'Encomendas',
    description: 'Pedidos com data de entrega e acompanhamento de status.',
  },
};

function isRole(role) {
  return ROLES.includes(role);
}

function permissionsOf(role) {
  return (MATRIX[role] || []).slice();
}

function can(role, permission) {
  return (MATRIX[role] || []).includes(permission);
}

function resolveModules(stored) {
  const src = stored && typeof stored === 'object' ? stored : {};
  const out = {};
  Object.keys(MODULES).forEach((key) => {
    out[key] = src[key] !== false;
  });
  return out;
}

// Campos que somem das respostas de quem nao tem a permissao (defesa no backend; a UI so esconde o resto).
const FINANCE_KEY = /(cmv|profit|lucro|margem|margin|preco_minimo|pricingalerts)/i;
// custo/cost so como palavra inteira ou prefixo de composto (custo_x, custoX, costPrice); nao pega "customer".
const COST_KEY = { test: (k) => /^purchase_?price/i.test(k) || /^(custo|cost)($|[_A-Z0-9])/.test(k) };

function stripKeys(value, drop, depth = 0) {
  if (value == null || depth > 8) return value;
  if (Array.isArray(value)) return value.map((v) => stripKeys(v, drop, depth + 1));
  if (typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value) && typeof value.toJSON !== 'function') {
    const out = {};
    Object.keys(value).forEach((k) => {
      if (!drop(k)) out[k] = stripKeys(value[k], drop, depth + 1);
    });
    return out;
  }
  return value;
}

function sanitizerFor(role) {
  const hideFinance = !can(role, 'finance:view');
  const hideCost = !can(role, 'cost:view');
  if (!hideFinance && !hideCost) return null;
  const drop = (key) => (hideFinance && FINANCE_KEY.test(key)) || (hideCost && COST_KEY.test(key));
  return (body) => stripKeys(body, drop);
}

module.exports = {
  ROLES,
  INVITABLE_ROLES,
  ROLE_LABELS,
  ALL_PERMISSIONS,
  MATRIX,
  MODULES,
  isRole,
  permissionsOf,
  can,
  resolveModules,
  sanitizerFor,
};
