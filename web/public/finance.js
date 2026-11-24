/**
 * Financeiro: contas a pagar/receber, fluxo de caixa e DRE simples.
 * Quem decide permissao e o backend (finance:view / finance:manage); aqui so escondemos o que nao se pode usar.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => window.SGVC.utils.escapeHtml(s);
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '-');
  const pct = (v) => (v == null ? '-' : `${(v * 100).toFixed(1).replace('.', ',')}%`);
  const iso = (d) => d.toISOString().slice(0, 10);
  const api = (path, method = 'GET', body) => window.apiRequest(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });

  const message = $('fin-message');
  const say = (text, kind = 'is-light') => {
    message.className = `notification ${kind} fin-message`;
    message.textContent = text;
    message.hidden = !text;
  };
  const errText = (e) => (e && e.message) || 'Não foi possível concluir a operação.';

  const STATUS_LABEL = { OPEN: 'Em aberto', OVERDUE: 'Vencida', PAID: 'Paga', CANCELED: 'Cancelada' };
  const KIND_LABEL = { PAYABLE: 'A pagar', RECEIVABLE: 'A receber' };
  let canManage = false;
  let entries = [];

  // Categoria: sugere as ja usadas e reaproveita a grafia existente (sem diferenca de caixa, acento ou espacos),
  // para o DRE nao se fragmentar em "energia", "Energia " e "Energía".
  const DEFAULT_CATEGORIES = ['Aluguel', 'Água', 'Energia', 'Internet', 'Salários', 'Impostos', 'Fornecedores', 'Embalagens', 'Marketing', 'Outros'];
  const catKey = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const knownCats = new Map();
  function addCategory(label) {
    const clean = String(label || '').replace(/\s+/g, ' ').trim();
    if (clean && !knownCats.has(catKey(clean))) knownCats.set(catKey(clean), clean);
  }
  function renderCategoryOptions() {
    $('f-cat-list').innerHTML = Array.from(knownCats.values()).sort((a, b) => a.localeCompare(b, 'pt-BR')).map((c) => `<option value="${esc(c)}"></option>`).join('');
  }
  function canonicalCategory(raw) {
    const clean = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return knownCats.get(catKey(clean)) || clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  async function seedCategories() {
    // Primeiro as categorias ja usadas (a grafia delas vence), depois as sugestoes padrao.
    try { (await api('/api/finance/entries')).entries.forEach((e) => addCategory(e.category)); } catch (_e) { /* so as sugestoes padrao */ }
    DEFAULT_CATEGORIES.forEach(addCategory);
    renderCategoryOptions();
  }
  $('f-cat').addEventListener('blur', () => { $('f-cat').value = canonicalCategory($('f-cat').value); });

  function showTab(name) {
    document.querySelectorAll('.fin-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    ['entries', 'cashflow', 'dre'].forEach((t) => { $(`tab-${t}`).hidden = t !== name; });
    if (name === 'cashflow') loadCashflow();
    if (name === 'dre') loadDre();
  }
  document.querySelector('.fin-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) showTab(b.dataset.tab);
  });

  async function loadSummary() {
    const s = await api('/api/finance/summary');
    const card = (label, value, neg) => `<div class="${neg ? 'is-neg' : ''}"><dt>${label}</dt><dd>${money(value)}</dd></div>`;
    $('fin-kpis').innerHTML = [
      card('A pagar em aberto', s.payable.open),
      card('A pagar vencido', s.payable.overdue, s.payable.overdue > 0),
      card('A receber em aberto', s.receivable.open),
      card('A receber vencido', s.receivable.overdue, s.receivable.overdue > 0),
      card('Próx. 7 dias (pagar)', s.payable.next7),
      card('Próx. 7 dias (receber)', s.receivable.next7),
      card('Saldo em aberto', s.openBalance, s.openBalance < 0),
    ].join('');
  }

  function rowActions(e) {
    if (!canManage) return '';
    const btn = (action, label) => `<button type="button" class="button is-light is-small" data-action="${action}" data-id="${esc(e.id)}">${label}</button>`;
    if (e.status === 'OPEN') return btn('pay', e.kind === 'PAYABLE' ? 'Pagar' : 'Receber') + btn('cancel', 'Cancelar');
    return btn('reopen', 'Reabrir');
  }

  function renderEntries() {
    const body = $('fin-body');
    if (!entries.length) {
      body.innerHTML = window.SGVC.emptyRow(6, {
        cls: 'is-empty',
        hasData: !!($('flt-kind').value || $('flt-status').value),
        none: 'Nenhum lançamento cadastrado ainda.',
        hint: 'Lance contas a pagar e a receber para acompanhar vencimentos e o fluxo de caixa.',
        filtered: 'Nenhum lançamento encontrado para este filtro.',
        cta: { label: 'Criar primeiro lançamento', focus: '#f-desc' },
        clear: '#flt-kind,#flt-status',
      });
      return;
    }
    body.innerHTML = entries.map((e) => {
      const st = e.status === 'OPEN' && e.overdue ? 'OVERDUE' : e.status;
      const inst = e.installmentTotal ? ` <span class="fin-muted">(${e.installmentNo}/${e.installmentTotal})</span>` : '';
      return `<tr><td>${fmtDate(e.dueDate)}</td><td>${esc(e.description)}${inst}${e.category ? `<br><span class="fin-muted">${esc(e.category)}</span>` : ''}</td>`
        + `<td>${KIND_LABEL[e.kind]}</td><td class="has-text-right">${money(e.amount)}</td>`
        + `<td><span class="fin-badge is-${st}">${STATUS_LABEL[st]}</span></td><td><div class="fin-actions">${rowActions(e)}</div></td></tr>`;
    }).join('');
  }

  async function loadEntries() {
    const q = new URLSearchParams();
    if ($('flt-kind').value) q.set('kind', $('flt-kind').value);
    if ($('flt-status').value) q.set('status', $('flt-status').value);
    entries = (await api(`/api/finance/entries?${q}`)).entries;
    renderEntries();
  }

  async function refresh() {
    try { await Promise.all([loadSummary(), loadEntries()]); } catch (e) { say(errText(e), 'is-danger is-light'); }
  }

  $('flt-kind').addEventListener('change', loadEntries);
  $('flt-status').addEventListener('change', loadEntries);

  $('fin-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      await api('/api/finance/entries', 'POST', {
        kind: $('f-kind').value,
        description: $('f-desc').value,
        amount: $('f-amount').value,
        dueDate: $('f-due').value,
        installments: $('f-inst').value || 1,
        category: canonicalCategory($('f-cat').value),
      });
      ev.target.reset();
      $('f-inst').value = 1;
      addCategory($('f-cat').value);
      say('Lançamento criado.', 'is-success is-light');
      await refresh();
    } catch (e) { say(errText(e), 'is-danger is-light'); }
  });

  $('fin-body').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-action]');
    if (!b) return;
    const { action, id } = b.dataset;
    try {
      if (action === 'pay') await api(`/api/finance/entries/${id}/pay`, 'POST', { paidAt: iso(new Date()) });
      else if (action === 'cancel') {
        if (!window.confirm('Cancelar este lançamento?')) return;
        await api(`/api/finance/entries/${id}/cancel`, 'POST');
      } else await api(`/api/finance/entries/${id}/reopen`, 'POST');
      say('Lançamento atualizado.', 'is-success is-light');
      await refresh();
    } catch (e) { say(errText(e), 'is-danger is-light'); }
  });

  async function loadCashflow() {
    try {
      const q = new URLSearchParams({ from: $('cf-from').value, to: $('cf-to').value, group: $('cf-group').value });
      const r = await api(`/api/finance/cashflow?${q}`);
      const line = (p) => `<tr><td>${esc(p.period)}</td><td class="has-text-right">${money(p.salesIn)}</td><td class="has-text-right">${money(p.receivablesIn)}</td>`
        + `<td class="has-text-right">${money(p.payablesOut)}</td><td class="has-text-right">${money(p.net)}</td><td class="has-text-right">${money(p.cumulative)}</td>`
        + `<td class="has-text-right">${money(p.projectedIn)}</td><td class="has-text-right">${money(p.projectedOut)}</td></tr>`;
      const t = r.totals;
      $('cf-body').innerHTML = (r.periods.length ? r.periods.map(line).join('') : '<tr class="is-empty"><td colspan="8">Sem movimentação no período.</td></tr>')
        + `<tr class="fin-total"><td>Total</td><td class="has-text-right">${money(t.salesIn)}</td><td class="has-text-right">${money(t.receivablesIn)}</td>`
        + `<td class="has-text-right">${money(t.payablesOut)}</td><td class="has-text-right">${money(t.net)}</td><td></td>`
        + `<td class="has-text-right">${money(t.projectedIn)}</td><td class="has-text-right">${money(t.projectedOut)}</td></tr>`;
    } catch (e) { say(errText(e), 'is-danger is-light'); }
  }

  async function loadDre() {
    try {
      const r = await api(`/api/finance/dre?${new URLSearchParams({ from: $('dre-from').value, to: $('dre-to').value })}`);
      const row = (label, value, cls = '') => `<tr class="${cls}"><td>${label}</td><td class="has-text-right">${value}</td></tr>`;
      $('dre-body').innerHTML = [
        row('Receita bruta de vendas', money(r.grossRevenue)),
        row('(−) Descontos', money(r.discounts)),
        row('Receita líquida', money(r.netRevenue), 'fin-total'),
        row('(−) CMV (custo das mercadorias vendidas)', money(r.cmv)),
        row('Lucro bruto', money(r.grossProfit), 'fin-total'),
        row('Margem bruta', pct(r.grossMargin)),
        row('(+) Outras receitas (contas recebidas)', money(r.otherIncome)),
        ...r.expenses.map((x) => row(`(−) ${esc(x.category || 'Sem categoria')}`, money(x.amount))),
        row('(−) Total de despesas pagas', money(r.totalExpenses)),
        row('Resultado operacional', money(r.operatingResult), 'fin-total'),
        row('Margem do resultado', pct(r.resultMargin)),
      ].join('');
    } catch (e) { say(errText(e), 'is-danger is-light'); }
  }

  $('cf-go').addEventListener('click', loadCashflow);
  $('dre-go').addEventListener('click', loadDre);

  const now = new Date();
  const first = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
  const last = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)));
  ['cf', 'dre'].forEach((p) => { $(`${p}-from`).value = first; $(`${p}-to`).value = last; });

  function start() {
    const access = window.SGVC && window.SGVC.access;
    canManage = !!(access && access.can && access.can('finance:manage'));
    $('fin-form').hidden = !canManage;
    if (canManage) seedCategories();
    refresh();
  }
  if (window.SGVC && window.SGVC.access && window.SGVC.access.user && window.SGVC.access.user()) start();
  else window.addEventListener('sgvc:access', start, { once: true });
})();
