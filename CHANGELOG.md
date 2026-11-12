# Changelog

## 2026-11-12 — Encomendas (US011)

### Novo
- Tela **Encomendas**: cliente (cadastrado ou só o nome), telefone, data e hora de entrega, itens com
  preço do produto ou combinado, sinal (valor e forma de pagamento) e observações.
- **Agenda da semana** agrupada por dia, com total do dia, link de WhatsApp e status
  (a fazer → pronta → entregue, ou cancelada).
- **Entregar vira venda:** escolhe a forma de pagamento do restante e a encomenda é registrada como
  venda, entrando no faturamento, no CMV e na baixa dos insumos (uma vez só, na entrega).
- **Falta de insumo:** aviso com o que as encomendas em aberto da semana vão consumir comparado com o
  estoque (ex.: "faltam 100 g · precisa 400 g, tem 300 g").
- Card **Próximas entregas** no painel (próximos 7 dias).
- API `/api/orders` (lista com `from`, `to`, `status`), `/api/orders/needs`, `/api/orders/{id}` e
  `/api/orders/{id}/status`. Migration 007.

### Ajustado
- Menu mais compacto em telas médias e menu recolhido até 1000 px (com a área nova ele quebrava linha).

### Testes
- `US011-orders.test.js` (9 testes; API com 319 passando) e `encomendas.cy.js` (fluxo completo pela
  tela, backend real).

## 2026-11-12 — Estoque de insumos (US010)

### Novo
- **Estoque por insumo** na unidade base (g, ml ou un), mostrado em kg/l quando passa de 1.000.
  Só é controlado nos insumos com estoque informado; os outros seguem como antes.
- **Baixa automática pela venda:** cada produto com ficha técnica desconta
  (quantidade do item na ficha ÷ rendimento) × quantidade vendida de cada insumo ligado.
  Funciona com a ficha ligada pelo produto (`ficha_tecnica_id`) ou pela ficha (`link_product_id`).
- **Cancelar a venda devolve os insumos** (sem devolver em dobro se cancelar de novo);
  editar os itens refaz a baixa.
- **Entrada de compra:** soma ao estoque e, com o valor pago, atualiza o preço do insumo,
  o que recalcula as fichas e o CMV dos produtos.
- **Contagem** (ajuste para o valor exato) e **estoque mínimo** com aviso de reposição:
  na tela de Insumos (faixa no topo e selo "Repor"), no painel (card "Insumos para repor")
  e na mensagem da venda que fez o insumo chegar ao mínimo.
- Histórico de movimentações (compra, venda, venda cancelada, contagem) com o saldo após cada uma.
- API: `/api/ingredients/low-stock`, `/api/ingredients/{id}/stock/purchases|adjust|min|movements`
  e `DELETE /api/ingredients/{id}/stock`. Migration 006.

### Testes
- `US010-stock.test.js` (12 testes; API com 310 passando) e `estoque-insumos.cy.js`
  (fluxo pela tela contra o backend real).

## 2026-11-12 — Suíte Cypress verde e correções achadas por ela

### Corrigido (telas)
- **Ficha técnica (edição):** um clique em "Salvar" disparava até 3 PUTs; um deles mandava o
  percentual de gastos extras como valor em R$ (10% virava R$ 10) e zerava o lucro fixo. O que ficava
  gravado dependia de qual terminava por último. Ficou só um tratador, o correto.
- **Excluir cliente e excluir ficha técnica** mandavam o DELETE duas vezes (dois tratadores no botão).
- **Cadastro de produto:** havia um segundo tratador de envio, mais frouxo, que podia passar por cima
  da validação e mandava `ficha_tecnica_id` (campo ignorado pela API na criação).
- **Busca de CEP e exportação de clientes** sempre respondiam "Sessão inválida" desde a mudança para
  login por cookie (exigiam um token que não existe mais no navegador).
- **Cadastro e troca de senha** aceitavam senha fraca que a API recusa; agora a regra é a mesma da API
  (8+ caracteres com maiúscula, minúscula, número e caractere especial). O indicador de força segue a
  mesma regra.
- **Login:** "Esqueci minha senha" ganhou link e janela (o código existia, a tela não); "Credenciais
  inválidas" vira "E-mail ou senha incorretos"; a tela não rouba mais o foco de quem já digita no
  cadastro; o botão de mostrar senha anunciava o estado invertido (acessibilidade).
- **Clientes:** valores com separador de milhar (R$ 2.100,00); observações liberam o botão de salvar;
  trocar a UF limpa a cidade do outro estado; acentos em "Próximos N dias" e mensagens de UF.
- **Cadastro (janela):** fechar descarta o que foi digitado.
- **Fichas:** "Gastos extras (15%)" em vez de "(15,00%)"; aviso de limite sem texto duplicado.

