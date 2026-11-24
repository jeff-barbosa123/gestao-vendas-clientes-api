// Cadastro de cliente recolhivel: aberto quando nao ha clientes, recolhido (um clique para abrir) quando ja ha.
const panel = document.getElementById('clients-create-panel');
const toggle = document.getElementById('clients-form-toggle');
let userChose = false;

function setOpen(open, focusName) {
  if (!panel || !toggle) return;
  panel.classList.toggle('is-collapsed', !open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Fechar cadastro' : 'Novo cliente';
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
export function syncFormToggle(hasClients) {
  if (userChose) return;
  setOpen(!hasClients, false);
}
