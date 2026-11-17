/**
 * Exibicao e limpeza de erros de campo de formulario.
 */
export function setFieldError(input, errorEl, message) {
  if (!input) return;
  input.classList.add('is-danger');
  input.setAttribute('aria-invalid', 'true');
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
  }
}

export function clearFieldError(input, errorEl) {
  if (!input) return;
  input.classList.remove('is-danger');
  input.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}
