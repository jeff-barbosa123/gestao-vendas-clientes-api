const authService = require("../services/authService"); 

module.exports = {
  login: async (req, res) => {
    try {
      const { token, refreshToken, user, exp, jti, refreshJti } = await authService.login(
        req.body.email,
        req.body.password
      );
      return res.status(200).json({ token, refreshToken, user, exp, jti, refreshJti });
    } catch (err) {
      const status = err.status || 500;
      const message = err.message || "Erro interno";
      return res.status(status).json({ error: message, message });
    }
  },

  refresh: async (req, res) => {
    try {
      const { token, refreshToken, user, exp, jti, refreshJti } = await authService.refresh(
        req.body.refreshToken
      );
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

  register: async (req, res) => {
    try {
      const user = await authService.registerUser(req.body);
      return res.status(201).json({ message: "Usuário criado com sucesso", user });
    } catch (err) {
      const status = err.status || 400;
      const message = err.message || "Erro ao registrar usuário";
      return res.status(status).json({ error: message });
    }
  },

  me: async (req, res) => {
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        statusUsuario: user.status_usuario,
        dataUltimoLogin: user.data_ultimo_login,
        tentativasFalha: user.tentativas_falha,
      },
    });
  },

  updateProfile: async (req, res) => {
    try {
      const { name, email } = req.body || {};
      const user = await authService.updateProfile(req.user.id, name, email);
      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          statusUsuario: user.status_usuario,
          dataUltimoLogin: user.data_ultimo_login,
          tentativasFalha: user.tentativas_falha,
        },
      });
    } catch (err) {
      const status = err.status || 400;
      const message = err.message || "Erro ao atualizar perfil";
      return res.status(status).json({ error: message, message });
    }
  },

  validate: (_req, res) => {
    return res.status(200).json({ valid: true });
  },

  forgot: async (req, res) => {
    try {
      await authService.forgotPassword(req.body?.email);
      return res
        .status(200)
        .json({ message: "Se o e-mail estiver cadastrado, enviaremos instruções." });
    } catch (err) {
      const status = err.status || 400;
      const message = err.message || "Erro ao solicitar recuperação";
      return res.status(status).json({ error: message, message });
    }
  },

  reset: async (req, res) => {
    try {
      const { token, password } = req.body || {};
      await authService.resetPassword(token, password);
      return res.status(200).json({ message: "Senha atualizada com sucesso." });
    } catch (err) {
      const status = err.status || 400;
      const message = err.message || "Erro ao redefinir senha";
      return res.status(status).json({ error: message, message });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      return res.status(200).json({ message: "Senha atualizada com sucesso." });
    } catch (err) {
      const status = err.status || 400;
      const message = err.message || "Erro ao atualizar senha";
      return res.status(status).json({ error: message, message });
    }
  },
};
