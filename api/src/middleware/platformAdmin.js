// Administrador da plataforma (operador do SGVC), diferente do "Dono" de uma empresa.
// Producao: lista explicita em PLATFORM_ADMIN_EMAILS (separada por virgula). Sem a variavel, ninguem tem acesso.
// Fora de producao: o admin do seed (ADMIN_EMAIL ou admin@negocio.com) para facilitar desenvolvimento e testes.
function adminEmails() {
  const configured = String(process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length) return configured;
  if (process.env.NODE_ENV === "production") return [];
  return [String(process.env.ADMIN_EMAIL || "admin@negocio.com").toLowerCase()];
}

function isPlatformAdmin(email) {
  return Boolean(email) && adminEmails().includes(String(email).toLowerCase());
}

function requirePlatformAdmin(req, res, next) {
  if (req.user && isPlatformAdmin(req.user.email)) return next();
  return res.status(403).json({
    success: false,
    code: "FORBIDDEN",
    message: "Acesso restrito ao administrador da plataforma",
    error: "Acesso restrito ao administrador da plataforma",
  });
}

module.exports = { isPlatformAdmin, requirePlatformAdmin };
