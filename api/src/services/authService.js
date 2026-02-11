const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const repo = require("../db/repository");
const emailService = require("./emailService");
const { getBlockDurationMs } = require("../utils/authConfig");
const { failedAttempts, tokenStore, refreshStore } = require("../models/db");
const { hashPassword, comparePassword } = require("../utils/passwordHash");

// Validate required environment variables
// Only enforce in production to allow development/testing
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret" || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a secure value (min 32 characters) in production. Cannot use default 'dev-secret'.");
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === "dev-refresh-secret" || process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be set to a secure value (min 32 characters) in production. Cannot use default 'dev-refresh-secret'.");
  }
}

const JWT_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS || 15 * 60); // 15 minutes
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_PREVIOUS_SECRET = process.env.JWT_PREVIOUS_SECRET;

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS || 24 * 60 * 60); // 24 hours
const JWT_REFRESH_PREVIOUS_SECRET = process.env.JWT_REFRESH_PREVIOUS_SECRET;

const MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 3);
const BLOCK_DURATION_MS = getBlockDurationMs();
const MIN_PASSWORD_LENGTH = Number(process.env.LOGIN_MIN_PASSWORD_LENGTH || 8);
const MAX_PASSWORD_LENGTH = Number(process.env.LOGIN_MAX_PASSWORD_LENGTH || 128);
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || JWT_SECRET;
const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:4000";

const MESSAGES = {
  invalidCredentials: "Credenciais inv\u00e1lidas",
  invalidEmail: "Formato de e-mail inv\u00e1lido",
  invalidPasswordType: "Formato de senha inv\u00e1lido",
  emailRequired: "E-mail \u00e9 obrigat\u00f3rio",
  passwordRequired: "Senha \u00e9 obrigat\u00f3ria",
  emailPasswordRequired: "E-mail e senha s\u00e3o obrigat\u00f3rios",
  passwordShort: "Senha muito curta. Mínimo 8 caracteres.",
  passwordLong: "Senha muito longa. Máximo 128 caracteres.",
  passwordWeak: "Senha muito fraca. Use pelo menos 8 caracteres incluindo letra maiúscula, minúscula, número e caractere especial.",
  blockedUser: "Usu\u00e1rio bloqueado",
  accessBlocked: "Acesso temporariamente bloqueado",
  refreshMissing: "Refresh token \u00e9 obrigat\u00f3rio",
  refreshInvalid: "Refresh token inv\u00e1lido ou revogado",
  resetTokenInvalid: "Token inv\u00e1lido ou expirado",
  resetTokenMissing: "Token \u00e9 obrigat\u00f3rio",
  currentPasswordInvalid: "Senha atual incorreta",
  passwordSame: "Nova senha deve ser diferente da atual",
  nameRequired: "Nome \u00e9 obrigat\u00f3rio",
};

function sanitizeEmail(email) {
  if (typeof email !== "string") return email;
  return email.trim().toLowerCase();
}

function sanitizePassword(password) {
  if (typeof password !== "string") return password;
  return password.trim();
}

async function getUserByEmail(email) {
  return repo.getUserByEmail(email);
}

async function getUserById(id) {
  return repo.getUserById(id);
}

function normalizeEmailKey(email) {
  return String(email || "").toLowerCase();
}

function getAttempt(email) {
  const key = normalizeEmailKey(email);
  return failedAttempts.get(key);
}

function setAttempt(email, value) {
  const key = normalizeEmailKey(email);
  failedAttempts.set(key, value);
}

function computeStatus(user, blockedUntil) {
  if (!user) return "ATIVO";
  if (user.blocked) return "BLOQUEADO";
  const blockedNow = blockedUntil && Date.now() < blockedUntil;
  return blockedNow ? "BLOQUEADO" : "ATIVO";
}

