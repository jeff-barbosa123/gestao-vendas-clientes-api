const authService = require("../services/authService"); 

module.exports = {
  login: async (req, res, next) => {
    try {
      const { token, refreshToken, user, exp, jti, refreshJti } = await authService.login(
        req.body.email,
        req.body.password
      );
      return res.status(200).json({ token, refreshToken, user, exp, jti, refreshJti });
    } catch (err) {
      // Passa erro para o errorHandler centralizado
      return next(err);
    }
  },

  refresh: async (req, res, next) => {
    try {
      const { token, refreshToken, user, exp, jti, refreshJti } = await authService.refresh(
        req.body.refreshToken
      );
      return res.status(200).json({ token, refreshToken, user, exp, jti, refreshJti });
    } catch (err) {
      // Passa erro para o errorHandler centralizado
      return next(err);
    }
  },

  logout: (req, res) => {
    if (req.auth && req.auth.jti) {
      authService.logout(req.auth.jti);
    }
    return res.status(204).end();
  },

  register: async (req, res, next) => {
    try {
      const user = await authService.registerUser(req.body);
      return res.status(201).json({ message: "Usuário criado com sucesso", user });
    } catch (err) {
      // Passa erro para o errorHandler centralizado
      return next(err);
    }
  },

  me: async (req, res, next) => {
    try {
      const user = await authService.getUserById(req.user.id);
      if (!user) {
        const err = new Error("Usuário não encontrado");
        err.status = 404;
        err.code = "NOT_FOUND";
        return next(err);
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
    } catch (err) {
      return next(err);
    }
  },

  updateProfile: async (req, res, next) => {
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
      // Passa erro para o errorHandler centralizado
      return next(err);
    }
  },

  validate: (_req, res) => {
    return res.status(200).json({ valid: true });
  },

  forgot: async (req, res, next) => {
    try {
      const email = req.body?.email;
      console.log('[AUTH] 📨 Solicitação de recuperação de senha para:', email);
      
      const result = await authService.forgotPassword(email);
      console.log('[AUTH] 📋 Resultado do forgotPassword:', {
        sent: result?.sent,
        hasResetLink: !!result?.resetLink,
        hasPreviewUrl: !!result?.previewUrl,
        hasToken: !!result?.token,
      });
      
      // Se usuário não existe, retorna mensagem genérica (segurança)
      if (!result || (result.sent === false && !result.resetLink && !result.previewUrl)) {
        console.log('[AUTH] ℹ️ Usuário não encontrado ou email não enviado (sem resetLink/previewUrl)');
        return res.status(200).json({ 
          message: "Se o e-mail estiver cadastrado, enviaremos instruções." 
        });
      }
      
      // Se email foi enviado via Ethereal (tem previewUrl), retorna o preview
      if (result.previewUrl && result.resetLink) {
        console.log('[AUTH] ✅ Retornando resposta com Ethereal preview');
        return res.status(200).json({ 
          message: "Email enviado via Ethereal Email! Use os links abaixo para visualizar o email e redefinir a senha (Desenvolvimento):",
          resetLink: result.resetLink,
          previewUrl: result.previewUrl,
          token: result.token,
          devMode: true,
          etherealMode: true
        });
      }
      
      // Se email foi enviado via SMTP configurado (produção)
      if (result.sent && !result.previewUrl) {
        console.log('[AUTH] ✅ Email enviado via SMTP (produção)');
        return res.status(200).json({ 
          message: "Se o e-mail estiver cadastrado, enviaremos instruções." 
        });
      }
      
      // Se SMTP não está configurado e estamos em desenvolvimento, retorna o link
      if (process.env.NODE_ENV !== 'production' && result && !result.sent && result.resetLink) {
        console.log('[AUTH] ⚠️ SMTP não configurado, retornando link em modo desenvolvimento');
        return res.status(200).json({ 
          message: "SMTP não configurado. Use o link abaixo para redefinir a senha (modo desenvolvimento):",
          resetLink: result.resetLink,
          token: result.token,
          devMode: true
        });
      }
      
      // Email foi enviado com sucesso (SMTP configurado)
      console.log('[AUTH] ✅ Retornando mensagem genérica de sucesso');
      return res.status(200).json({ 
        message: "Se o e-mail estiver cadastrado, enviaremos instruções." 
      });
    } catch (err) {
      console.error('[AUTH] ❌ Erro no controller forgot:', err.message);
      console.error('[AUTH] ❌ Stack trace:', err.stack);
      // Passa erro para o errorHandler centralizado
      return next(err);
    }
  },

  reset: async (req, res, next) => {
    try {
      const { token, password } = req.body || {};
      await authService.resetPassword(token, password);
      return res.status(200).json({ message: "Senha atualizada com sucesso." });
    } catch (err) {
      // Passa erro para o errorHandler centralizado
      return next(err);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      return res.status(200).json({ message: "Senha atualizada com sucesso." });
    } catch (err) {
      // Passa erro para o errorHandler centralizado
      return next(err);
    }
  },
};
