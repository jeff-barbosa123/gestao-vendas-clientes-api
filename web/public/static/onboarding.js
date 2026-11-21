(() => {
  'use strict';
  const KEY = 'sgvc.onboarding.dismissed';
  const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_e) { return false; } };
  const write = () => { try { localStorage.setItem(KEY, '1'); } catch (_e) { /* ignora */ } };

  async function init() {
    if (read() || !window.SGVC || !window.SGVC.api) return;
    const anchor = document.getElementById('dashboard-message');
    if (!anchor) return;
    let o;
    try {
      o = await window.SGVC.api.request('/api/analytics/overview', { method: 'GET', messageFromServer: true });
    } catch (_e) { return; }
    o = o || {};
    const steps = [
      { done: false, key: 'company', text: 'Configurar sua empresa (nome e logotipo)', href: '/appearance.html', cta: 'Configurar' },
      { done: Number(o.customers) > 0, text: 'Cadastrar o primeiro cliente', href: '/clients.html', cta: 'Cadastrar' },
      { done: Number(o.products) > 0, text: 'Cadastrar o primeiro produto', href: '/products.html', cta: 'Cadastrar' },
      { done: Number(o.recipes) > 0, text: 'Criar uma ficha t\u00e9cnica (opcional, para quem produz)', href: '/recipes.html', cta: 'Criar', optional: true },
      { done: Number(o.sales) > 0, text: 'Registrar a primeira venda', href: '/sales.html', cta: 'Registrar' },
    ];
    // "Empresa" so conta como feita depois que o usuario visita a tela (lembrado localmente).
    try { steps[0].done = localStorage.getItem('sgvc.onboarding.company') === '1'; } catch (_e) { /* ignora */ }
    const required = steps.filter((s) => !s.optional);
    if (required.every((s) => s.done)) { write(); return; }
    const box = document.createElement('section');
    box.className = 'panel-card onboarding-card';
    box.id = 'onboarding-card';
    box.setAttribute('aria-label', 'Primeiros passos');
    box.innerHTML = '<h4 class="panel-title">Primeiros passos</h4><ul class="onboarding-list">' +
      steps.map((s) => '<li class="onboarding-item' + (s.done ? ' is-done' : '') + '">' +
        '<span class="onboarding-mark" aria-hidden="true">' + (s.done ? '\u2713' : '\u25CB') + '</span>' +
        '<span class="onboarding-text">' + s.text + '</span>' +
        (s.done ? '' : '<a class="button is-light is-small" href="' + s.href + '"' + (s.key === 'company' ? ' data-onb-company="1"' : '') + '>' + s.cta + '</a>') +
        '</li>').join('') + '</ul>' +
      '<button class="button is-light is-small" type="button" id="onboarding-dismiss">Dispensar</button>';
    anchor.parentNode.insertBefore(box, anchor);
    box.addEventListener('click', (ev) => {
      if (ev.target.id === 'onboarding-dismiss') { write(); box.remove(); }
      if (ev.target.getAttribute && ev.target.getAttribute('data-onb-company')) {
        try { localStorage.setItem('sgvc.onboarding.company', '1'); } catch (_e) { /* ignora */ }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
