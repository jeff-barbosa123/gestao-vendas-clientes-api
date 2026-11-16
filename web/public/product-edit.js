/**
 * Tela de edição de produto (entrada). MÃ³dulos em /product-edit/*.js.
 */
import { productId } from './product-edit/constants.js';
import { ensureAuthOrRedirect, showMessage } from './product-edit/core.js';
import { loadRecipes } from './product-edit/recipes.js';
import { initLoad } from './product-edit/load.js';
import { initEventsForm } from './product-edit/events-form.js';
import { initEventsFields } from './product-edit/events-fields.js';
import { initEventsRecipe } from './product-edit/events-recipe.js';
import { initEventsModals } from './product-edit/events-modals.js';

// Auth via cookie HttpOnly
ensureAuthOrRedirect();

function bootstrap() {
  if (!productId) {
    window.location.href = '/products.html';
    return;
  }

  loadRecipes(null).catch((err) => showMessage(err.message, 'is-danger'));

  initLoad();

  initEventsModals();

  initEventsForm();

  initEventsRecipe();

  initEventsFields();
}

bootstrap();
