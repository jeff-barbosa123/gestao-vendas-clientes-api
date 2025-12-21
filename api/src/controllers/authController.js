const authService = require("../services/authService");

module.exports = {
  login: (req, res) => {
    try {
      const { token, refreshToken, user, exp, jti, refreshJti } = authService.login(req.body.email, req.body.password);
      return res.status(200).json({ token, refreshToken, user, exp, jti, refreshJti });
    } catch (err) {
      const status = err.status || 500;
      const message = err.message || "Erro interno";
      return res.status(status).json({ error: message, message });
    }
  },

  refresh: (req, res) => {
    try {
      const { token, refreshToken, user, exp, jti, refreshJti } = authService.refresh(req.body.refreshToken);
      return res.status(200).json({ token, refreshToken, user, exp, jti, refreshJti });
    } catch (err) {
      const status = err.status || 401;
      const message = err.message || "Refresh token inválido";
      return res.status(status).json({ error: message, message });
    }
  },

  logout: (req, res) => {
    if (req.auth && req.auth.jti) {
      authService.logout(req.auth.jti);
    }
    return res.status(204).end();
  },

  register: (req, res) => {
    try {
      const user = authService.registerUser(req.body);
      return res.status(201).json({ message: "Usuário criado com sucesso", user });
    } catch (err) {
      const status = err.status || 400;
      const message = err.message || "Erro ao registrar usuário";
      return res.status(status).json({ error: message });
    }
  },

  me: (req, res) => {
    const user = authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, statusUsuario: user.statusUsuario, dataUltimoLogin: user.dataUltimoLogin, tentativasFalha: user.tentativasFalha } });
  },

  validate: (_req, res) => {
    return res.status(200).json({ valid: true });
  },
};