### Segurança (API)
- **CORS:** fora de produção qualquer origem era aceita com cookies. Agora vale só localhost e
  `ALLOWED_ORIGINS` (produção continua exigindo a lista). Testes REG-016/017.

### Testes
- Specs Cypress atualizadas para a sessão por cookie (stubs de `/api/auth/me`, resposta neutra para
  chamadas sem stub). Specs de produtos, vendas e perfil reescritas para o layout atual;
  `fluxo-completo.cy.js` virou um fluxo real e curto (antes tentava a senha errada e bloqueava o admin).
- Job `e2e-tests` na CI. API: 298 testes passando.

## 2026-11-12 — Forma de pagamento e alerta de margem (US009)

### Novo
- **Forma de pagamento da venda** (Pix, dinheiro, crédito, débito, outro) no cadastro e na edição,
  exibida nos detalhes. Aceita também nomes em português (`débito`, `dinheiro`). Migration 005.
- Relatório **Faturamento por forma de pagamento** (`GET /api/reports/payment-methods`, mesmos filtros
  de período do faturamento, sem vendas canceladas) com total, quantidade e participação.
- Card **Margem dos produtos** no painel: lista produtos vendidos abaixo do custo e com margem bruta
  abaixo de 30% (`LOW_MARGIN_THRESHOLD`). Vem em `pricingAlerts` no `/api/analytics/overview`.

### Corrigido
- A forma de pagamento era validada pela API e descartada: nunca era gravada.

### Testes
- `US009-margem-pagamento.test.js` (8 testes); suíte da API com 296 passando.

## 2026-11-12 — Cadastro único de insumos (US008)

### Novo
- Tela **Insumos** (`ingredients.html`) e API `/api/ingredients`: preço e embalagem de cada
  ingrediente em um lugar só, com custo por 100 g/ml ou por unidade e em quantas fichas é usado.
- Itens da ficha técnica podem ser ligados a um insumo (`ingredientId`); a ficha sugere os insumos
  cadastrados e preenche embalagem e preço automaticamente.
- Ao mudar o preço de um insumo, **todas as fichas que o usam são recalculadas** e o custo (CMV) dos
  produtos vinculados é atualizado. Fichas com problema são informadas sem bloquear as demais.
- Histórico de preços dos insumos (`ingredient_price_history`), base para acompanhar a variação do CMV.

### Corrigido
- **Precisão do custo**: o custo por grama/ml era arredondado para centavos antes de multiplicar
  (ex.: farinha a R$ 6,50/kg — 500 g custavam R$ 5,00 em vez de R$ 3,25).
- **Arredondamento**: valores como R$ 0,575 viravam R$ 0,57 (agora meio centavo arredonda para cima).
- **Margem da ficha não era gravada**: editar a ficha (mesmo só a descrição) zerava a margem e o preço
  sugerido caía para o custo. Agora a margem fica salva (`recipes.margin`).
- **CSRF nas telas**: 9 telas gravavam sem o header `X-CSRF-Token` e o servidor recusava (403)
  cadastros, edições e o "Sair". O `api-client.js` inclui o token em toda gravação para a API.

### Testes
- `US008-ingredients.test.js` (15 testes); suíte da API com 288 passando.
- Limite global de requisições alto no ambiente de testes (`GLOBAL_RATE_LIMIT_MAX`).

## 2026-11-12 — Sessões persistentes

- Sessões de login gravadas no PostgreSQL (`auth_sessions`, migration 003) com cache em memória.
  Antes ficavam só em memória: cada reinício ou deploy da API deslogava todos os usuários.
- Refresh token de uso único também após reinício; limpeza automática de sessões expiradas.
- Testes REG-013 a REG-015 simulam o reinício da API.

## 2026-11-12 — Revisão de layout e telas

Revisão visual de todas as telas (desktop 1366px e celular 390px) com dados de demonstração.

### Bugs corrigidos (frontend)
- **8 telas inacessíveis**: Produtos, Fichas, Vendas, Vínculos, Relatórios, Simulação, Perfil e
  Monitoramento não carregavam o `api-client.js` e jogavam o usuário de volta para o login.
- **Datas um dia antes**: vendas e datas de nascimento eram exibidas no dia anterior (fuso UTC-3);
  depois das 21h, a data padrão da nova venda já era a de amanhã.
- **Lista de vendas** mostrava "-" no cliente quando a venda era de um cliente cadastrado.
- **Relatórios** abriam zerados ("Sem filtro" descartava todas as vendas).
- **Dashboard**: insight de faturamento ficava em "Carregando..." para sempre; cabeçalho mostrava
  "Usuário" em vez do nome.
