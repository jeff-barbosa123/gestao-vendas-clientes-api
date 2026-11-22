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
  const drops = alerts.filter((a) => a.level === 'margin_drop').length;
  const low = alerts.length - below - drops;
  listEl.textContent = '';
  if (countEl) countEl.textContent = alerts.length ? String(alerts.length) : '';
  if (!alerts.length) {
    msgEl.textContent = `Todos os produtos com custo informado mantêm a margem (mínimo de ${threshold}%).`;
    return;
  }
  const parts = [];
  if (below) parts.push(`${below} produto(s) vendido(s) abaixo do custo`);
  if (drops) parts.push(`${drops} com queda de margem`);
  if (low) parts.push(`${low} com margem abaixo de ${threshold}%`);
  msgEl.textContent = parts.join(', ') + '.';
  const canApply = !(window.SGVC && window.SGVC.access) || window.SGVC.access.can('products:write');
  alerts.slice(0, 4).forEach((a) => {
    const li = document.createElement('li');
    li.className = 'alert-pricing-item';
    const name = document.createElement('span');
    name.textContent = a.name;
    const value = document.createElement('span');
    value.className = a.level === 'below_cost' ? 'is-below-cost' : 'is-low-margin';
    if (a.level === 'below_cost') value.textContent = 'abaixo do custo';
    else if (a.level === 'margin_drop' && a.referenceMargin != null) value.textContent = `${Math.round(a.referenceMargin * 100)}% → ${Math.round(a.margin * 100)}%`;
    else value.textContent = `${Math.round(a.margin * 100)}%`;
    value.title = a.message || '';
    li.append(name, value);
    if (a.suggestedPrice != null) {
      const actions = document.createElement('div');
      actions.className = 'alert-actions';
      const hint = document.createElement('span');
      hint.className = 'alert-suggestion';
      hint.textContent = `Preço sugerido: ${money(a.suggestedPrice)} (hoje ${money(a.price)})`;
      actions.appendChild(hint);
      if (canApply) {
        const apply = document.createElement('button');
        apply.type = 'button';
        apply.className = 'button is-link is-small alert-apply';
        apply.textContent = 'Aplicar preço';
        apply.addEventListener('click', () => runPricingAction(apply, msgEl, `/api/products/${a.productId}`, 'PUT', { price: a.suggestedPrice }));
        actions.appendChild(apply);
        if (a.level === 'margin_drop') {
          const keep = document.createElement('button');
          keep.type = 'button';
          keep.className = 'button is-light is-small alert-keep';
          keep.textContent = 'Manter margem atual';
          keep.addEventListener('click', () => runPricingAction(keep, msgEl, `/api/products/${a.productId}/margin-baseline`, 'POST', {}));
          actions.appendChild(keep);
        }
      }
      li.appendChild(actions);
    }
    listEl.appendChild(li);
  });
}

async function runPricingAction(btn, msgEl, path, method, body) {
  btn.disabled = true;
  try {
    await window.apiRequest(path, null, { method, body: JSON.stringify(body) });
    window.location.reload();
  } catch (err) {
    msgEl.textContent = (err && err.message) || 'Não foi possível concluir a ação.';
    btn.disabled = false;
  }
}

export function renderProductStockAlerts(data) {
  const countEl = document.getElementById('alert-product-stock-count');
  const msgEl = document.getElementById('alert-product-stock-message');
  const listEl = document.getElementById('alert-product-stock-list');
  if (!msgEl || !listEl) return;
  const alerts = Array.isArray(data.productStockAlerts) ? data.productStockAlerts : [];
  listEl.textContent = '';
  if (countEl) countEl.textContent = alerts.length ? String(alerts.length) : '';
  if (!alerts.length) {
    msgEl.textContent = 'Nenhum produto abaixo do estoque mínimo. Defina o mínimo no cadastro do produto para receber o aviso.';
    return;
  }
  msgEl.textContent = `${alerts.length} produto(s) no estoque mínimo ou abaixo.`;
  alerts.slice(0, 4).forEach((a) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = a.name;
    const value = document.createElement('span');
    value.className = 'is-below-cost';
    value.textContent = `${a.stock} un.`;
    value.title = `Mínimo: ${a.minStock} un.`;
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
