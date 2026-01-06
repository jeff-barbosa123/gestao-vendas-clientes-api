const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { lookupBarcode } = require('../services/barcodeService');

const router = express.Router();

router.use(authenticate);

router.get('/:code', async (req, res) => {
  const code = String(req.params.code || '').replace(/\D/g, '');
  if (code.length < 8 || code.length > 14) {
    return res.status(400).json({ message: 'Codigo de barras invalido.' });
  }

  try {
    const result = await lookupBarcode(code);
    if (result.notFound || !result.data) {
      return res.status(404).json({ message: 'Produto nao encontrado.' });
    }
    return res.json(result.data);
  } catch (err) {
    return res.status(502).json({ message: 'Erro ao consultar codigo de barras.' });
  }
});

module.exports = router;
