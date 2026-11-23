/**
 * Menu de navegação comum a todas as telas logadas.
 * Injeta uma barra no topo da página com acesso direto às áreas do sistema,
 * destacando a tela atual. Não depende de nenhuma outra biblioteca.
 */
(() => {

  // Logotipo White-Label da empresa no canto esquerdo da navbar (no lugar do texto "SGVC").
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
  const ITEMS = [
    { href: '/dashboard.html', label: 'Painel' },
    { href: '/sales.html', label: 'Vendas' },
    { href: '/pdv.html', label: 'Caixa/PDV' },
    { href: '/orders.html', label: 'Encomendas' },
    { href: '/clients.html', label: 'Clientes', match: ['/client-edit.html'] },
    { href: '/crm.html', label: 'CRM' },
    { href: '/finance.html', label: 'Financeiro' },
    { href: '/products.html', label: 'Produtos', match: ['/product-edit.html'] },
    { href: '/ingredients.html', label: 'Insumos' },
    { href: '/recipes.html', label: 'Fichas técnicas', match: ['/recipe-edit.html'] },
    { href: '/vinculos.html', label: 'Vínculos' },
    { href: '/reports.html', label: 'Relatórios' },
    { href: '/simulacao.html', label: 'Simulação' },
  ];

  function isCurrent(item, path) {
    return path === item.href || (item.match || []).includes(path);
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
    ITEMS.forEach((item) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (isCurrent(item, path)) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
      li.appendChild(a);
      list.appendChild(li);
    });

    const profile = document.createElement('li');
    profile.className = 'app-nav-profile';
    const profileLink = document.createElement('a');
    profileLink.href = '/profile.html';
    profileLink.textContent = 'Perfil';
    if (path === '/profile.html') {
      profileLink.classList.add('is-active');
      profileLink.setAttribute('aria-current', 'page');
    }
    profile.appendChild(profileLink);
    list.appendChild(profile);

    // Botao discreto de instalar o PWA: fica oculto ate o navegador disparar beforeinstallprompt (static/pwa.js).
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
