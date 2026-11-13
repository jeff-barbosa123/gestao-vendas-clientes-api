require("./auth/config"); // valida os segredos JWT em producao no carregamento (precisa vir primeiro)
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const repo = require("../db/repository");
const emailService = require("./emailService");
const sessionStore = require("./sessionStore");
const { hashPassword, comparePassword } = require("../utils/passwordHash");
const { JWT_TTL_SECONDS, JWT_SECRET, JWT_REFRESH_SECRET, JWT_REFRESH_TTL_SECONDS, JWT_REFRESH_PREVIOUS_SECRET, MAX_FAILED_ATTEMPTS, BLOCK_DURATION_MS, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, RESET_TOKEN_TTL_MINUTES, RESET_TOKEN_SECRET, WEB_BASE_URL, EMAIL_VERIFY_TOKEN_SECRET } = require("./auth/config");
const { MESSAGES } = require("./auth/messages");
const { getUserByEmail, getUserById } = require("./auth/userLookup");
const { validateEmail, validatePassword, validateCredentials } = require("./auth/validators");
const { computeStatus, clearAttempts, isBlocked, buildFailedLoginError } = require("./auth/lockout");

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(`${token}.${RESET_TOKEN_SECRET}`)
    .digest("hex");
}

function hashEmailVerificationToken(token) {
  return crypto
    .createHash("sha256")
    .update(`${token}.${EMAIL_VERIFY_TOKEN_SECRET}`)
    .digest("hex");
}

function buildResetLink(token) {
  const base = WEB_BASE_URL.endsWith("/") ? WEB_BASE_URL.slice(0, -1) : WEB_BASE_URL;
  return `${base}/reset-password.html?token=${encodeURIComponent(token)}`;
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

async function issueTokens(user) {
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
    // Sessões gravadas em memória + PostgreSQL (sobrevivem a reinício/deploy da API)
    await sessionStore.save("access", {
      jti: accessJti,
      userId: user.id,
      email: user.email,
      issuedAt: now,
      lastActivity: now,
      revoked: false,
      expiresAt: now + JWT_TTL_SECONDS * 1000,
    });

    await sessionStore.save("refresh", {
      jti: refreshJti,
      userId: user.id,
      email: user.email,
      revoked: false,
      issuedAt: now,
      lastActivity: now,
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
    throw await buildFailedLoginError(email);
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
    throw await buildFailedLoginError(email);
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
    const { token, refreshToken, exp, jti, refreshJti } = await issueTokens(user);

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

async function logout(jti) {
  await sessionStore.revoke("access", jti);
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

  const entry = await sessionStore.get("refresh", payload.jti);
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

  // Refresh token é de uso único
  await sessionStore.revoke("refresh", payload.jti);

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
