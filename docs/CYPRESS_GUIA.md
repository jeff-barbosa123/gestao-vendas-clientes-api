# Cypress — Guia de Estrutura, Execução e Relatórios

Este guia documenta como os testes E2E estão organizados, como executar localmente/CI e onde encontrar evidências (prints, vídeos e relatórios).

> Caminho base: `C:\Projetos\gestao-vendas-clientes-api\gestao-vendas-clientes-api-V1\gestao-vendas-clientes-api-V1\cypress`

## 1. Estrutura de Pastas

- `cypress/e2e/` — especificações de testes (arquivos `.cy.js|.ts`)  
- `cypress/fixtures/` — dados estáticos usados pelos testes  
- `cypress/support/` — comandos custom (ex.: `commands.js`), hooks globais  
- `cypress/screenshots/` — screenshots gerados em falhas (CI/local)  
- `cypress/reports/` — relatórios (se configurado, ex.: Mochawesome, JUnit)

Print:
![cypress-root](./assets/api/cypress-root.png)

## 2. Execução dos Testes

### 2.1 Interativo (GUI)
1) Abra um terminal na raiz do projeto  
2) Execute: `npm run cypress:open` (ou `npx cypress open`)  
3) Escolha o navegador e o spec para rodar.

### 2.2 Headless (CLI)
Execução para CI ou local sem interface:
```
npm run cypress:run
```
ou
```
npx cypress run --browser chrome --headless
```

Parâmetros úteis:
- `--spec "cypress/e2e/**/login.cy.js"` — filtra por arquivo específico  
- `--record --key <CYPRESS_DASHBOARD_KEY>` — integra com Cypress Dashboard  
- `--config video=true,screenshotsFolder=cypress/screenshots`

Print (execução headless):
![cypress-run](./assets/api/cypress-run.png)

## 3. Relatórios e Evidências

- Screenshots: `cypress/screenshots/`
- Vídeos (se habilitado): `cypress/videos/`
- Relatórios HTML (ex.: Mochawesome): `cypress/reports/` e/ou `api/mochawesome-report/`

Integração típica com Mochawesome (exemplo de script no `package.json`):
```json
{
  "scripts": {
    "cypress:run": "cypress run",
    "report:merge": "mochawesome-merge cypress/reports/*.json > cypress/reports/mochawesome.json",
    "report:html": "marge cypress/reports/mochawesome.json --reportDir cypress/reports --inline",
    "test:e2e": "npm run cypress:run && npm run report:merge && npm run report:html"
  }
}
```

Print (relatório HTML):
![cypress-report](./assets/api/cypress-report.png)

## 4. Boas Práticas

- Evite dependência entre testes; cada spec deve ser autossuficiente.  
- Use `fixtures/` para dados determinísticos e fáceis de manter.  
- Centralize login e comandos repetitivos em `support/commands.js`.  
- Nomeie specs de forma clara: `feature.acao.estado.cy.js`.  
- Em falhas intermitentes, utilize `cy.intercept()` para estabilizar integrações externas.

## 5. Variáveis de Ambiente

Configurar via `.env`/`cypress.config`/CI:
- `BASE_URL` — URL da API/sistema sob teste.  
- `AUTH_*` — credenciais e tokens de teste (evitar hardcode em specs).  

Print (config):
![cypress-config](./assets/api/cypress-config.png)

## 6. Checklist de Evidências (prints)

- Print do explorer mostrando `cypress/e2e`, `fixtures`, `support`.  
- Print da execução `cypress run` em terminal.  
- Print do relatório HTML (Mochawesome ou outro).  
- Print de `screenshots/` com um caso de falha (se houver).

