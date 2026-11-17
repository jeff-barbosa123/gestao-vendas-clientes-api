/**
 * Validacao do nome da ficha tecnica.
 */
export function validateName(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  return true;
}
