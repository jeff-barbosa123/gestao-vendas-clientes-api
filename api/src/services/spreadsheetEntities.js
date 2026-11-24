/**
 * Definicao de colunas e regras de importacao/exportacao por cadastro.
 * Usado por controllers/spreadsheetController.js. Sempre opera com o "user" do tenant
 * (user.id = id da empresa), entao as listagens e criacoes ja ficam isoladas por empresa.
 */
const customersService = require('./customersService');
const productsService = require('./productsService');
const ingredientsService = require('./ingredientsService');
const salesService = require('./salesService');
const ordersService = require('./ordersService');
const financeService = require('./financeService');
const { parsePagination } = require('../utils/pagination');

const META_OPEN = '<sgvc-meta>';
const META_CLOSE = '</sgvc-meta>';

// Observacoes do cliente carregam metadados (tipo, nome fantasia, complemento) entre <sgvc-meta>.
function splitNotes(value) {
  const payload = typeof value === 'string' ? value : '';
  const start = payload.indexOf(META_OPEN);
  const end = start === -1 ? -1 : payload.indexOf(META_CLOSE, start + META_OPEN.length);
  if (start === -1 || end === -1) return { text: payload.trim(), meta: {} };
  let meta = {};
  try {
    meta = JSON.parse(payload.slice(start + META_OPEN.length, end).trim()) || {};
  } catch (_err) {
    meta = {};
  }
  return { text: payload.slice(0, start).trim(), meta };
}

function joinNotes(text, meta) {
  const clean = {};
  Object.keys(meta || {}).forEach((k) => {
    const v = meta[k] == null ? '' : String(meta[k]).trim();
    if (v) clean[k] = v;
  });
  const t = String(text || '').trim();
  if (!Object.keys(clean).length) return t || null;
  const tag = `${META_OPEN}${JSON.stringify(clean)}${META_CLOSE}`;
  return t ? `${t}\n${tag}` : tag;
}

const ALL_PAGES = { defaultLimit: 1000, maxLimit: 10000 };

// Percorre todas as paginas de um servico paginado e devolve a lista completa.
async function fetchAll(listPage) {
  const first = await listPage(parsePagination({ page: 1, limit: 1000 }, ALL_PAGES));
  if (Array.isArray(first)) return first;
  const items = [...(first.items || [])];
  const pages = (first.pagination && first.pagination.totalPages) || 1;
  for (let page = 2; page <= pages; page += 1) {
    const next = await listPage(parsePagination({ page, limit: 1000 }, ALL_PAGES));
    items.push(...(next.items || []));
  }
  return items;
}

const PRODUCT_TYPES = { revenda: 'RESALE', resale: 'RESALE', produzido: 'PRODUCED', produced: 'PRODUCED' };
const PRODUCT_TYPE_LABELS = { RESALE: 'Revenda', PRODUCED: 'Produzido' };
const STATUS_LABELS = { ATIVO: 'Ativo', INATIVO: 'Inativo' };

function matchesSearch(row, term, keys) {
  const t = String(term || '').trim().toLowerCase();
  if (!t) return true;
  return keys.some((k) => String(row[k] || '').toLowerCase().includes(t));
}

