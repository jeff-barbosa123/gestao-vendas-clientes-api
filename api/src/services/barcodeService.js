const https = require('https');
const { URL } = require('url');

const BARCODE_BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';
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
        if (raw && (contentType.includes('application/json') || raw.trim().startsWith('{'))) {
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

function normalizeProduct(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    name: String(payload.product_name || payload.product_name_pt || '').trim(),
    brand: String(payload.brands || '').trim(),
    quantity: String(payload.quantity || '').trim(),
    imageUrl: String(payload.image_url || payload.image_front_url || '').trim(),
  };
}

async function lookupBarcode(code) {
  const key = String(code);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await requestJson('GET', `${BARCODE_BASE_URL}/${key}.json`, {
    headers: { Accept: 'application/json' },
    timeoutMs: 6000,
  });

  if (response.status < 200 || response.status >= 300) {
    const err = new Error('Erro ao consultar codigo de barras.');
    err.code = 'BARCODE_LOOKUP_FAILED';
    err.status = response.status;
    err.payload = response.data;
    throw err;
  }

  if (!response.data || Number(response.data.status) !== 1) {
    return { notFound: true };
  }

  const data = normalizeProduct(response.data.product);
  cache.set(key, { data, expiresAt: Date.now() + 1000 * 60 * 60 * 24 });
  return { data };
}

module.exports = { lookupBarcode };