async function clearAttempts(email) {
  const key = normalizeEmailKey(email);
  failedAttempts.delete(key);
  
  // Tenta atualizar no banco, mas não falha se banco não estiver disponível
  try {
    const user = await getUserByEmail(email);
    if (user) {
      const statusUsuario = computeStatus(user, null);
      await repo.updateUserLogin(user.id, user.data_ultimo_login, 0, statusUsuario);
    }
  } catch (dbError) {
    // Se banco não disponível, apenas limpa em memória (para desenvolvimento)
    console.warn('Aviso: Não foi possível limpar tentativas no banco:', dbError.message);
  }
}

function isBlocked(email) {
  const entry = getAttempt(email);
  return entry && entry.blockedUntil && Date.now() < entry.blockedUntil;
}

async function recordFailedAttempt(email) {
  const key = normalizeEmailKey(email);
  let entry = getAttempt(key) || { count: 0, blockedUntil: null };

  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    entry = { count: 0, blockedUntil: null };
  }

  entry.count += 1;

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }

  setAttempt(key, entry);
  
  // Tenta atualizar no banco, mas não falha se banco não estiver disponível
  try {
    const user = await getUserByEmail(email);
    if (user) {
      const statusUsuario = computeStatus(user, entry.blockedUntil);
      await repo.updateUserLogin(user.id, user.data_ultimo_login, entry.count, statusUsuario);
    }
  } catch (dbError) {
    // Se banco não disponível, apenas registra em memória (para desenvolvimento)
    console.warn('Aviso: Não foi possível atualizar tentativas no banco:', dbError.message);
  }
  
  return entry;
}

function validateEmail(rawEmail, passwordProvided) {
  if (rawEmail === undefined && !passwordProvided) {
    const err = new Error(MESSAGES.emailPasswordRequired);
    err.status = 400;
    throw err;
  }
  if (rawEmail === undefined || rawEmail === null) {
    const err = new Error(MESSAGES.emailRequired);
    err.status = 400;
    throw err;
  }
  if (typeof rawEmail !== "string") {
    const err = new Error(MESSAGES.invalidEmail);
    err.status = 400;
    throw err;
  }

  const email = sanitizeEmail(rawEmail);
  if (!email) {
    const err = new Error(MESSAGES.emailRequired);
    err.status = 400;
    throw err;
  }

  const strictEmailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!strictEmailRegex.test(email)) {
    const err = new Error(MESSAGES.invalidEmail);
    err.status = 400;
    throw err;
  }

  return email;
}

function validatePasswordStrength(password) {
  if (password.length < 8) {
    const err = new Error(MESSAGES.passwordShort);
    err.status = 400;
    throw err;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    const err = new Error(MESSAGES.passwordLong);
    err.status = 400;
    throw err;
  }
  
  // Strong password validation: at least one uppercase, one lowercase, one number, one special char
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    const err = new Error(MESSAGES.passwordWeak);
    err.status = 400;
    throw err;
  }
  
  return true;
}

function validatePassword(rawPassword, requireStrength = true) {
  if (rawPassword === undefined || rawPassword === null) {
    const err = new Error(MESSAGES.passwordRequired);
    err.status = 400;
    throw err;
  }
  if (typeof rawPassword !== "string") {
    const err = new Error(MESSAGES.invalidPasswordType);
    err.status = 400;
    throw err;
  }

  const password = sanitizePassword(rawPassword);
  if (!password) {
    const err = new Error(MESSAGES.passwordRequired);
    err.status = 400;
    throw err;
  }

  // Validação de tamanho mínimo só é necessária para registro/recuperação (requireStrength = true)
  // No login (requireStrength = false), aceitamos qualquer senha não vazia para compatibilidade com senhas antigas
  if (requireStrength && password.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(MESSAGES.passwordShort);
    err.status = 400;
    throw err;
  }
  
  // Tamanho máximo sempre deve ser validado
  if (password.length > MAX_PASSWORD_LENGTH) {
    const err = new Error(MESSAGES.passwordLong);
    err.status = 400;
    throw err;
  }
  
  // Validação de força só para registro/recuperação/alteração de senha
  if (requireStrength) {
    validatePasswordStrength(password);
  }
  
  return password;
}

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(`${token}.${RESET_TOKEN_SECRET}`)
    .digest("hex");
}

