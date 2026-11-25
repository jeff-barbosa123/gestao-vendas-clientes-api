(() => {
  'use strict';
  const KEY = 'sgvc.onboarding.dismissed';
  const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_e) { return false; } };
  const write = () => { try { localStorage.setItem(KEY, '1'); } catch (_e) { /* ignora */ } };

  // Base vazia: a API confirma zero clientes, produtos, fichas ativas e vendas em todo o historico.
  const isEmptyBase = (o) => ['customers', 'products', 'recipes', 'salesCount'].every((k) => o[k] != null && Number(o[k]) === 0);

  // Com a base vazia, indicadores e alertas ficam recolhidos para o guia aparecer em destaque.
  function highlightGuide(box) {
    const dashboard = box.closest('.dashboard');
    if (!dashboard) return;
    dashboard.classList.add('is-guide-focus');
    box.classList.add('is-highlight');
    const intro = document.createElement('p');
    intro.className = 'onboarding-intro';
    intro.textContent = 'Seu sistema ainda n\u00e3o tem dados. Comece pelos passos abaixo.';
    box.insertBefore(intro, box.querySelector('.onboarding-list'));
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'onboarding-show-metrics';
    toggle.className = 'button is-link is-small';
    toggle.textContent = 'Mostrar indicadores';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const expanded = !dashboard.classList.toggle('is-guide-focus');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? 'Ocultar indicadores' : 'Mostrar indicadores';
    });
    box.querySelector('.onboarding-actions').prepend(toggle);
  }

  let running = false;

  async function init() {
    if (running || read() || !window.SGVC || !window.SGVC.api || document.getElementById('onboarding-card')) return;
    running = true;
    try { await buildGuide(); } finally { running = false; }
  }

  async function buildGuide() {
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
      { done: Number(o.salesCount) > 0, text: 'Registrar a primeira venda', href: '/sales.html', cta: 'Registrar' },
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
      '<div class="onboarding-actions"><button class="button is-light is-small" type="button" id="onboarding-dismiss">Dispensar</button></div>';
    anchor.parentNode.insertBefore(box, anchor);
    if (isEmptyBase(o)) highlightGuide(box);
    box.addEventListener('click', (ev) => {
      if (ev.target.id === 'onboarding-dismiss') {
        const dashboard = box.closest('.dashboard');
        if (dashboard) dashboard.classList.remove('is-guide-focus');
        write();
        box.remove();
      }
      if (ev.target.getAttribute && ev.target.getAttribute('data-onb-company')) {
        try { localStorage.setItem('sgvc.onboarding.company', '1'); } catch (_e) { /* ignora */ }
      }
    });
  }
  // "Tentar novamente" no painel: se o guia nao carregou antes, tenta de novo.
  window.addEventListener('sgvc:dashboard-retry', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
