const jwt = require("jsonwebtoken");
const repo = require("../../db/repository");
const sessionStore = require("../sessionStore");
const { hashPassword, comparePassword, isBcryptHash } = require("../../utils/passwordHash");
const { JWT_REFRESH_SECRET, JWT_REFRESH_PREVIOUS_SECRET } = require("./config");
const { MESSAGES } = require("./messages");
const { getUserByIdentifier, getUserById } = require("./userLookup");
const { validateCredentials } = require("./validators");
const { computeStatus, clearAttempts, isBlocked, buildFailedLoginError } = require("./lockout");
const { issueTokens } = require("./tokens");

// Hash descartavel: usuario inexistente gasta o mesmo tempo de um bcrypt compare (evita enumeracao por timing)
let dummyHashPromise = null;
function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword("sgvc-dummy-password-timing");
  return dummyHashPromise;
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
    user = await getUserByIdentifier(email);
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
    await comparePassword(password, await getDummyHash()).catch(() => false);
    throw await buildFailedLoginError(email);
  }

  // Check if password is already hashed
  const { isBcryptHash } = require("../../utils/passwordHash");
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
        username: updatedUser.username || null,
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

module.exports = {
  login,
  logout,
  refresh,
};
