// Identidade da empresa no dashboard: nome ao lado do usuario e atalho para "Aparencia".
// O logotipo fica na navbar (static/nav.js), nao aqui: a miniatura ao lado do avatar ficava espremida.
(() => {
  const btn = document.getElementById('appearance-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      window.location.href = '/appearance.html';
    });
  }

  async function init() {
    try {
      const dto = await window.SGVC.api.request('/api/branding', { method: 'GET', skipAuth: true });
      const box = document.querySelector('.dashboard-userbox');
      if (!box || !dto) return;
      if (dto.companyName) {
        const name = document.createElement('span');
        name.id = 'brand-name';
        name.className = 'brand-name';
        name.textContent = dto.companyName;
        box.prepend(name);
      }
    } catch (_err) {
      // Identidade e opcional: falha aqui nao pode quebrar o dashboard
    }
  }

  init();
})();
