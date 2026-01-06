const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { lookupCnpj } = require('../services/cnpjService');

const router = express.Router();

router.use(authenticate);

const CNPJ_GENERIC_ERROR = 'Nao foi possivel consultar o CNPJ agora.';
const respondSuccess = (res, data, message = 'CNPJ encontrado') =>
  res.status(200).json({ message, error: false, data });
const respondError = (res, status, message) => res.status(status).json({ message, error: true });

router.get('/:cnpj', async (req, res) => {
  const raw = String(req.params.cnpj || '').replace(/\D/g, '');
  if (raw.length !== 14) {
    return respondError(res, 400, 'CNPJ invalido. Digite 14 digitos.');
  }

  try {
    const result = await lookupCnpj(raw);
    if (result.notFound) {
      return respondError(res, 404, 'CNPJ nao encontrado.');
    }
    return respondSuccess(res, {
      name: result.data.name || '',
      tradeName: result.data.tradeName || '',
      phone: result.data.phone || '',
      addressStreet: result.data.addressStreet || '',
      addressNumber: result.data.addressNumber || '',
      addressComplement: result.data.addressComplement || '',
      addressNeighborhood: result.data.addressNeighborhood || '',
      addressCity: result.data.addressCity || '',
      addressState: result.data.addressState || '',
      addressPostalCode: result.data.addressPostalCode || '',
    });
  } catch (err) {
    return respondError(res, 502, CNPJ_GENERIC_ERROR);
  }
});

module.exports = router;
