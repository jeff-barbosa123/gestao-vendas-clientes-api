const brandingService = require("../services/brandingService");

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
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.status(200).send(css);
    } catch (err) {
      next(err);
    }
  },
};