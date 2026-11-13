// Fachada do serviço de autenticação: a implementação fica em services/auth/*.
// O config precisa ser carregado primeiro: ele valida os segredos JWT em produção no carregamento.
require("./auth/config");
const { MESSAGES } = require("./auth/messages");
const { getUserById } = require("./auth/userLookup");
const { login, logout, refresh } = require("./auth/sessionFlow");
const { registerUser, forgotPassword, resetPassword, changePassword, verifyEmail, updateProfile } = require("./auth/accountFlow");

module.exports = {
  login,
  refresh,
  logout,
  registerUser,
  getUserById,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  updateProfile,
  MESSAGES,
};
