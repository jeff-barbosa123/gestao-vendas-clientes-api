/**
 * Infinite Scroll para Paginação
 * Permite carregar mais itens ao rolar a página
 */

(() => {
  'use strict';

  /**
   * Classe para gerenciar infinite scroll
   */
  class InfiniteScroll {
    constructor(options = {}) {
      this.container = options.container || document.body;
      this.endpoint = options.endpoint;
      this.fetchFn = options.fetchFn; // Função que retorna Promise
      this.renderFn = options.renderFn; // Função que renderiza itens
      this.token = options.token;
      
      this.currentPage = 1;
      this.limit = options.limit || 20;
      this.hasMore = true;
      this.isLoading = false;
      this.items = [];
      this.total = 0;
      
      this.threshold = options.threshold || 200; // pixels antes do fim
      this.loadingIndicator = options.loadingIndicator || null;
      this.errorMessage = options.errorMessage || null;
      
      this.scrollHandler = this._handleScroll.bind(this);
      this._init();
    }

    _init() {
      // Cria indicador de loading se não fornecido
      if (!this.loadingIndicator) {
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'infinite-scroll-loading';
        this.loadingIndicator.hidden = true;
        this.loadingIndicator.innerHTML = '<p>Carregando mais itens...</p>';
        this.container.appendChild(this.loadingIndicator);
      }

      // Adiciona listener de scroll
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      
      // Carrega primeira página
      this.loadMore();
    }

    /**
     * Verifica se deve carregar mais itens
     */
    _shouldLoadMore() {
      if (this.isLoading || !this.hasMore) return false;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Verifica se está próximo do fim
      return (scrollTop + windowHeight + this.threshold) >= documentHeight;
    }

    /**
     * Handler de scroll
     */
    _handleScroll() {
      if (this._shouldLoadMore()) {
        this.loadMore();
      }
    }

    /**
     * Carrega mais itens
     */
    async loadMore() {
      if (this.isLoading || !this.hasMore) return;

      this.isLoading = true;
      this.loadingIndicator.hidden = false;
      
      if (this.errorMessage) {
        this.errorMessage.hidden = true;
      }

      try {
        const params = {
          page: this.currentPage,
          limit: this.limit,
        };

        const data = await this.fetchFn(params, this.token);
        
        // Suporta formato paginado e não paginado
        let newItems = [];
        let pagination = null;
        
        if (data && data.items && data.pagination) {
          newItems = data.items || [];
          pagination = data.pagination;
          this.total = pagination.total || 0;
          this.hasMore = pagination.hasNextPage || false;
        } else if (Array.isArray(data)) {
          newItems = data;
          this.hasMore = data.length === this.limit; // Assume que se retornou menos que limit, não há mais
        } else if (data && Array.isArray(data.items)) {
          newItems = data.items;
          this.hasMore = newItems.length === this.limit;
        }

        if (newItems.length > 0) {
          this.items = [...this.items, ...newItems];
          this.currentPage++;
          
          // Renderiza novos itens
          if (this.renderFn) {
            this.renderFn(newItems, this.items);
          }
        } else {
          this.hasMore = false;
        }

      } catch (err) {
        console.error('Infinite scroll error:', err);
        if (this.errorMessage) {
          this.errorMessage.textContent = 'Erro ao carregar mais itens. Tente novamente.';
          this.errorMessage.hidden = false;
        }
        // Não incrementa página em caso de erro para permitir retry
      } finally {
        this.isLoading = false;
        this.loadingIndicator.hidden = true;
      }
    }

    /**
     * Reseta o infinite scroll
     */
    reset() {
      this.currentPage = 1;
      this.hasMore = true;
      this.items = [];
      this.total = 0;
      this.isLoading = false;
      if (this.loadingIndicator) {
        this.loadingIndicator.hidden = true;
      }
      if (this.errorMessage) {
        this.errorMessage.hidden = true;
      }
    }

    /**
     * Destrói o infinite scroll e remove listeners
     */
    destroy() {
      window.removeEventListener('scroll', this.scrollHandler);
      if (this.loadingIndicator && this.loadingIndicator.parentNode) {
        this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
      }
    }

    /**
     * Retorna estatísticas
     */
    getStats() {
      return {
        currentPage: this.currentPage,
        itemsLoaded: this.items.length,
        total: this.total,
        hasMore: this.hasMore,
        isLoading: this.isLoading,
      };
    }
  }

  // CSS para loading indicator
  if (!document.getElementById('infinite-scroll-styles')) {
    const style = document.createElement('style');
    style.id = 'infinite-scroll-styles';
    style.textContent = `
      .infinite-scroll-loading {
        padding: 2rem;
        text-align: center;
        color: #666;
      }
      
      .infinite-scroll-loading p {
        margin: 0;
      }
      
      .infinite-scroll-error {
        padding: 1rem;
        background: #fee;
        border: 1px solid #fcc;
        border-radius: 4px;
        margin: 1rem 0;
        color: #c33;
      }
    `;
    document.head.appendChild(style);
  }

  // Expõe classe globalmente
  window.InfiniteScroll = InfiniteScroll;
})();
