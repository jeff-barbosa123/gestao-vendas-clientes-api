/**
 * Utilitario compartilhado de planilhas (CSV e XLSX) para exportacao, modelo e importacao.
 *
 * - CSV: UTF-8 com BOM e separador ";" (abre direto no Excel pt-BR). Na leitura aceita ";", "," ou TAB.
 * - XLSX: gerado/lido com exceljs.
 * - Nao conhece nenhuma entidade: cada cadastro descreve suas colunas e quem chama cuida de
 *   permissoes e de filtrar por empresa (req.user.id e o dono do tenant).
 *
 * Coluna: { key, label, type?: 'text'|'int'|'number'|'money'|'date'|'datetime', required?, aliases?, example?, note?,
 *           width?, get?(row) }
 */
const ExcelJS = require('exceljs');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIME = 'text/csv; charset=utf-8';
const CSV_DELIMITER = ';';
const MAX_IMPORT_ROWS = 2000;
const MAX_REPORTED_ERRORS = 100;

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// ---------- formatos ----------
function normalizeFormat(value, fallback = 'csv') {
  const f = String(value || fallback).trim().toLowerCase();
  if (f === 'csv') return 'csv';
  if (f === 'xlsx' || f === 'excel') return 'xlsx';
  throw httpError(400, 'INVALID_EXPORT_FORMAT', 'Formato inválido. Use CSV ou Excel (XLSX).');
}

function formatInfo(format) {
  return format === 'xlsx' ? { ext: 'xlsx', mime: XLSX_MIME } : { ext: 'csv', mime: CSV_MIME };
}

function stampName(prefix, ext) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${prefix}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}

// ---------- valores ----------
function isDate(v) {
  return v instanceof Date && !Number.isNaN(v.getTime());
}

