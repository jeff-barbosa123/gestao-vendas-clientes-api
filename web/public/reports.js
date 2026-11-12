(() => {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;
  const REPORT_FILTER_KEY = 'sgvc.reportsFilters';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const messageBox = document.getElementById('reports-message');
  const backBtn = document.getElementById('back-dashboard');
  const refreshBtn = document.getElementById('refresh-report');
  const breakdownSelect = document.getElementById('breakdown');
  const filterType = document.getElementById('filter-type');
  const dayInput = document.getElementById('day-input');
  const weekInput = document.getElementById('week-input');
  const monthInput = document.getElementById('month-input');
  const yearInput = document.getElementById('year-input');
  if (yearInput) yearInput.placeholder = String(new Date().getFullYear());
  const startInput = document.getElementById('start-input');
  const endInput = document.getElementById('end-input');
  const applyBtn = document.getElementById('apply-filters');
  const clearBtn = document.getElementById('clear-filters');
  const exportBtn = document.getElementById('export-btn');
  const exportFormat = document.getElementById('export-format');

  const revenueBody = document.getElementById('revenue-body');
  const financialBody = document.getElementById('financial-body');
  const summaryRevenue = document.getElementById('summary-revenue');
  const summaryCmv = document.getElementById('summary-cmv');
  const summaryProfit = document.getElementById('summary-profit');
  const summaryMargin = document.getElementById('summary-margin');
  const summaryTicket = document.getElementById('summary-ticket');
  const summaryCount = document.getElementById('summary-count');
  let debounceTimer = null;
  const controlButtons = [applyBtn, refreshBtn, exportBtn];
  let isLoadingReports = false;
  let pendingRequest = null;

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`;
    }
    return `${base}${normalizedPath}`;
  }

  // Auth via cookie HttpOnly (token não deve existir no browser storage)
  const session = { token: null };

  async function ensureAuthOrRedirect() {
    try {
      const user = await window.apiGetMe();
      if (!user) {
        window.location.href = '/';
        return null;
      }
      return user;
    } catch (_err) {
      if (_err && _err.name === 'AbortError') {
        return null;
      }
      window.location.href = '/';
      return null;
    }
  }

  function showMessage(text, type) {
    if (!messageBox) return;
    messageBox.textContent = text || '';
    messageBox.classList.remove('is-success', 'is-danger');
    if (type) messageBox.classList.add(type);
    messageBox.hidden = !text;
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(value) {
    return `${(Number(value || 0) * 100).toFixed(1).replace(".", ",")}%`;
  }

  function setControlsLoading(loading) {
    controlButtons.forEach((button) => {
      if (!button) return;
      button.disabled = loading;
      button.classList.toggle('is-loading', loading);
    });
  }

  function getTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (_err) {
      return 'UTC';
    }
  }

  async function apiRequest(path, _tokenIgnored, options = {}) {
    const url = buildUrl(path);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    headers['x-timezone'] = getTimezone();
    
    let response;
    try {
      response = await fetch(url, { ...options, headers, credentials: 'include' });
    } catch (err) {
      // Erro de rede (Failed to fetch)
      const error = new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      error.status = 0;
      error.payload = null;
      throw error;
    }
    
    const contentType = response.headers.get('content-type') || '';
    let payload;
    try {
      payload = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch (err) {
      // Erro ao parsear resposta
      const error = new Error('Resposta inválida do servidor. Tente novamente.');
      error.status = response.status;
      error.payload = null;
      throw error;
    }
    
    if (!response.ok) {
      const message = payload && (payload.message || payload.error) ? payload.message || payload.error : 'Erro ao processar solicitação. Tente novamente.';
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function buildQuery() {
    const breakdown = breakdownSelect ? breakdownSelect.value : 'total';
    const params = { breakdown };
    const filter = filterType ? filterType.value : 'none';
    
    // CORREÇÃO CRÍTICA: Backend NÃO aceita múltiplos filtros temporais
    // A função ensureSingleTemporalFilter no backend valida isso e rejeita se:
    // - Enviar year E start/end ao mesmo tempo
    // - Enviar day/week/month/year junto com start/end
    // Prioridade: range (start/end) > day > week > month > year
    // Se início e fim estiverem preenchidos, SEMPRE usa range (ignora outros filtros)
    if (startInput?.value && endInput?.value) {
      // Filtro range: NÃO envia day, week, month, year (backend rejeita se enviar)
      params.start = startInput.value;
      params.end = endInput.value;
    } else if (filter === 'day' && dayInput?.value) {
      params.day = dayInput.value;
    } else if (filter === 'week' && weekInput?.value) {
      params.week = weekInput.value;
    } else if (filter === 'month' && monthInput?.value) {
      params.month = monthInput.value;
    } else if (filter === 'year' && yearInput?.value) {
      params.year = yearInput.value;
    }
    
    const query = Object.entries(params)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return query ? `?${query}` : '';
  }

  function renderRevenue(data) {
    if (!revenueBody) return;
    revenueBody.innerHTML = '';
    
    // Garante que data é válido
    if (!data) {
      revenueBody.innerHTML = '<tr><td colspan="3">Nenhum dado encontrado.</td></tr>';
      return;
    }
    
    const rows = Array.isArray(data) ? data : [{ period: 'total', total: data.total || 0, quantidadeVendas: data.quantidadeVendas || 0 }];
    if (!rows || !rows.length) {
      revenueBody.innerHTML = '<tr><td colspan="3">Nenhum dado encontrado.</td></tr>';
      return;
    }
    
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(row.period || '-')}</td>
        <td class="has-text-right">R$ ${formatPrice(row.total || 0)}</td>
        <td class="has-text-right">${row.quantidadeVendas ?? '-'}</td>
      `;
      revenueBody.appendChild(tr);
    });
  }

  function renderFinancial(data) {
    if (!financialBody) return;
    financialBody.innerHTML = '';
    
    // Garante que data é válido
    if (!data) {
      financialBody.innerHTML = '<tr><td colspan="7">Nenhum dado encontrado.</td></tr>';
      return;
    }
    
    const rows = Array.isArray(data) ? data : (data && typeof data === 'object' ? [{ period: 'total', ...data }] : []);
    if (!rows || !rows.length) {
      financialBody.innerHTML = '<tr><td colspan="7">Nenhum dado encontrado.</td></tr>';
      return;
    }
    
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(row.period || '-')}</td>
        <td class="has-text-right">R$ ${formatPrice(row.revenue || 0)}</td>
        <td class="has-text-right">R$ ${formatPrice(row.cmv || 0)}</td>
        <td class="has-text-right">R$ ${formatPrice(row.profit || 0)}</td>
        <td class="has-text-right">${formatPercent(row.margin || 0)}</td>
        <td class="has-text-right">R$ ${formatPrice(row.avgTicket || 0)}</td>
        <td class="has-text-right">${row.salesCount ?? '-'}</td>
      `;
      financialBody.appendChild(tr);
    });
  }

  function renderSummary(data) {
    if (!data || Array.isArray(data)) return;
    if (summaryRevenue) summaryRevenue.textContent = `R$ ${formatPrice(data.revenue || 0)}`;
    if (summaryCmv) summaryCmv.textContent = `R$ ${formatPrice(data.cmv || 0)}`;
    if (summaryProfit) summaryProfit.textContent = `R$ ${formatPrice(data.profit || 0)}`;
    if (summaryMargin) summaryMargin.textContent = formatPercent(data.margin || 0);
    if (summaryTicket) summaryTicket.textContent = `R$ ${formatPrice(data.avgTicket || 0)}`;
    if (summaryCount) summaryCount.textContent = String(data.salesCount ?? '--');
  }

  async function loadReports(token) {
    const query = buildQuery();
    
    // Carrega dados com tratamento individual de erro (silencioso)
    let revenue = null;
    let financial = null;
    
    try {
      revenue = await apiRequest(`/api/reports/revenue${query}`, token);
    } catch (err) {
      // Se revenue falhar, usa dados vazios (não quebra a tela)
      revenue = { total: 0, quantidadeVendas: 0 };
    }
    
    try {
      financial = await apiRequest(`/api/reports/financial${query}`, token);
    } catch (err) {
      // Se financial falhar, usa dados vazios baseado no breakdown
      const breakdown = breakdownSelect ? breakdownSelect.value : 'total';
      if (breakdown === 'total') {
        financial = { revenue: 0, cmv: 0, profit: 0, margin: 0, avgTicket: 0, salesCount: 0 };
      } else {
        financial = [];
      }
    }
    
    // Validação de consistência (não intrusiva, apenas aviso visual)
    validateDataConsistency(revenue, financial);
    
    // Renderiza dados (mesmo se alguns forem vazios)
    if (revenue) renderRevenue(revenue);
    if (financial) {
      renderFinancial(financial);
      renderSummary(financial);
    }
  }

  /**
   * Valida consistência entre dados de revenue e financial
   * Exibe aviso discreto se houver inconsistência (não bloqueia)
   */
  function validateDataConsistency(revenue, financial) {
    try {
      // Só valida se ambos são objetos (não arrays) e não estão vazios
      if (!revenue || !financial || Array.isArray(revenue) || Array.isArray(financial)) {
        return;
      }

      const revenueTotal = Number(revenue.total || 0);
      const revenueCount = Number(revenue.quantidadeVendas || 0);
      const financialRevenue = Number(financial.revenue || 0);
      const financialCount = Number(financial.salesCount || 0);

      // Tolerância de 0.01 para arredondamentos
      const tolerance = 0.01;
      const hasInconsistency = Math.abs(revenueTotal - financialRevenue) > tolerance || revenueCount !== financialCount;

      // Mostra aviso discreto se houver inconsistência
      const consistencyWarning = document.getElementById('consistency-warning');
      if (hasInconsistency && consistencyWarning) {
        consistencyWarning.hidden = false;
        consistencyWarning.textContent = 'Alguns dados podem estar temporariamente inconsistentes.';
      } else if (consistencyWarning) {
        consistencyWarning.hidden = true;
      }
    } catch (err) {
      // Se a validação falhar, não quebra o fluxo
      console.warn('[REPORTS] Erro na validação de consistência (não crítico):', err);
    }
  }

  async function requestReports({ successMessage } = {}) {
    if (isLoadingReports) {
      pendingRequest = { successMessage };
      return;
    }
    isLoadingReports = true;
    showMessage('');
    setControlsLoading(true);
    
    try {
      await ensureAuthOrRedirect();
      await loadReports(null);
      
      if (successMessage) {
        showMessage(successMessage, 'is-success');
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        isLoadingReports = false;
        setControlsLoading(false);
        return;
      }
      // Mensagem amigável de erro
      const errorMessage = err.message || 'Não foi possível carregar os dados no momento. Tente novamente.';
      showMessage(errorMessage, 'is-danger');
    } finally {
      isLoadingReports = false;
      setControlsLoading(false);
      if (pendingRequest) {
        const next = pendingRequest;
        pendingRequest = null;
        requestReports(next);
      }
    }
  }

  function validateFilters() {
    const filter = filterType ? filterType.value : 'none';
    
    // Se início e fim estão preenchidos, valida como range (mesmo se o filtro não for 'range')
    if (startInput?.value && endInput?.value) {
      if (startInput.value > endInput.value) {
        showMessage('A data final não pode ser menor que a inicial.', 'is-danger');
        return false;
      }
      return true; // Válido, não precisa validar outros filtros
    }
    
    // Validação baseada no filtro selecionado
    if (filter === 'day' && !dayInput?.value) {
      showMessage('Selecione um dia para continuar.', 'is-danger');
      return false;
    }
    if (filter === 'week' && !weekInput?.value) {
      showMessage('Selecione uma semana para continuar.', 'is-danger');
      return false;
    }
    if (filter === 'month' && !monthInput?.value) {
      showMessage('Selecione um mes para continuar.', 'is-danger');
      return false;
    }
    if (filter === 'year' && !yearInput?.value) {
      showMessage('Informe um ano para continuar.', 'is-danger');
      return false;
    }
    if (filter === 'range') {
      if (!startInput?.value || !endInput?.value) {
        showMessage('Informe início e fim do período.', 'is-danger');
        return false;
      }
      if (startInput.value > endInput.value) {
        showMessage('A data final não pode ser menor que a inicial.', 'is-danger');
        return false;
      }
    }
    return true;
  }

  function scheduleLoad() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      showMessage('');
      if (!validateFilters()) return;
      requestReports();
    }, 400);
  }

  function handleManualLoad(successMessage) {
    showMessage('');
    if (!validateFilters()) return;
    saveFilters(); // Salva filtros antes de aplicar
    requestReports({ successMessage });
  }

  function saveFilters() {
    try {
      const filters = {
        breakdown: breakdownSelect ? breakdownSelect.value : 'total',
        filterType: filterType ? filterType.value : 'none',
        day: dayInput ? dayInput.value : '',
        week: weekInput ? weekInput.value : '',
        month: monthInput ? monthInput.value : '',
        year: yearInput ? yearInput.value : '',
        start: startInput ? startInput.value : '',
        end: endInput ? endInput.value : '',
      };
      sessionStorage.setItem(REPORT_FILTER_KEY, JSON.stringify(filters));
    } catch (err) {
      // Se falhar ao salvar, não quebra o fluxo (opcional)
      console.warn('[REPORTS] Erro ao salvar filtros (não crítico):', err);
    }
  }

  function applyStoredFilters() {
    const raw = sessionStorage.getItem(REPORT_FILTER_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (data.breakdown && breakdownSelect) breakdownSelect.value = data.breakdown;
      if (data.filterType && filterType) filterType.value = data.filterType;
      if (data.day && dayInput) dayInput.value = data.day;
      if (data.week && weekInput) weekInput.value = data.week;
      if (data.month && monthInput) monthInput.value = data.month;
      if (data.year && yearInput) yearInput.value = data.year;
      if (data.start && startInput) startInput.value = data.start;
      if (data.end && endInput) endInput.value = data.end;
      sessionStorage.removeItem(REPORT_FILTER_KEY);
      return true;
    } catch (_err) {
      sessionStorage.removeItem(REPORT_FILTER_KEY);
      return false;
    }
  }

  ensureAuthOrRedirect().then((user) => {
    if (!user) return;
    applyStoredFilters();
    requestReports();
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () =>
      handleManualLoad('Relatório atualizado com sucesso.')
    );
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () =>
      handleManualLoad('Filtros aplicados com sucesso.')
    );
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (filterType) filterType.value = 'none';
      if (breakdownSelect) breakdownSelect.value = 'total';
      if (dayInput) dayInput.value = '';
      if (weekInput) weekInput.value = '';
      if (monthInput) monthInput.value = '';
      if (yearInput) yearInput.value = '';
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      requestReports({ successMessage: 'Filtros limpos e relatório atualizado.' });
    });
  }

  [breakdownSelect, filterType, dayInput, weekInput, monthInput, yearInput, startInput, endInput].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', scheduleLoad);
  });

  function getFileExtension(format) {
    switch (format) {
      case 'excel':
        return 'xlsx';
      case 'pdf':
        return 'pdf';
      default:
        return 'csv';
    }
  }

  function deriveFileName(disposition, format) {
    if (disposition) {
      const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^"]+)"?/);
      if (match) {
        return decodeURIComponent(match[1] || match[2]).trim();
      }
    }
    const extension = getFileExtension(format);
    const timestamp = new Date().toISOString().slice(0, 10);
    return `relatorio-${timestamp}.${extension}`;
  }

  async function downloadReport() {
    if (isLoadingReports) return;
    showMessage('');
    if (!validateFilters()) return;
    const format = exportFormat ? exportFormat.value : 'csv';
    const query = buildQuery();
    const url = buildUrl(
      `/api/reports/revenue/export${query}${query ? '&' : '?'}format=${encodeURIComponent(format)}`
    );
    exportBtn.disabled = true;
    exportBtn.classList.add('is-loading');
    try {
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) {
        let errorMessage = 'Falha ao gerar o arquivo.';
        const text = await response.text();
        try {
          const payload = JSON.parse(text);
          errorMessage = payload.message || payload.error || errorMessage;
        } catch (_err) {
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }
      const blob = await response.blob();
      const filename = deriveFileName(response.headers.get('content-disposition'), format);
      const link = document.createElement('a');
      const urlBlob = URL.createObjectURL(blob);
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(urlBlob);
      showMessage('Download iniciado.', 'is-success');
    } catch (err) {
      showMessage(err.message, 'is-danger');
    } finally {
      exportBtn.disabled = false;
      exportBtn.classList.remove('is-loading');
    }
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', downloadReport);
  }
})();