function buildResetLink(token) {
  const base = WEB_BASE_URL.endsWith("/") ? WEB_BASE_URL.slice(0, -1) : WEB_BASE_URL;
  return `${base}/reset-password.html?token=${encodeURIComponent(token)}`;
}

function validateCredentials(rawEmail, rawPassword) {
  const emailProvided = rawEmail !== undefined;
  const passwordProvided = rawPassword !== undefined;
  if (!emailProvided && !passwordProvided) {
    const err = new Error(MESSAGES.emailPasswordRequired);
    err.status = 400;
    throw err;
  }
  const email = validateEmail(rawEmail, passwordProvided);
  // No login, NÃO validamos força da senha (requireStrength = false)
  // A validação de força só acontece em registro/recuperação/alteração de senha
  const password = validatePassword(rawPassword, false);
  return { email, password };
}

function signAccessToken(user, jti) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado. Configure no arquivo .env.local');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: user.id, email: user.email, jti, iat: nowSec }, JWT_SECRET, {
    expiresIn: JWT_TTL_SECONDS,
  });
}

function signRefreshToken(user, refreshJti) {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET não configurado. Configure no arquivo .env.local');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: user.id, email: user.email, jti: refreshJti, iat: nowSec }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_TTL_SECONDS,
  });
}

function issueTokens(user) {
  try {
    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
      const err = new Error('JWT_SECRET ou JWT_REFRESH_SECRET não configurado. Configure no arquivo .env.local');
      err.status = 500;
      err.code = 'JWT_CONFIG_ERROR';
      throw err;
    }

    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const token = signAccessToken(user, accessJti);
    const refreshToken = signRefreshToken(user, refreshJti);

    const now = Date.now();
    tokenStore.set(accessJti, {
      jti: accessJti,
      userId: user.id,
      email: user.email,
      issuedAt: now,
      lastActivity: now,
      revoked: false,
      expiresAt: now + JWT_TTL_SECONDS * 1000,
    });

    refreshStore.set(refreshJti, {
      jti: refreshJti,
      userId: user.id,
      email: user.email,
      revoked: false,
      issuedAt: now,
      expiresAt: now + JWT_REFRESH_TTL_SECONDS * 1000,
    });

    return {
      token,
      refreshToken,
      exp: Date.now() + JWT_TTL_SECONDS * 1000,
      jti: accessJti,
      refreshJti,
    };
  } catch (err) {
    // Re-throw se já tem status definido
    if (err.status) throw err;
    
    // Caso contrário, trata como erro de configuração
    const configError = new Error('Erro ao gerar tokens. Verifique se JWT_SECRET e JWT_REFRESH_SECRET estão configurados no .env.local');
    configError.status = 500;
    configError.code = 'JWT_CONFIG_ERROR';
    configError.originalError = process.env.NODE_ENV !== 'production' ? err.message : undefined;
    throw configError;
  }
}

