const { query } = require('../index');

// Contexto de tenant do usuario: empresa (ownerId), papel e modulos. Sem membership = dono da propria empresa.
async function getTenantContext(userId) {
  const result = await query(
    `SELECT m.owner_id, m.role, cm.modules
       FROM users u
       LEFT JOIN memberships m ON m.user_id = u.id
       LEFT JOIN company_modules cm ON cm.owner_id = COALESCE(m.owner_id, u.id)
      WHERE u.id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return { ownerId: userId, role: 'owner', modules: {} };
  return { ownerId: row.owner_id || userId, role: row.role || 'owner', modules: row.modules || {} };
}

async function listMembers(ownerId) {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.username, COALESCE(m.role, 'owner') AS role, COALESCE(m.created_at, u.created_at) AS joined_at
       FROM users u
       LEFT JOIN memberships m ON m.user_id = u.id
      WHERE u.id = $1 OR m.owner_id = $1
      ORDER BY (u.id = $1) DESC, joined_at ASC`,
    [ownerId]
  );
  return result.rows;
}

async function getMember(ownerId, userId) {
  const result = await query(
    'SELECT user_id, owner_id, role FROM memberships WHERE user_id = $1 AND owner_id = $2',
    [userId, ownerId]
  );
  return result.rows[0] || null;
}

async function createMembership(userId, ownerId, role) {
  await query('INSERT INTO memberships (user_id, owner_id, role) VALUES ($1, $2, $3)', [userId, ownerId, role]);
}

async function setMemberRole(ownerId, userId, role) {
  const result = await query(
    "UPDATE memberships SET role = $3, updated_at = NOW() WHERE user_id = $1 AND owner_id = $2 AND role <> 'owner'",
    [userId, ownerId, role]
  );
  return result.rowCount > 0;
}

async function removeMember(ownerId, userId) {
  const result = await query(
    "DELETE FROM memberships WHERE user_id = $1 AND owner_id = $2 AND role <> 'owner'",
    [userId, ownerId]
  );
  return result.rowCount > 0;
}

async function revokePendingByEmail(ownerId, email) {
  await query(
    'UPDATE team_invitations SET revoked_at = NOW() WHERE owner_id = $1 AND lower(email) = lower($2) AND accepted_at IS NULL AND revoked_at IS NULL',
    [ownerId, email]
  );
}

async function createInvitation({ id, ownerId, email, role, tokenHash, invitedBy, expiresAt }) {
  await query(
    `INSERT INTO team_invitations (id, owner_id, email, role, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, ownerId, email, role, tokenHash, invitedBy, expiresAt]
  );
}

async function listPendingInvitations(ownerId) {
  const result = await query(
    `SELECT id, email, role, created_at, expires_at
       FROM team_invitations
      WHERE owner_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC`,
    [ownerId]
  );
  return result.rows;
}

async function revokeInvitation(ownerId, id) {
  const result = await query(
    'UPDATE team_invitations SET revoked_at = NOW() WHERE id = $1 AND owner_id = $2 AND accepted_at IS NULL AND revoked_at IS NULL',
    [id, ownerId]
  );
  return result.rowCount > 0;
}

async function getInvitationByTokenHash(tokenHash) {
  const result = await query(
    `SELECT i.*, COALESCE(cs.company_name, u.name) AS company_name
       FROM team_invitations i
       JOIN users u ON u.id = i.owner_id
       LEFT JOIN company_settings cs ON cs.owner_id = i.owner_id
      WHERE i.token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function markInvitationAccepted(id) {
  await query('UPDATE team_invitations SET accepted_at = NOW() WHERE id = $1', [id]);
}

async function getModules(ownerId) {
  const result = await query('SELECT modules FROM company_modules WHERE owner_id = $1', [ownerId]);
  return (result.rows[0] && result.rows[0].modules) || {};
}

async function setModules(ownerId, modules) {
  await query(
    `INSERT INTO company_modules (owner_id, modules, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (owner_id) DO UPDATE SET modules = company_modules.modules || EXCLUDED.modules, updated_at = NOW()`,
    [ownerId, JSON.stringify(modules)]
  );
}

module.exports = {
  getTenantContext,
  listMembers,
  getMember,
  createMembership,
  setMemberRole,
  removeMember,
  revokePendingByEmail,
  createInvitation,
  listPendingInvitations,
  revokeInvitation,
  getInvitationByTokenHash,
  markInvitationAccepted,
  getModules,
  setModules,
};
