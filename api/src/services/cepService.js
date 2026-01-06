const https = require('https');
const { URL } = require('url');

const CONECTA_CEP_BASE_URL =
  process.env.CONECTA_CEP_BASE_URL ||
  'https://h-apigateway.conectagov.estaleiro.serpro.gov.br/api-cep/v1/consulta/cep';
const CONECTA_OAUTH_TOKEN_URL = process.env.CONECTA_OAUTH_TOKEN_URL;
const CONECTA_CLIENT_ID = process.env.CONECTA_CLIENT_ID;
const CONECTA_CLIENT_SECRET = process.env.CONECTA_CLIENT_SECRET;
const CONECTA_SCOPE = process.env.CONECTA_SCOPE;
const CONECTA_CPF_USUARIO = process.env.CONECTA_CPF_USUARIO;
const CONECTA_OAUTH_USE_BASIC = process.env.CONECTA_OAUTH_USE_BASIC !== 'false';

const VIA_CEP_BASE_URL = 'https://viacep.com.br/ws';

const tokenCache = {
  accessToken: null,
  expiresAt: 0,
  pending: null,
};

function requestJson(method, urlString, { headers = {}, body, timeoutMs = 5000 } = {}) {
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

async function requestToken() {
  if (!CONECTA_OAUTH_TOKEN_URL || !CONECTA_CLIENT_ID || !CONECTA_CLIENT_SECRET) {
    const err = new Error('Credenciais do Conecta Gov nao configuradas.');
    err.code = 'CONECTA_CONFIG';
    throw err;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CONECTA_CLIENT_ID,
    client_secret: CONECTA_CLIENT_SECRET,
  });
  if (CONECTA_SCOPE) params.set('scope', CONECTA_SCOPE);

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (CONECTA_OAUTH_USE_BASIC) {
    const basic = Buffer.from(`${CONECTA_CLIENT_ID}:${CONECTA_CLIENT_SECRET}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await requestJson('POST', CONECTA_OAUTH_TOKEN_URL, {
    headers,
    body: params.toString(),
    timeoutMs: 6000,
  });

  if (response.status < 200 || response.status >= 300) {
    const err = new Error('Falha ao autenticar no Conecta Gov.');
    err.code = 'CONECTA_AUTH';
    err.status = response.status;
    err.payload = response.data;
    throw err;
  }

  const accessToken = response.data && response.data.access_token;
  const expiresIn = Number(response.data && response.data.expires_in) || 300;
  if (!accessToken) {
    const err = new Error('Resposta de token invalida.');
    err.code = 'CONECTA_AUTH';
    throw err;
  }

  tokenCache.accessToken = accessToken;
  tokenCache.expiresAt = Date.now() + Math.max(expiresIn - 60, 30) * 1000;
  return accessToken;
}

async function getAccessToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  if (tokenCache.pending) {
    return tokenCache.pending;
  }
  tokenCache.pending = requestToken();
  try {
    return await tokenCache.pending;
  } finally {
    tokenCache.pending = null;
  }
}

function normalizeConectaPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const logradouro = payload.logradouro || payload.endereco || payload.endereco_logradouro || '';
  const bairro = payload.bairro || '';
  const localidade = payload.localidade || payload.cidade || payload.municipio || payload.municipio_nome || '';
  const uf = payload.uf || payload.estado || payload.sigla_uf || '';
  return {
    logradouro: String(logradouro || '').trim(),
    bairro: String(bairro || '').trim(),
    localidade: String(localidade || '').trim(),
    uf: String(uf || '').trim(),
  };
}

function normalizeViaCepPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    logradouro: String(payload.logradouro || '').trim(),
    bairro: String(payload.bairro || '').trim(),
    localidade: String(payload.localidade || '').trim(),
    uf: String(payload.uf || '').trim(),
  };
}

function normalizeBrasilApiPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    logradouro: String(payload.street || '').trim(),
    bairro: String(payload.neighborhood || '').trim(),
    localidade: String(payload.city || '').trim(),
    uf: String(payload.state || '').trim(),
  };
}

async function fetchConectaCep(cep) {
  const token = await getAccessToken();
  const url = `${CONECTA_CEP_BASE_URL.replace(/\/$/, '')}/${cep}`;
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (CONECTA_CPF_USUARIO) {
    headers['x-cpf-usuario'] = CONECTA_CPF_USUARIO;
  }

  const response = await requestJson('GET', url, { headers, timeoutMs: 5000 });
  return response;
}

async function fetchViaCep(cep) {
  const url = `${VIA_CEP_BASE_URL}/${cep}/json/`;
  const response = await requestJson('GET', url, { headers: { Accept: 'application/json' }, timeoutMs: 4000 });
  return response;
}

async function fetchBrasilApi(cep) {
  const url = `https://brasilapi.com.br/api/cep/v2/${cep}`;
  const response = await requestJson('GET', url, { headers: { Accept: 'application/json' }, timeoutMs: 4000 });
  return response;
}

async function tryBrasilApiFallback(cep) {
  const fallback = await fetchBrasilApi(cep);
  if (fallback.status >= 500 || fallback.status === 0) {
    const error = new Error('Servico de CEP indisponivel.');
    error.code = 'CEP_UNAVAILABLE';
    throw error;
  }
  if (fallback.status === 404) {
    return { notFound: true };
  }
  if (fallback.status < 200 || fallback.status >= 300) {
    return { notFound: true };
  }
  return { data: normalizeBrasilApiPayload(fallback.data) };
}

async function tryFallback(cep) {
  const fallback = await fetchViaCep(cep);
  if (fallback.status >= 500 || fallback.status === 0) {
    return tryBrasilApiFallback(cep);
  }
  if (fallback.status >= 200 && fallback.status < 300) {
    if (fallback.data && fallback.data.erro) {
      return tryBrasilApiFallback(cep);
    }
    return { data: normalizeViaCepPayload(fallback.data) };
  }
  return tryBrasilApiFallback(cep);
}

async function lookupCep(cep) {
  let conectaResponse;
  try {
    conectaResponse = await fetchConectaCep(cep);
  } catch (_err) {
    return tryFallback(cep);
  }

  if (conectaResponse.status === 404) {
    return { notFound: true };
  }

  if (conectaResponse.status < 200 || conectaResponse.status >= 300) {
    return tryFallback(cep);
  }

  return { data: normalizeConectaPayload(conectaResponse.data) };
}

module.exports = { lookupCep };






