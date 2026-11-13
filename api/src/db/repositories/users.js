const { v4: uuidv4 } = require("uuid");
const { query } = require("../index");
const { isUuid } = require("./shared");

async function getUserByEmail(email) {
  const result = await query(
    "SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email]
  );
  return result.rows[0] || null;
}

async function getUserById(id) {
  if (!isUuid(id)) return null;
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function createUser(data) {
  const payload = {
    id: data.id || uuidv4(),
    email: data.email,
    password: data.password,
    name: data.name,
    email_verified: data.emailVerified === true,
    email_verification_token: data.emailVerificationToken || null,
    status_usuario: data.statusUsuario || "ATIVO",
    data_ultimo_login: data.dataUltimoLogin || null,
    tentativas_falha: data.tentativasFalha || 0,
    blocked: !!data.blocked,
  };
  const result = await query(
    `INSERT INTO users
      (id, email, password, name, email_verified, email_verification_token, status_usuario, data_ultimo_login, tentativas_falha, blocked, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     RETURNING *`,
    [
      payload.id,
      payload.email,
      payload.password,
      payload.name,
      payload.email_verified,
      payload.email_verification_token,
      payload.status_usuario,
      payload.data_ultimo_login,
      payload.tentativas_falha,
      payload.blocked,
    ]
  );
  return result.rows[0];
}

async function setEmailVerificationToken(userId, tokenHash) {
  const result = await query(
    `UPDATE users
       SET email_verification_token = $2,
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, tokenHash]
  );
  return result.rows[0] || null;
}

async function verifyEmailByTokenHash(tokenHash) {
  const result = await query(
    `UPDATE users
       SET email_verified = TRUE,
           email_verification_token = NULL,
           updated_at = NOW()
     WHERE email_verification_token = $1
     RETURNING *`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function updateUserLogin(id, dataUltimoLogin, tentativasFalha, statusUsuario) {
  const result = await query(
    `UPDATE users
       SET data_ultimo_login = $2,
           tentativas_falha = $3,
           status_usuario = $4,
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, dataUltimoLogin, tentativasFalha, statusUsuario]
  );
  return result.rows[0] || null;
}

async function updateUserPassword(id, password) {
  const result = await query(
    `UPDATE users
       SET password = $2,
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, password]
  );
  return result.rows[0] || null;
}

async function updateUserProfile(id, name, email) {
  const result = await query(
    `UPDATE users
       SET name = $2,
           email = $3,
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name, email]
  );
  return result.rows[0] || null;
}

async function createPasswordReset(userId, tokenHash, expiresAt) {
  const result = await query(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
     VALUES ($1,$2,$3,$4,NOW())
     RETURNING *`,
    [uuidv4(), userId, tokenHash, expiresAt]
  );
  return result.rows[0] || null;
}

async function getPasswordResetByTokenHash(tokenHash) {
  const result = await query(
    `SELECT * FROM password_resets
      WHERE token_hash = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function markPasswordResetUsed(id) {
  const result = await query(
    `UPDATE password_resets
       SET used_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  setEmailVerificationToken,
  verifyEmailByTokenHash,
  updateUserLogin,
  updateUserPassword,
  updateUserProfile,
  createPasswordReset,
  getPasswordResetByTokenHash,
  markPasswordResetUsed,
};
