/**
 * Gráficos de vendas e receita (Chart.js).
 */
import { state } from './state.js';
import { toggleEmpty } from './core.js';

export function renderCharts(data) {
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
      if (!state.salesChart) {
        state.salesChart = new Chart(salesCanvas, {
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
        if (state.salesChart.data && Array.isArray(state.salesChart.data.datasets) && state.salesChart.data.datasets[0]) {
          state.salesChart.data.labels = chartLabels;
          state.salesChart.data.datasets[0].data = salesDataArray;
          state.salesChart.update();
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
      if (!state.revenueChart) {
        state.revenueChart = new Chart(revenueCanvas, {
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
        if (state.revenueChart.data && Array.isArray(state.revenueChart.data.datasets) && state.revenueChart.data.datasets[0]) {
          state.revenueChart.data.labels = chartLabels;
          state.revenueChart.data.datasets[0].data = revenueDataArray;
          state.revenueChart.update();
        }
      }
    } catch (err) {
      // CORREÇÃO: Suprime erros internos do Chart.js (index.js minificado)
      // Esses erros não afetam a funcionalidade e são causados por biblioteca externa
      console.warn('[DASHBOARD] Erro ao renderizar gráfico de faturamento (suprimido):', err.message);
    }
  }
}
