/**
 * Sistema de Internacionalização (i18n)
 * Suporta múltiplos idiomas com fallback
 */

const fs = require('fs');
const path = require('path');

// Cache de traduções carregadas
const translationsCache = new Map();

// Idioma padrão
const DEFAULT_LOCALE = 'pt-BR';

// Locales suportados
const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-ES'];

/**
 * Carrega arquivo de tradução
 */
function loadTranslations(locale) {
  if (translationsCache.has(locale)) {
    return translationsCache.get(locale);
  }

  const translationsPath = path.join(__dirname, '../locales', `${locale}.json`);
  
  try {
    if (fs.existsSync(translationsPath)) {
      const content = fs.readFileSync(translationsPath, 'utf8');
      const translations = JSON.parse(content);
      translationsCache.set(locale, translations);
      return translations;
    }
  } catch (err) {
    console.error(`Erro ao carregar traduções para ${locale}:`, err);
  }

  // Fallback para idioma padrão
  if (locale !== DEFAULT_LOCALE) {
    return loadTranslations(DEFAULT_LOCALE);
  }

  return {};
}

/**
 * Normaliza locale (ex: 'pt' -> 'pt-BR', 'en' -> 'en-US')
 */
function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LOCALE;
  
  const normalized = locale.toLowerCase().trim();
  
  // Mapeamentos comuns
  const localeMap = {
    'pt': 'pt-BR',
    'pt-br': 'pt-BR',
    'ptbr': 'pt-BR',
    'en': 'en-US',
    'en-us': 'en-US',
    'enus': 'en-US',
    'es': 'es-ES',
    'es-es': 'es-ES',
    'eses': 'es-ES',
  };

  if (localeMap[normalized]) {
    return localeMap[normalized];
  }

  // Verifica se está na lista de suportados
  if (SUPPORTED_LOCALES.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_LOCALE;
}

/**
 * Traduz uma chave
 * @param {string} key - Chave de tradução (ex: 'error.invalid_email')
 * @param {object} params - Parâmetros para interpolação
 * @param {string} locale - Idioma desejado
 * @returns {string} Texto traduzido
 */
function t(key, params = {}, locale = DEFAULT_LOCALE) {
  const normalizedLocale = normalizeLocale(locale);
  const translations = loadTranslations(normalizedLocale);

  // Busca tradução com suporte a nested keys (ex: 'error.invalid_email')
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Se não encontrar, tenta no idioma padrão
      if (normalizedLocale !== DEFAULT_LOCALE) {
        return t(key, params, DEFAULT_LOCALE);
      }
      // Fallback: retorna a chave
      return key;
    }
  }

  if (typeof value !== 'string') {
    if (normalizedLocale !== DEFAULT_LOCALE) {
      return t(key, params, DEFAULT_LOCALE);
    }
    return key;
  }

  // Interpolação de parâmetros (ex: 'Olá {name}' -> 'Olá João')
  let translated = value;
  Object.keys(params).forEach(param => {
    const placeholder = new RegExp(`\\{${param}\\}`, 'g');
    translated = translated.replace(placeholder, params[param]);
  });

  return translated;
}

/**
 * Middleware Express para detectar locale do request
 */
function i18nMiddleware(req, res, next) {
  // Prioridade: query param > header > cookie > default
  const locale = 
    req.query.lang || 
    req.query.locale ||
    req.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
    req.cookies?.locale ||
    DEFAULT_LOCALE;

  req.locale = normalizeLocale(locale);
  res.locals.locale = req.locale;
  
  // Função helper no response
  res.t = (key, params) => t(key, params, req.locale);
  
  next();
}

/**
 * Retorna lista de idiomas suportados
 */
function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Limpa cache de traduções (útil em desenvolvimento)
 */
function clearCache() {
  translationsCache.clear();
}

module.exports = {
  t,
  i18nMiddleware,
  normalizeLocale,
  getSupportedLocales,
  clearCache,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
};