const ENTITIES = {
  customers: {
    baseName: 'clientes',
    sheetName: 'Clientes',
    exportPerm: 'customers:read',
    importPerm: 'customers:write',
    columns: [
      { key: 'name', label: 'Nome', required: true, aliases: ['Nome completo', 'Cliente', 'Razão social'], example: 'Maria Souza', note: 'Nome do cliente (até 255 caracteres).' },
      { key: 'email', label: 'E-mail', required: true, aliases: ['Email'], example: 'maria@exemplo.com', note: 'E-mail único por cliente.' },
      { key: 'phone', label: 'Telefone', aliases: ['Celular', 'WhatsApp'], example: '(81) 99999-0000' },
      { key: 'type', label: 'Tipo', aliases: ['Tipo de pessoa'], example: 'PF', note: 'PF ou PJ. PJ exige CNPJ.', get: (r) => splitNotes(r.notes).meta.type || '' },
      { key: 'cpf', label: 'CPF', example: '', note: 'Somente números ou com pontuação.' },
      { key: 'cnpj', label: 'CNPJ', example: '' },
      { key: 'tradeName', label: 'Nome fantasia', get: (r) => splitNotes(r.notes).meta.tradeName || '' },
      { key: 'birthDate', label: 'Data de nascimento', type: 'date', aliases: ['Nascimento'], example: '15/03/1990', note: 'dd/mm/aaaa.', get: (r) => r.birthDate || r.birth_date },
      { key: 'addressPostalCode', label: 'CEP', aliases: ['Cep'], get: (r) => r.addressPostalCode || r.address_postal_code },
      { key: 'addressStreet', label: 'Rua', aliases: ['Endereço', 'Logradouro'], get: (r) => r.addressStreet || r.address_street },
      { key: 'addressNumber', label: 'Número', aliases: ['Numero'], get: (r) => r.addressNumber || r.address_number },
      { key: 'complement', label: 'Complemento', get: (r) => splitNotes(r.notes).meta.complement || '' },
      { key: 'addressNeighborhood', label: 'Bairro', get: (r) => r.addressNeighborhood || r.address_neighborhood },
      { key: 'addressCity', label: 'Cidade', get: (r) => r.addressCity || r.address_city },
      { key: 'notes', label: 'Observações', aliases: ['Observacoes', 'Notas'], get: (r) => splitNotes(r.notes).text },
      { key: 'totalSpent', label: 'Total gasto', type: 'money', exportOnly: true },
      { key: 'purchases', label: 'Compras', type: 'int', exportOnly: true },
      { key: 'createdAt', label: 'Cadastrado em', type: 'date', exportOnly: true, get: (r) => r.createdAt || r.created_at },
    ],
    async rows(user, query) {
      const type = query.filter || query.type;
      const filters = {};
      ['search', 'sortBy', 'createdFrom', 'createdTo'].forEach((k) => { if (query[k]) filters[k] = query[k]; });
      if (query.q && !filters.search) filters.search = query.q;
      if (type && type !== 'all') filters.type = type;
      return fetchAll((pagination) => customersService.list(user, pagination, filters));
    },
    async create(user, v) {
      const meta = { type: v.type ? String(v.type).toUpperCase() : '', tradeName: v.tradeName, complement: v.complement };
      if (meta.type && !['PF', 'PJ'].includes(meta.type)) throw new Error('Tipo deve ser PF ou PJ');
      await customersService.create({
        name: v.name,
        email: v.email,
        phone: v.phone,
        cpf: v.cpf,
        cnpj: v.cnpj,
        birthDate: v.birthDate,
        addressStreet: v.addressStreet,
        addressNumber: v.addressNumber,
        addressNeighborhood: v.addressNeighborhood,
        addressCity: v.addressCity,
        addressPostalCode: v.addressPostalCode,
        notes: joinNotes(v.notes, meta),
      }, user);
    },
  },

  products: {
    baseName: 'produtos',
    sheetName: 'Produtos',
    exportPerm: 'products:read',
    importPerm: 'products:write',
    columns: [
      { key: 'name', label: 'Nome', required: true, aliases: ['Produto'], example: 'Brigadeiro gourmet' },
      { key: 'description', label: 'Descrição', aliases: ['Descricao'], example: 'Caixa com 12 unidades' },
      { key: 'price', label: 'Preço de venda', type: 'money', required: true, aliases: ['Preco', 'Preço', 'Preço de venda (R$)'], example: 36.9, note: 'Valor em reais. Aceita 36,90 ou 36.90.' },
      { key: 'purchase_price', label: 'Custo de compra', type: 'money', required: true, aliases: ['Custo', 'Preço de compra', 'Custo (R$)'], example: 18, note: 'Custo do produto. Visível apenas a perfis com permissão de custos.', perm: 'cost:view', get: (r) => (r.purchase_price !== undefined ? r.purchase_price : r.purchasePrice) },
      { key: 'productType', label: 'Tipo', aliases: ['Tipo de produto'], example: 'Revenda', note: 'Revenda (padrão). Produtos "Produzido" precisam de ficha técnica e devem ser criados pela tela de Produtos.', get: (r) => PRODUCT_TYPE_LABELS[r.productType || r.product_type] || '' },
      { key: 'stock', label: 'Estoque', type: 'int', example: 10, note: 'Quantidade em estoque (inteiro). Vazio = sem controle.' },
      { key: 'minStock', label: 'Estoque mínimo', type: 'int', aliases: ['Estoque minimo'], example: 2, get: (r) => (r.minStock !== undefined ? r.minStock : r.min_stock) },
      { key: 'barcode', label: 'Código de barras', exportOnly: true },
      { key: 'statusProduto', label: 'Situação', aliases: ['Situacao', 'Status'], example: 'Ativo', note: 'Ativo ou Inativo.', get: (r) => STATUS_LABELS[r.status_produto || r.statusProduto] || (r.status_produto || r.statusProduto || '') },
      { key: 'createdAt', label: 'Cadastrado em', type: 'date', exportOnly: true, get: (r) => r.created_at || r.createdAt },
    ],
    async rows(user, query) {
      const all = await fetchAll((pagination) => productsService.getAll(user, pagination));
      return all.filter((p) => matchesSearch(p, query.search || query.q, ['name', 'description', 'barcode']));
    },
    async create(user, v) {
      const type = v.productType ? PRODUCT_TYPES[String(v.productType).trim().toLowerCase()] : 'RESALE';
      if (!type) throw new Error('Tipo inválido. Use Revenda (produtos Produzidos são criados pela tela de Produtos).');
      if (type === 'PRODUCED') throw new Error('Produtos "Produzido" exigem ficha técnica: crie-os pela tela de Produtos.');
      const statusRaw = v.statusProduto ? String(v.statusProduto).trim().toUpperCase() : 'ATIVO';
      const status = { ATIVO: 'ATIVO', INATIVO: 'INATIVO' }[statusRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
      if (!status) throw new Error('Situação inválida. Use Ativo ou Inativo.');
      await productsService.create({
        name: v.name,
        description: v.description,
        price: v.price,
        purchase_price: v.purchase_price,
        productType: type,
        stock: v.stock === null ? undefined : v.stock,
        minStock: v.minStock === null ? undefined : v.minStock,
        statusProduto: status,
      }, user);
    },
  },

  ingredients: {
    baseName: 'insumos',
    sheetName: 'Insumos',
    exportPerm: 'ingredients:read',
    importPerm: 'ingredients:write',
    module: 'producao',
    columns: [
      { key: 'name', label: 'Nome', required: true, aliases: ['Insumo'], example: 'Leite condensado', note: 'Nome único por empresa.' },
      { key: 'packageQuantity', label: 'Quantidade da embalagem', type: 'number', required: true, aliases: ['Quantidade', 'Qtd embalagem'], example: 395, note: 'Maior que zero.' },
      { key: 'packageUnit', label: 'Unidade', required: true, aliases: ['Unidade da embalagem'], example: 'g', note: 'g, kg, ml, l ou un.' },
      { key: 'packageCost', label: 'Preço da embalagem', type: 'money', required: true, aliases: ['Preco da embalagem', 'Custo da embalagem', 'Preço'], example: 6.5, note: 'Valor em reais (zero ou maior).' },
      { key: 'stockQuantity', label: 'Estoque atual', type: 'number', exportOnly: true },
      { key: 'minStock', label: 'Estoque mínimo', type: 'number', exportOnly: true },
      { key: 'stockUnit', label: 'Unidade de estoque', exportOnly: true },
      { key: 'createdAt', label: 'Cadastrado em', type: 'date', exportOnly: true },
    ],
    async rows(user, query) {
      const all = await ingredientsService.list(user);
      return all.filter((i) => matchesSearch(i, query.search || query.q, ['name']));
    },
    async create(user, v) {
      await ingredientsService.create({
        name: v.name,
        packageQuantity: v.packageQuantity,
        packageUnit: v.packageUnit ? String(v.packageUnit).trim().toLowerCase() : v.packageUnit,
        packageCost: v.packageCost,
      }, user);
    },
  },

  // ----- apenas exportacao -----
  sales: {
    baseName: 'vendas',
    sheetName: 'Vendas',
    exportPerm: 'sales:read',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'date', label: 'Data', type: 'datetime' },
      { key: 'customerName', label: 'Cliente', get: (r) => r.customerName || r.customer_name || '' },
      { key: 'paymentMethod', label: 'Forma de pagamento', get: (r) => r.paymentMethod || r.payment_method || '' },
      { key: 'items', label: 'Itens', type: 'int', get: (r) => (Array.isArray(r.items) ? r.items.reduce((s, i) => s + Number(i.quantity || 0), 0) : 0) },
      { key: 'discount', label: 'Desconto', type: 'money' },
      { key: 'total', label: 'Total', type: 'money' },
      { key: 'cmv', label: 'CMV', type: 'money', perm: 'cost:view' },
      { key: 'status', label: 'Situação', get: (r) => ({ ACTIVE: 'Ativa', CANCELED: 'Cancelada', CANCELLED: 'Cancelada' }[r.status] || r.status || '') },
    ],
    async rows(user, query) {
      const all = await fetchAll((pagination) => salesService.getAll(user, pagination));
      const from = query.from ? new Date(query.from) : null;
      const to = query.to ? new Date(query.to) : null;
      return all.filter((s) => {
        const d = new Date(s.date || s.created_at);
        if (from && !Number.isNaN(from.getTime()) && d < from) return false;
        if (to && !Number.isNaN(to.getTime()) && d >= to) return false;
        return true;
      });
    },
  },

  orders: {
    baseName: 'encomendas',
    sheetName: 'Encomendas',
    exportPerm: 'orders:read',
    module: 'encomendas',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'customerPhone', label: 'Telefone' },
      { key: 'deliveryAt', label: 'Entrega', type: 'datetime' },
      { key: 'status', label: 'Situação', get: (r) => r.statusLabel || r.status },
      { key: 'items', label: 'Itens', get: (r) => (Array.isArray(r.items) ? r.items.map((i) => `${i.quantity}x ${i.productName || i.product_name || ''}`.trim()).join(' | ') : '') },
      { key: 'total', label: 'Total', type: 'money' },
      { key: 'deposit', label: 'Sinal', type: 'money' },
      { key: 'balanceDue', label: 'Saldo a receber', type: 'money' },
      { key: 'notes', label: 'Observações' },
      { key: 'createdAt', label: 'Criada em', type: 'datetime' },
    ],
    async rows(user, query) {
      const q = {};
      ['from', 'to', 'status'].forEach((k) => { if (query[k]) q[k] = query[k]; });
      return ordersService.list(user, q);
    },
  },

  finance: {
    baseName: 'financeiro',
    sheetName: 'Financeiro',
    exportPerm: 'finance:view',
    module: 'financeiro',
    columns: [
      { key: 'kind', label: 'Tipo', get: (r) => ({ RECEIVABLE: 'A receber', PAYABLE: 'A pagar' }[r.kind] || r.kind) },
      { key: 'description', label: 'Descrição' },
      { key: 'category', label: 'Categoria' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'supplier', label: 'Fornecedor' },
      { key: 'amount', label: 'Valor', type: 'money' },
      { key: 'dueDate', label: 'Vencimento', type: 'date' },
      { key: 'status', label: 'Situação', get: (r) => ({ OPEN: r.overdue ? 'Vencida' : 'Em aberto', PAID: 'Paga', CANCELED: 'Cancelada', CANCELLED: 'Cancelada' }[r.status] || r.status) },
      { key: 'paidAt', label: 'Pago em', type: 'date' },
      { key: 'paidAmount', label: 'Valor pago', type: 'money' },
      { key: 'method', label: 'Forma de pagamento' },
      { key: 'installment', label: 'Parcela', get: (r) => (r.installmentNo ? `${r.installmentNo}/${r.installmentTotal || ''}` : '') },
      { key: 'notes', label: 'Observações' },
    ],
    async rows(user, query) {
      const q = {};
      ['kind', 'status', 'from', 'to'].forEach((k) => { if (query[k]) q[k] = query[k]; });
      const result = await financeService.list(user, q);
      return result.entries || [];
    },
  },
};

module.exports = { ENTITIES, splitNotes, joinNotes };
