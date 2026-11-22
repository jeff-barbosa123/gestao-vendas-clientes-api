// Resolve a empresa (tenant), o papel e as permissoes do usuario autenticado.
// Funciona junto de authenticate/authenticateStrict: o index.js marca a rota com req.tenantGate (gate)
// e, depois de validar o token, os middlewares de auth chamam tenantPostAuth.
// Nas rotas "de negocio", req.user.id passa a ser o ID da EMPRESA (owner_id), entao os controllers
// continuam funcionando sem mudanca; req.user.userId e o usuario real.
const permissions = require('../services/permissions');
const team = require('../db/repositories/team');

function forbid(res, code, message) {
  return res.status(403).json({ success: false, code, message, error: message });
}

// gate(resolve): resolve(req) -> { perm?, module? } exigidos para a requisicao.
function gate(resolve) {
  return (req, _res, next) => {
    req.tenantGate = resolve;
    next();
  };
}

// Atalho: leitura (GET/HEAD) x escrita (demais metodos).
function rw(readPerm, writePerm, module) {
  return (req) => ({
    perm: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? readPerm : writePerm,
    module,
  });
}

async function loadContext(userId) {
  if (!process.env.DATABASE_URL) return { ownerId: userId, role: 'owner', modules: {} };
  return team.getTenantContext(userId);
}

// Retorna true se a requisicao pode seguir; caso contrario ja respondeu.
async function tenantPostAuth(req, res) {
  const resolve = req.tenantGate;
  if (!resolve) return true;
  const realId = req.user.id;
  let ctx;
  try {
    ctx = await loadContext(realId);
  } catch (_err) {
    res.status(503).json({ success: false, code: 'TENANT_UNAVAILABLE', message: 'Serviço indisponível. Tente novamente.' });
    return false;
  }
  req.tenant = { ownerId: ctx.ownerId, role: ctx.role, modules: permissions.resolveModules(ctx.modules) };
  req.user = { id: ctx.ownerId, email: req.user.email, userId: realId, role: ctx.role };

  const need = resolve(req) || {};
  if (need.module && req.tenant.modules[need.module] === false) {
    forbid(res, 'MODULE_DISABLED', 'Este recurso está desativado para a sua empresa.');
    return false;
  }
  if (need.perm && !permissions.can(ctx.role, need.perm)) {
    forbid(res, 'FORBIDDEN_ROLE', 'Seu perfil não tem permissão para esta ação.');
    return false;
  }
  const sanitize = permissions.sanitizerFor(ctx.role);
  if (sanitize) {
    const original = res.json.bind(res);
    res.json = (body) => original(sanitize(body));
  }
  return true;
}

module.exports = { gate, rw, tenantPostAuth };
