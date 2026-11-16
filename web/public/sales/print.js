/**
 * Impressão do comprovante da venda.
 */
import { escapeHtml } from './formatters.js';

export function openPrint(details) {
  if (!details) return;
  const typeBlock =
    details.customerDetails && details.customerDetails.type
      ? `<div><div class="label">Tipo</div><div class="value">${escapeHtml(details.customerDetails.type)}</div></div>`
      : '';
  const documentBlock =
    details.customerDetails && details.customerDetails.document
      ? `<div><div class="label">${escapeHtml(details.customerDetails.documentLabel || 'Documento')}</div><div class="value">${escapeHtml(details.customerDetails.document)}</div></div>`
      : '';
  const tradeBlock =
    details.customerDetails && details.customerDetails.tradeName
      ? `<div><div class="label">Nome fantasia</div><div class="value">${escapeHtml(details.customerDetails.tradeName)}</div></div>`
      : '';
  const complementBlock =
    details.customerDetails && details.customerDetails.complement
      ? `<div><div class="label">Complemento</div><div class="value">${escapeHtml(details.customerDetails.complement)}</div></div>`
      : '';
  const stateBlock =
    details.customerDetails && details.customerDetails.state
      ? `<div><div class="label">UF</div><div class="value">${escapeHtml(details.customerDetails.state)}</div></div>`
      : '';
  const customerBlock = details.customerDetails
    ? `
          <div class="section-title">Dados do cliente</div>
          <div class="meta">
            <div><div class="label">Nome</div><div class="value">${escapeHtml(details.customerDetails.name)}</div></div>
            <div><div class="label">E-mail</div><div class="value">${escapeHtml(details.customerDetails.email)}</div></div>
            <div><div class="label">Telefone</div><div class="value">${escapeHtml(details.customerDetails.phone)}</div></div>
            ${typeBlock}
            ${documentBlock}
            <div><div class="label">Nascimento</div><div class="value">${escapeHtml(details.customerDetails.birthDate)}</div></div>
            ${tradeBlock}
            <div><div class="label">Endere\u00e7o completo</div><div class="value">${escapeHtml(details.customerDetails.address)}</div></div>
            ${complementBlock}
            <div><div class="label">Bairro</div><div class="value">${escapeHtml(details.customerDetails.neighborhood)}</div></div>
            <div><div class="label">Cidade</div><div class="value">${escapeHtml(details.customerDetails.city)}</div></div>
            ${stateBlock}
            <div><div class="label">CEP</div><div class="value">${escapeHtml(details.customerDetails.postal)}</div></div>
          </div>
        `
    : '';
  const itemsRows = details.items
    .map(
      (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td style="text-align:right;">${escapeHtml(item.qty)}</td>
            <td style="text-align:right;">R$ ${escapeHtml(item.price)}</td>
            <td style="text-align:right;">R$ ${escapeHtml(item.total)}</td>
          </tr>
        `
    )
    .join('');
  const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Detalhes da venda</title>
          <style>
            body { font-family: "Source Sans 3", Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .value { font-weight: 600; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
            th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
            .notes { margin-top: 16px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
            .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #475569; margin: 14px 0 8px; }
          </style>
        </head>
        <body>
          <h1>Detalhes da venda</h1>
          <div class="meta">
            <div><div class="label">Cliente</div><div class="value">${escapeHtml(details.customer)}</div></div>
            <div><div class="label">Data</div><div class="value">${escapeHtml(details.date)}</div></div>
            <div><div class="label">Status</div><div class="value">${escapeHtml(details.status)}</div></div>
            <div><div class="label">Total</div><div class="value">R$ ${escapeHtml(details.total)}</div></div>
          </div>
          ${customerBlock}
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th style="text-align:right;">Qtd</th>
                <th style="text-align:right;">Preco</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="notes">
            <div class="label">Observa\u00e7\u00f5es</div>
            <div class="value">${escapeHtml(details.notes || '-')}</div>
          </div>
        </body>
      </html>
    `;
  const win = window.open('', '_blank');
  if (!win) return;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  // Evita document.write (desencorajado e mais difícil de auditar)
  win.document.open();
  win.document.documentElement.innerHTML = parsed.documentElement.innerHTML;
  win.document.close();
  win.focus();
  win.print();
}
