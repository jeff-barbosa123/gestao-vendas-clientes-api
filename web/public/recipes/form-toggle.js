// Cadastro de ficha tecnica recolhivel: aberto quando nao ha fichas, recolhido (um clique para abrir) quando ja ha.
const panel = document.getElementById('recipes-create-panel');
const toggle = document.getElementById('recipes-form-toggle');
let userChose = false;

function setOpen(open, focusName) {
  if (!panel || !toggle) return;
  panel.classList.toggle('is-collapsed', !open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Fechar cadastro' : 'Nova ficha';
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
export function syncFormToggle(hasRecipes) {
  if (userChose) return;
  setOpen(!hasRecipes, false);
}