- Elementos com `hidden` apareciam (ex.: aviso amarelo vazio no código de barras).
- Login no celular com marca e formulário espremidos lado a lado.

### Layout e textos
- Rodapé deixou de ficar fixo por cima do conteúdo.
- Login: formulário centralizado na área branca e lista de benefícios no lado azul.
- Títulos do relatório estavam quase invisíveis (texto claro sobre fundo branco).
- ~110 textos corrigidos (acentos, caracteres corrompidos como "VocÃª", jargão técnico como
  "comportamento atual"); percentuais com vírgula (65,4%).
- Vínculos: removida a fileira de indicadores repetidos.
- Celular: grupos de campos e botões quebram linha em vez de estourar a tela.
- Acessibilidade: rótulos em 15 campos que não tinham.
- Ficha técnica: atalho "Aviamentos" (termo de costura) trocado por "Recheio".

### Melhorias
- **Menu de navegação** em todas as telas logadas (antes só dava para navegar voltando ao dashboard).
- **Dashboard com CMV e lucro bruto** do período, além do faturamento.
- `api/src/config/loadEnv.js`: carregamento do `.env` centralizado; `npm run db:seed:users` e os
  scripts de migração não carregavam o `.env` e nunca funcionavam.
- Removidos `web/public/styles.css` e `web/public/static/app.js` (nunca eram servidos).

### Testes
- API: 270 passando, 0 falhando (novos REG-011 e REG-012).
- E2E (Cypress): sem regressões em relação à versão anterior. A suíte já tinha muitas falhas antigas
  (testes escritos para o modelo antigo de sessão em `sessionStorage`); ver docs/TESTES.md.

## 2026-11-11 — Varredura, limpeza e correções

### Estrutura do repositório
- A versão atual (antiga pasta `gestao-vendas-clientes-api-V1/gestao-vendas-clientes-api-V1`) passou a
  ser a raiz do projeto. Removidas a V1 antiga, a pasta intermediária, o backup `.zip` (515 MB) e o
  `postgres_15.tar`. O histórico git foi preservado (a V2 já continha todos os commits da V1).
- 76 relatórios `.md` soltos consolidados em `README.md`, `docs/INSTALACAO.md` e `docs/TESTES.md`.
- Removidos temporários e duplicados: `Tmp/`, logs, `cookies.txt`, `.bak`, arquivos de lock do Word,
  `.docx` duplicados, `web/static/` e `api/src/routes/auth.routes.js` (código morto), scripts `.bat`.
- `.gitignore` refeito: `web/` e `cypress/` passam a ser versionados (antes eram ignorados).

### Correções de bugs (API)
- **Rate limit global** usava 5 requisições/minuto por IP em produção para a API inteira → 300/min.
- **Vazamento de dados**: `/api/sales/summary` e `/api/analytics/timeseries` somavam vendas de todos
  os usuários.
- **Faturamento/dashboard** contavam vendas canceladas.
- **Ficha técnica**: alterar ou criar ficha vinculada não atualizava o custo usado no CMV da venda
  (`purchase_price`); remover o vínculo não limpava os campos do produto.
- **Login**: senha errada aparecia como "Sua sessão expirou"; o bloqueio após N tentativas
  devolvia 401 em vez de 423.
- **POST sem corpo** (logout, cancelar venda) era rejeitado com 415.
- **CSRF** bloqueava clientes com `Authorization: Bearer` (Swagger, Postman, testes); agora só se
  aplica a requisições com cookie de sessão.
- **ID em formato inválido** gerava 500 → 404.
- **Dashboard**: `lastSaleAt` mostrava a venda mais antiga.
- Mensagens de erro unificadas (catálogo `pt-BR.json` alinhado com `errorMessages.js`); validação do
  login no mesmo formato de erro do restante da API.
- Removido log temporário que exibia usuário e tamanho da senha do SMTP.

### Melhorias
- `getSaleById` / `getRecipeById` buscam direto por id (antes carregavam a tabela inteira).
- Respostas de venda com formato único (`customerName`/`clienteNome`, `statusVenda`); produtos expõem
  `fichaTecnicaId`; fichas expõem `linkProductId`/`ownerId`.
- Testes usam `api/.env.test` e nunca o banco de desenvolvimento.
- Seed de usuários grava senhas com bcrypt.
- CI com PostgreSQL 15 e Node 20, aplicando schema e seed antes dos testes.

### Testes
- Antes: a suíte quebrava antes de terminar (testes US999 em sintaxe Jest).
- Depois: **268 passando, 0 falhando** (35 pendentes). Novo `US998-regressoes.test.js` cobrindo os
  bugs acima. Testes alinhados às mensagens atuais da API.
