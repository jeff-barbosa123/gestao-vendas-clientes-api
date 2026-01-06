const https = require('https');
const { URL } = require('url');

const BRASIL_API_BASE_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const RECEITA_WS_URL = 'https://www.receitaws.com.br/v1/cnpj';

function requestJson(method, urlString, { headers = {}, body, timeoutMs = 6000 } = {}) {
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
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function toDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const phoneDigits = toDigits(payload.ddd_telefone_1 || payload.telefone_1);
  const altPhoneDigits = toDigits(payload.ddd_telefone_2 || payload.telefone_2);
  const cep = toDigits(payload.cep);
  return {
    name: String(payload.razao_social || '').trim(),
    tradeName: String(payload.nome_fantasia || '').trim(),
    phone: phoneDigits || altPhoneDigits || '',
    addressStreet: String(payload.logradouro || '').trim(),
    addressNumber: String(payload.numero || '').trim(),
    addressComplement: String(payload.complemento || '').trim(),
    addressNeighborhood: String(payload.bairro || '').trim(),
    addressCity: String(payload.municipio || '').trim(),
    addressState: String(payload.uf || '').trim(),
    addressPostalCode: cep,
  };
}

async function lookupCnpj(cnpj) {
  try {
    const response = await requestJson('GET', `${BRASIL_API_BASE_URL}/${cnpj}`, {
      headers: { Accept: 'application/json' },
      timeoutMs: 6000,
    });
    if (response.status === 404) return { notFound: true };
    if (response.status >= 200 && response.status < 300) {
      return { data: normalizePayload(response.data) };
    }
    throw new Error('Erro ao consultar CNPJ principal');
  } catch (_primaryErr) {
    return tryReceitaCnpjFallback(cnpj);
  }
}

async function tryReceitaCnpjFallback(cnpj) {
  const response = await requestJson('GET', `${RECEITA_WS_URL}/${cnpj}`, {
    headers: { Accept: 'application/json' },
    timeoutMs: 6000,
  });
  if (response.status === 404) {
    return { notFound: true };
  }
  if (response.status < 200 || response.status >= 300) {
    const err = new Error('Erro ao consultar CNPJ fallback');
    err.code = 'CNPJ_LOOKUP_FAILED';
    err.status = response.status;
    err.payload = response.data;
    throw err;
  }
  return { data: normalizeFallbackPayload(response.data) };
}

function normalizeFallbackPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const cep = toDigits(payload.cep);
  return {
    name: String(payload.nome || '').trim(),
    tradeName: String(payload.fantasia || payload.nome || '').trim(),
    phone: toDigits(payload.ddd_telefone_1 || payload.ddd_telefone_2 || payload.telefone) || '',
    addressStreet: String(payload.logradouro || '').trim(),
    addressNumber: String(payload.numero || '').trim(),
    addressComplement: String(payload.complemento || '').trim(),
    addressNeighborhood: String(payload.bairro || '').trim(),
    addressCity: String(payload.municipio || '').trim(),
    addressState: String(payload.uf || '').trim(),
    addressPostalCode: cep,
  };
}

module.exports = { lookupCnpj };
