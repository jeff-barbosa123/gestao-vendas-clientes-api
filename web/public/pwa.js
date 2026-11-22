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
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    window.SGVC = window.SGVC || {};
    window.SGVC.canInstall = true;
    const btn = document.getElementById('pwa-install');
    if (btn) btn.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    const btn = document.getElementById('pwa-install');
    if (btn) btn.hidden = true;
  });
  window.SGVC = window.SGVC || {};
  window.SGVC.installApp = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    return choice && choice.outcome === 'accepted';
  };
})();
