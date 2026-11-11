/**
 * SGVC - Proteção contra Perda de Dados Não Salvos
 * 
 * Helper reutilizável para detectar alterações em formulários e avisar o usuário
 * antes de navegar ou fechar a página quando há alterações não salvas.
 * 
 * Uso:
 *   // No início do script da página
 *   const unsavedGuard = new UnsavedChangesGuard('#my-form');
 *   
 *   // Após salvar com sucesso
 *   unsavedGuard.markAsSaved();
 * 
 * @module sgvc-unsaved-changes
 */

(function() {
  'use strict';

  /**
   * Guarda de alterações não salvas
   * Monitora um formulário e avisa o usuário antes de perder dados
   */
  class UnsavedChangesGuard {
    /**
     * @param {string|HTMLElement} formSelector - Seletor CSS ou elemento do formulário
     * @param {Object} options - Opções de configuração
     * @param {string[]} options.ignoreFields - IDs ou classes de campos a ignorar
     * @param {Function} options.onBeforeUnload - Callback customizado para beforeunload
     */
    constructor(formSelector, options = {}) {
      this.form = typeof formSelector === 'string' 
        ? document.querySelector(formSelector)
        : formSelector;
      
      if (!this.form) {
        console.warn('[UnsavedChangesGuard] Formulário não encontrado:', formSelector);
        return;
      }

      this.options = {
        ignoreFields: options.ignoreFields || [],
        onBeforeUnload: options.onBeforeUnload || null,
        ...options
      };

      // Flag que indica se o formulário tem alterações não salvas
      this.formDirty = false;
      
      // Flag para evitar detectar alterações programáticas
      this._programmaticChange = false;
      
      // Referência ao handler beforeunload para poder removê-lo depois
      this._beforeUnloadHandler = null;
      
      // Inicializa o monitoramento
      this._init();
    }

    /**
     * Inicializa o monitoramento do formulário
     * @private
     */
    _init() {
      // Detecta alterações em inputs, selects e textareas
      const fields = this.form.querySelectorAll('input, select, textarea');
      
      fields.forEach(field => {
        // Ignora campos marcados para ignorar
        if (this._shouldIgnoreField(field)) {
          return;
        }

        // Detecta alterações em diferentes tipos de campos
        const eventTypes = ['input', 'change'];
        
        eventTypes.forEach(eventType => {
          field.addEventListener(eventType, (e) => {
            // Ignora se a alteração foi programática
            if (this._programmaticChange) {
              return;
            }
            // Marca o formulário como "dirty" (tem alterações não salvas)
            this.markAsDirty();
          }, { passive: true });
        });
      });

      // Adiciona listener para beforeunload quando necessário
      this._updateBeforeUnloadListener();
    }

    /**
     * Verifica se um campo deve ser ignorado
     * @param {HTMLElement} field - Campo a verificar
     * @returns {boolean}
     * @private
     */
    _shouldIgnoreField(field) {
      if (!this.options.ignoreFields || this.options.ignoreFields.length === 0) {
        return false;
      }

      const fieldId = field.id || '';
      const fieldClass = field.className || '';
      const fieldName = field.name || '';

      return this.options.ignoreFields.some(ignore => {
        if (typeof ignore === 'string') {
          return fieldId === ignore || 
                 fieldClass.includes(ignore) || 
                 fieldName === ignore;
        }
        return false;
      });
    }

    /**
     * Atualiza o listener de beforeunload
     * Adiciona quando há alterações não salvas, remove quando não há
     * @private
     */
    _updateBeforeUnloadListener() {
      // Remove listener anterior se existir
      if (this._beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this._beforeUnloadHandler);
        this._beforeUnloadHandler = null;
      }

      // Adiciona listener apenas se há alterações não salvas
      if (this.formDirty) {
        this._beforeUnloadHandler = (e) => {
          // Callback customizado se fornecido
          if (this.options.onBeforeUnload && typeof this.options.onBeforeUnload === 'function') {
            const result = this.options.onBeforeUnload(e, this);
            if (result === false) {
              return; // Callback cancelou o alerta
            }
          }

          // Alerta padrão do navegador
          // Nota: navegadores modernos ignoram mensagens customizadas por segurança
          const message = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
          e.preventDefault();
          e.returnValue = message; // Chrome requer returnValue
          return message; // Alguns navegadores ainda usam return
        };

        window.addEventListener('beforeunload', this._beforeUnloadHandler);
      }
    }

    /**
     * Marca o formulário como tendo alterações não salvas
     * Ativa a proteção contra perda de dados
     */
    markAsDirty() {
      if (!this.formDirty) {
        this.formDirty = true;
        this._updateBeforeUnloadListener();
      }
    }

    /**
     * Marca o formulário como salvo (sem alterações não salvas)
     * Desativa a proteção contra perda de dados
     */
    markAsSaved() {
      if (this.formDirty) {
        this.formDirty = false;
        this._updateBeforeUnloadListener();
      }
    }

    /**
     * Retorna o estado atual (true = tem alterações não salvas)
     * @returns {boolean}
     */
    isDirty() {
      return this.formDirty;
    }

    /**
     * Define um valor em um campo SEM marcar como "dirty"
     * Útil para preencher campos automaticamente (ex: via CEP, API, etc)
     * @param {string|HTMLElement} fieldSelector - Seletor ou elemento do campo
     * @param {any} value - Valor a definir
     */
    setValueWithoutDirty(fieldSelector, value) {
      const field = typeof fieldSelector === 'string'
        ? this.form.querySelector(fieldSelector)
        : fieldSelector;

      if (!field) {
        console.warn('[UnsavedChangesGuard] Campo não encontrado:', fieldSelector);
        return;
      }

      // Marca que a alteração é programática
      this._programmaticChange = true;

      try {
        // Define o valor de acordo com o tipo de campo
        if (field.type === 'checkbox') {
          field.checked = Boolean(value);
        } else if (field.type === 'radio') {
          field.checked = field.value === String(value);
        } else {
          field.value = value != null ? String(value) : '';
        }

        // Dispara evento 'input' para garantir que máscaras/validações sejam atualizadas
        field.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      } finally {
        // Remove a flag após um pequeno delay para garantir que eventos sejam processados
        setTimeout(() => {
          this._programmaticChange = false;
        }, 0);
      }
    }

    /**
     * Reseta o guard (útil ao limpar o formulário)
     */
    reset() {
      this.markAsSaved();
    }

    /**
     * Destrói o guard e remove todos os listeners
     */
    destroy() {
      if (this._beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this._beforeUnloadHandler);
        this._beforeUnloadHandler = null;
      }
      this.formDirty = false;
      this.form = null;
    }
  }

  // Exporta para uso global
  window.UnsavedChangesGuard = UnsavedChangesGuard;

  // Cria instância global opcional para uso rápido
  // Exemplo: window.unsavedGuard.markAsSaved()
  window.unsavedGuard = window.unsavedGuard || null;
})();
