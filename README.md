🧩 README.md — API de Gestão de Vendas e Clientes
# 💼 Software para Gestão de Vendas e Clientes

API RESTful desenvolvida durante o **Implementation Day**, com o objetivo de gerenciar **clientes, produtos e vendas** de microempreendedores.

---

## ⚙️ Tecnologias Utilizadas

- **Node.js** + **Express**
- **JWT Authentication**
- **Swagger UI** para documentação
- **Mocha + Chai** para testes automatizados
- **Cypress / Postman** para automação QA
- **Git + GitHub** para versionamento e integração contínua

---

## 📁 Estrutura de Pastas

```bash
📦 Software-para-Gestao-de-Vendas-e-Clientes
├── 📁 API
│   ├── src/                # Código-fonte principal
│   ├── test/               # Testes automatizados (Mocha / Chai)
│   ├── package.json        # Dependências e scripts
│   ├── .gitignore          # Regras de exclusão do Git
│   └── README.md           # Documentação local da API
│
├── 📁 Documentação          # Planos de teste, estratégias e artefatos QA
├── .env.exemplo             # Modelo de variáveis de ambiente
├── .gitignore               # Ignora node_modules, .env e caches
└── README.md                # Este arquivo

🚀 Como Executar o Projeto
1️⃣ Clonar o repositório:
git clone https://github.com/jeff-barbosa123/Software-para-Gest-o-de-Vendas-e-Clientes.git

2️⃣ Acessar a pasta da API:
cd Software-para-Gest-o-de-Vendas-e-Clientes/API

3️⃣ Instalar dependências:
npm install

4️⃣ Criar o arquivo .env:

Baseado no .env.exemplo da raiz.

Exemplo:

PORT=3000
JWT_SECRET=minha_chave_segura

5️⃣ Iniciar o servidor:
npm start


A API ficará disponível em:
👉 http://localhost:3000

🧪 Testes Automatizados
Testes unitários (Mocha + Chai)
npm test

Testes de integração (Postman / Cypress)

Arquivos de coleção disponíveis em /Documentação/fixtures

Logs e evidências em /Documentação/reports

📊 Documentação Swagger

Acesse:
👉 http://localhost:3000/api-docs

Interface interativa para explorar e testar os endpoints da API.

🧱 Funcionalidades Principais
Endpoint	Método	Descrição
/auth/login	POST	Autenticação de empreendedores
/clientes	CRUD	Cadastro e consulta de clientes
/produtos	CRUD	Cadastro de produtos
/vendas	POST	Registro de vendas e faturamento
/relatorios	GET	Visualização de faturamento total
👩‍💻 Sobre o Projeto

Este projeto foi criado como parte de um desafio técnico para consolidar conhecimentos em:

Qualidade de Software (QA)

Automação de Testes

Desenvolvimento de APIs REST

Documentação e boas práticas ágeis

🧩 Autor

Jefferson Barbosa
📧 GitHub https://github.com/jeff-barbosa123

💼 Técnico de Qualidade | QA | Automação de Testes
🌐 LinkedIn https://www.linkedin.com/in/jeffersonpaulo-/

📄 Licença: MIT
Desenvolvido com ❤️ e foco em qualidade.
