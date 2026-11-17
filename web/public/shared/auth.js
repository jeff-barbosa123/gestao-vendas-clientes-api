/**
 * Garantia de sessao autenticada: redireciona para o login quando nao ha usuario.
 */
export async function ensureAuthOrRedirect() {
  try {
    const user = await window.apiGetMe();
    if (!user) {
      window.location.href = '/';
      return null;
    }
    return user;
  } catch (_err) {
    if (_err && _err.name === 'AbortError') {
      return null;
    }
    window.location.href = '/';
    return null;
  }
}
