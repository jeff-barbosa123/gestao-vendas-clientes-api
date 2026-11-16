/**
 * Tela de vendas (entrada). MÃ³dulos em /sales/*.js.
 */
import { paymentLabel } from './sales/constants.js';
import {
  cancelBackBtn,
  cancelClose,
  cancelCloseBtn,
  cancelConfirmBtn,
  cancelModal,
  createCustomer,
  createDate,
  createDateError,
  createDateHoliday,
  createForm,
  createPayment,
  createSubmit,
  detailsAddressBlock,
  detailsBirth,
  detailsCity,
  detailsClose,
  detailsCloseBtn,
  detailsComplement,
  detailsCustomer,
  detailsCustomerBlock,
  detailsDate,
  detailsDocument,
  detailsDocumentLabel,
  detailsEmail,
  detailsEmpty,
  detailsFieldBirth,
  detailsFieldCity,
  detailsFieldComplement,
  detailsFieldDocument,
  detailsFieldEmail,
  detailsFieldName,
  detailsFieldNeighborhood,
  detailsFieldNumber,
  detailsFieldPhone,
  detailsFieldPostal,
  detailsFieldStreet,
  detailsFieldTrade,
  detailsFieldType,
  detailsFullAddress,
  detailsItems,
  detailsModal,
  detailsName,
  detailsNeighborhood,
  detailsNotes,
  detailsNotesCard,
  detailsNumber,
  detailsPayment,
  detailsPdfBtn,
  detailsPhone,
  detailsPostal,
  detailsStatus,
  detailsStreet,
  detailsTotal,
  detailsTrade,
  detailsType,
  editClose,
  editCloseBtn,
  editDate,
  editDateError,
  editDateHoliday,
  editForm,
  editItemError,
  editModal,
  editPayment,
  editSubmit,
  itemBarcodeMessage,
  itemError,
  tableBody,
} from './sales/dom.js';
import { state } from './sales/state.js';
import {
  apiRequest,
  ensureAuthOrRedirect,
  setFieldError,
  showMessage,
  toggleModal,
} from './sales/core.js';
import {
  formatAddress,
  formatBirthDate,
  formatDateDisplay,
  formatDateInput,
  formatDocument,
  formatPhone,
  formatPrice,
  getTypeLabel,
  normalizeName,
  parseNotesMeta,
} from './sales/formatters.js';
import { normalizeStatus } from './sales/parsers.js';
import { checkHoliday } from './sales/holidays.js';
import {
  getProductNameById,
  initCatalog,
  loadCustomers,
  loadProducts,
  resolveCustomerSelection,
  setCustomerField,
  updateCustomerSelection,
} from './sales/catalog.js';
import { showBarcodeMessage } from './sales/barcode.js';
import { initItems, renderEditItems, renderItems } from './sales/items.js';
import { openPdf } from './sales/pdf.js';
import { initList, loadSales, loadSummary } from './sales/list.js';

// Gate de auth: só inicializa dados se estiver autenticado
ensureAuthOrRedirect().then((user) => {
  if (!user) return;
  loadProducts(null).catch((err) => showMessage(err.message, 'is-danger'));
  loadCustomers(null).catch((_err) => {});
  loadSales(null).catch((err) => showMessage(err.message, 'is-danger'));
  loadSummary(null);
});

initCatalog();

initList();

initItems();

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

