/**
 * Exportacao, modelo e importacao de planilhas (CSV/XLSX) para os cadastros.
 * Cada rota confere perfil (permissao) e modulo da empresa, e usa req.user (id da empresa)
 * para que so dados do proprio tenant sejam lidos ou criados.
 */
const permissions = require('../services/permissions');
const { ENTITIES } = require('../services/spreadsheetEntities');
const sheet = require('../utils/spreadsheet');

function fail(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function entityOf(name) {
  const entity = Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : null;
  if (!entity) throw fail(404, 'UNKNOWN_ENTITY', 'Cadastro não encontrado para exportação/importação.');
  return entity;
}

// Confere permissao e modulo ativo da empresa (o gate do mount so valida o basico).
function ensureAccess(req, perm, module) {
  const tenant = req.tenant || {};
  if (module && tenant.modules && tenant.modules[module] === false) {
    throw fail(403, 'MODULE_DISABLED', 'Este recurso está desativado para a sua empresa.');
  }
  if (perm && !permissions.can(tenant.role, perm)) {
    throw fail(403, 'FORBIDDEN_ROLE', 'Seu perfil não tem permissão para esta ação.');
  }
}

// Colunas que o perfil pode ver (ex.: custo exige cost:view).
function columnsFor(entity, req) {
  const role = req.tenant && req.tenant.role;
  return entity.columns.filter((c) => !c.perm || permissions.can(role, c.perm));
}

async function exportEntity(req, res, next) {
  try {
    const entity = entityOf(req.params.entity);
    ensureAccess(req, entity.exportPerm, entity.module);
    const format = sheet.normalizeFormat(req.query.format);
    const rows = await entity.rows(req.user, req.query || {});
    await sheet.sendTable(res, {
      format,
      baseName: entity.baseName,
      sheetName: entity.sheetName,
      columns: columnsFor(entity, req),
      rows,
    });
  } catch (err) {
    next(err);
  }
}

async function downloadTemplate(req, res, next) {
  try {
    const entity = entityOf(req.params.entity);
    if (!entity.create) throw fail(404, 'IMPORT_NOT_AVAILABLE', 'Este cadastro não aceita importação.');
    ensureAccess(req, entity.importPerm, entity.module);
    await sheet.sendTemplate(res, { format: req.query.format, baseName: entity.baseName, columns: columnsFor(entity, req) });
  } catch (err) {
    next(err);
  }
}

async function importEntity(req, res, next) {
  try {
    const entity = entityOf(req.params.entity);
    if (!entity.create) throw fail(404, 'IMPORT_NOT_AVAILABLE', 'Este cadastro não aceita importação.');
    ensureAccess(req, entity.importPerm, entity.module);
    const buffer = sheet.decodeUpload(req.body);
    const result = await sheet.importRows({
      buffer,
      columns: columnsFor(entity, req),
      handler: (values) => entity.create(req.user, values),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { exportEntity, downloadTemplate, importEntity };
