// Planilhas (CSV/XLSX) reutilizaveis: exportar, baixar modelo e importar com resumo por linha.
// Uso: <div data-sheet-tools data-entity="products" data-prefix="products" data-import></div>
//   data-entity   entidade da API (/api/export/<entity>, /api/import/<entity>)
//   data-prefix   prefixo dos ids (#<prefix>-export-format, -export-btn, -template-btn, -import-input, -import-summary)
//   data-import   habilita Baixar modelo + Importar
//   data-pdf      inclui a opcao PDF no seletor
//   data-export-perm / data-import-perm  permissao exigida (esconde o que o perfil nao pode usar)
//   data-module   modulo da empresa exigido
//   data-filters  id de um input de busca (opcional) repassado como ?search=
// O backend continua sendo quem decide (403); aqui so evitamos mostrar o que nao funciona.
(() => {
  'use strict';

  const MAX_FILE_BYTES = 700 * 1024;
  const ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  function api() {
    return (window.SGVC && window.SGVC.api) || null;
  }

  function url(path) {
    const a = api();
    return a && a.buildUrl ? a.buildUrl(path) : path;
  }

  function toast(message, kind) {
    if (typeof window.showToast === 'function') return window.showToast(message, kind);
    const box = document.getElementById('message') || document.querySelector('.message-box');
    if (box) {
      box.textContent = message;
      box.className = `message-box ${kind === 'is-danger' ? 'is-danger' : 'is-success'}`;
      box.hidden = false;
    }
    return undefined;
  }

  function filenameFrom(response, fallback) {
    const disposition = response.headers.get('content-disposition') || '';
    const star = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (star) {
      try {
        return decodeURIComponent(star[1]).trim();
      } catch (_e) { /* usa o proximo */ }
    }
    const plain = disposition.match(/filename="?([^";]+)"?/i);
    return plain ? plain[1].trim() : fallback;
  }

  async function errorMessage(response) {
    const text = await response.text();
    try {
      const payload = JSON.parse(text);
      return payload.message || payload.error || 'Falha ao gerar o arquivo.';
    } catch (_e) {
      return text || 'Falha ao gerar o arquivo.';
    }
  }

  async function download(path, fallbackName) {
    const response = await fetch(url(path), { method: 'GET', credentials: 'include' });
    if (!response.ok) throw new Error(await errorMessage(response));
    const blob = await response.blob();
    const name = filenameFrom(response, fallbackName);
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(href);
    }, 100);
    return { name, size: blob.size };
  }

  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = () => reject(new Error('N\u00e3o foi poss\u00edvel ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  function importErrorMessage(err) {
    if (err && err.status === 413) return 'Arquivo muito grande. Divida a planilha em partes menores (ate 2000 linhas).';
    if (err && err.status === 403) return 'Seu perfil nao tem permissao para importar.';
    if (err && err.status === 415) return 'Formato nao suportado. Envie um arquivo .csv ou .xlsx.';
    return (err && err.message) || 'Falha ao importar a planilha.';
  }

  function renderSummary(box, result) {
    box.textContent = '';
    box.hidden = false;
    box.classList.toggle('has-errors', result.failed > 0);

    const title = document.createElement('p');
    title.className = 'sheet-summary-title';
    title.textContent = `${result.imported} importado(s) · ${result.failed} com erro · ${result.total} linha(s) lidas`;
    box.appendChild(title);

    if (result.errors && result.errors.length) {
      const list = document.createElement('ul');
      list.className = 'sheet-summary-errors';
      result.errors.forEach((e) => {
        const li = document.createElement('li');
        li.textContent = `Linha ${e.row}: ${e.message}`;
        list.appendChild(li);
      });
      box.appendChild(list);
      if (result.errorsTruncated) {
        const more = document.createElement('p');
        more.className = 'sheet-summary-more';
        more.textContent = 'Mostrando apenas os primeiros erros. Corrija e reenvie para ver os demais.';
        box.appendChild(more);
      }
    }
  }

  function button(id, text, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.className = 'button is-light is-small';
    b.textContent = text;
    if (label) b.setAttribute('aria-label', label);
    return b;
  }

  async function withBusy(btn, busyText, fn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.textContent = busyText;
    try {
      return await fn();
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.textContent = original;
    }
  }

  function mount(host) {
    if (host.dataset.sheetMounted) return;
    host.dataset.sheetMounted = '1';
    const entity = host.dataset.entity;
    const prefix = host.dataset.prefix || entity;
    const canImport = host.hasAttribute('data-import');
    const label = host.dataset.label || 'registros';

    host.classList.add('sheet-tools');
    const bar = document.createElement('div');
    bar.className = 'sheet-tools-bar';

    const lbl = document.createElement('label');
    lbl.className = 'label';
    lbl.htmlFor = `${prefix}-export-format`;
    lbl.textContent = 'Exportar';
    const select = document.createElement('select');
    select.id = `${prefix}-export-format`;
    select.setAttribute('aria-label', 'Formato de exportacao');
    const formats = [['csv', 'CSV (.csv)'], ['xlsx', 'Excel (.xlsx)']];
    if (host.hasAttribute('data-pdf')) formats.push(['pdf', 'PDF (.pdf)']);
    formats.forEach(([value, text]) => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      select.appendChild(o);
    });
    const exportBtn = button(`${prefix}-export-btn`, 'Exportar', `Exportar ${label}`);
    bar.append(lbl, select, exportBtn);

    const summary = document.createElement('div');
    summary.id = `${prefix}-import-summary`;
    summary.className = 'sheet-summary';
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-live', 'polite');
    summary.hidden = true;

    exportBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const format = select.value;
      const params = new URLSearchParams({ format });
      const searchId = host.dataset.filters;
      const search = searchId && document.getElementById(searchId);
      if (search && search.value.trim()) params.set('search', search.value.trim());
      const active = document.querySelector(host.dataset.activeFilter || '[data-filter].is-active');
      if (active && active.dataset.filter && active.dataset.filter !== 'all') params.set('filter', active.dataset.filter);
      try {
        await withBusy(exportBtn, 'Exportando...', () => download(`/api/export/${entity}?${params}`, `${entity}.${format}`));
        toast('Download iniciado com sucesso.', 'is-success');
      } catch (err) {
        toast(err.message || 'Erro ao exportar.', 'is-danger');
      }
    });

    let templateBtn = null;
    let importBtn = null;
    let input = null;
    if (canImport) {
      templateBtn = button(`${prefix}-template-btn`, 'Baixar modelo', `Baixar modelo de planilha de ${label}`);
      importBtn = button(`${prefix}-import-btn`, 'Importar', `Importar ${label} de uma planilha`);
      input = document.createElement('input');
      input.type = 'file';
      input.id = `${prefix}-import-input`;
      input.accept = ACCEPT;
      input.hidden = true;
      input.setAttribute('aria-label', `Arquivo de ${label} (.csv ou .xlsx)`);
      bar.append(templateBtn, importBtn, input);

      templateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const format = select.value === 'xlsx' ? 'xlsx' : 'csv';
        try {
          await withBusy(templateBtn, 'Baixando...', () => download(`/api/import/${entity}/template?format=${format}`, `modelo_${entity}.${format}`));
          toast('Modelo baixado. Preencha e use Importar.', 'is-success');
        } catch (err) {
          toast(err.message || 'Erro ao baixar o modelo.', 'is-danger');
        }
      });

      importBtn.addEventListener('click', (e) => {
        e.preventDefault();
        input.click();
      });

      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        if (!/\.(csv|xlsx)$/i.test(file.name)) {
          toast('Formato nao suportado. Envie um arquivo .csv ou .xlsx.', 'is-danger');
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast('Arquivo muito grande. Divida a planilha em partes menores (ate 2000 linhas).', 'is-danger');
          return;
        }
        try {
          const result = await withBusy(importBtn, 'Importando...', async () => {
            const contentBase64 = await readAsBase64(file);
            return api().post(`/api/import/${entity}`, { filename: file.name, contentBase64 });
          });
          renderSummary(summary, result);
          toast(`${result.imported} importado(s), ${result.failed} com erro.`, result.failed ? 'is-danger' : 'is-success');
          window.dispatchEvent(new CustomEvent('sgvc:imported', { detail: { entity, result } }));
        } catch (err) {
          toast(importErrorMessage(err), 'is-danger');
        }
      });
    }

    host.append(bar, summary);

    function applyAccess() {
      const access = window.SGVC && window.SGVC.access;
      if (!access) return;
      const mod = host.dataset.module;
      if (mod && !access.moduleOn(mod)) {
        host.hidden = true;
        return;
      }
      const exportPerm = host.dataset.exportPerm;
      const importPerm = host.dataset.importPerm;
      if (exportPerm && !access.can(exportPerm)) host.hidden = true;
      if (canImport && importPerm && !access.can(importPerm)) {
        [templateBtn, importBtn].forEach((b) => { b.hidden = true; });
      }
    }
    applyAccess();
    window.addEventListener('sgvc:access', applyAccess);
  }

  function init() {
    document.querySelectorAll('[data-sheet-tools]').forEach(mount);
  }

  window.SGVC = window.SGVC || {};
  window.SGVC.sheets = { mount, init, download };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
