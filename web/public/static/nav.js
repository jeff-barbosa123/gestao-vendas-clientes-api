/**
 * Menu de navegação comum a todas as telas logadas.
 * Injeta uma barra no topo da página com acesso direto às áreas do sistema,
 * destacando a tela atual. Não depende de nenhuma outra biblioteca.
 */
(() => {
  const ITEMS = [
    { href: '/dashboard.html', label: 'Painel' },
    { href: '/sales.html', label: 'Vendas' },
    { href: '/clients.html', label: 'Clientes', match: ['/client-edit.html'] },
    { href: '/products.html', label: 'Produtos', match: ['/product-edit.html'] },
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
