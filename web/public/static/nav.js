/**
 * Menu de navegação comum a todas as telas logadas.
 * Barra lateral fixa à esquerda (>= 768px) com o logotipo da empresa no topo e os links agrupados;
 * em telas menores vira uma barra superior com botão "Menu" que abre/fecha a lista.
 * Os href, IDs e classes usados pelos testes (.app-nav-links a[href], #brand-logo, #pwa-install) são mantidos.
 * Não depende de nenhuma outra biblioteca.
 */
(() => {
  // Desenha o topo da sidebar: logotipo (se houver) ou o texto "SGVC". Reusado no carregamento e no evento sgvc:branding.
  function renderBrand(brand, dto) {
    if (dto && dto.hasLogo && dto.logoUrl) {
      const name = dto.companyName || 'SGVC';
      let img = brand.querySelector('#brand-logo');
      if (!img) {
        img = document.createElement('img');
        img.id = 'brand-logo';
        img.className = 'app-nav-logo';
        img.decoding = 'async';
        brand.textContent = '';
        brand.appendChild(img);
      }
      img.alt = 'Logotipo ' + name;
      img.src = dto.logoUrl;
      brand.classList.add('has-logo');
      brand.setAttribute('aria-label', name);
    } else {
      brand.textContent = 'SGVC';
      brand.classList.remove('has-logo');
      brand.removeAttribute('aria-label');
    }
  }

  // Logotipo White-Label da empresa no topo da sidebar (no lugar do texto "SGVC").
  // Sem logo (ou se a API falhar) o texto "SGVC" permanece. A imagem vem do banco via /api/branding/logo.
  function applyCompanyLogo(brand) {
    const run = async () => {
      try {
        const api = window.SGVC && window.SGVC.api;
        if (!api) return;
        const dto = await api.request('/api/branding', { method: 'GET', skipAuth: true });
        if (!dto || !dto.hasLogo || !dto.logoUrl) return;
        renderBrand(brand, dto);
      } catch (_err) {
        // identidade e opcional: o menu continua com o texto SGVC
      }
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
    // A tela Aparencia avisa quando o logotipo e enviado/removido: o menu troca na hora, sem recarregar
    window.addEventListener('sgvc:branding', (event) => renderBrand(brand, event.detail));
  }

  // Grupos da sidebar. Equipe (team:manage) é inserida por static/access.js antes de "Aparência".
  const GROUPS = [
    { title: 'Principal', items: [{ href: '/dashboard.html', label: 'Painel' }] },
    {
      title: 'Operação',
      items: [
        { href: '/pdv.html', label: 'Caixa/PDV' },
        { href: '/sales.html', label: 'Vendas' },
        { href: '/orders.html', label: 'Encomendas' },
      ],
    },
    {
      title: 'Catálogo & Custos',
      items: [
        { href: '/products.html', label: 'Produtos', match: ['/product-edit.html'] },
        { href: '/ingredients.html', label: 'Insumos' },
        { href: '/recipes.html', label: 'Fichas técnicas', match: ['/recipe-edit.html'] },
        { href: '/vinculos.html', label: 'Vínculos' },
        { href: '/simulacao.html', label: 'Simulação' },
      ],
    },
    {
      title: 'Clientes & Financeiro',
      items: [
        { href: '/clients.html', label: 'Clientes', match: ['/client-edit.html'] },
        { href: '/crm.html', label: 'CRM' },
        { href: '/finance.html', label: 'Financeiro' },
        { href: '/reports.html', label: 'Relatórios' },
      ],
    },
  ];

  function isCurrent(item, path) {
    return path === item.href || (item.match || []).includes(path);
  }

  function link(item, path, extraClass) {
    const li = document.createElement('li');
    if (extraClass) li.className = extraClass;
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    if (isCurrent(item, path)) {
      a.classList.add('is-active');
      a.setAttribute('aria-current', 'page');
    }
    li.appendChild(a);
    return li;
  }

  const COLLAPSE_KEY = 'sgvc.nav.collapsed';

  function readCollapsed() {
    try {
      const v = JSON.parse(window.localStorage.getItem(COLLAPSE_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (_e) {
      return [];
    }
  }

  function saveCollapsed(title, collapsed) {
    try {
      const set = new Set(readCollapsed());
      if (collapsed) set.add(title); else set.delete(title);
      window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(Array.from(set)));
    } catch (_e) { /* sem armazenamento: so nao lembra */ }
  }

  // Transforma o titulo do grupo em botao (clique/Enter/Espaco) que recolhe ou expande os links.
  function makeCollapsible(head, title, items, hasActive) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'app-nav-group-toggle';
    btn.textContent = title;
    head.textContent = '';
    head.removeAttribute('role');
    head.appendChild(btn);
    const apply = (collapsed) => {
      btn.setAttribute('aria-expanded', String(!collapsed));
      items.forEach((li) => li.classList.toggle('is-collapsed', collapsed));
    };
    apply(!hasActive && readCollapsed().includes(title));
    btn.addEventListener('click', () => {
      const collapsed = btn.getAttribute('aria-expanded') === 'true';
      apply(collapsed);
      saveCollapsed(title, collapsed);
    });
  }

  function heading(text, isFooter) {
    const li = document.createElement('li');
    li.className = 'app-nav-heading' + (isFooter ? ' is-footer' : '');
    li.setAttribute('role', 'presentation');
    li.textContent = text;
    return li;
  }

  // Esconde o título de um grupo quando todos os links dele estão ocultos pelas permissões/módulos.
  function syncHeadings(list) {
    const children = Array.from(list.children);
    children.forEach((el, i) => {
      if (!el.classList.contains('app-nav-heading')) return;
      let anyVisible = false;
      for (let j = i + 1; j < children.length && !children[j].classList.contains('app-nav-heading'); j += 1) {
        if (!children[j].hidden) anyVisible = true;
      }
      if (el.hidden === anyVisible) el.hidden = !anyVisible;
    });
  }

  function logout() {
    if (!window.confirm('Deseja sair da sua conta agora?')) return;
    const call = typeof window.apiRequest === 'function'
      ? window.apiRequest('/api/auth/logout', { method: 'POST', skipAuth: true })
      : Promise.resolve();
    Promise.resolve(call)
      .catch(() => {})
      .finally(() => {
        window.location.href = '/index.html';
      });
  }

  function build() {
    if (document.querySelector('.app-nav')) return;
    const path = window.location.pathname;

    const nav = document.createElement('nav');
    nav.className = 'app-nav';
    nav.setAttribute('aria-label', 'Menu principal');

    const inner = document.createElement('div');
    inner.className = 'app-nav-inner';

    const brand = document.createElement('a');
    brand.className = 'app-nav-brand';
    brand.href = '/dashboard.html';
    brand.textContent = 'SGVC';
    inner.appendChild(brand);
    applyCompanyLogo(brand);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'app-nav-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'app-nav-links');
    toggle.textContent = 'Menu';
    inner.appendChild(toggle);

    // Painel recolhível no celular (#app-nav-links): lista rolável + rodapé "Conta" sempre visível.
    const panel = document.createElement('div');
    panel.className = 'app-nav-panel';
    panel.id = 'app-nav-links';

    const list = document.createElement('ul');
    list.className = 'app-nav-links';
    const footer = document.createElement('ul');
    footer.className = 'app-nav-links app-nav-footer';

    // Grupos recolhiveis (com mais de 1 item): estado salvo por titulo; o grupo da pagina ativa sempre abre.
    GROUPS.forEach((group) => {
      const head = heading(group.title, false);
      list.appendChild(head);
      const lis = group.items.map((item) => link(item, path));
      lis.forEach((li) => list.appendChild(li));
      if (group.items.length > 1) makeCollapsible(head, group.title, lis, group.items.some((item) => isCurrent(item, path)));
    });

    // Botão discreto de instalar o PWA: fica oculto até o navegador disparar beforeinstallprompt (static/pwa.js).
    const install = document.createElement('li');
    install.className = 'app-nav-install';
    install.hidden = true;
    const installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.id = 'pwa-install';
    installBtn.className = 'app-nav-install-btn';
    installBtn.textContent = 'Instalar app';
    installBtn.hidden = true;
    install.appendChild(installBtn);
    list.appendChild(install);

    // Rodapé da sidebar: Perfil, Equipe (access.js), Aparência e Sair.
    footer.appendChild(heading('Conta', true));
    footer.appendChild(link({ href: '/profile.html', label: 'Perfil' }, path, 'app-nav-profile'));
    footer.appendChild(link({ href: '/appearance.html', label: 'Aparência' }, path, 'app-nav-appearance'));
    const logoutLi = document.createElement('li');
    logoutLi.className = 'app-nav-logout-item';
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.id = 'nav-logout';
    logoutBtn.className = 'app-nav-logout';
    logoutBtn.textContent = 'Sair';
    logoutBtn.addEventListener('click', logout);
    logoutLi.appendChild(logoutBtn);
    footer.appendChild(logoutLi);

    panel.appendChild(list);
    panel.appendChild(footer);
    inner.appendChild(panel);
    nav.appendChild(inner);

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    // Fecha com Esc (devolvendo o foco ao botão), ao escolher um link ou ao tocar fora do menu aberto.
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    panel.addEventListener('click', (ev) => {
      if (ev.target.closest && ev.target.closest('a')) setOpen(false);
    });
    document.addEventListener('click', (ev) => {
      if (nav.classList.contains('is-open') && !nav.contains(ev.target)) setOpen(false);
    });

    let skip = document.querySelector('.skip-link');
    const mainEl = document.getElementById('main');
    if (!skip && mainEl) {
      skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#main';
      skip.textContent = 'Pular para o conte\u00fado';
      document.body.insertBefore(skip, document.body.firstChild);
    }
    if (mainEl && !mainEl.hasAttribute('tabindex')) mainEl.setAttribute('tabindex', '-1');
    if (skip && skip.parentNode === document.body) {
      skip.insertAdjacentElement('afterend', nav);
    } else {
      document.body.insertBefore(nav, document.body.firstChild);
    }
    document.body.classList.add('has-sidebar');

    // Permissões/módulos (access.js) ocultam <li>s depois do build: mantém os títulos dos grupos coerentes.
    const syncAll = () => { syncHeadings(list); syncHeadings(footer); };
    syncAll();
    new MutationObserver(syncAll).observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