async function login(rawEmail, rawPassword) {
  const { email, password } = validateCredentials(rawEmail, rawPassword);

  if (isBlocked(email)) {
    const err = new Error(MESSAGES.accessBlocked);
    err.status = 423;
    throw err;
  }

  let user;
  try {
    user = await getUserByEmail(email);
  } catch (dbError) {
    // Se erro de banco de dados, retorna erro mais amigável
    const errorMessage = dbError.message || 'Erro desconhecido';
    const err = new Error('Erro ao conectar com o banco de dados. Verifique se o PostgreSQL está rodando e o DATABASE_URL está configurado corretamente no arquivo .env.local');
    err.status = 503;
    err.code = 'DATABASE_ERROR';
    // Em desenvolvimento, inclui detalhes do erro
    if (process.env.NODE_ENV !== 'production') {
      err.originalError = errorMessage;
      err.details = 'Certifique-se de que: 1) PostgreSQL está rodando, 2) DATABASE_URL está correto no .env.local, 3) Banco sgvc_local existe';
    }
    throw err;
  }

  if (user && user.blocked) {
    const err = new Error(MESSAGES.blockedUser);
    err.status = 403;
    throw err;
  }

  if (!user) {
    try {
      const attempt = await recordFailedAttempt(email);
      const blocked = attempt.blockedUntil && Date.now() < attempt.blockedUntil;
      const err = new Error(blocked ? MESSAGES.accessBlocked : MESSAGES.invalidCredentials);
      err.status = blocked ? 423 : 401;
      throw err;
    } catch (attemptError) {
      // Se falhar ao registrar tentativa (ex: banco não disponível), retorna erro de credenciais
      const err = new Error(MESSAGES.invalidCredentials);
      err.status = 401;
      throw err;
    }
  }

  // Check if password is already hashed
  const { isBcryptHash } = require("../utils/passwordHash");
  const isHashed = isBcryptHash(user.password);
  
  let passwordMatches = false;
  
  try {
    if (isHashed) {
      // Compare using bcrypt
      passwordMatches = await comparePassword(password, user.password);
    } else {
      // Legacy plain text password - compare directly and upgrade
      passwordMatches = user.password === password;
      
      if (passwordMatches) {
        // Auto-upgrade: hash the password for next login
        try {
          const hashedPassword = await hashPassword(password);
          await repo.updateUserPassword(user.id, hashedPassword);
        } catch (upgradeError) {
          // Se falhar ao fazer upgrade, continua mesmo assim (senha antiga ainda funciona)
          console.warn('Aviso: Não foi possível fazer upgrade da senha:', upgradeError.message);
        }
      }
    }
  } catch (compareError) {
    // Erro ao comparar senha (pode ser problema com bcrypt ou banco)
    console.error('Erro ao comparar senha:', compareError.message);
    passwordMatches = false;
  }
  
  if (!passwordMatches) {
    try {
      const attempt = await recordFailedAttempt(email);
      const blocked = attempt.blockedUntil && Date.now() < attempt.blockedUntil;
      const err = new Error(blocked ? MESSAGES.accessBlocked : MESSAGES.invalidCredentials);
      err.status = blocked ? 423 : 401;
      throw err;
    } catch (attemptError) {
      // Se falhar ao registrar tentativa (ex: banco não disponível), retorna erro de credenciais
      const err = new Error(MESSAGES.invalidCredentials);
      err.status = 401;
      throw err;
    }
  }

  try {
    await clearAttempts(email);
    const dataUltimoLogin = new Date().toISOString();
    const statusUsuario = computeStatus(user, null);
    
    let updatedUser = user;
    try {
      updatedUser = await repo.updateUserLogin(user.id, dataUltimoLogin, 0, statusUsuario);
    } catch (updateError) {
      // Se falhar ao atualizar, usa dados do usuário original
      console.warn('Aviso: Não foi possível atualizar último login:', updateError.message);
    }

    // Gera tokens - se falhar aqui, propaga o erro (não pode fazer login sem tokens)
    const { token, refreshToken, exp, jti, refreshJti } = issueTokens(user);

    return {
      token,
      refreshToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        statusUsuario: updatedUser.status_usuario || updatedUser.statusUsuario || 'ATIVO',
        dataUltimoLogin: updatedUser.data_ultimo_login || updatedUser.dataUltimoLogin || dataUltimoLogin,
        tentativasFalha: updatedUser.tentativas_falha || updatedUser.tentativasFalha || 0,
      },
      exp,
      jti,
      refreshJti,
    };
  } catch (error) {
    // Se erro ao gerar tokens ou atualizar, propaga o erro (não tenta gerar tokens novamente)
    console.error('Erro ao finalizar login:', error.message);
    // Re-throw para que o errorHandler trate adequadamente
    throw error;
  }
}

function logout(jti) {
  const entry = tokenStore.get(jti);
  if (entry) entry.revoked = true;
}

