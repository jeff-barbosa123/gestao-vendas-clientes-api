// Espelha no frontend o papel e os modulos da empresa: esconde menu, cartoes e telas que o usuario nao pode usar.
// O backend e quem decide (403); aqui so evitamos mostrar o que nao funciona.
// Sem lista de permissoes em /api/auth/me (ex.: API simulada), nada e escondido.
(() => {
  'use strict';

  const PAGES = {
    '/sales.html': { perm: 'sales:read' },
    '/pdv.html': { perm: 'pdv:use', module: 'pdv' },
    '/orders.html': { perm: 'orders:read', module: 'encomendas' },
    '/clients.html': { perm: 'customers:read' },
    '/crm.html': { perm: 'customers:read', module: 'crm' },
    '/finance.html': { perm: 'finance:view', module: 'financeiro' },
    '/client-edit.html': { perm: 'customers:read' },
    '/products.html': { perm: 'products:read' },
    '/product-edit.html': { perm: 'products:read' },
    '/ingredients.html': { perm: 'ingredients:read', module: 'producao' },
    '/recipes.html': { perm: 'recipes:read', module: 'producao' },
    '/recipe-edit.html': { perm: 'recipes:read', module: 'producao' },
    '/vinculos.html': { perm: 'recipes:read', module: 'producao' },
    '/reports.html': { perm: 'finance:view' },
    '/simulacao.html': { perm: 'finance:view' },
    '/appearance.html': { perm: 'branding:write' },
    '/team.html': { perm: 'team:manage' },
  };

  // Elementos do painel: id -> exigencia (esconde o cartao/botao inteiro).
  const DASHBOARD = {
    'metric-cmv': { perm: 'finance:view', card: true },
    'metric-profit': { perm: 'finance:view', card: true },
    'metric-margin': { perm: 'finance:view', card: true },
    'metric-recipes': { perm: 'recipes:read', module: 'producao', card: true },
    'metric-linked': { perm: 'recipes:read', module: 'producao', card: true },
    'reports-btn': { perm: 'finance:view' },
    'margin-manage-action': { perm: 'finance:view' },
    'alert-pricing-card': { perm: 'finance:view' },
    'alert-products-count': { perm: 'recipes:read', module: 'producao', closest: '.dashboard-alert-card' },
    'alert-stock-card': { perm: 'ingredients:read', module: 'producao' },
    'alert-product-stock-card': { perm: 'products:read' },
  };

  const state = { user: null, ready: false };

  function allowed(req) {
    const u = state.user;
    if (!u || !Array.isArray(u.permissions)) return true;
    if (req.perm && !u.permissions.includes(req.perm)) return false;
    if (req.module && u.modules && u.modules[req.module] === false) return false;
    return true;
  }

  function hide(el) {
    if (el) el.hidden = true;
  }

  function applyNav() {
    document.querySelectorAll('.app-nav-links a').forEach((a) => {
      const req = PAGES[new URL(a.href, window.location.origin).pathname];
      if (req && !allowed(req)) hide(a.closest('li') || a);
    });
    const list = document.querySelector('.app-nav-links');
    if (list && allowed({ perm: 'team:manage' }) && state.user && Array.isArray(state.user.permissions) && !document.querySelector('.app-nav a[href="/team.html"]')) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '/team.html';
      a.textContent = 'Equipe';
      if (window.location.pathname === '/team.html') {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
      li.appendChild(a);
      const appearanceLi = document.querySelector('.app-nav-appearance');
      if (appearanceLi && appearanceLi.parentNode) appearanceLi.parentNode.insertBefore(li, appearanceLi);
      else list.appendChild(li);
    }
  }

  function applyDashboard() {
    Object.keys(DASHBOARD).forEach((id) => {
      const req = DASHBOARD[id];
      const el = document.getElementById(id);
      if (el && !allowed(req)) hide(req.closest ? el.closest(req.closest) || el : req.card ? el.closest('.dashboard-card') || el : el);
    });
  }

  // Formularios de escrita (e seus campos de custo) somem para quem so le.
  const PAGE_BLOCKS = {
    '/products.html': [{ sel: '#create-form', perm: 'products:write', closest: '.panel-card' }],
  };

  function applyBlocks() {
    (PAGE_BLOCKS[window.location.pathname] || []).forEach((b) => {
      const el = document.querySelector(b.sel);
      if (el && !allowed(b)) hide(b.closest ? el.closest(b.closest) || el : el);
    });
  }

  function guardPage() {
    const req = PAGES[window.location.pathname];
    if (req && !allowed(req)) window.location.replace('/dashboard.html');
  }

  async function init() {
    if (typeof window.apiGetMe !== 'function') return;
    try {
      const me = await window.apiGetMe();
      state.user = (me && me.user) || me || null;
    } catch (_err) {
      return;
    }
    state.ready = true;
    guardPage();
    applyNav();
    applyDashboard();
    applyBlocks();
    window.dispatchEvent(new CustomEvent('sgvc:access', { detail: state.user }));
  }

  window.SGVC = window.SGVC || {};
  window.SGVC.access = {
    can: (perm) => allowed({ perm }),
    moduleOn: (name) => allowed({ module: name }),
    user: () => state.user,
  };

  // Depois que os demais scripts (defer) rodaram e o menu foi montado.
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
