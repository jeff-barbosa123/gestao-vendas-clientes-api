/**
 * Eventos dos formulários de criação e edição de venda.
 */
import {
  createCustomer,
  createDate,
  createDateError,
  createDateHoliday,
  createForm,
  createPayment,
  createSubmit,
  editDate,
  editDateError,
  editForm,
  editItemError,
  editModal,
  editPayment,
  editSubmit,
  itemBarcodeMessage,
  itemError,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, setFieldError, showMessage, toggleModal } from './core.js';
import { formatDateInput } from './formatters.js';
import { checkHoliday } from './holidays.js';
import { resolveCustomerSelection, updateCustomerSelection } from './catalog.js';
import { showBarcodeMessage } from './barcode.js';
import { renderItems } from './items.js';
import { loadSales, loadSummary } from './list.js';

export function initEventsForms() {
  if (createForm) {
    createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setFieldError(createDateError, '');
      setFieldError(itemError, '');

      if (!createDate.value) {
        setFieldError(createDateError, 'Informe a data da venda.');
        return;
      }
      if (!state.items.length) {
        setFieldError(itemError, 'Adicione pelo menos um item.');
        return;
      }

      createSubmit.classList.add('is-loading');
      createSubmit.disabled = true;
      try {
        const rawCustomer = createCustomer.value.trim();
        const match = resolveCustomerSelection(rawCustomer);
        const created = await apiRequest('/api/sales', null, {
          method: 'POST',
          body: JSON.stringify({
            customerId: match ? match.id : undefined,
            customerName: rawCustomer || undefined,
            date: createDate.value,
            paymentMethod: createPayment && createPayment.value ? createPayment.value : undefined,
            items: state.items.map((item) => ({
              productId: item.productId,
              quantity: item.qty,
              unitPrice: item.price,
            })),
          }),
        });
        const lowStock = created && Array.isArray(created.lowStockIngredients) ? created.lowStockIngredients : [];
        if (lowStock.length) {
          showMessage(
            `Venda criada com sucesso. Atenção: ${lowStock.map((i) => i.name).join(', ')} ${
              lowStock.length === 1 ? 'chegou' : 'chegaram'
            } ao estoque mínimo.`,
            'is-warning'
          );
        } else {
          showMessage('Venda criada com sucesso.', 'is-success');
        }
        createForm.reset();
        state.items = [];
        renderItems();
        updateCustomerSelection('');
        showBarcodeMessage(itemBarcodeMessage, '');
        if (createDate) {
          createDate.value = formatDateInput(new Date());
          checkHoliday(createDate.value, null, createDateHoliday);
        }
        await loadSales(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        createSubmit.classList.remove('is-loading');
        createSubmit.disabled = false;
      }
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.editingId) return;
      setFieldError(editDateError, '');
      setFieldError(editItemError, '');

      if (!editDate.value) {
        setFieldError(editDateError, 'Informe a data da venda.');
        return;
      }
      if (!state.editItems.length) {
        setFieldError(editItemError, 'Adicione pelo menos um item.');
        return;
      }

      editSubmit.classList.add('is-loading');
      editSubmit.disabled = true;
      try {
        await apiRequest(`/api/sales/${state.editingId}`, null, {
          method: 'PUT',
          body: JSON.stringify({
            date: editDate.value,
            paymentMethod: editPayment && editPayment.value ? editPayment.value : undefined,
            items: state.editItems.map((item) => ({
              productId: item.productId,
              quantity: item.qty,
              unitPrice: item.price,
            })),
          }),
        });
        showMessage('Venda atualizada.', 'is-success');
        toggleModal(editModal, false);
        await loadSales(null);
        loadSummary(null);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      } finally {
        editSubmit.classList.remove('is-loading');
        editSubmit.disabled = false;
      }
    });
  }
}
