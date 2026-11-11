/**
 * Dashboard de Monitoramento de Erros
 */

(() => {
  'use strict';

  // Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

  // Elementos
  const frequentErrorsBody = document.getElementById('frequent-errors-body');
  const endpointsErrorsBody = document.getElementById('endpoints-errors-body');
  const recentErrorsList = document.getElementById('recent-errors-list');
  const monitoringMessage = document.getElementById('monitoring-message');
  const periodSelect = document.getElementById('period-select');
  const refreshBtn = document.getElementById('refresh-btn');
  const dashboardBtn = document.getElementById('dashboard-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // Stats
  const statTotalErrors = document.getElementById('stat-total-errors');
  const statUniqueErrors = document.getElementById('stat-unique-errors');
  const statAffectedUsers = document.getElementById('stat-affected-users');
  const statServerErrors = document.getElementById('stat-server-errors');

  let timelineChart = null;

  // Auth via cookie HttpOnly (token não deve existir no browser storage)
  const session = { token: null };
  const CSRF_COOKIE_NAME = 'sgvc_csrf';
  const CSRF_HEADER_NAME = 'X-CSRF-Token';
  let csrfEnsured = false;

  function getCookieValue(name) {
    try {
      const parts = String(document.cookie || '').split(';');
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i].trim();
        if (!part) continue;
        const eq = part.indexOf('=');
        const key = eq >= 0 ? part.slice(0, eq).trim() : part;
        if (key !== name) continue;
        const raw = eq >= 0 ? part.slice(eq + 1) : '';
        return decodeURIComponent(raw);
      }
    } catch (_err) {
      // ignore
    }
    return null;
  }

  function getCsrfToken() {
    return getCookieValue(CSRF_COOKIE_NAME);
  }

  async function ensureCsrfCookie() {
    if (csrfEnsured) return;
    csrfEnsured = true;
    try {
      await fetch(buildUrl('/api/auth/csrf'), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
    } catch (_err) {
      // ignore
    }
  }

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

  function buildUrl(path) {
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  function showMessage(text, type = 'is-danger') {
    if (!monitoringMessage) return;
    monitoringMessage.textContent = text || '';
    monitoringMessage.classList.remove('is-danger', 'is-success', 'is-hidden');
    monitoringMessage.classList.add(type);
    monitoringMessage.hidden = !text;
  }

  function clearMessage() {
    if (monitoringMessage) {
      monitoringMessage.textContent = '';
      monitoringMessage.classList.add('is-hidden');
      monitoringMessage.hidden = true;
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('pt-BR').format(num || 0);
  }

  function formatPercentage(num) {
    return `${(num || 0).toFixed(2)}%`;
  }

  async function fetchJson(path, _tokenIgnored) {
    const url = buildUrl(path);
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = new Error('API_ERROR');
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  function getPeriodDates(period) {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }

  async function loadStatistics(token, startDate, endDate) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await fetchJson(`/api/errors/analytics/statistics?${params}`, token);
      
      if (data.success && data.data) {
        const stats = data.data;
        if (statTotalErrors) statTotalErrors.textContent = formatNumber(stats.total_errors);
        if (statUniqueErrors) statUniqueErrors.textContent = formatNumber(stats.unique_error_codes);
        if (statAffectedUsers) statAffectedUsers.textContent = formatNumber(stats.affected_users);
        if (statServerErrors) statServerErrors.textContent = formatPercentage(stats.server_error_percentage);
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }

  async function loadFrequentErrors(token, startDate, endDate) {
    try {
      const params = new URLSearchParams({ limit: '10' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await fetchJson(`/api/errors/analytics/frequent?${params}`, token);
      
      if (data.success && data.data && frequentErrorsBody) {
        if (data.data.length === 0) {
          frequentErrorsBody.innerHTML = '<tr><td colspan="6" class="has-text-centered">Nenhum erro encontrado no período</td></tr>';
          return;
        }

        frequentErrorsBody.innerHTML = data.data.map(error => `
          <tr>
            <td><code>${escapeHtml(error.error_code || '-')}</code></td>
            <td><span class="tag is-${error.status_code >= 500 ? 'danger' : error.status_code >= 400 ? 'warning' : 'info'}">${error.status_code}</span></td>
            <td><strong>${formatNumber(error.count)}</strong></td>
            <td>${formatNumber(error.unique_users)}</td>
            <td>${formatNumber(error.affected_endpoints)}</td>
            <td>${formatDate(error.last_occurrence)}</td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Erro ao carregar erros frequentes:', err);
      if (frequentErrorsBody) {
        frequentErrorsBody.innerHTML = '<tr><td colspan="6" class="has-text-centered has-text-danger">Erro ao carregar dados</td></tr>';
      }
    }
  }

  async function loadTimeline(token, startDate, endDate) {
    try {
      const params = new URLSearchParams({ period: 'day' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await fetchJson(`/api/errors/analytics/timeline?${params}`, token);
      
      if (data.success && data.data && window.Chart) {
        const canvas = document.getElementById('errors-timeline-chart');
        if (!canvas) return;

        const labels = data.data.map(item => item.period);
        const counts = data.data.map(item => parseInt(item.count, 10));

        if (timelineChart) {
          timelineChart.destroy();
        }

        timelineChart = new Chart(canvas, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Erros por dia',
              data: counts,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      }
    } catch (err) {
      console.error('Erro ao carregar timeline:', err);
    }
  }

  async function loadEndpointsErrors(token, startDate, endDate) {
    try {
      const params = new URLSearchParams({ limit: '10' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await fetchJson(`/api/errors/analytics/endpoints?${params}`, token);
      
      if (data.success && data.data && endpointsErrorsBody) {
        if (data.data.length === 0) {
          endpointsErrorsBody.innerHTML = '<tr><td colspan="5" class="has-text-centered">Nenhum endpoint com erros encontrado</td></tr>';
          return;
        }

        endpointsErrorsBody.innerHTML = data.data.map(endpoint => `
          <tr>
            <td><code>${escapeHtml(endpoint.path || '-')}</code></td>
            <td><span class="tag">${escapeHtml(endpoint.method || '-')}</span></td>
            <td><strong>${formatNumber(endpoint.error_count)}</strong></td>
            <td>${formatNumber(endpoint.unique_errors)}</td>
            <td>${formatNumber(endpoint.affected_users)}</td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Erro ao carregar endpoints com erros:', err);
      if (endpointsErrorsBody) {
        endpointsErrorsBody.innerHTML = '<tr><td colspan="5" class="has-text-centered has-text-danger">Erro ao carregar dados</td></tr>';
      }
    }
  }

  async function loadRecentErrors(token) {
    try {
      const data = await fetchJson('/api/errors/analytics/recent?hours=24&limit=20', token);
      
      if (data.success && data.data && recentErrorsList) {
        if (data.data.length === 0) {
          recentErrorsList.innerHTML = '<p class="has-text-centered">Nenhum erro recente</p>';
          return;
        }

        recentErrorsList.innerHTML = data.data.map(error => `
          <div class="recent-error-item">
            <div class="recent-error-header">
              <code class="recent-error-code">${escapeHtml(error.error_code || 'UNKNOWN')}</code>
              <span class="tag is-${error.status_code >= 500 ? 'danger' : 'warning'}">${error.status_code}</span>
              <span class="recent-error-time">${formatDate(error.occurred_at)}</span>
            </div>
            <div class="recent-error-details">
              <p><strong>Endpoint:</strong> <code>${escapeHtml(error.method)} ${escapeHtml(error.path)}</code></p>
              ${error.message ? `<p><strong>Mensagem:</strong> ${escapeHtml(error.message)}</p>` : ''}
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Erro ao carregar erros recentes:', err);
      if (recentErrorsList) {
        recentErrorsList.innerHTML = '<p class="has-text-centered has-text-danger">Erro ao carregar dados</p>';
      }
    }
  }

  async function loadAllData(token) {
    clearMessage();
    
    const period = periodSelect ? periodSelect.value : '7d';
    const { startDate, endDate } = getPeriodDates(period);

    try {
      await Promise.all([
        loadStatistics(token, startDate, endDate),
        loadFrequentErrors(token, startDate, endDate),
        loadTimeline(token, startDate, endDate),
        loadEndpointsErrors(token, startDate, endDate),
        loadRecentErrors(token),
      ]);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return;
      }
      if (err.status === 401 || err.status === 403) {
        window.location.href = '/';
        return;
      }
      showMessage('Erro ao carregar dados. Tente novamente.', 'is-danger');
    }
  }

  // Inicialização
  ensureAuthOrRedirect().then((user) => {
    if (!user) return;
    loadAllData(null);
  });

  // Event listeners
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadAllData(null));
  }

  if (periodSelect) {
    periodSelect.addEventListener('change', () => loadAllData(null));
  }

  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await ensureCsrfCookie();
        const csrfToken = getCsrfToken();
        await fetch(buildUrl('/api/auth/logout'), {
          method: 'POST',
          credentials: 'include',
          headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
        });
      } catch {
        // Ignora erros no logout
      }
      window.location.href = '/';
    });
  }
})();
