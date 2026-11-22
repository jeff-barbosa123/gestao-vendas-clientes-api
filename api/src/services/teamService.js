const crypto = require('crypto');
const repo = require('../db/repositories/team');
const usersRepo = require('../db/repositories/users');
const perms = require('./permissions');
const emailService = require('./emailService');
const sessionStore = require('./sessionStore');
const authService = require('./authService');
const { hashPassword } = require('../utils/passwordHash');
const { validateEmail, validatePassword } = require('./auth/validators');

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const roleOption = (value) => ({ value, label: perms.ROLE_LABELS[value] });

function inviteUrl(token) {
  const base = (process.env.WEB_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
  return `${base}/accept-invite.html?token=${encodeURIComponent(token)}`;
}

async function list(ownerId) {
  const [members, invitations] = await Promise.all([repo.listMembers(ownerId), repo.listPendingInvitations(ownerId)]);
  return {
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      username: m.username || null,
      role: m.role,
      roleLabel: perms.ROLE_LABELS[m.role],
      isOwner: m.role === 'owner',
    })),
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      roleLabel: perms.ROLE_LABELS[i.role],
      createdAt: new Date(i.created_at).toISOString(),
      expiresAt: new Date(i.expires_at).toISOString(),
    })),
    roles: perms.INVITABLE_ROLES.map(roleOption),
  };
}

async function invite(ownerId, actorId, data) {
  const email = validateEmail(data && data.email, false);
  const role = data && data.role;
  if (!perms.INVITABLE_ROLES.includes(role)) {
    throw httpError(400, 'INVALID_ROLE', 'Perfil inválido. Use gerente, vendedor ou estoquista.');
  }
  if (await usersRepo.getUserByEmail(email)) {
    throw httpError(409, 'EMAIL_ALREADY_EXISTS', 'Este e-mail já possui conta no SGVC. Convide outro e-mail.');
  }
  await repo.revokePendingByEmail(ownerId, email);
  const token = crypto.randomBytes(32).toString('hex');
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await repo.createInvitation({ id, ownerId, email, role, tokenHash: hashToken(token), invitedBy: actorId, expiresAt });

  const inviter = await usersRepo.getUserById(actorId);
  const info = await repo.getInvitationByTokenHash(hashToken(token));
  const url = inviteUrl(token);
  Promise.resolve(
    emailService.sendTeamInvite({
      to: email,
      inviterName: inviter && inviter.name,
      companyName: info && info.company_name,
      roleLabel: perms.ROLE_LABELS[role],
      link: url,
    })
  ).catch((err) => console.error('[TEAM] falha ao enviar convite:', err && err.message));

  return {
    invitation: { id, email, role, roleLabel: perms.ROLE_LABELS[role], expiresAt: expiresAt.toISOString() },
    inviteUrl: url,
  };
}

async function revokeInvitation(ownerId, id) {
  if (!(await repo.revokeInvitation(ownerId, id))) throw httpError(404, 'NOT_FOUND', 'Convite não encontrado.');
}

async function changeRole(ownerId, userId, role) {
  if (!perms.INVITABLE_ROLES.includes(role)) {
    throw httpError(400, 'INVALID_ROLE', 'Perfil inválido. Use gerente, vendedor ou estoquista.');
  }
  if (!(await repo.setMemberRole(ownerId, userId, role))) throw httpError(404, 'NOT_FOUND', 'Membro não encontrado.');
}

async function removeMember(ownerId, userId) {
  if (!(await repo.removeMember(ownerId, userId))) throw httpError(404, 'NOT_FOUND', 'Membro não encontrado.');
  // Quem sai da equipe perde todas as sessoes abertas.
  await sessionStore.revokeOthers(userId, null);
}

async function getInvitationInfo(token) {
  const row = await repo.getInvitationByTokenHash(hashToken(token || ''));
  if (!row || row.revoked_at || row.accepted_at || new Date(row.expires_at) <= new Date()) {
    throw httpError(404, 'INVITATION_INVALID', 'Convite inválido ou expirado. Peça um novo convite ao dono da empresa.');
  }
  return { row, info: { email: row.email, role: row.role, roleLabel: perms.ROLE_LABELS[row.role], companyName: row.company_name } };
}

async function acceptInvitation(token, data, meta) {
  const { row } = await getInvitationInfo(token);
  const name = String((data && data.name) || '').trim();
  if (name.length < 2) throw httpError(400, 'VALIDATION_ERROR', 'Informe seu nome.');
  const password = validatePassword(data && data.password, true);
  if (await usersRepo.getUserByEmail(row.email)) {
    throw httpError(409, 'EMAIL_ALREADY_EXISTS', 'Este e-mail já possui conta no SGVC.');
  }
  const userId = crypto.randomUUID();
  await usersRepo.createUser({
    id: userId,
    email: row.email,
    password: await hashPassword(password),
    name,
    emailVerified: true, // o convite foi enviado para este e-mail
    statusUsuario: 'ATIVO',
  });
  try {
    await repo.createMembership(userId, row.owner_id, row.role);
  } catch (err) {
    await usersRepo.deleteUser?.(userId);
    throw err;
  }
  await repo.markInvitationAccepted(row.id);
  return authService.login(row.email, password, meta);
}

async function getModules(ownerId) {
  return perms.resolveModules(await repo.getModules(ownerId));
}

async function setModules(ownerId, input) {
  // Apenas as chaves enviadas; o merge e atomico no SQL (evita corrida entre alteracoes rapidas).
  const patch = {};
  Object.keys(perms.MODULES).forEach((key) => {
    if (input && typeof input[key] === 'boolean') patch[key] = input[key];
  });
  await repo.setModules(ownerId, patch);
  return perms.resolveModules(await repo.getModules(ownerId));
}

module.exports = {
  list,
  invite,
  revokeInvitation,
  changeRole,
  removeMember,
  getInvitationInfo,
  acceptInvitation,
  getModules,
  setModules,
};
