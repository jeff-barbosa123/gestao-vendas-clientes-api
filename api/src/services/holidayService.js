const https = require('https');
const { URL } = require('url');

const HOLIDAY_BASE_URL = 'https://brasilapi.com.br/api/feriados/v1';
const cache = new Map();

function requestJson(method, urlString, { headers = {}, timeoutMs = 6000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 443,
      path: `${url.pathname}${url.search}`,
      headers,
      timeout: timeoutMs,
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        const contentType = String(res.headers['content-type'] || '');
        let parsed = raw;
        if (raw && (contentType.includes('application/json') || raw.trim().startsWith('['))) {
          try {
            parsed = JSON.parse(raw);
          } catch (err) {
            err.code = 'INVALID_JSON';
            return reject(err);
          }
        }
        resolve({ status: res.statusCode || 0, data: parsed, headers: res.headers });
      });
    });

    req.on('timeout', () => {
      const err = new Error('timeout');
      err.code = 'ETIMEDOUT';
      req.destroy(err);
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
}

async function lookupHolidays(year) {
  const key = String(year);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  const response = await requestJson('GET', `${HOLIDAY_BASE_URL}/${key}`, {
    headers: { Accept: 'application/json' },
    timeoutMs: 6000,
  });

  if (response.status < 200 || response.status >= 300) {
    const err = new Error('Erro ao consultar feriados.');
    err.code = 'HOLIDAY_LOOKUP_FAILED';
    err.status = response.status;
    err.payload = response.data;
    throw err;
  }

  const items = Array.isArray(response.data) ? response.data : [];
  cache.set(key, { items, expiresAt: Date.now() + 1000 * 60 * 60 * 24 });
  return items;
}

module.exports = { lookupHolidays };
