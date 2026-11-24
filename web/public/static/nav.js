/**
 * Menu de navegação comum a todas as telas logadas.
 * Barra lateral fixa à esquerda (>= 768px) com o logotipo da empresa no topo e os links agrupados;
 * em telas menores vira uma barra superior com botão "Menu" que abre/fecha a lista.
 * Os href, IDs e classes usados pelos testes (.app-nav-links a[href], #brand-logo, #pwa-install) são mantidos.
 * Não depende de nenhuma outra biblioteca.
 */
(() => {
  // Logotipo White-Label da empresa no topo da sidebar (no lugar do texto "SGVC").
  // Sem logo (ou se a API falhar) o texto "SGVC" permanece. A imagem vem do banco via /api/branding/logo.
  function applyCompanyLogo(brand) {
    const run = async () => {
      try {
        const api = window.SGVC && window.SGVC.api;
        if (!api) return;
        const dto = await api.request('/api/branding', { method: 'GET', skipAuth: true });
        if (!dto || !dto.hasLogo || !dto.logoUrl) return;
        const name = dto.companyName || 'SGVC';
        const img = document.createElement('img');
        img.id = 'brand-logo';
        img.className = 'app-nav-logo';
        img.alt = 'Logotipo ' + name;
        img.decoding = 'async';
        img.src = dto.logoUrl;
        brand.textContent = '';
        brand.classList.add('has-logo');
        brand.setAttribute('aria-label', name);
        brand.appendChild(img);
      } catch (_err) {
        // identidade e opcional: o menu continua com o texto SGVC
      }
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
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

    const list = document.createElement('ul');
    list.className = 'app-nav-links';
    list.id = 'app-nav-links';

    GROUPS.forEach((group) => {
      list.appendChild(heading(group.title, false));
      group.items.forEach((item) => list.appendChild(link(item, path)));
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
    list.appendChild(heading('Conta', true));
    list.appendChild(link({ href: '/profile.html', label: 'Perfil' }, path, 'app-nav-profile'));
    list.appendChild(link({ href: '/appearance.html', label: 'Aparência' }, path, 'app-nav-appearance'));
    const logoutLi = document.createElement('li');
    logoutLi.className = 'app-nav-logout-item';
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.id = 'nav-logout';
    logoutBtn.className = 'app-nav-logout';
    logoutBtn.textContent = 'Sair';
    logoutBtn.addEventListener('click', logout);
    logoutLi.appendChild(logoutBtn);
    list.appendChild(logoutLi);

    inner.appendChild(list);
    nav.appendChild(inner);

    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    const skip = document.querySelector('.skip-link');
    if (skip && skip.parentNode === document.body) {
      skip.insertAdjacentElement('afterend', nav);
    } else {
      document.body.insertBefore(nav, document.body.firstChild);
    }
    document.body.classList.add('has-sidebar');

    // Permissões/módulos (access.js) ocultam <li>s depois do build: mantém os títulos dos grupos coerentes.
    syncHeadings(list);
    new MutationObserver(() => syncHeadings(list)).observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
