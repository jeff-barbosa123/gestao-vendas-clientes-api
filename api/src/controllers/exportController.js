/**
 * Controller para exportação de dados
 */

const customersService = require('../services/customersService');
const productsService = require('../services/productsService');
const salesService = require('../services/salesService');
const { toCSV, getAllPagesForExport, generateExportFilename, validateExportFormat } = require('../utils/export');
const { parsePagination } = require('../utils/pagination');

// PDFDocument está disponível (já instalado no package.json)
const PDFDocument = require('pdfkit');

/**
 * Exporta clientes
 */
async function exportCustomers(req, res, next) {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const filters = {
      type: req.query.filter || req.query.type,
      search: req.query.search || req.query.q,
      sortBy: req.query.sortBy || req.query.sort,
      createdFrom: req.query.createdFrom,
      createdTo: req.query.createdTo,
    };

    // Remove valores vazios
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    // Busca todos os dados (sem paginação para exportação)
    const pagination = parsePagination({ page: 1, limit: 1000 }, { defaultLimit: 1000, maxLimit: 10000 });
    
    // Busca primeira página
    let allData = await customersService.list(req.user, pagination, filters);
    
    // Se tem paginação, busca todas as páginas
    if (allData && allData.pagination && allData.pagination.totalPages > 1) {
      const fetchPage = async (page) => {
        const pagePagination = parsePagination({ page, limit: 1000 }, { defaultLimit: 1000, maxLimit: 10000 });
        return await customersService.list(req.user, pagePagination, filters);
      };
      
      const allItems = await getAllPagesForExport(allData, null, fetchPage);
      allData = allItems;
    } else {
      allData = allData.items || allData;
    }

    if (!Array.isArray(allData) || allData.length === 0) {
      const err = new Error('Nenhum dado encontrado para exportação');
      err.status = 404;
      err.code = 'NO_DATA_TO_EXPORT';
      return next(err);
    }

    // Define colunas para exportação - incluindo TODOS os campos
    const columns = [
      { key: 'name', label: 'Nome' },
      { key: 'tradeName', label: 'Nome Fantasia' },
      { key: 'email', label: 'E-mail' },
      { key: 'phone', label: 'Telefone' },
      { key: 'cpf', label: 'CPF' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'birthDate', label: 'Data de Nascimento' },
      { key: 'addressStreet', label: 'Rua' },
      { key: 'addressNumber', label: 'Número' },
      { key: 'addressComplement', label: 'Complemento' },
      { key: 'addressNeighborhood', label: 'Bairro' },
      { key: 'addressCity', label: 'Cidade' },
      { key: 'addressState', label: 'UF' },
      { key: 'addressPostalCode', label: 'CEP' },
      { key: 'notes', label: 'Observações' },
      { key: 'totalSpent', label: 'Total Gasto' },
      { key: 'purchases', label: 'Compras' },
      { key: 'createdAt', label: 'Data de Cadastro' },
    ];

    // Formata valores para exibição
    const formatValue = (item, key) => {
      const value = item[key];
      if (value == null || value === undefined) return '';
      if (key === 'totalSpent') {
        const num = typeof value === 'number' ? value : parseFloat(value) || 0;
        return num.toFixed(2).replace('.', ',');
      }
      if (key === 'purchases') {
        return typeof value === 'number' ? value.toString() : String(value);
      }
      if (key === 'birthDate' || key === 'createdAt') {
        if (!value) return '';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('pt-BR');
      }
      return String(value);
    };

    if (format === 'csv' || format === 'excel') {
      const csv = toCSV(allData, columns);
      const filename = generateExportFilename('clientes', format === 'excel' ? 'xlsx' : 'csv');
      const contentType = format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'text/csv; charset=utf-8';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else if (format === 'pdf') {
      if (!PDFDocument) {
        const err = new Error('Exportação PDF não disponível. Biblioteca pdfkit não instalada.');
        err.status = 501;
        err.code = 'PDF_NOT_AVAILABLE';
        return next(err);
      }

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));

      // Cabeçalho
      doc.fontSize(18).text('Lista de Clientes', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
      doc.moveDown();

      // Dados dos clientes
      doc.fontSize(10);
      let yPosition = doc.y;
      const pageHeight = doc.page.height;
      const margin = doc.page.margins;

      allData.forEach((item, index) => {
        // Verifica se precisa de nova página
        if (yPosition > pageHeight - 150) {
          doc.addPage();
          yPosition = margin.top;
        }

        doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${formatValue(item, 'name') || 'Sem nome'}`, margin.left, yPosition);
        yPosition += 18;
        
        doc.fontSize(10).font('Helvetica');
        
        const tradeName = formatValue(item, 'tradeName');
        if (tradeName) {
          doc.text(`Nome Fantasia: ${tradeName}`, margin.left, yPosition);
          yPosition += 15;
        }
        
        doc.text(`E-mail: ${formatValue(item, 'email') || '-'}`, margin.left, yPosition);
        yPosition += 15;
        
        doc.text(`Telefone: ${formatValue(item, 'phone') || '-'}`, margin.left, yPosition);
        yPosition += 15;
        
        const cpf = formatValue(item, 'cpf');
        const cnpj = formatValue(item, 'cnpj');
        if (cpf) {
          doc.text(`CPF: ${cpf}`, margin.left, yPosition);
          yPosition += 15;
        }
        if (cnpj) {
          doc.text(`CNPJ: ${cnpj}`, margin.left, yPosition);
          yPosition += 15;
        }
        
        const birthDate = formatValue(item, 'birthDate');
        if (birthDate) {
          doc.text(`Data de Nascimento: ${birthDate}`, margin.left, yPosition);
          yPosition += 15;
        }
        
        const addressParts = [];
        if (formatValue(item, 'addressStreet')) addressParts.push(formatValue(item, 'addressStreet'));
        if (formatValue(item, 'addressNumber')) addressParts.push(`Nº ${formatValue(item, 'addressNumber')}`);
        const addressComplement = formatValue(item, 'addressComplement');
        if (addressComplement) addressParts.push(addressComplement);
        if (formatValue(item, 'addressNeighborhood')) addressParts.push(formatValue(item, 'addressNeighborhood'));
        if (formatValue(item, 'addressCity')) addressParts.push(formatValue(item, 'addressCity'));
        if (formatValue(item, 'addressState')) addressParts.push(formatValue(item, 'addressState'));
        if (formatValue(item, 'addressPostalCode')) addressParts.push(`CEP: ${formatValue(item, 'addressPostalCode')}`);
        
        if (addressParts.length > 0) {
          doc.text(`Endereço: ${addressParts.join(', ')}`, margin.left, yPosition);
          yPosition += 15;
        }
        
        const notes = formatValue(item, 'notes');
        if (notes) {
          doc.text(`Observações: ${notes}`, margin.left, yPosition);
          yPosition += 15;
        }
        
        const totalSpent = formatValue(item, 'totalSpent');
        const purchases = formatValue(item, 'purchases');
        if (totalSpent || purchases) {
          doc.text(`Total Gasto: R$ ${totalSpent || '0,00'} | Compras: ${purchases || '0'}`, margin.left, yPosition);
          yPosition += 15;
        }
        
        const createdAt = formatValue(item, 'createdAt');
        if (createdAt) {
          doc.text(`Cliente desde: ${createdAt}`, margin.left, yPosition);
          yPosition += 15;
        }

        yPosition += 10; // Espaço entre clientes
        doc.moveTo(margin.left, yPosition).lineTo(doc.page.width - margin.right, yPosition).stroke();
        yPosition += 15;
      });

      doc.end();

      await new Promise((resolve, reject) => {
        doc.on('end', () => {
          const filename = generateExportFilename('clientes', 'pdf');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(Buffer.concat(chunks));
          resolve();
        });
        doc.on('error', (err) => {
          reject(err);
        });
      });
      return;
    } else if (format === 'json') {
      const filename = generateExportFilename('clientes', 'json');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(allData);
    } else {
      const err = new Error('Formato de exportação não suportado. Use CSV, Excel, PDF ou JSON.');
      err.status = 400;
      err.code = 'UNSUPPORTED_EXPORT_FORMAT';
      return next(err);
    }
  } catch (e) {
    next(e);
  }
}

/**
 * Exporta produtos
 */
async function exportProducts(req, res, next) {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    
    const pagination = parsePagination({ page: 1, limit: 1000 }, { defaultLimit: 1000, maxLimit: 10000 });
    let allData = await productsService.getAll(req.user, pagination);
    
    if (allData && allData.pagination && allData.pagination.totalPages > 1) {
      const fetchPage = async (page) => {
        const pagePagination = parsePagination({ page, limit: 1000 }, { defaultLimit: 1000, maxLimit: 10000 });
        return await productsService.getAll(req.user, pagePagination);
      };
      const allItems = await getAllPagesForExport(allData, null, fetchPage);
      allData = allItems;
    } else {
      allData = allData.items || allData;
    }

    if (!Array.isArray(allData) || allData.length === 0) {
      const err = new Error('Nenhum dado encontrado para exportação');
      err.status = 404;
      err.code = 'NO_DATA_TO_EXPORT';
      return next(err);
    }

    const columns = [
      { key: 'name', label: 'Nome' },
      { key: 'description', label: 'Descrição' },
      { key: 'price', label: 'Preço de Venda' },
      { key: 'purchasePrice', label: 'Preço de Compra' },
      { key: 'productType', label: 'Tipo' },
      { key: 'stock', label: 'Estoque' },
      { key: 'createdAt', label: 'Data de Cadastro' },
    ];

    if (format === 'csv') {
      const csv = toCSV(allData, columns);
      const filename = generateExportFilename('produtos', 'csv');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else if (format === 'json') {
      const filename = generateExportFilename('produtos', 'json');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(allData);
    } else {
      const err = new Error('Formato de exportação não suportado. Use CSV ou JSON.');
      err.status = 400;
      err.code = 'UNSUPPORTED_EXPORT_FORMAT';
      return next(err);
    }
  } catch (e) {
    next(e);
  }
}

/**
 * Exporta vendas
 */
async function exportSales(req, res, next) {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    
    const pagination = parsePagination({ page: 1, limit: 1000 }, { defaultLimit: 1000, maxLimit: 10000 });
    let allData = await salesService.getAll(req.user, pagination);
    
    if (allData && allData.pagination && allData.pagination.totalPages > 1) {
      const fetchPage = async (page) => {
        const pagePagination = parsePagination({ page, limit: 1000 }, { defaultLimit: 1000, maxLimit: 10000 });
        return await salesService.getAll(req.user, pagePagination);
      };
      const allItems = await getAllPagesForExport(allData, null, fetchPage);
      allData = allItems;
    } else {
      allData = allData.items || allData;
    }

    if (!Array.isArray(allData) || allData.length === 0) {
      const err = new Error('Nenhum dado encontrado para exportação');
      err.status = 404;
      err.code = 'NO_DATA_TO_EXPORT';
      return next(err);
    }

    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'customerId', label: 'ID Cliente' },
      { key: 'date', label: 'Data' },
      { key: 'total', label: 'Total' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Data de Criação' },
    ];

    if (format === 'csv') {
      const csv = toCSV(allData, columns);
      const filename = generateExportFilename('vendas', 'csv');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else if (format === 'json') {
      const filename = generateExportFilename('vendas', 'json');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(allData);
    } else {
      const err = new Error('Formato de exportação não suportado. Use CSV ou JSON.');
      err.status = 400;
      err.code = 'UNSUPPORTED_EXPORT_FORMAT';
      return next(err);
    }
  } catch (e) {
    next(e);
  }
}

module.exports = {
  exportCustomers,
  exportProducts,
  exportSales,
};
