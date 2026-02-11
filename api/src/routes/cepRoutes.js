const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { lookupCep } = require('../services/cepService');

const router = express.Router();

router.use(authenticate);

const respondSuccess = (res, data, message = 'CEP encontrado') =>
  res.status(200).json({ message, error: false, data });

router.get('/:cep', async (req, res, next) => {
  const raw = String(req.params.cep || '').replace(/\D/g, '');
  if (raw.length !== 8) {
    const err = new Error('CEP inválido. Informe 8 dígitos');
    err.status = 400;
    err.code = 'CEP_INVALID';
    return next(err);
  }

  try {
    const result = await lookupCep(raw);
    if (result.notFound) {
      const err = new Error('CEP não encontrado. Verifique o número informado');
      err.status = 404;
      err.code = 'CEP_NOT_FOUND';
      return next(err);
    }
    return respondSuccess(res, {
      logradouro: result.data.logradouro || '',
      bairro: result.data.bairro || '',
      localidade: result.data.localidade || '',
      uf: result.data.uf || '',
    });
  } catch (err) {
    // Se já tem status e code, passa adiante
    if (err.status && err.code) {
      return next(err);
    }
    // Caso contrário, cria erro amigável
    const apiErr = new Error('Erro ao consultar CEP. Tente novamente ou preencha manualmente');
    apiErr.status = 502;
    apiErr.code = 'CEP_API_ERROR';
    apiErr.originalError = err;
    return next(apiErr);
  }
});

module.exports = router;
