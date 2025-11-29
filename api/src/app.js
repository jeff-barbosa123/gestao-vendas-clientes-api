require('dotenv').config(); // ✅ carrega as variáveis do arquivo .env logo no início

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
let swaggerDocument = {};
try {
  const swaggerPath = require('path').join(__dirname, '../resources/swagger.json');
  swaggerDocument = require(swaggerPath);
} catch (err) {
  console.warn('⚠ Swagger não carregado nos testes. Ignorando.');
}


const app = express();

app.use(cors());
app.use(express.json());

// 🔹 Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 🔹 Rotas da API
app.use('/api', routes);

// 🔹 Tratamento de erros
app.use(errorHandler);

module.exports = app;