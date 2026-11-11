/**
 * Utilitário para skeleton loading states
 * Melhora a percepção de performance mostrando placeholders durante carregamento
 */

(() => {
  /**
   * Cria um elemento skeleton para tabela
   * @param {number} rows - Número de linhas
   * @param {number} cols - Número de colunas
   * @returns {HTMLElement} Elemento skeleton
   */
  function createTableSkeleton(rows = 5, cols = 5) {
    const table = document.createElement('table');
    table.className = 'table is-fullwidth';
    table.setAttribute('aria-label', 'Carregando dados...');
    table.setAttribute('aria-busy', 'true');
    
    const tbody = document.createElement('tbody');
    tbody.className = 'skeleton-tbody';
    
    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      tr.className = 'skeleton-row';
      for (let j = 0; j < cols; j++) {
        const td = document.createElement('td');
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton';
        // Varia a largura para parecer mais realista
        const width = j === 0 ? '60%' : j === cols - 1 ? '30%' : '40%';
        skeleton.style.width = width;
        skeleton.style.height = '1rem';
        skeleton.style.marginBottom = '0.5rem';
        td.appendChild(skeleton);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    return table;
  }

  /**
   * Cria skeleton para cards/listas
   * @param {number} count - Número de cards
   * @returns {HTMLElement} Container com skeletons
   */
  function createCardSkeleton(count = 3) {
    const container = document.createElement('div');
    container.className = 'skeleton-container';
    container.setAttribute('aria-label', 'Carregando...');
    container.setAttribute('aria-busy', 'true');
    
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton-card';
      
      // Título
      const title = document.createElement('div');
      title.className = 'skeleton';
      title.style.width = '70%';
      title.style.height = '1.25rem';
      title.style.marginBottom = '1rem';
      
      // Conteúdo
      const content = document.createElement('div');
      content.className = 'skeleton';
      content.style.width = '100%';
      content.style.height = '0.875rem';
      content.style.marginBottom = '0.5rem';
      
      const content2 = document.createElement('div');
      content2.className = 'skeleton';
      content2.style.width = '85%';
      content2.style.height = '0.875rem';
      
      card.appendChild(title);
      card.appendChild(content);
      card.appendChild(content2);
      container.appendChild(card);
    }
    
    return container;
  }

  /**
   * Cria skeleton para lista de itens
   * @param {number} count - Número de itens
   * @returns {HTMLElement} Lista skeleton
   */
  function createListSkeleton(count = 5) {
    const list = document.createElement('ul');
    list.className = 'skeleton-list';
    list.setAttribute('aria-label', 'Carregando lista...');
    list.setAttribute('aria-busy', 'true');
    
    for (let i = 0; i < count; i++) {
      const item = document.createElement('li');
      item.className = 'skeleton-item';
      
      const line1 = document.createElement('div');
      line1.className = 'skeleton';
      line1.style.width = '80%';
      line1.style.height = '1rem';
      line1.style.marginBottom = '0.5rem';
      
      const line2 = document.createElement('div');
      line2.className = 'skeleton';
      line2.style.width = '50%';
      line2.style.height = '0.75rem';
      
      item.appendChild(line1);
      item.appendChild(line2);
      list.appendChild(item);
    }
    
    return list;
  }

  /**
   * Remove todos os skeletons de um container
   * @param {HTMLElement} container - Container que contém skeletons
   */
  function removeSkeletons(container) {
    if (!container) return;
    
    const skeletons = container.querySelectorAll('.skeleton-tbody, .skeleton-container, .skeleton-list, [aria-busy="true"]');
    skeletons.forEach(skeleton => {
      skeleton.remove();
    });
  }

  // CSS para skeleton loading (adiciona ao head se não existir)
  function injectSkeletonStyles() {
    if (document.getElementById('skeleton-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'skeleton-styles';
    style.textContent = `
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s ease-in-out infinite;
        border-radius: 4px;
      }
      
      @keyframes skeleton-loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
      
      .skeleton-row td {
        padding: 1rem 0.75rem;
      }
      
      .skeleton-card {
        padding: 1rem;
        margin-bottom: 1rem;
        background: #fafafa;
        border-radius: 4px;
      }
      
      .skeleton-item {
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .skeleton-container,
      .skeleton-list {
        opacity: 0.7;
      }
      
      [aria-busy="true"] {
        pointer-events: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  }

  // Injeta estilos ao carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSkeletonStyles);
  } else {
    injectSkeletonStyles();
  }

  // Expõe funções globalmente
  window.SGVCSkeleton = {
    createTableSkeleton,
    createCardSkeleton,
    createListSkeleton,
    removeSkeletons,
  };
})();
