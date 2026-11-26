/**
 * Geração do PDF da venda (jsPDF).
 */
import { formatPhone, sanitizeFileName } from './formatters.js';
import { openPrint } from './print.js';

export function openPdf(details) {
  if (!details) return;
  const jsPdfLib = window.jspdf && window.jspdf.jsPDF ? window.jspdf : null;
  if (!jsPdfLib) {
    openPrint(details);
    return;
  }
  const doc = new jsPdfLib.jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;
  const accent = [15, 118, 110];
  const gray = [100, 116, 139];
  const generatedAt = new Date().toLocaleString('pt-BR');

  const addTitle = (text) => {
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(margin, y - 16, pageWidth - margin * 2, 32, 8, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(text, margin + 14, y + 6);
    doc.setFontSize(10);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('SGVC', pageWidth - margin - 80, y + 2, { align: 'right' });
    doc.text(`Gerado em ${generatedAt}`, pageWidth - margin - 14, y + 14, { align: 'right' });
    doc.setTextColor(15, 23, 42);
    y += 32;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
  };

  const addSection = (text) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(text.toUpperCase(), margin, y);
    doc.setTextColor(15, 23, 42);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
  };

  const ensureSpace = (height) => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  addTitle('Detalhes da venda');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(details.customer || '-', margin, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text('Data', margin + 260, y);
  doc.setFont('helvetica', 'normal');
  doc.text(details.date || '-', margin + 260, y + 12);
  y += 30;
  doc.setFont('helvetica', 'bold');
  doc.text('Status', margin, y);
  doc.setFont('helvetica', 'normal');
  const statusText = details.status || '-';
  const statusLower = String(statusText).toLowerCase();
  if (statusLower.includes('cancel')) {
    doc.setTextColor(185, 28, 28);
  } else {
    doc.setTextColor(5, 150, 105);
  }
  doc.text(statusText, margin, y + 12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', margin + 260, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(`R$ ${details.total || '0,00'}`, margin + 260, y + 14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 28;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  if (details.customerDetails) {
    ensureSpace(80);
    addSection('Cliente');
    const phoneValue = formatPhone(details.customerDetails.phone);
    const normalizedPhone = phoneValue === 'N\u00e3o informado' ? '' : phoneValue;
    const fields = [
      ['Nome', details.customerDetails.name],
      ['Tipo', details.customerDetails.type],
      [details.customerDetails.documentLabel || 'Documento', details.customerDetails.document],
      ['Nome fantasia', details.customerDetails.tradeName],
      ['E-mail', details.customerDetails.email],
      ['Telefone', normalizedPhone],
      ['Nascimento', details.customerDetails.birthDate],
      ['Endere\u00e7o completo', details.customerDetails.address],
      ['Complemento', details.customerDetails.complement],
      ['Bairro', details.customerDetails.neighborhood],
      ['Cidade', details.customerDetails.city],
      ['UF', details.customerDetails.state],
      ['CEP', details.customerDetails.postal],
    ].filter((entry) => entry[1] && String(entry[1]).trim());
    const leftX = margin;
    const rightX = margin + 260;
    const colWidth = 240;
    let colY = y;
    fields.forEach((item, index) => {
      const x = index % 2 === 0 ? leftX : rightX;
      if (index % 2 === 0 && index > 0) {
        colY += 28;
        y = colY;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(gray[0], gray[1], gray[2]);
      doc.text(item[0], x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const value = doc.splitTextToSize(String(item[1]), colWidth);
      doc.text(value, x, y + 12);
    });
    y = colY + 28;
  } else {
    ensureSpace(30);
    addSection('Cliente');
    doc.text('Cliente n\u00e3o cadastrado.', margin, y);
    y += 18;
  }

  ensureSpace(80);
  addSection('Itens da venda');
  const colProduct = margin;
  const colQty = pageWidth - margin - 160;
  const colPrice = pageWidth - margin - 100;
  const colTotal = pageWidth - margin;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 4, pageWidth - margin, y + 4);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Produto', colProduct, y);
  doc.text('Qtd', colQty, y, { align: 'right' });
  doc.text('Pre\u00e7o', colPrice, y, { align: 'right' });
  doc.text('Total', colTotal, y, { align: 'right' });
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  (details.items || []).forEach((item) => {
    ensureSpace(20);
    doc.text(String(item.name || '-'), colProduct, y);
    doc.text(String(item.qty || '-'), colQty, y, { align: 'right' });
    doc.text(`R$ ${String(item.price || '-')}`, colPrice, y, { align: 'right' });
    doc.text(`R$ ${String(item.total || '-')}`, colTotal, y, { align: 'right' });
    y += 16;
  });

  if (details.notes && details.notes !== '-' && details.notes !== 'Sem observa\u00e7\u00f5es.') {
    ensureSpace(40);
    addSection('Observa\u00e7\u00f5es');
    const lines = doc.splitTextToSize(String(details.notes), pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 12;
  }

  const fileBase = sanitizeFileName(`${details.customer || 'venda'}-${details.date || ''}`);
  doc.save(`${fileBase || 'venda'}.pdf`);
}
