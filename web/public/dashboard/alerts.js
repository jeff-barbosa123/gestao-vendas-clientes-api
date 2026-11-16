/**
 * Alertas de clientes, produtos, receita, preços e estoque.
 */
import {
  alertClientsCount,
  alertClientsHint,
  alertClientsMessage,
  alertProductsCount,
  alertProductsHint,
  alertProductsMessage,
  alertRevenueCount,
  alertRevenueHint,
  alertRevenueMessage,
} from './dom.js';
import { money } from './core.js';
import { daysBetween } from './period.js';

export function renderPricingAlerts(data) {
  const countEl = document.getElementById('alert-pricing-count');
  const msgEl = document.getElementById('alert-pricing-message');
  const listEl = document.getElementById('alert-pricing-list');
  if (!msgEl || !listEl) return;
  const alerts = Array.isArray(data.pricingAlerts) ? data.pricingAlerts : [];
  const threshold = Math.round(Number(data.lowMarginThreshold ?? 0.3) * 100);
  const below = alerts.filter((a) => a.level === 'below_cost').length;
  listEl.textContent = '';
  if (countEl) countEl.textContent = alerts.length ? String(alerts.length) : '';
  if (!alerts.length) {
    msgEl.textContent = `Todos os produtos com custo informado têm margem de pelo menos ${threshold}%.`;
    return;
  }
  msgEl.textContent = below
    ? `${below} produto(s) vendido(s) abaixo do custo e ${alerts.length - below} com margem abaixo de ${threshold}%.`
    : `${alerts.length} produto(s) com margem abaixo de ${threshold}%.`;
  alerts.slice(0, 4).forEach((a) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = a.name;
    const value = document.createElement('span');
    value.className = a.level === 'below_cost' ? 'is-below-cost' : 'is-low-margin';
    value.textContent = a.level === 'below_cost' ? 'abaixo do custo' : `${Math.round(a.margin * 100)}%`;
    value.title = a.message || '';
    li.append(name, value);
    listEl.appendChild(li);
  });
}

function formatStockQty(value, unit) {
  const n = Number(value || 0);
  const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if ((unit === 'g' || unit === 'ml') && Math.abs(n) >= 1000) return `${fmt(n / 1000)} ${unit === 'g' ? 'kg' : 'l'}`;
  return `${fmt(n)} ${unit || ''}`.trim();
}

export function renderStockAlerts(data) {
  const countEl = document.getElementById('alert-stock-count');
  const msgEl = document.getElementById('alert-stock-message');
  const listEl = document.getElementById('alert-stock-list');
  if (!msgEl || !listEl) return;
  const alerts = Array.isArray(data.stockAlerts) ? data.stockAlerts : [];
  listEl.textContent = '';
  if (countEl) countEl.textContent = alerts.length ? String(alerts.length) : '';
  if (!alerts.length) {
    msgEl.textContent = 'Nenhum insumo abaixo do estoque mínimo. Defina o mínimo na tela de Insumos para receber o aviso.';
    return;
  }
  msgEl.textContent = `${alerts.length} insumo(s) no estoque mínimo ou abaixo.`;
  alerts.slice(0, 4).forEach((a) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = a.name;
    const value = document.createElement('span');
    value.className = 'is-below-cost';
    value.textContent = formatStockQty(a.stockQuantity, a.stockUnit);
    value.title = `Mínimo: ${formatStockQty(a.minStock, a.stockUnit)}`;
    li.append(name, value);
    listEl.appendChild(li);
  });
}

function setAlertContent(badgeEl, count, messageEl, message, hintEl, hint) {
  if (badgeEl) badgeEl.textContent = count ? `(${count})` : "";
  if (messageEl) messageEl.textContent = message || "";
  if (hintEl) hintEl.textContent = hint || "";
}

export function updateClientAlert(customers) {
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

export function updateProductAlert(products) {
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

export function updateRevenueAlert(current, previous) {
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
    hint = `Variação de ${sign}${change.toFixed(1).replace(".", ",")}% em relação ao período anterior`;
  }
  setAlertContent(alertRevenueCount, salesCount, alertRevenueMessage, message, alertRevenueHint, hint);
}
