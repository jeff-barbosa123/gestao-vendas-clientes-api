# Roteiro de Evidências (Prints) e Padronização

Este roteiro orienta a coleta de prints e define padrões de nomenclatura/idioma para manter a documentação consistente.

## 1. Padrões de Nomenclatura para Arquivos de Print

- Formato: `<seção>-<subseção>.png`  
  - Ex.: `routes-list.png`, `services-analytics.png`, `cypress-run.png`
- Usar sempre `kebab-case` e idioma: Português para docs; Inglês para código.
- Salvar prints em: `docs/assets/api/`

## 2. Como Capturar Prints no Windows

- No Explorer, habilitar o painel “Detalhes” (mostra caminho/metadata).  
- Capturar a janela completa quando possível.  
- Dica: `Win + Shift + S` (Ferramenta de Captura) e salvar direto na pasta alvo.

## 3. Lista de Evidências por Pastas

- `api/backup` — print com `sgvc-empty.json` e `sgvc-export.json`  
- `api/fixtures` — print listando `customers.json` e `products.json`  
- `api/logs` — print mostrando `application.log`, `audit.log`, `error.log`  
- `api/migrations` — print listando `001_*` e `002_*`  
- `api/resources` — print destacando `swagger.json`  
- `api/scripts` — print listando scripts principais  
- `api/src` — print da árvore de pastas (controllers, services, routes, etc.)  
- `api/src/controllers` — print do conteúdo  
- `api/src/services` — print do conteúdo  
- `api/src/routes` — print do conteúdo  
- `api/src/middleware` — print do conteúdo  
- `api/src/db` — print do conteúdo  
- `cypress/` — print raiz e subpastas `e2e`, `fixtures`, `support`  
- Execução Cypress (terminal) — print do `cypress run`  
- Relatório de testes — print do HTML (Mochawesome)  
- Dependências — print do `npm ls --depth=0` e dos artefatos em `reports/`

## 4. Idioma e Estilo

- Código (nomes de pastas/arquivos, variáveis e funções): Inglês.  
- Mensagens de erro para o usuário: Português.  
- Documentação interna (`docs/*`): Português.

## 5. Convenções de Camadas (Regra de Ouro)

- Nenhuma lógica de negócio em `routes/` ou `controllers/`.  
- `controllers/` → orquestram; `services/` → regras de negócio; `models/db/` → dados.  
- `middleware/` → cross-cutting (auth, validação, auditoria).  
- `utils/` → funções puras/reutilizáveis, sem dependência de framework.

