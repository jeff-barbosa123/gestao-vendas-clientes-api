(() => {
  const MAX_LOGO_BYTES = 512 * 1024;
  const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const MIN_RATIO = 4.5;
  const FIELDS = [
    { key: 'primaryColor', id: 'primary-color', fallback: '#4f46e5', against: '#ffffff' },
    { key: 'backgroundColor', id: 'background-color', fallback: '#0b1220', against: '#ffffff' },
    { key: 'textColor', id: 'text-color', fallback: '#f1f5f9', against: '#111c33' }, // texto claro sobre superficie escura
  ];

  const $ = (id) => document.getElementById(id);
  const api = () => window.SGVC.api;
  const apiRequest = (path, options = {}) => api().request(path, { ...options, messageFromServer: true });

  const form = $('appearance-form');
  const message = $('appearance-message');
  const formMessage = $('appearance-form-message');
  const logoMessage = $('logo-message');
  const state = { hasLogo: false, logoUrl: null };

  function show(el, text, isError) {
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.classList.toggle('is-danger', Boolean(isError));
  }

  // WCAG 2.x: mesma formula do backend (api/src/utils/contrast.js)
  function luminance(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v);

  function values() {
    const out = {};
    FIELDS.forEach((f) => {
      const v = $(`${f.id}-hex`).value.trim();
      out[f.key] = isHex(v) ? v.toLowerCase() : null;
    });
    return out;
  }

  function refreshBadges() {
    const v = values();
    let allOk = true;
    FIELDS.forEach((f) => {
      const badge = $(`${f.id}-badge`);
      const hex = v[f.key];
      badge.classList.remove('is-ok', 'is-fail');
      if (!hex) {
        badge.textContent = 'Use #RRGGBB';
        badge.classList.add('is-fail');
        allOk = false;
        return;
      }
      const ratio = contrastRatio(hex, f.against);
      const ok = ratio >= MIN_RATIO;
      badge.textContent = `${ratio.toFixed(2).replace('.', ',')}:1 ${ok ? 'AA aprovado' : 'abaixo de AA'}`;
      badge.classList.add(ok ? 'is-ok' : 'is-fail');
      if (!ok) allOk = false;
    });
    const preview = $('appearance-preview');
    if (v.primaryColor) preview.style.setProperty('--pv-primary', v.primaryColor);
    if (v.backgroundColor) preview.style.setProperty('--pv-bg', v.backgroundColor);
    if (v.textColor) preview.style.setProperty('--pv-text', v.textColor);
    $('preview-name').textContent = $('company-name').value.trim() || 'Sua empresa';
    $('appearance-save').disabled = !allOk;
    return allOk;
  }

  function setColor(f, hex) {
    $(`${f.id}-hex`).value = hex;
    if (isHex(hex)) $(f.id).value = hex;
  }

  function renderLogo() {
    const img = $('logo-preview');
    const prev = $('preview-logo');
    img.hidden = prev.hidden = !state.hasLogo;
    $('logo-empty').hidden = state.hasLogo;
    $('logo-remove').hidden = !state.hasLogo;
    if (state.hasLogo) {
      img.src = prev.src = state.logoUrl;
    } else {
      img.removeAttribute('src');
      prev.removeAttribute('src');
    }
  }

  function applyDto(dto) {
    FIELDS.forEach((f) => setColor(f, dto[f.key] || f.fallback));
    $('company-name').value = dto.companyName || '';
    state.hasLogo = Boolean(dto.hasLogo);
    state.logoUrl = dto.logoUrl || null;
    renderLogo();
    refreshBadges();
  }

  async function load() {
    try {
      await window.apiGetMe();
    } catch (_e) {
      window.location.href = '/index.html';
      return;
    }
    try {
      applyDto(await apiRequest('/api/branding'));
    } catch (err) {
      show(message, err.message || 'Erro ao carregar a aparência.', true);
    }
  }

  FIELDS.forEach((f) => {
    $(f.id).addEventListener('input', () => {
      $(`${f.id}-hex`).value = $(f.id).value;
      refreshBadges();
    });
    $(`${f.id}-hex`).addEventListener('input', () => {
      const v = $(`${f.id}-hex`).value.trim();
      if (isHex(v)) $(f.id).value = v;
      refreshBadges();
    });
  });
  $('company-name').addEventListener('input', refreshBadges);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    show(formMessage, '');
    if (!refreshBadges()) {
      show(formMessage, 'Ajuste as cores: todas precisam atingir o contraste AA (4,5:1).', true);
      return;
    }
    const body = { companyName: $('company-name').value.trim(), ...values() };
    try {
      applyDto(await apiRequest('/api/branding', { method: 'PUT', body: JSON.stringify(body) }));
      show(formMessage, 'Aparência salva. Recarregando o tema...');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      show(formMessage, err.message || 'Erro ao salvar a aparência.', true);
    }
  });

  $('appearance-reset').addEventListener('click', async () => {
    if (!window.confirm('Restaurar cores e logotipo padrão?')) return;
    try {
      applyDto(await apiRequest('/api/branding', { method: 'DELETE' }));
      show(formMessage, 'Padrão restaurado. Recarregando o tema...');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      show(formMessage, err.message || 'Erro ao restaurar.', true);
    }
  });

  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  $('logo-file').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    show(logoMessage, '');
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      show(logoMessage, 'Formato não suportado: use PNG, JPG ou WebP.', true);
      event.target.value = '';
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      show(logoMessage, 'O logotipo deve ter no máximo 512 KB.', true);
      event.target.value = '';
      return;
    }
    try {
      const data = await readAsBase64(file);
      const dto = await apiRequest('/api/branding/logo', {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type, data }),
      });
      state.hasLogo = dto.hasLogo;
      state.logoUrl = dto.logoUrl;
      renderLogo();
      show(logoMessage, 'Logotipo atualizado.');
    } catch (err) {
      show(logoMessage, err.message || 'Erro ao enviar o logotipo.', true);
    }
    event.target.value = '';
  });

  $('logo-remove').addEventListener('click', async () => {
    try {
      const dto = await apiRequest('/api/branding/logo', { method: 'DELETE' });
      state.hasLogo = dto.hasLogo;
      state.logoUrl = dto.logoUrl;
      renderLogo();
      show(logoMessage, 'Logotipo removido.');
    } catch (err) {
      show(logoMessage, err.message || 'Erro ao remover o logotipo.', true);
    }
  });

  const backEl = $('appearance-back');
  if (backEl) backEl.addEventListener('click', () => {
    window.location.href = '/dashboard.html';
  });

  load(); // script com defer: o DOM ja esta pronto
})();
