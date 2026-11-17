// Identidade da empresa no dashboard: logotipo + nome ao lado do usuario e atalho para "Aparencia".
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
      if (dto.hasLogo && dto.logoUrl) {
        const img = document.createElement('img');
        img.id = 'brand-logo';
        img.className = 'brand-logo';
        img.alt = dto.companyName ? `Logotipo ${dto.companyName}` : 'Logotipo da empresa';
        img.src = dto.logoUrl;
        box.prepend(img);
      }
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
