/**
 * PWA: registra o service worker e oferece "Instalar app" quando o navegador permitir.
 * O SW fica na raiz (/sw.js) para ter escopo em todo o site e nunca guarda respostas de /api.
 */
(() => {
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* sem SW o site segue funcionando */ });
    });
  }

  let deferred = null;
  const button = () => document.getElementById('pwa-install');
  // Mostra/oculta o botao (e o <li> que o envolve) conforme haja prompt de instalacao disponivel.
  const sync = () => {
    const btn = button();
    if (!btn) return;
    const show = !!deferred;
    btn.hidden = !show;
    if (btn.parentElement) btn.parentElement.hidden = !show;
  };

  window.SGVC = window.SGVC || {};
  window.SGVC.installApp = async () => {
    if (!deferred) return false;
    const prompt = deferred;
    deferred = null;
    sync();
    prompt.prompt();
    const choice = await prompt.userChoice;
    return !!choice && choice.outcome === 'accepted';
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    window.SGVC.canInstall = true;
    sync();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    window.SGVC.canInstall = false;
    sync();
  });
  document.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest('#pwa-install')) window.SGVC.installApp();
  });
  // O menu (nav.js) pode ser montado depois do evento: sincroniza de novo quando a pagina termina de carregar.
  window.addEventListener('load', sync);
})();
