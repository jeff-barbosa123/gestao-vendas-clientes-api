// Estados vazios padronizados para listas/tabelas.
//   "nada cadastrado ainda"  -> mensagem + botao de acao que leva ao formulario de cadastro
//   "busca/filtro sem resultado" -> mensagem + botao "Limpar busca e filtros"
// Uso: tbody.innerHTML = SGVC.emptyRow(7, { cls: 'products-empty', hasData, none, hint, filtered, cta: { label, focus }, clear: '#search-input', click: '#filter-clear' })
//   hasData  true quando existem registros e o filtro zerou o resultado
//   cta.focus  seletor do campo/botao que recebe o foco (omitido se estiver oculto/ausente)
//   clear    seletores de campos a esvaziar (separados por virgula); click  seletor de um botao a acionar
(() => {
  'use strict';

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function visible(selector) {
    const el = selector && document.querySelector(selector);
    return !!el && !el.closest('[hidden]');
  }

  function emptyRow(colspan, o) {
    const opts = o || {};
    const cls = opts.cls ? ` class="${esc(opts.cls)}"` : '';
    let body;
    if (opts.hasData) {
      const attrs = [];
      if (opts.clear) attrs.push(`data-empty-clear="${esc(opts.clear)}"`);
      if (opts.click) attrs.push(`data-empty-click="${esc(opts.click)}"`);
      body = `<p class="empty-state-title">${esc(opts.filtered)}</p>`
        + `<button type="button" class="button is-light is-small" ${attrs.join(' ')}>Limpar busca e filtros</button>`;
    } else {
      const cta = opts.cta && visible(opts.cta.focus)
        ? `<button type="button" class="button is-link is-small" data-empty-focus="${esc(opts.cta.focus)}">${esc(opts.cta.label)}</button>`
        : '';
      body = `<p class="empty-state-title">${esc(opts.none)}</p>`
        + (opts.hint ? `<p class="empty-state-hint">${esc(opts.hint)}</p>` : '')
        + cta;
    }
    return `<tr${cls}><td colspan="${colspan}"><div class="empty-state" data-empty-state="${opts.hasData ? 'filtered' : 'none'}">${body}</div></td></tr>`;
  }

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  document.addEventListener('click', (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest('[data-empty-focus],[data-empty-clear],[data-empty-click]') : null;
    if (!t) return;
    if (t.dataset.emptyFocus) {
      const el = document.querySelector(t.dataset.emptyFocus);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }
      return;
    }
    if (t.dataset.emptyClear) {
      t.dataset.emptyClear.split(',').forEach((sel) => {
        const el = document.querySelector(sel.trim());
        if (!el) return;
        el.value = '';
        fire(el, 'input');
        fire(el, 'change');
      });
    }
    if (t.dataset.emptyClick) {
      const btn = document.querySelector(t.dataset.emptyClick);
      if (btn) btn.click();
    }
  });

  window.SGVC = window.SGVC || {};
  window.SGVC.emptyRow = emptyRow;
})();
