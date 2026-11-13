require("./auth/config"); // valida os segredos JWT em producao no carregamento (precisa vir primeiro)
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const repo = require("../db/repository");
const emailService = require("./emailService");
const { hashPassword, comparePassword } = require("../utils/passwordHash");
const { JWT_TTL_SECONDS, JWT_SECRET, JWT_REFRESH_SECRET, JWT_REFRESH_TTL_SECONDS, JWT_REFRESH_PREVIOUS_SECRET, MAX_FAILED_ATTEMPTS, BLOCK_DURATION_MS, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, RESET_TOKEN_TTL_MINUTES, RESET_TOKEN_SECRET, WEB_BASE_URL, EMAIL_VERIFY_TOKEN_SECRET } = require("./auth/config");
const { MESSAGES } = require("./auth/messages");
const { getUserByEmail, getUserById } = require("./auth/userLookup");
const { validateEmail, validatePassword, validateCredentials } = require("./auth/validators");
const { computeStatus, clearAttempts, isBlocked, buildFailedLoginError } = require("./auth/lockout");
const { hashResetToken, hashEmailVerificationToken, buildResetLink, issueTokens } = require("./auth/tokens");
const { login, logout, refresh } = require("./auth/sessionFlow");

async function registerUser(data) {
  const { email, password, name } = data;
  
  // Validate email is provided
  const validatedEmail = validateEmail(email, false);
  
  // Validate and hash password
  const validatedPassword = validatePassword(password, true);
  const hashedPassword = await hashPassword(validatedPassword);
  
  // Check if user already exists
  const existingUser = await repo.getUserByEmail(validatedEmail);
  if (existingUser) {
    const err = new Error("Usu\u00e1rio j\u00e1 existe");
    err.status = 409;
    err.code = "EMAIL_ALREADY_EXISTS";
    throw err;
  }
  
  const newUser = await repo.createUser({
    id: uuidv4(),
    email: validatedEmail,
    password: hashedPassword,
    name,
    emailVerified: false,
    emailVerificationToken: null,
    statusUsuario: "ATIVO",
    dataUltimoLogin: null,
    tentativasFalha: 0,
  });

  // Gera token de confirmação e salva hash no banco
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyTokenHash = hashEmailVerificationToken(verifyToken);
  try {
    await repo.setEmailVerificationToken(newUser.id, verifyTokenHash);
  } catch (err) {
    console.warn('[AUTH] ⚠️ Não foi possível salvar token de verificação:', err.message);
  }

  // Emails: boas-vindas + confirmação (assíncrono, não bloqueia resposta)
  try {
    const fireAndForget = () => {
      Promise.allSettled([
        emailService.sendWelcomeEmail(newUser),
        emailService.sendEmailConfirmation(newUser, verifyToken),
      ]).then((results) => {
        const nomes = ['sendWelcomeEmail', 'sendEmailConfirmation'];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            console.log(`[AUTH] ✅ ${nomes[i]} resultado:`, JSON.stringify(r.value));
          } else {
            console.error(`[AUTH] ❌ ${nomes[i]} falhou:`, r.reason);
          }
        });
      });
    };
    if (typeof setImmediate === 'function') {
      setImmediate(fireAndForget);
    } else {
      setTimeout(fireAndForget, 0);
    }
  } catch (err) {                                                        // ← estava faltando isso
    console.warn('[AUTH] ⚠️ Falha ao agendar envio de emails:', err.message);
  }

  return {
    ...newUser,
    statusUsuario: newUser.status_usuario,
    dataUltimoLogin: newUser.data_ultimo_login,
    tentativasFalha: newUser.tentativas_falha,
  };
}

async function forgotPassword(rawEmail) {
  const email = validateEmail(rawEmail, false);
  const user = await getUserByEmail(email);
  if (!user) {
    return { sent: false };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  await repo.createPasswordReset(user.id, tokenHash, expiresAt);

  const resetLink = buildResetLink(token);
  try {
    const result = await emailService.sendPasswordReset(user, token);
    // Respeita o retorno do provedor de email
    if (result && result.sent) {
      return { sent: true };
    }
    // Se não enviado e estamos em dev, retorna link para facilitar testes
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] ⚠️ Email não enviado via provedor. Retornando link em modo desenvolvimento.');
      return { sent: false, resetLink, token };
    }
    return { sent: false };
  } catch (err) {
    console.warn('[AUTH] ⚠️ Falha ao enviar email de reset:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] 🔗 [DEV] Link de reset para ${user.email}: ${resetLink}`);
      return { sent: false, resetLink, token: token };
    }
    return { sent: false };
  }
}

