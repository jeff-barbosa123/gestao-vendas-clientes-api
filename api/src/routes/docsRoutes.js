const express = require('express');
const router = express.Router();
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');

const swaggerPath = path.join(__dirname, '..', '..', 'resources', 'swagger.json');

let swaggerDoc = {};
try {
  swaggerDoc = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
} catch (e) {
  swaggerDoc = { openapi: '3.0.3', info: { title: 'API', version: '1.0.0' } };
}

router.get('/raw', (_req, res) => {
  res.sendFile(swaggerPath);
});

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

module.exports = router;

