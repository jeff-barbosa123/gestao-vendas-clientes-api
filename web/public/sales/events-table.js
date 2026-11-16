/**
 * Eventos da tabela de vendas: detalhes, edição, cancelamento e PDF.
 */
import { paymentLabel } from './constants.js';
import {
  cancelConfirmBtn,
  cancelModal,
  detailsAddressBlock,
  detailsBirth,
  detailsCity,
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
  detailsPhone,
  detailsPostal,
  detailsStatus,
  detailsStreet,
  detailsTotal,
  detailsTrade,
  detailsType,
  editDate,
  editDateHoliday,
  editModal,
  editPayment,
  tableBody,
} from './dom.js';
import { state } from './state.js';
import { apiRequest, showMessage, toggleModal } from './core.js';
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
} from './formatters.js';
import { normalizeStatus } from './parsers.js';
import { checkHoliday } from './holidays.js';
import { getProductNameById, setCustomerField } from './catalog.js';
import { renderEditItems } from './items.js';

export function initEventsTable() {
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
}
