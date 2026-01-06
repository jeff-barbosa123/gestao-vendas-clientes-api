const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { lookupHolidays } = require('../services/holidayService');

const router = express.Router();

router.use(authenticate);

router.get('/:year', async (req, res) => {
  const year = String(req.params.year || '');
  if (!/^\d{4}$/.test(year)) {
    return res.status(400).json({ message: 'Ano invalido. Use 4 digitos.' });
  }

  try {
    const items = await lookupHolidays(year);
    return res.json({
      year: Number(year),
      items: (items || []).map((item) => ({
        date: item.date || '',
        name: item.name || '',
        type: item.type || '',
      })),
    });
  } catch (err) {
    return res.status(502).json({ message: 'Erro ao consultar feriados.' });
  }
});

module.exports = router;