if (tableBody) {
  tableBody.addEventListener('click', async (event) => {
    const viewBtn = event.target.closest('button[data-view-id]');
    if (viewBtn) {
      const saleId = viewBtn.dataset.viewId;
      if (!saleId) return;
      try {
        const sale = await apiRequest(`/api/sales/${saleId}`, null);
        const statusData = normalizeStatus(sale.statusVenda || sale.status_venda || sale.status || 'ATIVA');
        const customerName =
          sale.customerName ||
          sale.customer_name ||
          sale.clienteNome ||
          sale.cliente_nome ||
          '-';
        if (detailsCustomer) detailsCustomer.textContent = customerName;
        if (detailsDate) detailsDate.textContent = formatDateDisplay(sale.date || sale.dataVenda);
        if (detailsPayment) detailsPayment.textContent = `Pagamento: ${paymentLabel(sale.paymentMethod)}`;
        if (detailsStatus) detailsStatus.textContent = statusData.label;
        if (detailsStatus) {
          detailsStatus.classList.toggle('is-canceled', statusData.key === 'CANCELADA');
        }
        if (detailsTotal) detailsTotal.textContent = `R$ ${formatPrice(sale.total || sale.valorTotal || 0)}`;
        if (detailsCustomerBlock) detailsCustomerBlock.hidden = true;
        if (detailsEmpty) detailsEmpty.hidden = true;
        if (detailsItems) {
          detailsItems.innerHTML = '';
          (sale.items || []).forEach((item) => {
            const productId = item.productId ?? item.idProduto ?? item.produtoId;
            const qty = Number(item.quantity || item.qtd || 0);
            const price = Number(item.unitPrice || item.priceUnit || item.precoUnitario || 0);
            const total = qty * price;
            const name =
              item.productName ||
              item.nomeProduto ||
              getProductNameById(productId) ||
              productId ||
              '-';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${name}</td>
                <td class="has-text-right">${qty}</td>
                <td class="has-text-right">R$ ${formatPrice(price)}</td>
                <td class="has-text-right">R$ ${formatPrice(total)}</td>
              `;
            detailsItems.appendChild(row);
          });
        }
        let customerDetails = null;
        if (sale.customerId) {
          try {
            customerDetails = await apiRequest(`/api/customers/${sale.customerId}`, null);
          } catch (_err) {
            customerDetails = null;
          }
        }
        if (!customerDetails && customerName && customerName !== '-') {
          try {
            const customers = await apiRequest('/api/customers', null);
            const normalized = normalizeName(customerName);
            customerDetails = (customers || []).find((customer) => normalizeName(customer.name) === normalized) || null;
          } catch (_err) {
            customerDetails = null;
          }
        }
        let notesText = '';
        let typeLabel = '';
        let typeKey = '';
        let documentLabel = 'Documento';
        let documentFormatted = '';
        let tradeNameValue = '';
        let complementValue = '';
        let stateValue = '';
        let fullAddress = '';
        if (customerDetails) {
          const parsedNotes = parseNotesMeta(customerDetails.notes || customerDetails.note || '');
          notesText = parsedNotes.text;
          const metadata = parsedNotes.metadata || {};
          typeKey = String(metadata.type || '').trim().toUpperCase();
          typeLabel = getTypeLabel(typeKey);
          tradeNameValue = String(metadata.tradeName || '').trim();
          complementValue = String(metadata.complement || '').trim();
          stateValue = String(customerDetails.addressState || customerDetails.address_state || '').trim().toUpperCase();
          let documentSource = '';
          if (typeKey === 'PF') {
            documentSource = metadata.cpf || customerDetails.cpf || customerDetails.cnpj || '';
          } else {
            documentSource = customerDetails.cnpj || metadata.cnpj || '';
          }
          documentFormatted = formatDocument(documentSource, typeKey);
          documentLabel = typeKey === 'PF' ? 'CPF' : typeKey === 'PJ' ? 'CNPJ' : 'Documento';
          const customerWithMeta = {
            ...customerDetails,
            complement: complementValue,
            addressState: stateValue,
            address_state: stateValue,
          };
          fullAddress = formatAddress(customerWithMeta);
        }
        if (detailsCustomerBlock && customerDetails) {
          detailsCustomerBlock.hidden = false;
          if (detailsEmpty) detailsEmpty.hidden = true;
          setCustomerField(detailsFieldName, detailsName, customerDetails.name || customerName);
          setCustomerField(detailsFieldEmail, detailsEmail, customerDetails.email);
          setCustomerField(detailsFieldPhone, detailsPhone, customerDetails.phone, formatPhone);
          setCustomerField(detailsFieldType, detailsType, typeLabel);
          if (detailsFieldDocument) {
            if (detailsDocumentLabel) detailsDocumentLabel.textContent = documentLabel;
            setCustomerField(detailsFieldDocument, detailsDocument, documentFormatted);
          }
          setCustomerField(detailsFieldBirth, detailsBirth, customerDetails.birthDate, formatBirthDate);
          setCustomerField(detailsFieldTrade, detailsTrade, tradeNameValue);
          setCustomerField(detailsFieldStreet, detailsStreet, customerDetails.addressStreet);
          setCustomerField(detailsFieldNumber, detailsNumber, customerDetails.addressNumber);
          setCustomerField(detailsFieldComplement, detailsComplement, complementValue);
          setCustomerField(detailsFieldCity, detailsCity, customerDetails.addressCity);
          setCustomerField(detailsFieldNeighborhood, detailsNeighborhood, customerDetails.addressNeighborhood);
          setCustomerField(detailsFieldPostal, detailsPostal, customerDetails.addressPostalCode);
          if (detailsFullAddress) {
            detailsFullAddress.textContent = fullAddress || '-';
          }
          if (detailsAddressBlock) {
            const hasAddress = [
              customerDetails.addressStreet,
              customerDetails.addressNumber,
              customerDetails.addressNeighborhood,
              customerDetails.addressCity,
              customerDetails.addressPostalCode,
            ].some((value) => String(value || '').trim());
            detailsAddressBlock.hidden = !hasAddress;
          }
        }
        if (detailsCustomerBlock && !customerDetails) {
          detailsCustomerBlock.hidden = true;
          if (detailsEmpty) detailsEmpty.hidden = false;
        }
        if (detailsNotes) detailsNotes.textContent = notesText || 'Sem observa\u00e7\u00f5es.';
        if (detailsNotesCard) detailsNotesCard.hidden = !notesText;
        state.currentDetails = {
          customer: customerName,
          date: formatDateDisplay(sale.date || sale.dataVenda),
          status: statusData.label,
          total: formatPrice(sale.total || sale.valorTotal || 0),
          items: (sale.items || []).map((item) => {
            const productId = item.productId ?? item.idProduto ?? item.produtoId;
            const qty = Number(item.quantity || item.qtd || 0);
            const price = Number(item.unitPrice || item.priceUnit || item.precoUnitario || 0);
            const total = qty * price;
            const name =
              item.productName ||
              item.nomeProduto ||
              getProductNameById(productId) ||
              productId ||
              '-';
            return {
              name,
              qty: String(qty),
              price: formatPrice(price),
              total: formatPrice(total),
            };
          }),
          notes: notesText || '-',
          customerDetails: customerDetails
            ? {
                name: customerDetails.name || customerName || '-',
                email: customerDetails.email || '-',
                phone: customerDetails.phone || '-',
                birthDate: formatBirthDate(customerDetails.birthDate),
                city: customerDetails.addressCity || '-',
                neighborhood: customerDetails.addressNeighborhood || '-',
                address: fullAddress || '-',
                postal: customerDetails.addressPostalCode || '-',
                type: typeLabel,
                document: documentFormatted,
                documentLabel,
                tradeName: tradeNameValue,
                complement: complementValue,
                state: stateValue,
              }
            : null,
        };
        toggleModal(detailsModal, true);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      }
      return;
    }

    const editBtn = event.target.closest('button[data-edit-id]');
    if (editBtn) {
      const saleId = editBtn.dataset.editId;
      if (!saleId) return;
      try {
        const sale = await apiRequest(`/api/sales/${saleId}`, null);
        state.editingId = saleId;
        state.editItems = (sale.items || []).map((item) => {
          const productId = item.productId ?? item.idProduto ?? item.produtoId;
          const qty = Number(item.quantity || item.qtd || 1);
          const price = Number(item.unitPrice || item.priceUnit || item.precoUnitario || 0);
          return {
            productId,
            productName: item.productName || item.nomeProduto || getProductNameById(productId),
            qty,
            price,
            total: qty * price,
          };
        });
        if (editDate) editDate.value = formatDateInput(sale.date || sale.dataVenda);
        if (editPayment) editPayment.value = sale.paymentMethod || '';
        if (editDateHoliday) {
          checkHoliday(editDate.value, null, editDateHoliday);
        }
        renderEditItems();
        toggleModal(editModal, true);
      } catch (err) {
        showMessage(err.message, 'is-danger');
      }
      return;
    }

    const btn = event.target.closest('button[data-cancel-id]');
    if (!btn) return;
    const saleId = btn.dataset.cancelId;
    if (!saleId) return;
    state.pendingCancelId = saleId;
    if (cancelConfirmBtn) cancelConfirmBtn.disabled = false;
    toggleModal(cancelModal, true);
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

[editClose, editCloseBtn].forEach((el) => {
  if (!el) return;
  el.addEventListener('click', () => toggleModal(editModal, false));
});

[detailsClose, detailsCloseBtn].forEach((el) => {
  if (!el) return;
  el.addEventListener('click', () => toggleModal(detailsModal, false));
});

if (detailsModal) {
  detailsModal.addEventListener('click', (event) => {
    const closeBtn = event.target.closest('.modal-close-btn');
    if (closeBtn) toggleModal(detailsModal, false);
  });
}

if (detailsPdfBtn) {
  detailsPdfBtn.addEventListener('click', () => openPdf(state.currentDetails));
}

[cancelClose, cancelCloseBtn, cancelBackBtn].forEach((el) => {
  if (!el) return;
  el.addEventListener('click', () => {
    state.pendingCancelId = null;
    toggleModal(cancelModal, false);
  });
});

if (cancelConfirmBtn) {
  cancelConfirmBtn.addEventListener('click', async () => {
    if (!state.pendingCancelId) return;
    cancelConfirmBtn.disabled = true;
    try {
      await apiRequest(`/api/sales/${state.pendingCancelId}/cancel`, null, { method: 'POST' });
      showMessage('Venda cancelada.', 'is-success');
      toggleModal(cancelModal, false);
      await loadSales(null);
    } catch (err) {
      showMessage(err.message, 'is-danger');
    } finally {
      state.pendingCancelId = null;
      cancelConfirmBtn.disabled = false;
    }
  });
}
