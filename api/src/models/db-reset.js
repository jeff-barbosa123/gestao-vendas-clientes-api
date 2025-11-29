// api/src/models/db-reset.js
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const customersPath = path.join(__dirname, '../../fixtures/customers.json');

function resetDB(db) {
  // recria admin
  db.users = [{
    id: 'u1',
    email: 'admin@negocio.com',
    password: 'admin123',
    name: 'Admin'
  }];

  // recarrega customers salvos (ou vazio)
  let customersFromFile = [];
  try {
    customersFromFile = JSON.parse(fs.readFileSync(customersPath, 'utf-8'));
  } catch (_) {}

  db.customers = [...customersFromFile];
  db.products = [];
  db.sales = [];
  db.recipes = [];
}

module.exports = { resetDB };
