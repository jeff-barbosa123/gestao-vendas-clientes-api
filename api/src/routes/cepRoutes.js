const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { lookupCep } = require('../services/cepService');

const router = express.Router();

router.use(authenticate);

const CEP_GENERIC_ERROR = 'Erro ao consultar CEP';
const respondSuccess = (res, data, message = 'CEP encontrado') =>
  res.status(200).json({ message, error: false, data });
const respondError = (res, status, message) => res.status(status).json({ message, error: true });

router.get('/:cep', async (req, res) => {
  const raw = String(req.params.cep || '').replace(/\D/g, '');
  if (raw.length !== 8) {
    return respondError(res, 400, 'CEP invalido. Digite 8 digitos.');
  }

  try {
    const result = await lookupCep(raw);
    if (result.notFound) {
      return respondError(res, 404, 'CEP nao encontrado.');
    }
    return respondSuccess(res, {
      logradouro: result.data.logradouro || '',
      bairro: result.data.bairro || '',
      localidade: result.data.localidade || '',
      uf: result.data.uf || '',
    });
  } catch (err) {
    return respondError(res, 502, CEP_GENERIC_ERROR);
  }
});

module.exports = router;
