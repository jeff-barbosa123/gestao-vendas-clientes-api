const teamService = require('../services/teamService');
const perms = require('../services/permissions');

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

// Nas rotas de equipe/empresa, req.user.id = ID da empresa (tenant) e req.user.userId = quem esta agindo.
module.exports = {
  list: wrap(async (req, res) => res.status(200).json(await teamService.list(req.user.id))),

  invite: wrap(async (req, res) => res.status(201).json(await teamService.invite(req.user.id, req.user.userId, req.body || {}))),

  revokeInvitation: wrap(async (req, res) => {
    await teamService.revokeInvitation(req.user.id, req.params.id);
    res.status(204).end();
  }),

  changeRole: wrap(async (req, res) => {
    await teamService.changeRole(req.user.id, req.params.userId, (req.body || {}).role);
    res.status(200).json({ ok: true });
  }),

  removeMember: wrap(async (req, res) => {
    await teamService.removeMember(req.user.id, req.params.userId);
    res.status(204).end();
  }),

  getModules: wrap(async (req, res) =>
    res.status(200).json({ modules: await teamService.getModules(req.user.id), catalog: perms.MODULES })
  ),

  setModules: wrap(async (req, res) =>
    res.status(200).json({ modules: await teamService.setModules(req.user.id, req.body || {}), catalog: perms.MODULES })
  ),
};
