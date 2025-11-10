## Projeto: API de Gestão de Vendas e Clientes

Esta API REST, construída com Express, implementa as funcionalidades e regras de negócio do sistema de gestão de vendas e clientes. Inclui autenticação JWT via middleware, armazenamento em memória, documentação Swagger e endpoint para exportação de relatórios (CSV/PDF).

### Como executar

- Requisitos: Node.js 18+
- Instalar dependências: `npm install`
- Ambiente (opcional): `set JWT_SECRET="sua_chave_segura"`
- Desenvolvimento: `npm run dev`
- Produção: `npm start`

Servidor em `http://localhost:3000` com base `/api`.

### Credenciais padrão (demo)

- E-mail: `admin@negocio.com`
- Senha: `admin123`

### Documentação Swagger

- UI: `GET /api/docs`
- JSON: `GET /api/docs/raw` (arquivo em `resources/swagger.json`)

### Autenticação

- `POST /api/auth/login` retorna um token JWT.
- Envie `Authorization: Bearer <token>` nas demais rotas.
- Regras:
  - Após 3 tentativas erradas de login, bloqueia por 15 minutos (403).
  - Sessão expira por inatividade de 30 minutos (401). Implementado via verificação em middleware e store de tokens em memória.
  - `POST /api/auth/logout` revoga o token ativo.

### Camadas

- `src/routes`: definição das rotas
- `src/controllers`: orquestram requisições/respostas
- `src/services`: regras de negócio
- `src/models`: banco em memória e fábricas
- `src/middleware`: autenticação JWT e tratamento de erros

### Banco de dados em memória

- Estruturas: usuários, clientes, produtos, vendas e tokens.
- Não persistente; reinicia a cada execução.

### Endpoints principais

- Auth: `/auth/login`, `/auth/logout`
- Clientes: `/customers` (CRUD, e-mail único)
- Produtos: `/products` (CRUD, nome e preço obrigatórios)
- Vendas: `/sales` (CRUD básico, cancelamento, regra de não editar cancelada)
- Relatórios: `/reports/revenue` (total, dia, semana, mês com filtros `start`/`end`), `/reports/revenue/export?format=csv|pdf|excel`

### Códigos de erro

- 400: validação/entrada inválida
- 401: não autorizado/token inválido ou sessão inativa
- 403: login bloqueado por tentativas
- 404: recurso não encontrado
- 409: conflito (e-mail duplicado)
- 422: regra de negócio impede operação
- 500: erro interno

---

## Regras de Negócio (Contexto)

1) Funcionalidade: Login de Empreendedores
Como um microempreendedor,
Eu quero realizar login no sistema,
Para que eu possa acessar e gerenciar minhas informações de vendas e clientes.

Regras de Negócio:
- O login deve validar e-mail e senha cadastrados.
- O sistema deve impedir tentativas com credenciais incorretas.
- Após 3 tentativas erradas, o acesso deve ser temporariamente bloqueado por 15 minutos.
- O sistema deve manter a sessão ativa por tempo limitado (ex: 30 minutos de inatividade).

2) Funcionalidade: Cadastro de Clientes e Produtos
Como um empreendedor,
Eu quero cadastrar meus clientes e produtos,
Para que eu possa registrar vendas e acompanhar meu estoque de forma organizada.

Regras de Negócio:
- Não pode haver clientes com e-mails duplicados.
- Cada produto deve ter nome e preço obrigatórios.
- O empreendedor pode editar ou excluir produtos e clientes.
- O sistema deve validar campos obrigatórios antes de salvar o cadastro.

3) Funcionalidade: Registro de Vendas e Faturamento
Como um empreendedor,
Eu quero registrar minhas vendas,
Para que eu possa visualizar e acompanhar meu faturamento diário e mensal.

Regras de Negócio:
- Cada venda deve conter cliente, produto, valor e data.
- O sistema deve calcular automaticamente o total de faturamento.
- Não é permitido registrar uma venda sem cliente e produto vinculados.
- O sistema deve permitir editar ou cancelar vendas realizadas.

4) Funcionalidade: Visualização do Total de Faturamento
Como um empreendedor,
Eu quero visualizar o total do meu faturamento,
Para que eu possa acompanhar meus ganhos e avaliar o desempenho das minhas vendas.

Regras de Negócio:
- O sistema deve exibir o faturamento total diário, semanal e mensal.
- Deve permitir filtros por período (ex: data inicial e final).
- O cálculo deve considerar apenas vendas confirmadas.
- O empreendedor pode exportar o relatório em formato PDF ou Excel (CSV para Excel).

