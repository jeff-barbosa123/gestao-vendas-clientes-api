// Esquemas de forma por recurso (usados com `validate({ body: ... })` nas rotas).
// Só tipo/tamanho: obrigatoriedade e regras de negócio continuam nos serviços,
// para manter as mensagens e os status que os testes já cobrem.
const { v } = require("../middleware/validate");

// Tetos GENEROSOS de propósito: aqui só se barra abuso (ex.: nome com 20 mil caracteres).
// Limites de negócio (ex.: nome > 255 -> 422) continuam sendo decididos pelos serviços.
const customerBody = {
  name: v.string({ max: 1000 }),
  email: v.string({ max: 254 }),
  notes: v.string({ max: 2000 }),
};

const productBody = {
  name: v.string({ max: 1000 }),
  description: v.string({ max: 2000 }),
};

// items: lista de objetos. O limite de 1000 itens (413) e os campos de cada item são
// validados pelo salesService.
const saleBody = {
  items: v.array({ of: v.object() }),
};

module.exports = { customerBody, productBody, saleBody };
