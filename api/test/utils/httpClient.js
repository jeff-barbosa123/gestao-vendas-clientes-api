// api/test/utils/httpClient.js
const request = require('supertest');
const app = require('../../src/app');

const baseUrl = process.env.BASE_URL;

function getClient() {
  return baseUrl ? request(baseUrl) : request(app);
}

module.exports = { getClient };
