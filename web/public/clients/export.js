/**
 * ExportaÃ§Ã£o de clientes.
 */
import { filterButtons, searchInput } from './dom.js';
import { buildUrl, showMessage } from './core.js';

// ============================================
// EXPORTAÇÃO DE CLIENTES
// ============================================
const clientsExportBtn = document.getElementById('clients-export-btn');

const clientsExportFormat = document.getElementById('clients-export-format');

export function initExport() {
  if (clientsExportBtn) {
    clientsExportBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[EXPORT] 🖱️ Clique detectado no botão de exportação');
      

      const format = clientsExportFormat ? clientsExportFormat.value : 'csv';
      const currentSearch = searchInput ? searchInput.value.trim() : '';
      
      console.log('[EXPORT] 📋 Parâmetros:', { format, currentSearch });
      
      // Construir query com filtros atuais
      const params = new URLSearchParams();
      params.set('format', format);
      
      if (currentSearch) {
        params.set('search', currentSearch);
      }
      
      // Adicionar filtros
      const activeFilterBtn = Array.from(filterButtons || []).find(b => b && b.classList.contains('is-active'));
      if (activeFilterBtn && activeFilterBtn.dataset.filter) {
        const filter = activeFilterBtn.dataset.filter;
        if (filter !== 'all') {
          params.set('filter', filter);
          console.log('[EXPORT] 🔍 Filtro ativo:', filter);
        }
      }

      // Construir URL da API usando buildUrl para consistência
      const url = buildUrl(`/api/export/customers?${params.toString()}`);
      
      console.log('[EXPORT] 🌐 URL da requisição:', url);
      
      const originalText = clientsExportBtn.textContent;
      clientsExportBtn.disabled = true;
      clientsExportBtn.classList.add('is-loading');
      clientsExportBtn.textContent = 'Exportando...';

      try {
        // Define Accept header baseado no formato
        let acceptHeader = 'text/csv';
        if (format === 'json') acceptHeader = 'application/json';
        else if (format === 'pdf') acceptHeader = 'application/pdf';
        else if (format === 'excel') acceptHeader = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': acceptHeader,
          },
        });

        console.log('[EXPORT] 📡 Resposta recebida:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: response.headers.get('content-type')
        });

        if (!response.ok) {
          let errorMessage = 'Falha ao gerar o arquivo.';
          const text = await response.text();
          console.error('[EXPORT] ❌ Erro na resposta:', text);
          try {
            const payload = JSON.parse(text);
            errorMessage = payload.message || payload.error || errorMessage;
          } catch (_err) {
            if (text) errorMessage = text;
          }
          throw new Error(errorMessage);
        }

        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition');
        let filename = 'clientes.csv';
        
        if (disposition) {
          const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^"]+)"?/);
          if (match) {
            filename = decodeURIComponent(match[1] || match[2]).trim();
          }
        } else {
          let extension = 'csv';
          if (format === 'json') extension = 'json';
          else if (format === 'pdf') extension = 'pdf';
          else if (format === 'excel') extension = 'xlsx';
          const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          filename = `clientes_${timestamp}.${extension}`;
        }

        console.log('[EXPORT] 💾 Arquivo gerado:', filename, 'Tamanho:', blob.size, 'bytes');

        const link = document.createElement('a');
        const urlBlob = URL.createObjectURL(blob);
        link.href = urlBlob;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(urlBlob);
        }, 100);
        
        console.log('[EXPORT] ✅ Download iniciado com sucesso');
        showMessage('Download iniciado com sucesso.', 'is-success');
      } catch (err) {
        console.error('[EXPORT] ❌ Erro completo:', err);
        showMessage(err.message || 'Erro ao exportar clientes. Verifique o console para mais detalhes.', 'is-danger');
      } finally {
        clientsExportBtn.disabled = false;
        clientsExportBtn.classList.remove('is-loading');
        clientsExportBtn.textContent = originalText;
      }
    });
    console.log('[EXPORT] ✅ Evento de exportação configurado com sucesso');
  } else {
    console.warn('[EXPORT] ⚠️ Botão de exportação não encontrado no DOM');
  }
}
