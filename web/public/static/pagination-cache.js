/**
 * Cache de Paginação para Frontend
 * Melhora performance armazenando páginas já carregadas
 */

(() => {
  'use strict';

  /**
   * Classe para gerenciar cache de paginação
   */
  class PaginationCache {
    constructor(options = {}) {
      this.maxSize = options.maxSize || 50; // Máximo de páginas em cache
      this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutos por padrão
      this.cache = new Map(); // Map<key, { data, timestamp, page, limit }>
      this.stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
      };
    }

    /**
     * Gera chave de cache baseada em parâmetros
     */
    _generateKey(endpoint, params = {}) {
      // Proteção defensiva: garante que Object.keys() retorne array válido antes de .map()
      const keys = Object.keys(params || {});
      const sortedParams = Array.isArray(keys) ? keys
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&') : '';
      return `${endpoint}?${sortedParams}`;
    }

    /**
     * Verifica se um item está expirado
     */
    _isExpired(item) {
      if (!item.timestamp) return true;
      return Date.now() - item.timestamp > this.ttl;
    }

    /**
     * Remove itens expirados
     */
    _cleanExpired() {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > this.ttl) {
          this.cache.delete(key);
          this.stats.evictions++;
        }
      }
    }

    /**
     * Remove itens mais antigos se cache está cheio
     */
    _evictOldest() {
      if (this.cache.size < this.maxSize) return;

      // Ordena por timestamp (mais antigo primeiro)
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove os mais antigos até ficar abaixo do limite
      const toRemove = this.cache.size - this.maxSize + 1;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
        this.stats.evictions++;
      }
    }

    /**
     * Obtém dados do cache
     * @param {string} endpoint - Endpoint da API
     * @param {object} params - Parâmetros de paginação e filtros
     * @returns {object|null} Dados em cache ou null
     */
    get(endpoint, params = {}) {
      this._cleanExpired();
      
      const key = this._generateKey(endpoint, params);
      const item = this.cache.get(key);

      if (!item) {
        this.stats.misses++;
        return null;
      }

      if (this._isExpired(item)) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return item.data;
    }

    /**
     * Armazena dados no cache
     * @param {string} endpoint - Endpoint da API
     * @param {object} params - Parâmetros de paginação e filtros
     * @param {object} data - Dados para cachear
     */
    set(endpoint, params = {}, data) {
      this._cleanExpired();
      this._evictOldest();

      const key = this._generateKey(endpoint, params);
      this.cache.set(key, {
        data: JSON.parse(JSON.stringify(data)), // Deep clone
        timestamp: Date.now(),
        page: params.page || 1,
        limit: params.limit || 20,
      });
    }

    /**
     * Invalida cache para um endpoint específico
     * @param {string} endpoint - Endpoint a invalidar
     */
    invalidate(endpoint) {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(endpoint)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Limpa todo o cache
     */
    clear() {
      this.cache.clear();
      this.stats = { hits: 0, misses: 0, evictions: 0 };
    }

    /**
     * Retorna estatísticas do cache
     */
    getStats() {
      const total = this.stats.hits + this.stats.misses;
      const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
      
      return {
        ...this.stats,
        size: this.cache.size,
        maxSize: this.maxSize,
        hitRate: `${hitRate}%`,
      };
    }

    /**
     * Pre-carrega páginas adjacentes
     * @param {string} endpoint - Endpoint da API
     * @param {object} currentParams - Parâmetros atuais
     * @param {function} fetchFn - Função para buscar dados
     * @param {number} preloadCount - Quantas páginas pré-carregar
     */
    async preload(endpoint, currentParams, fetchFn, preloadCount = 2) {
      const currentPage = currentParams.page || 1;
      const limit = currentParams.limit || 20;
      
      const preloadPromises = [];
      
      // Pré-carrega páginas anteriores
      for (let i = 1; i <= preloadCount && currentPage - i >= 1; i++) {
        const params = { ...currentParams, page: currentPage - i, limit };
        if (!this.get(endpoint, params)) {
          preloadPromises.push(
            fetchFn(params).then(data => {
              this.set(endpoint, params, data);
            }).catch(() => {
              // Ignora erros no pré-carregamento
            })
          );
        }
      }
      
      // Pré-carrega páginas seguintes
      for (let i = 1; i <= preloadCount; i++) {
        const params = { ...currentParams, page: currentPage + i, limit };
        if (!this.get(endpoint, params)) {
          preloadPromises.push(
            fetchFn(params).then(data => {
              this.set(endpoint, params, data);
            }).catch(() => {
              // Ignora erros no pré-carregamento
            })
          );
        }
      }
      
      // Executa pré-carregamento em background (não bloqueia)
      Promise.all(preloadPromises).catch(() => {
        // Ignora erros
      });
    }
  }

  // Cria instância global
  window.SGVCPaginationCache = new PaginationCache({
    maxSize: 50,
    ttl: 5 * 60 * 1000, // 5 minutos
  });

  // Expõe classe para uso avançado
  window.PaginationCache = PaginationCache;
})();
