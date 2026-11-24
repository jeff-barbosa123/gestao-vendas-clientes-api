// Cadastro de produto recolhivel: aberto quando nao ha produtos, recolhido (um clique para abrir) quando ja ha.
const panel = document.getElementById('products-create-panel');
const toggle = document.getElementById('products-form-toggle');
let userChose = false;

function setOpen(open, focusName) {
  if (!panel || !toggle) return;
  panel.classList.toggle('is-collapsed', !open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Fechar cadastro' : 'Novo produto';
  if (open && focusName) {
    const name = document.getElementById('create-name');
    if (name) {
      panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
      name.focus({ preventScroll: true });
    }
  }
}

if (toggle) {
  toggle.addEventListener('click', () => {
    userChose = true;
    setOpen(toggle.getAttribute('aria-expanded') !== 'true', true);
  });
}

// Chamado apos carregar a lista; nao sobrescreve uma escolha ja feita pelo usuario.
export function syncFormToggle(hasProducts) {
  if (userChose) return;
  setOpen(!hasProducts, false);
}