// Texto que o Excel interpretaria como formula: prefixa com apostrofo (CSV/XLSX injection).
function safeText(text) {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDateBr(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatDateTimeBr(d) {
  return `${formatDateBr(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Componentes de data/hora de um valor. Datas "so dia" (YYYY-MM-DD ou meia-noite UTC) nao mudam de dia por fuso.
function dateParts(v, type) {
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]00:00:00(?:\.0+)?Z?)?$/);
    if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), h: 0, mi: 0 };
  }
  const d = isDate(v) ? v : new Date(v);
  if (!isDate(d)) return null;
  const utcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  if (type === 'date' && utcMidnight) return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: 0, mi: 0 };
  return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
}

function rawValue(col, row) {
  return typeof col.get === 'function' ? col.get(row) : row ? row[col.key] : undefined;
}

// Valor "tipado" para o XLSX (numeros e datas reais).
function xlsxValue(col, row) {
  const v = rawValue(col, row);
  if (v === null || v === undefined || v === '') return null;
  const type = col.type || 'text';
  if (type === 'int' || type === 'number' || type === 'money') {
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : safeText(String(v));
  }
  if (type === 'date' || type === 'datetime') {
    const p = dateParts(v, type);
    // exceljs grava datas em UTC: monta o instante UTC com o mesmo "relogio" para o Excel mostrar o valor certo
    return p ? new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi)) : safeText(String(v));
  }
  if (isDate(v)) return v;
  return safeText(String(v));
}

// Texto para o CSV (pt-BR: virgula decimal, datas dd/mm/aaaa).
function csvValue(col, row) {
  const v = rawValue(col, row);
  if (v === null || v === undefined || v === '') return '';
  const type = col.type || 'text';
  if (type === 'int') return Number.isFinite(Number(v)) ? String(Math.trunc(Number(v))) : String(v);
  if (type === 'number') return Number.isFinite(Number(v)) ? String(Number(v)).replace('.', ',') : String(v);
  if (type === 'money') return Number.isFinite(Number(v)) ? Number(v).toFixed(2).replace('.', ',') : String(v);
  if (type === 'date' || type === 'datetime') {
    const p = dateParts(v, type);
    if (!p) return safeText(String(v));
    const day = `${pad2(p.d)}/${pad2(p.mo)}/${p.y}`;
    return type === 'date' ? day : `${day} ${pad2(p.h)}:${pad2(p.mi)}`;
  }
  if (isDate(v)) return formatDateBr(v);
  return safeText(String(v));
}

function csvEscape(text) {
  const s = String(text);
  return /[";\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------- gerar ----------
function buildCsv(columns, rows) {
  const lines = [columns.map((c) => csvEscape(c.label || c.key)).join(CSV_DELIMITER)];
  (rows || []).forEach((row) => {
    lines.push(columns.map((c) => csvEscape(csvValue(c, row))).join(CSV_DELIMITER));
  });
  return Buffer.from(`\ufeff${lines.join('\r\n')}\r\n`, 'utf8');
}

const NUM_FORMATS = { int: '0', number: '#,##0.00#', money: '#,##0.00', date: 'dd/mm/yyyy', datetime: 'dd/mm/yyyy hh:mm' };

function addTable(sheet, columns, rows) {
  sheet.columns = columns.map((c) => ({
    header: c.label || c.key,
    key: c.key,
    width: c.width || Math.max(12, Math.min(42, String(c.label || c.key).length + 4)),
    style: NUM_FORMATS[c.type] ? { numFmt: NUM_FORMATS[c.type] } : {},
  }));
  (rows || []).forEach((row) => {
    const obj = {};
    columns.forEach((c) => { obj[c.key] = xlsxValue(c, row); });
    sheet.addRow(obj);
  });
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

async function buildXlsx(columns, rows, { sheetName = 'Dados', instructions } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SGVC';
  wb.created = new Date();
  addTable(wb.addWorksheet(String(sheetName).slice(0, 31)), columns, rows);
  if (instructions && instructions.length) {
    const info = wb.addWorksheet('Instruções');
    info.columns = [{ header: 'Coluna', key: 'a', width: 28 }, { header: 'Obrigatória', key: 'b', width: 14 }, { header: 'Observação', key: 'c', width: 70 }];
    instructions.forEach((i) => info.addRow(i));
    info.getRow(1).font = { bold: true };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function buildTable(format, columns, rows, opts = {}) {
  return format === 'xlsx' ? buildXlsx(columns, rows, opts) : buildCsv(columns, rows);
}

function sendFile(res, { buffer, filename, mime }) {
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}

// Exporta uma tabela (mesmo vazia: so com o cabecalho).
async function sendTable(res, { format, baseName, columns, rows, sheetName }) {
  const f = normalizeFormat(format);
  const info = formatInfo(f);
  const buffer = await buildTable(f, columns, rows, { sheetName: sheetName || baseName });
  sendFile(res, { buffer, filename: stampName(baseName, info.ext), mime: info.mime });
}

// Modelo para importacao: cabecalho + linha de exemplo (+ aba de instrucoes no XLSX).
async function sendTemplate(res, { format, baseName, columns }) {
  const f = normalizeFormat(format);
  const info = formatInfo(f);
  const example = {};
  columns.forEach((c) => { if (c.example !== undefined) example[c.key] = c.example; });
  const importable = columns.filter((c) => !c.exportOnly);
  const instructions = importable.map((c) => [c.label || c.key, c.required ? 'Sim' : 'Não', c.note || '']);
  const buffer = await buildTable(f, importable, [example], { sheetName: baseName, instructions });
  sendFile(res, { buffer, filename: `modelo_${baseName}.${info.ext}`, mime: info.mime });
}

// ---------- ler ----------
function decodeText(buffer) {
  let text = buffer.toString('utf8');
  if (text.includes('\ufffd')) text = buffer.toString('latin1'); // CSV salvo em ANSI (Excel antigo)
  return text.replace(/^\ufeff/, '');
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  let best = CSV_DELIMITER;
  let bestCount = -1;
  [';', ',', '\t'].forEach((d) => {
    const n = firstLine.split(d).length - 1;
    if (n > bestCount) { best = d; bestCount = n; }
  });
  return best;
}

function parseCsvText(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === '') inQuotes = true;
    else if (ch === delimiter) pushField();
    else if (ch === '\n') pushRow();
    else if (ch === '\r') { if (text[i + 1] === '\n') i += 1; pushRow(); } else field += ch;
  }
  if (field !== '' || row.length) pushRow();
  return rows;
}

function cellToPrimitive(v) {
  if (v === null || v === undefined) return '';
  if (isDate(v) || typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((p) => p.text).join('');
    if (v.result !== undefined) return cellToPrimitive(v.result);
    if (v.text !== undefined) return cellToPrimitive(v.text);
    if (v.error) return '';
  }
  return String(v);
}

function isXlsx(buffer) {
  return buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

// Le CSV ou XLSX (detectado pelo conteudo) e devolve a matriz crua: [[celulas da linha 1], ...].
async function readMatrix(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw httpError(422, 'EMPTY_FILE', 'O arquivo está vazio.');
  if (isXlsx(buffer)) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer);
    } catch (_err) {
      throw httpError(422, 'INVALID_FILE', 'Não foi possível ler o Excel. Envie um arquivo .xlsx válido ou use o modelo.');
    }
    const ws = wb.worksheets[0];
    if (!ws) throw httpError(422, 'EMPTY_FILE', 'A planilha não tem abas.');
    const matrix = [];
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const cells = [];
      for (let c = 1; c <= ws.columnCount; c += 1) cells.push(cellToPrimitive(row.getCell(c).value));
      matrix[n - 1] = cells;
    });
    return Array.from(matrix, (r) => r || []);
  }
  return parseCsvText(decodeText(buffer));
}

function norm(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isBlankRow(cells) {
  return cells.every((c) => c === '' || c === null || c === undefined || (typeof c === 'string' && c.trim() === ''));
}

// Mapeia as linhas para objetos por coluna (rotulo, chave ou alias, sem acento/caixa).
async function readTable(buffer, columns) {
  const matrix = await readMatrix(buffer);
  const headerIndex = matrix.findIndex((r) => r && !isBlankRow(r));
  if (headerIndex < 0) throw httpError(422, 'EMPTY_FILE', 'O arquivo está vazio.');
  const headers = matrix[headerIndex].map(norm);
  const indexByKey = {};
  columns.forEach((c) => {
    const names = [c.label, c.key, ...(c.aliases || [])].map(norm);
    const idx = headers.findIndex((h) => h && names.includes(h));
    if (idx >= 0) indexByKey[c.key] = idx;
  });
  const missing = columns.filter((c) => c.required && !(c.key in indexByKey)).map((c) => c.label || c.key);
  if (missing.length) {
    throw httpError(422, 'MISSING_COLUMNS', `Colunas obrigatórias ausentes: ${missing.join(', ')}. Baixe o modelo para ver o formato esperado.`);
  }
  const rows = [];
  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const cells = matrix[i] || [];
    if (isBlankRow(cells)) continue;
    const values = {};
    Object.keys(indexByKey).forEach((key) => { values[key] = cells[indexByKey[key]]; });
    rows.push({ rowNumber: i + 1, values });
  }
  return rows;
}

// ---------- converter celulas ----------
function toText(v) {
  if (v === null || v === undefined) return null;
  if (isDate(v)) return formatDateBr(v);
  let s = String(v).trim();
  if (s === '') return null;
  if (/^'[=+\-@]/.test(s)) s = s.slice(1); // desfaz o prefixo de seguranca da exportacao
  return s;
}

function toNumber(v, label = 'Valor') {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`${label} inválido`);
    return v;
  }
  let s = String(v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (s === '') return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`${label} inválido: "${String(v).trim()}"`);
  return n;
}

// Retorna YYYY-MM-DD (aceita dd/mm/aaaa, aaaa-mm-dd e datas do Excel).
function toIsoDate(v, label = 'Data') {
  if (v === null || v === undefined || v === '') return null;
  if (isDate(v)) return `${v.getUTCFullYear()}-${pad2(v.getUTCMonth() + 1)}-${pad2(v.getUTCDate())}`;
  const s = String(v).trim();
  if (s === '') return null;
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  let y; let mo; let d;
  if (m) { [, d, mo, y] = m; } else {
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) throw new Error(`${label} inválida: "${s}" (use dd/mm/aaaa)`);
    [, y, mo, d] = m;
  }
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (dt.getUTCFullYear() !== Number(y) || dt.getUTCMonth() !== Number(mo) - 1 || dt.getUTCDate() !== Number(d)) {
    throw new Error(`${label} inválida: "${s}"`);
  }
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

function coerce(col, raw) {
  const label = col.label || col.key;
  const type = col.type || 'text';
  let value;
  if (type === 'int') {
    value = toNumber(raw, label);
    if (value !== null && !Number.isInteger(value)) throw new Error(`${label} deve ser um número inteiro`);
  } else if (type === 'number' || type === 'money') value = toNumber(raw, label);
  else if (type === 'date' || type === 'datetime') value = toIsoDate(raw, label);
  else value = toText(raw);
  if (col.required && (value === null || value === undefined)) throw new Error(`${label} é obrigatório`);
  return value;
}

/**
 * Importa linha a linha: uma linha com erro nao derruba o lote.
 * handler(values, rowNumber) cria o registro (deve lancar Error com mensagem amigavel se falhar).
 * Retorna { total, imported, failed, errors: [{ row, message }], errorsTruncated }.
 */
async function importRows({ buffer, columns, handler, maxRows = MAX_IMPORT_ROWS }) {
  const importable = columns.filter((c) => !c.exportOnly);
  const rows = await readTable(buffer, importable);
  if (rows.length === 0) throw httpError(422, 'EMPTY_FILE', 'Nenhuma linha de dados encontrada no arquivo.');
  if (rows.length > maxRows) throw httpError(422, 'TOO_MANY_ROWS', `O arquivo tem ${rows.length} linhas. O limite por importação é ${maxRows}; divida em arquivos menores.`);
  const result = { total: rows.length, imported: 0, failed: 0, errors: [], errorsTruncated: false };
  for (const { rowNumber, values } of rows) {
    try {
      const parsed = {};
      importable.forEach((c) => { parsed[c.key] = coerce(c, values[c.key]); });
      await handler(parsed, rowNumber);
      result.imported += 1;
    } catch (err) {
      result.failed += 1;
      if (result.errors.length < MAX_REPORTED_ERRORS) {
        const message = (err && err.message) || 'Erro ao importar a linha';
        result.errors.push({ row: rowNumber, message });
      } else result.errorsTruncated = true;
    }
  }
  return result;
}

// Decodifica o corpo { filename, contentBase64 } enviado pelo front.
function decodeUpload(body) {
  const b64 = body && typeof body.contentBase64 === 'string' ? body.contentBase64.replace(/^data:[^,]*,/, '') : '';
  if (!b64) throw httpError(400, 'FILE_REQUIRED', 'Selecione um arquivo .csv ou .xlsx para importar.');
  const name = String((body && body.filename) || '').toLowerCase();
  if (name && !/\.(csv|xlsx)$/.test(name)) throw httpError(415, 'UNSUPPORTED_FILE', 'Formato não suportado. Envie um arquivo .csv ou .xlsx.');
  return Buffer.from(b64, 'base64');
}

module.exports = {
  XLSX_MIME,
  CSV_MIME,
  CSV_DELIMITER,
  MAX_IMPORT_ROWS,
  normalizeFormat,
  buildCsv,
  buildXlsx,
  buildTable,
  sendTable,
  sendTemplate,
  parseCsvText,
  readMatrix,
  readTable,
  importRows,
  decodeUpload,
  toText,
  toNumber,
  toIsoDate,
  stampName,
};
