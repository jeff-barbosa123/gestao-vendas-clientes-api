const express = require('express');
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/authMiddleware');
const { rateLimit } = require('../middleware/rateLimit');

// /api/team (permissao team:manage, aplicada pelo gate no routes/index.js)
const team = express.Router();
team.use(authenticate);
const inviteLimit = rateLimit({ windowMs: 60_000, max: 20, message: 'Muitos convites. Tente novamente em 1 minuto.' });
team.get('/', teamController.list);
team.post('/invitations', inviteLimit, teamController.invite);
team.delete('/invitations/:id', teamController.revokeInvitation);
team.put('/members/:userId', teamController.changeRole);
team.delete('/members/:userId', teamController.removeMember);

// /api/company: modulos opcionais (GET: qualquer membro; PUT: modules:manage)
const company = express.Router();
company.use(authenticate);
company.get('/modules', teamController.getModules);
company.put('/modules', teamController.setModules);

module.exports = { team, company };