async function resetPassword(token, rawPassword) {
  if (!token || typeof token !== "string") {
    const err = new Error(MESSAGES.resetTokenMissing);
    err.status = 400;
    throw err;
  }
  const password = validatePassword(rawPassword, true);
  const hashedPassword = await hashPassword(password);
  const tokenHash = hashResetToken(token);
  const record = await repo.getPasswordResetByTokenHash(tokenHash);

  if (!record || record.used_at) {
    const err = new Error(MESSAGES.resetTokenInvalid);
    err.status = 400;
    throw err;
  }

  const expiresAt = new Date(record.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    const err = new Error(MESSAGES.resetTokenInvalid);
    err.status = 400;
    throw err;
  }

  await repo.updateUserPassword(record.user_id, hashedPassword);
  await repo.markPasswordResetUsed(record.id);
  try {
    const user = await getUserById(record.user_id);
    if (user) await emailService.sendPasswordChanged(user);
  } catch (err) {
    console.warn('[AUTH] ⚠️ Falha ao enviar email de senha alterada (reset):', err.message);
  }
  return { ok: true };
}

async function changePassword(userId, rawCurrentPassword, rawNewPassword) {
  if (!userId) {
    const err = new Error("Usu\u00e1rio n\u00e3o encontrado");
    err.status = 404;
    throw err;
  }
  const currentPassword = validatePassword(rawCurrentPassword, false);
  const newPassword = validatePassword(rawNewPassword, true);
  
  if (currentPassword === newPassword) {
    const err = new Error(MESSAGES.passwordSame);
    err.status = 400;
    throw err;
  }
  
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("Usu\u00e1rio n\u00e3o encontrado");
    err.status = 404;
    throw err;
  }
  
  // Verify current password using bcrypt
  const currentPasswordMatches = await comparePassword(currentPassword, user.password);
  
  // Handle legacy plain text passwords during migration
  if (!currentPasswordMatches && user.password === currentPassword) {
    // Legacy match - proceed but upgrade both passwords
    const hashedNewPassword = await hashPassword(newPassword);
    await repo.updateUserPassword(userId, hashedNewPassword);
    return { ok: true };
  }
  
  if (!currentPasswordMatches) {
    const err = new Error(MESSAGES.currentPasswordInvalid);
    err.status = 400;
    throw err;
  }
  
  const hashedNewPassword = await hashPassword(newPassword);
  await repo.updateUserPassword(userId, hashedNewPassword);
  try {
    await emailService.sendPasswordChanged(user);
  } catch (err) {
    console.warn('[AUTH] ⚠️ Falha ao enviar email de senha alterada:', err.message);
  }
  return { ok: true };
}

async function verifyEmail(token) {
  if (!token || typeof token !== 'string') {
    const err = new Error('Token é obrigatório');
    err.status = 400;
    throw err;
  }
  const tokenHash = hashEmailVerificationToken(token);
  const user = await repo.verifyEmailByTokenHash(tokenHash);
  if (!user) {
    const err = new Error('Token inválido ou expirado');
    err.status = 400;
    throw err;
  }
  return { ok: true };
}

async function updateProfile(userId, rawName, rawEmail) {
  if (!userId) {
    const err = new Error("Usu\u00e1rio n\u00e3o encontrado");
    err.status = 404;
    throw err;
  }
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) {
    const err = new Error(MESSAGES.nameRequired);
    err.status = 400;
    throw err;
  }
  const email = validateEmail(rawEmail, false);
  const current = await getUserById(userId);
  if (!current) {
    const err = new Error("Usu\u00e1rio n\u00e3o encontrado");
    err.status = 404;
    throw err;
  }
  const existing = await getUserByEmail(email);
  if (existing && existing.id !== userId) {
    const err = new Error("E-mail ja esta em uso");
    err.status = 409;
    throw err;
  }
  return repo.updateUserProfile(userId, name, email);
}

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