async function refresh(refreshTokenRaw) {
  if (!refreshTokenRaw) {
    const err = new Error(MESSAGES.refreshMissing);
    err.status = 400;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(refreshTokenRaw, JWT_REFRESH_SECRET);
  } catch (err) {
    if (JWT_REFRESH_PREVIOUS_SECRET) {
      try {
        payload = jwt.verify(refreshTokenRaw, JWT_REFRESH_PREVIOUS_SECRET);
      } catch (err2) {
        const e = new Error(MESSAGES.refreshInvalid);
        e.status = 401;
        throw e;
      }
    } else {
      const e = new Error(MESSAGES.refreshInvalid);
      e.status = 401;
      throw e;
    }
  }

  const entry = refreshStore.get(payload.jti);
  if (!entry || entry.revoked) {
    const err = new Error(MESSAGES.refreshInvalid);
    err.status = 401;
    throw err;
  }

  const user = await getUserById(payload.sub);
  if (!user) {
    const err = new Error(MESSAGES.refreshInvalid);
    err.status = 401;
    throw err;
  }

  entry.revoked = true;

  return issueTokens(user);
}

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
    throw err;
  }
  
  const newUser = await repo.createUser({
    id: uuidv4(),
    email: validatedEmail,
    password: hashedPassword,
    name,
    statusUsuario: "ATIVO",
    dataUltimoLogin: null,
    tentativasFalha: 0,
  });
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
  const subject = "Redefinicao de senha - SGVC";
  const text = [
    `Ola ${user.name || "cliente"},`,
    "",
    "Recebemos uma solicitacao para redefinir sua senha.",
    "Clique no link abaixo para criar uma nova senha:",
    resetLink,
    "",
    `Este link expira em ${RESET_TOKEN_TTL_MINUTES} minutos.`,
    "Se voc\u00ea n\u00e3o solicitou, ignore este e-mail.",
  ].join("\n");

  const html = `
    <p>Ola ${user.name || "cliente"},</p>
    <p>Recebemos uma solicitacao para redefinir sua senha.</p>
    <p><a href="${resetLink}">Clique aqui para criar uma nova senha</a></p>
    <p>Este link expira em ${RESET_TOKEN_TTL_MINUTES} minutos.</p>
    <p>Se voc\u00ea n\u00e3o solicitou, ignore este e-mail.</p>
  `;

  console.log(`[AUTH] 📧 Tentando enviar email de recuperação para: ${user.email}`);
  const result = await emailService.sendMail({
    to: user.email,
    subject,
    text,
    html,
  });

  // Se email foi enviado com sucesso (incluindo via Ethereal)
  if (result && result.sent) {
    if (result.previewUrl) {
      console.log(`[AUTH] ✅ Email enviado via Ethereal. Preview: ${result.previewUrl}`);
      // Retorna com previewUrl para desenvolvimento (Ethereal envia email de teste)
      return { sent: true, resetLink, token: token, previewUrl: result.previewUrl };
    }
    // Email enviado via SMTP configurado (produção)
    console.log(`[AUTH] ✅ Email enviado com sucesso via SMTP para ${user.email}`);
    return { sent: true };
  }
  
  // Email não foi enviado - log detalhado do erro
  if (result && result.reason === 'SMTP_NOT_CONFIGURED') {
    console.warn("[AUTH] ⚠️ SMTP não configurado e Ethereal não disponível. Não foi possível enviar email.");
  } else if (result && result.reason === 'SEND_ERROR') {
    console.error(`[AUTH] ❌ Falha ao enviar e-mail para ${user.email}:`, result.error || result.reason);
  } else if (result) {
    console.error(`[AUTH] ❌ Falha ao enviar e-mail para ${user.email}. Razão:`, result.reason || 'desconhecida');
  } else {
    console.error("[AUTH] ❌ Resultado do envio de email é inválido (result é null/undefined)");
  }
  
  // Em modo desenvolvimento, sempre retorna o link para facilitar testes
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AUTH] 🔗 [DEV] Link de reset para ${user.email}: ${resetLink}`);
    return { sent: false, resetLink, token: token };
  }

  console.warn(`[AUTH] ⚠️ Email não foi enviado para ${user.email}. Token gerado mas não foi possível enviar.`);
  return { sent: false };
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
  updateProfile,
  MESSAGES,
};
