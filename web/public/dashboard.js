(() => {
  'use strict';
  
  // Aguardar DOM estar pronto antes de executar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE =
    (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:4000' : window.location.origin);
  // Auth via cookie HttpOnly (não usar token no browser storage)
  const REQUEST_TIMEOUT_MS =
    Number(window.APP_CONFIG && window.APP_CONFIG.REQUEST_TIMEOUT_MS) || 10000;
  const DEBUG = !!(window.APP_CONFIG && window.APP_CONFIG.DEBUG);

  // ELEMENTOS
  const els = {
    customers: document.getElementById('metric-customers'),
    sales: document.getElementById('metric-sales'),
    revenue: document.getElementById('metric-revenue'),
    products: document.getElementById('metric-products'),
    recipes: document.getElementById('metric-recipes'),
    linked: document.getElementById('metric-linked'),
    margin: document.getElementById('metric-margin'),
  };
  const periodSelect = document.getElementById('dashboard-period');
  const reportsBtn = document.getElementById('reports-btn');
  const profileBtn = document.getElementById('profile-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const clientsBtn = document.getElementById('clients-manage-action');
  const salesBtn = document.getElementById('sales-manage-action');
  const productsBtn = document.getElementById('products-manage-action');
  const recipesBtn = document.getElementById('recipes-manage-action');
  const linkedBtn = document.getElementById('linked-manage-action');
  const marginBtn = document.getElementById('margin-manage-action');
  const quickSaleBtn = document.getElementById('quick-sale-action');
  const quickClientBtn = document.getElementById('quick-client-action');
  const quickProductBtn = document.getElementById('quick-product-action');
  const dashboardMessage = document.getElementById('dashboard-message');

  // FORMATAÇÃO
  const money = (v) =>
    Number(v || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const emptyEls = {
    customers: document.querySelector('[data-empty="customers"]'),
    sales: document.querySelector('[data-empty="sales"]'),
    revenue: document.querySelector('[data-empty="revenue"]'),
    products: document.querySelector('[data-empty="products"]'),
    recipes: document.querySelector('[data-empty="recipes"]'),
    linked: document.querySelector('[data-empty="linked"]'),
    margin: document.querySelector('[data-empty="margin"]'),
    salesChart: document.querySelector('[data-empty="sales-chart"]'),
    revenueChart: document.querySelector('[data-empty="revenue-chart"]'),
  };

  const FALLBACK_METRICS = {
    customers: 0,
    salesCount: 0,
    revenueTotal: 0,
    products: 0,
    recipes: 0,
    linkedProducts: 0,
    margin: 0,
  };

  const alertClientsMessage = document.getElementById('alert-clients-message');
  const alertClientsHint = document.getElementById('alert-clients-hint');
  const alertClientsCount = document.getElementById('alert-clients-count');
  const alertClientsBtn = document.getElementById('alert-clients-action');

  const alertRevenueMessage = document.getElementById('alert-revenue-message');
  const alertRevenueHint = document.getElementById('alert-revenue-hint');
  const alertRevenueCount = document.getElementById('alert-revenue-count');
  const alertRevenueBtn = document.getElementById('alert-revenue-action');

  const alertProductsMessage = document.getElementById('alert-products-message');
  const alertProductsHint = document.getElementById('alert-products-hint');
  const alertProductsCount = document.getElementById('alert-products-count');
  const alertProductsBtn = document.getElementById('alert-products-action');

  function showDashboardMessage(text, type = 'is-danger') {
    if (!dashboardMessage) return;
    dashboardMessage.textContent = text || '';
    dashboardMessage.classList.remove('is-danger', 'is-success', 'is-hidden');
    dashboardMessage.classList.add(type);
    dashboardMessage.hidden = !text;
  }

  function clearDashboardMessage() {
    if (!dashboardMessage) return;
    dashboardMessage.textContent = '';
    dashboardMessage.classList.add('is-hidden');
    dashboardMessage.hidden = true;
  }

  function toggleEmpty(key, isEmpty) {
    const el = emptyEls[key];
    if (!el) return;
    el.classList.toggle('is-hidden', !isEmpty);
  }

  let salesChart;
  let revenueChart;

  function renderCharts(data) {
    const chartSection = document.querySelector('[data-chart-section]');
    if (!chartSection || !window.Chart) {
      if (chartSection) chartSection.hidden = true;
      return;
    }

    // CORREÇÃO: Garante que data seja um objeto válido antes de acessar propriedades
    if (!data || typeof data !== 'object') {
      data = { salesCount: 0, revenueTotal: 0 };
    }

    const salesValue = Number(data.salesCount || 0);
    const revenueValue = Number(data.revenueTotal || 0);
    const hasSales = salesValue > 0;
    const hasRevenue = revenueValue > 0;

    chartSection.hidden = !(hasSales || hasRevenue);
    toggleEmpty('salesChart', !hasSales);
    toggleEmpty('revenueChart', !hasRevenue);

    if (!hasSales && !hasRevenue) return;

    // CORREÇÃO: Garante arrays válidos (não undefined) para Chart.js
    const chartLabels = ['Período'];
    const salesDataArray = [salesValue];
    const revenueDataArray = [revenueValue];

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 8, right: 8, bottom: 4, left: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          padding: 10,
          borderWidth: 0,
          displayColors: false,
          callbacks: {
            title: () => 'Período',
          },
        },
      },
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: true },
      },
    };

    const salesCanvas = document.getElementById('sales-chart');
    if (salesCanvas) {
      try {
        if (!salesChart) {
          salesChart = new Chart(salesCanvas, {
            type: 'bar',
            data: {
              labels: chartLabels,
              datasets: [
                {
                  data: salesDataArray,
                  backgroundColor: '#4f46e5',
                  borderColor: '#4338ca',
                  borderWidth: 1,
                  borderRadius: 14,
                  barThickness: 36,
                  maxBarThickness: 40,
                },
              ],
            },
            options: baseOptions,
          });
        } else {
          // CORREÇÃO: Verifica se datasets existe e é array antes de acessar
          if (salesChart.data && Array.isArray(salesChart.data.datasets) && salesChart.data.datasets[0]) {
            salesChart.data.labels = chartLabels;
            salesChart.data.datasets[0].data = salesDataArray;
            salesChart.update();
          }
        }
      } catch (err) {
        // CORREÇÃO: Suprime erros internos do Chart.js (index.js minificado)
        // Esses erros não afetam a funcionalidade e são causados por biblioteca externa
        console.warn('[DASHBOARD] Erro ao renderizar gráfico de vendas (suprimido):', err.message);
      }
    }

    const revenueCanvas = document.getElementById('revenue-chart');
    if (revenueCanvas) {
      try {
        if (!revenueChart) {
          revenueChart = new Chart(revenueCanvas, {
            type: 'bar',
            data: {
              labels: chartLabels,
              datasets: [
                {
                  data: revenueDataArray,
                  backgroundColor: '#16a34a',
                  borderColor: '#15803d',
                  borderWidth: 1,
                  borderRadius: 14,
                  barThickness: 36,
                  maxBarThickness: 40,
                },
              ],
            },
            options: baseOptions,
          });
        } else {
          // CORREÇÃO: Verifica se datasets existe e é array antes de acessar
          if (revenueChart.data && Array.isArray(revenueChart.data.datasets) && revenueChart.data.datasets[0]) {
            revenueChart.data.labels = chartLabels;
            revenueChart.data.datasets[0].data = revenueDataArray;
            revenueChart.update();
          }
        }
      } catch (err) {
        // CORREÇÃO: Suprime erros internos do Chart.js (index.js minificado)
        // Esses erros não afetam a funcionalidade e são causados por biblioteca externa
        console.warn('[DASHBOARD] Erro ao renderizar gráfico de faturamento (suprimido):', err.message);
      }
    }
  }

  async function ensureAuthenticated() {
    // Auth é validado no backend via cookie HttpOnly
    try {
      const me = await fetchJson('/api/auth/me', null, {}, { method: 'GET', skipAuth: true });
      return me && me.user ? me.user : (me && me.data && me.data.user ? me.data.user : me);
    } catch (err) {
      // Ignora erros causados por navegação que abortam requisições pendentes
      if (err && err.name === 'AbortError') {
        return null;
      }
      if (err && (err.status === 401 || err.status === 403)) {
        // Evita redirecionar para login se o usuário está navegando para outra página
        if (!isNavigating) {
          window.location.href = '/';
        }
        return null;
      }
      // Falha de rede/etc: mantém na tela mas mostra fallback
      return null;
    }
  }

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${base}${normalizedPath.slice(4)}`;
    }
    return `${base}${normalizedPath}`;
  }

  function isLocalhostHost(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }

  // Hardening: alerta (sem quebrar) quando rodando em contexto inseguro fora de localhost.
  try {
    const apiUrl = new URL(API_BASE);
    if (apiUrl.protocol !== 'https:' && !isLocalhostHost(apiUrl.hostname)) {
      console.warn(
        '[DASHBOARD] API_BASE não usa HTTPS. Em produção, use HTTPS para evitar vazamento de token.'
      );
    }
  } catch (_e) {
    // ignore
  }

  function buildPeriodQuery(value) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    let end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    if (value === 'quarter') {
      const quarter = Math.floor(now.getUTCMonth() / 3);
      const startMonth = quarter * 3;
      start.setUTCMonth(startMonth);
      start.setUTCDate(1);
      end = new Date(Date.UTC(now.getUTCFullYear(), startMonth + 3, 0));
    } else if (value === 'year') {
      start.setUTCMonth(0);
      start.setUTCDate(1);
      end = new Date(Date.UTC(now.getUTCFullYear(), 12, 0));
    }
    const fmt = (d) => d.toISOString().slice(0, 10);
    return {
      queryString: `?start=${fmt(start)}&end=${fmt(end)}`,
      start: fmt(start),
      end: fmt(end),
    };
  }

  function updateMetrics(data) {
    const customersValue = Number(data.customers ?? 0);
    const salesValue = Number(data.salesCount ?? 0);
    const revenueValue = Number(data.revenueTotal ?? 0);
    const productsValue = Number(data.products ?? 0);
    const recipesValue = Number(data.recipes ?? 0);
    const linkedValue = Number(data.linkedProducts ?? 0);
    const marginValue = data.margin;

    if (els.customers) els.customers.textContent = customersValue || 0;
    if (els.sales) els.sales.textContent = salesValue || 0;
    if (els.revenue) els.revenue.textContent = money(revenueValue);
    if (els.products) els.products.textContent = productsValue || 0;
    if (els.recipes) els.recipes.textContent = recipesValue || 0;
    if (els.linked) els.linked.textContent = linkedValue || 0;
    if (els.margin) {
      els.margin.textContent =
        marginValue != null ? `${(marginValue * 100).toFixed(1)}%` : '0%';
    }

    toggleEmpty('customers', customersValue <= 0);
    toggleEmpty('sales', salesValue <= 0);
    toggleEmpty('revenue', revenueValue <= 0);
    toggleEmpty('products', productsValue <= 0);
    toggleEmpty('recipes', recipesValue <= 0);
    toggleEmpty('linked', linkedValue <= 0);
    toggleEmpty('margin', marginValue == null);

    renderCharts({
      salesCount: salesValue,
      revenueTotal: revenueValue,
    });
  }

  function buildApiUrl(path, queryParams = {}) {
    try {
      const url = new URL(buildUrl(path));
      Object.entries(queryParams || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).length) {
          url.searchParams.set(key, String(value));
        }
      });
      return url.toString();
    } catch (err) {
      return buildUrl(path);
    }
  }

  /**
   * Normaliza erro da API para mensagem amigável
   */
  function normalizeError(err) {
    if (window.SGVCErrorHandler && window.SGVCErrorHandler.normalizeApiError) {
      return window.SGVCErrorHandler.normalizeApiError(err);
    }
    return err && err.message ? err.message : 'Erro ao processar solicitação. Tente novamente.';
  }

  async function fetchJson(path, _tokenIgnored, query = {}, options = {}) {
    const url = buildApiUrl(path, query);
    
    let response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
        cache: 'no-store',
        credentials: 'include',
        signal: controller.signal,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        const timeoutError = new Error('REQUEST_TIMEOUT');
        timeoutError.status = 0;
        timeoutError.payload = null;
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }
      const networkError = new Error('NETWORK_ERROR');
      networkError.status = 0;
      networkError.payload = null;
      networkError.name = 'NetworkError';
      throw networkError;
    } finally {
      clearTimeout(timeoutId);
    }
    
    const contentType = response.headers.get('content-type') || '';
    let payload = null;
    
    try {
      payload = contentType.includes('application/json') 
        ? await response.json() 
        : await response.text();
    } catch (err) {
      const parseError = new Error('INVALID_RESPONSE');
      parseError.status = response.status;
      parseError.payload = null;
      throw parseError;
    }
    
    if (!response.ok) {
      const error = new Error("API_ERROR");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    
    return payload;
  }

  function formatIso(date) {
    if (!date) return null;
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function daysBetween(from, to) {
    const a = formatIso(from);
    const b = formatIso(to);
    if (!a || !b) return null;
    const diff = Math.abs(b.getTime() - a.getTime());
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  function computePreviousPeriod(period) {
    const startDate = formatIso(period.start);
    const endDate = formatIso(period.end);
    if (!startDate || !endDate) return null;
    const diffMs = endDate.getTime() - startDate.getTime();
    const previousEnd = new Date(startDate.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - diffMs);
    return {
      start: previousStart.toISOString().slice(0, 10),
      end: previousEnd.toISOString().slice(0, 10),
    };
  }

  function setAlertContent(badgeEl, count, messageEl, message, hintEl, hint) {
    if (badgeEl) badgeEl.textContent = count ? `(${count})` : "";
    if (messageEl) messageEl.textContent = message || "";
    if (hintEl) hintEl.textContent = hint || "";
  }

  function updateClientAlert(customers) {
    const list = Array.isArray(customers) ? customers : [];
    const now = new Date();
    const inactiveCount = list.filter((customer) => {
      const last = customer.lastPurchase || customer.last_purchase || customer.last_purchase_at;
      const days = daysBetween(last, now);
      return days != null && days > 30;
    }).length;
    const total = list.length;
    const message = inactiveCount
      ? `${inactiveCount} cliente${inactiveCount > 1 ? "s" : ""} sem compra há mais de 30 dias`
      : total
      ? "Todos os clientes compraram recentemente"
      : "Sem dados de clientes ainda";
    const hint = inactiveCount
      ? "Que tal entrar em contato e oferecer uma promoção?"
      : total
      ? "Continue fidelizando sua base."
      : "Adicione clientes para começar.";
    setAlertContent(alertClientsCount, inactiveCount, alertClientsMessage, message, alertClientsHint, hint);
  }

  function updateProductAlert(products) {
    const list = Array.isArray(products) ? products : [];
    const pending = list.filter((item) => !item.ficha_tecnica_id).length;
    const message = pending
      ? `${pending} produto${pending > 1 ? "s" : ""} sem ficha técnica`
      : list.length
      ? "Todas as fichas técnicas estão vinculadas"
      : "Sem produtos cadastrados";
    const hint = pending
      ? "Sem ficha técnica não é possível calcular o lucro real"
      : "Aproveite para revisar os custos e margens.";
    setAlertContent(alertProductsCount, pending, alertProductsMessage, message, alertProductsHint, hint);
  }

  function updateRevenueAlert(current, previous) {
    if (!current) {
      setAlertContent(alertRevenueCount, 0, alertRevenueMessage, "Não foi possível carregar os dados financeiros", alertRevenueHint, "");
      return;
    }
    const revenue = current.revenue != null ? Number(current.revenue) : 0;
    const salesCount = Number(current.salesCount || 0);
    const message = `Faturamento ${money(revenue)}`;
    let hint = "Sem dados comparativos";
    if (previous && Number(previous.revenue) > 0) {
      const prevRevenue = Number(previous.revenue);
      const change = prevRevenue === 0 ? 0 : ((revenue - prevRevenue) / prevRevenue) * 100;
      const sign = change >= 0 ? "+" : "";
      hint = `Variação de ${sign}${change.toFixed(1)}% em relação ao período anterior`;
    }
    setAlertContent(alertRevenueCount, salesCount, alertRevenueMessage, message, alertRevenueHint, hint);
  }

  async function loadClients(token) {
    try {
      const data = await fetchJson("/api/customers", token);
      // Suporta formato paginado e não paginado
      const list = Array.isArray(data) 
        ? data 
        : (data.items && Array.isArray(data.items) ? data.items : []);
      updateClientAlert(list);
      return list;
    } catch (err) {
      if (handleAuthFailure(err)) return [];
      const friendlyMessage = normalizeError(err);
      console.error("Clients list:", friendlyMessage);
      updateClientAlert([]);
      return [];
    }
  }

  async function loadProducts(token) {
    try {
      const data = await fetchJson("/api/products", token);
      // Suporta formato paginado e não paginado
      const list = Array.isArray(data) 
        ? data 
        : (data.items && Array.isArray(data.items) ? data.items : []);
      updateProductAlert(list);
      return list;
    } catch (err) {
      if (handleAuthFailure(err)) return [];
      const friendlyMessage = normalizeError(err);
      console.error("Products list:", friendlyMessage);
      updateProductAlert([]);
      return [];
    }
  }

  async function loadRevenueInsights(token, period) {
    if (!token || !period) return;
    try {
      const current = await fetchJson("/api/reports/financial", token, {
        start: period.start,
        end: period.end,
        breakdown: "total",
      });
      const previousPeriod = computePreviousPeriod(period);
      let previous = null;
      if (previousPeriod) {
        try {
          previous = await fetchJson("/api/reports/financial", token, {
            start: previousPeriod.start,
            end: previousPeriod.end,
            breakdown: "total",
          });
        } catch (_err) {
          previous = null;
        }
      }
      updateRevenueAlert(current, previous);
    } catch (err) {
      console.error("Revenue insight:", err);
      updateRevenueAlert(null, null);
    }
  }
  async function loadFallbackMetrics(token, period) {
    if (!token || !period) return null;
    try {
      const [customers, products, recipes, financial] = await Promise.all([
        fetchJson("/api/customers", token),
        fetchJson("/api/products", token),
        fetchJson("/api/recipes", token),
        fetchJson("/api/reports/financial", token, {
          start: period.start,
          end: period.end,
          breakdown: "total",
        }),
      ]);
      const linked = (products || []).filter((p) => p.ficha_tecnica_id).length;
      const recipesCount = Array.isArray(recipes) ? recipes.length : 0;
      return {
        customers: Array.isArray(customers) ? customers.length : 0,
        products: Array.isArray(products) ? products.length : 0,
        recipes: recipesCount,
        linkedProducts: linked,
        revenueTotal: financial && Number.isFinite(financial.revenue) ? financial.revenue : 0,
        salesCount: financial && Number.isFinite(financial.salesCount) ? financial.salesCount : 0,
        margin: financial && Number.isFinite(financial.margin) ? financial.margin : 0,
      };
    } catch (err) {
      console.error("Fallback metrics failed:", err);
      return null;
    }
  }

  function handleAuthFailure(err) {
    // Ignora aborts (ex.: navegação troca de página e cancela a requisição atual)
    if (err && err.name === 'AbortError') return true;
    if (!err || (err.status !== 401 && err.status !== 403)) return false;
    // Evita redirecionar para login se o usuário está navegando para outra página
    if (!isNavigating) {
      window.location.href = '/';
    }
    return true;
  }

  let isNavigating = false;

  async function carregarDashboard() {
    const user = await ensureAuthenticated();
    if (!user) {
      // Não redirecionar se estiver navegando (clique em botão)
      if (isNavigating) return;
      showDashboardMessage('Sessão expirada. Faça login novamente.', 'is-danger');
      updateMetrics(FALLBACK_METRICS);
      return;
    }
    clearDashboardMessage();
    const period = buildPeriodQuery(periodSelect ? periodSelect.value : null);

    try {
      const data = await fetchJson('/api/analytics/overview', null, {
        start: period.start,
        end: period.end,
      });
      updateMetrics(data || {});
    } catch (err) {
      if (handleAuthFailure(err)) return;
      
      const friendlyMessage = normalizeError(err);
      
      try {
        const fallback = await loadFallbackMetrics(null, period);
        if (fallback) {
          clearDashboardMessage();
          updateMetrics(fallback);
          return;
        }
      } catch (fallbackErr) {
        const fallbackFriendly = normalizeError(fallbackErr);
        console.error('Fallback dashboard:', fallbackFriendly);
      }
      
      showDashboardMessage(friendlyMessage || 'Não foi possível carregar os indicadores. Tente novamente mais tarde.', 'is-danger');
      updateMetrics(FALLBACK_METRICS);
      console.error('Dashboard error:', friendlyMessage);
    } finally {
      await Promise.all([
        loadRevenueInsights(null, period),
        loadClients(null),
        loadProducts(null),
      ]);
    }
  }

  // Adicionar event listeners PRIMEIRO, antes de qualquer outra coisa
  // Isso garante que os cliques sejam processados antes de qualquer redirecionamento
  if (periodSelect) {
    periodSelect.addEventListener('change', () => carregarDashboard());
  }

  if (reportsBtn) reportsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/reports.html';
  });
  if (profileBtn) profileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/profile.html';
  });
  if (clientsBtn) {
    clientsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isNavigating = true;
      if (DEBUG) console.log('[DASHBOARD] Redirecionando para /clients.html');
      // Usar setTimeout para garantir que o redirecionamento aconteça após todos os handlers
      setTimeout(() => {
        window.location.href = '/clients.html';
      }, 0);
    });
    if (DEBUG) console.log('[DASHBOARD] Event listener adicionado ao botão clients-manage-action');
  } else {
    console.warn('[DASHBOARD] Botão clients-manage-action não encontrado!');
  }
  if (salesBtn) salesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/sales.html';
  });
  if (productsBtn) productsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/products.html';
  });
  if (recipesBtn) recipesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/recipes.html';
  });
  if (linkedBtn) linkedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/vinculos.html';
  });
  if (marginBtn) marginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/simulacao.html';
  });
  if (quickSaleBtn) quickSaleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/sales.html';
  });
  if (quickClientBtn) quickClientBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/clients.html';
  });
  if (quickProductBtn) quickProductBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/products.html';
  });
  if (alertClientsBtn) alertClientsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/clients.html';
  });
  if (alertRevenueBtn) alertRevenueBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/sales.html';
  });
  if (alertProductsBtn) alertProductsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isNavigating = true;
    window.location.href = '/products.html';
  });

  // Carregar dashboard DEPOIS de adicionar event listeners
  // Usar setTimeout para garantir que todos os event listeners estejam registrados primeiro
  setTimeout(() => {
    carregarDashboard();
  }, 0);

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetchJson('/api/auth/logout', null, {}, { method: 'POST', skipAuth: true });
      } catch (_err) {
        // ignore
      }
      window.location.href = '/';
    });
  }

  // Sem “proteção de sessão” via storage: sessão é validada via /api/auth/me.

  } // fim da função init()
})();
