/**
 * Itens da venda: totais e renderização (criação e edição).
 */
import {
  addItemBtn,
  editAddItem,
  editItemError,
  editItemPrice,
  editItemProduct,
  editItemQty,
  editItemsBody,
  editSaleTotal,
  itemError,
  itemPrice,
  itemProduct,
  itemQty,
  itemsBody,
  saleTotal,
} from './dom.js';
import { state } from './state.js';
import { setFieldError } from './core.js';
import { escapeHtml, formatPrice } from './formatters.js';
import { parsePrice } from './parsers.js';
import { getProductNameById, setPriceFromProduct } from './catalog.js';

export function updateAddItemState(selectEl, qtyEl, priceEl, buttonEl) {
  if (!buttonEl) return;
  const hasProduct = Boolean(selectEl && selectEl.value);
  const qty = Number(qtyEl ? qtyEl.value : 0);
  const price = parsePrice(priceEl ? priceEl.value : null);
  const isReady = hasProduct && qty > 0 && price != null;
  buttonEl.classList.toggle('is-highlight', isReady);
}

function updateTotal() {
  const total = state.items.reduce((sum, item) => sum + item.total, 0);
  saleTotal.textContent = `R$ ${formatPrice(total)}`;
}

function updateEditTotal() {
  const total = state.editItems.reduce((sum, item) => sum + item.total, 0);
  if (editSaleTotal) editSaleTotal.textContent = `R$ ${formatPrice(total)}`;
}

export function renderItems() {
  itemsBody.innerHTML = '';
  state.items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${escapeHtml(item.productName || item.productId)}</td>
        <td class="has-text-right">${escapeHtml(item.qty)}</td>
        <td class="has-text-right">R$ ${formatPrice(item.price)}</td>
        <td class="has-text-right">R$ ${formatPrice(item.total)}</td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-index="${index}" aria-label="Remover item">Remover</button>
        </td>
      `;
    itemsBody.appendChild(row);
  });
  updateTotal();
}

export function renderEditItems() {
  if (!editItemsBody) return;
  editItemsBody.innerHTML = '';
  state.editItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${escapeHtml(item.productName || item.productId)}</td>
        <td class="has-text-right">${escapeHtml(item.qty)}</td>
        <td class="has-text-right">R$ ${formatPrice(item.price)}</td>
        <td class="has-text-right">R$ ${formatPrice(item.total)}</td>
        <td class="has-text-right">
          <button class="button is-light is-small" data-edit-index="${index}" aria-label="Remover item">Remover</button>
        </td>
      `;
    editItemsBody.appendChild(row);
  });
  updateEditTotal();
}

export function initItems() {
  [itemQty, itemPrice].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => updateAddItemState(itemProduct, itemQty, itemPrice, addItemBtn));
  });

  [editItemQty, editItemPrice].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => updateAddItemState(editItemProduct, editItemQty, editItemPrice, editAddItem));
  });

  if (itemProduct) {
    itemProduct.addEventListener('change', () => {
      setPriceFromProduct(itemProduct, itemPrice);
      updateAddItemState(itemProduct, itemQty, itemPrice, addItemBtn);
    });
  }

  if (editItemProduct) {
    editItemProduct.addEventListener('change', () => {
      setPriceFromProduct(editItemProduct, editItemPrice);
      updateAddItemState(editItemProduct, editItemQty, editItemPrice, editAddItem);
    });
  }

  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      const productId = itemProduct.value.trim();
      const qty = Number(itemQty.value);
      const price = parsePrice(itemPrice.value);

      setFieldError(itemError, '');
      if (!productId) {
        setFieldError(itemError, 'Selecione um produto.');
        return;
      }
      if (!qty || qty <= 0 || !price) {
        setFieldError(itemError, 'Informe quantidade e pre\u00e7o v\u00e1lidos.');
        return;
      }

      const total = qty * price;
      const productName = getProductNameById(productId);
      state.items.push({ productId, productName, qty, price, total });
      itemProduct.value = '';
      itemQty.value = '';
      itemPrice.value = '';
      updateAddItemState(itemProduct, itemQty, itemPrice, addItemBtn);
      renderItems();
    });
  }

  if (itemsBody) {
    itemsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-index]');
      if (!btn) return;
      const index = Number(btn.dataset.index);
      if (Number.isInteger(index)) {
        state.items.splice(index, 1);
        renderItems();
      }
    });
  }

  if (editItemsBody) {
    editItemsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-edit-index]');
      if (!btn) return;
      const index = Number(btn.dataset.editIndex);
      if (Number.isInteger(index)) {
        state.editItems.splice(index, 1);
        renderEditItems();
      }
    });
  }

  if (editAddItem) {
    editAddItem.addEventListener('click', () => {
      const productId = editItemProduct.value.trim();
      const qty = Number(editItemQty.value);
      const price = parsePrice(editItemPrice.value);

      setFieldError(editItemError, '');
      if (!productId) {
        setFieldError(editItemError, 'Selecione um produto.');
        return;
      }
      if (!qty || qty <= 0 || price == null) {
        setFieldError(editItemError, 'Informe quantidade e pre\u00e7o v\u00e1lidos.');
        return;
      }

      const total = qty * price;
      const productName = getProductNameById(productId);
      state.editItems.push({ productId, productName, qty, price, total });
      editItemProduct.value = '';
      editItemQty.value = '';
      editItemPrice.value = '';
      updateAddItemState(editItemProduct, editItemQty, editItemPrice, editAddItem);
      renderEditItems();
    });
  }
}
