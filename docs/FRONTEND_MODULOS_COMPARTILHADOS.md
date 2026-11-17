# Front-end: módulos compartilhados (`web/public/shared/`)

Resultado da rodada de unificação entre `products` × `product-edit` e `recipes` × `recipe-edit`
(2026-11-17). Cada tela continua com seus módulos em `web/public/<tela>/`; o que era idêntico foi movido para
`web/public/shared/` e é importado por `../shared/<modulo>.js`. Os módulos locais mantêm `export { ... }`
dos nomes movidos, então quem já importava de `./core.js`, `./money.js` etc. não mudou.

## O que está compartilhado

| Módulo | Conteúdo | Telas |
| --- | --- | --- |
| `config` | `API_BASE` | products, product-edit, recipes, recipe-edit |
| `http` | `buildUrl`, `apiRequest` | as 4 |
| `form-errors` | `setFieldError`, `clearFieldError` | as 4 |
| `auth` | `ensureAuthOrRedirect` | as 4 |
| `money` | `parseLocaleNumber`, `parsePrice`, `formatPrice`, `formatCurrency`, `sanitizeCurrencyInput`, `bindCurrencyInput` | products, product-edit |
| `text` | `normalizeSpaces`, `toTitleCase`, `standardizeText` | products, product-edit |
| `search` | `normalizeSearch` | products, product-edit |
| `product-name` | `validateName`, `getNameGuidance`, `updateNameGuidance` | products, product-edit |
| `recipe-constants` | `DEFAULT_COMPONENT_NAME`, `INGREDIENTS_URL`, `INGREDIENTS_FALLBACK`, `UNIT_ALIASES`, `catalogByName` | recipes, recipe-edit |
| `recipe-format` | `formatCatalogNumber`, `formatMoney`, `formatQuantity`, `normalizeKgValue` | recipes, recipe-edit |
| `recipe-catalog` | `setMaskedValue`, `findCatalogIngredient` | recipes, recipe-edit |
| `recipe-validators` | `validateName` (ficha técnica) | recipes, recipe-edit |

Regra: módulos de `shared/` não importam de nenhuma tela e não tocam DOM nem estado de tela.

## O que continua por tela (e por quê)

**Mesma lógica, DOM diferente.** As telas de edição usam ids com prefixo (`edit-...`), então funções idênticas
em texto dependem de elementos diferentes:

- `recipes`/`recipe-edit`: ~40 funções (`ingredients.js`, `renderComponent*`, `calc.parseLocaleNumber` e derivadas,
  `validateIngredientFields`, `showMessage`).
- `products`/`product-edit`: `pricing.js` (`updateResale*`, `applyResalePricingRule`, `syncPercentFromPrice`),
  `updateFlowHint`, `updateFinalPriceHint`.

Compartilhar isso exige injetar o DOM (por exemplo `createPricing(dom)` ou prefixo de ids). É uma mudança de
design, não de extração, e os fluxos de ingredientes/preço têm pouca cobertura E2E. Fica como próxima rodada,
começando por `pricing.js`.

**Lógica realmente diferente (decisão de produto/comportamento):**

- `updateProducedPricing`: em `product-edit` há o guarda de revenda e `state.linkedRecipe`; em `products` limpa
  também erro/classe do select de ficha.
- `loadRecipes`/`getSelectedRecipe`/`buildRecipeFuse`/`updateRecipeSelect`: `products` tem guardas
  `Array.isArray` e tratamento de erro/401; `product-edit` não.
- `setProductType`: `products` chama `updateProductTypeCards()`.
- `initEvents`/`initEventsForm`, `state` e `summary`/`components` de receitas: fluxos distintos por tela.

## Divergência corrigida nesta rodada

`validateName`/`getNameGuidance`: `products` aceitava qualquer letra Unicode (`\p{L}`) e `product-edit` só
Latin-1, impedindo salvar na edição um produto criado com nome como "Łódź". Alinhado em `\p{L}`
(`cypress/e2e/product-edit-name.cy.js`).

## Notas

- O ramo `AbortError` de `ensureAuthOrRedirect` (presente em 3 das 4 telas) não é alcançável hoje: o
  `api-client` converte o timeout em `TimeoutError`. Mantido na versão compartilhada.
- Validação estática dos imports: todos os módulos resolvem exports existentes e não há identificadores
  não declarados (verificação feita com script de AST durante a rodada).
