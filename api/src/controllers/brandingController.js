const crypto = require("crypto");
const brandingService = require("../services/brandingService");

// If-None-Match: lista de ETags (fortes ou fracos "W/") ou "*"
function etagMatches(header, etag) {
  if (!header) return false;
  if (header.trim() === "*") return true;
  return header.split(",").some((t) => t.trim().replace(/^W\//, "") === etag);
}

function fail(res, err) {
  if (!err.status) return null;
  const body = { success: false, code: err.code || "BAD_REQUEST", message: err.message, error: err.message };
  if (err.details) body.details = err.details;
  return res.status(err.status).json(body);
}

function wrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (fail(res, err)) return undefined;
      return next(err);
    }
    return undefined;
  };
}

module.exports = {
  get: wrap(async (req, res) => res.status(200).json(await brandingService.getBranding(req.user.id))),
  save: wrap(async (req, res) => res.status(200).json(await brandingService.saveBranding(req.user.id, req.body))),
  reset: wrap(async (req, res) => res.status(200).json(await brandingService.resetBranding(req.user.id))),
  uploadLogo: wrap(async (req, res) => res.status(200).json(await brandingService.uploadLogo(req.user.id, req.body))),
  removeLogo: wrap(async (req, res) => res.status(200).json(await brandingService.removeLogo(req.user.id))),

  logo: wrap(async (req, res) => {
    const logo = await brandingService.getLogo(req.user.id);
    if (!logo) {
      return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Logo nao cadastrado", error: "Logo nao cadastrado" });
    }
    res.setHeader("Content-Type", logo.logo_mime);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    return res.status(200).send(logo.logo_data);
  }),

  // Publico por design: sem sessao devolve o tema padrao (a tela de login usa o mesmo link).
  themeCss: async (req, res, next) => {
    try {
      const css = await brandingService.getThemeCss(req.user ? req.user.id : null);
      // ETag forte pelo conteudo: o navegador revalida a cada pagina (If-None-Match) e recebe 304 sem corpo
      // enquanto a paleta nao muda; ao salvar/remover a marca o hash muda e o tema novo vem na proxima carga.
      // "private" + Vary: o CSS depende da sessao (empresa logada), nunca pode ser reutilizado por cache compartilhado.
      const etag = `"${crypto.createHash("sha1").update(css).digest("hex")}"`;
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      res.setHeader("Cache-Control", "private, no-cache");
      res.setHeader("Vary", "Cookie, Authorization");
      res.setHeader("ETag", etag);
      if (etagMatches(req.headers["if-none-match"], etag)) return res.status(304).end();
      res.status(200).send(css);
    } catch (err) {
      next(err);
    }
  },
};