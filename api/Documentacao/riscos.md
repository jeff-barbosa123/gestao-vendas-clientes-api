# Levantamento de Riscos – SGVC (US001 a US007)

## 1. Objetivo
Identificar, analisar e classificar os principais riscos das US001–US007 do SGVC, apoiando priorização de testes e redução de falhas críticas (financeiro, regras de negócio, segurança e integridade de dados).

## 2. Escopo
- Funcionalidades: US001 (Clientes), US002 (Produtos), US003 (Vendas), US004 (Faturamento), US005 (Ficha Técnica), US006 (Simulação de Preço Ideal), US007 (Vínculo Ficha x Produto).
- Testes de API.
- Regras de negócio: CMV, cálculo de preços, faturamento, integridade de dados e autorização.

## 3. Metodologia (RBT)
- Impacto: consequência para o negócio.
- Probabilidade: chance de ocorrer.
- Classificação: 🔴 Crítico | 🟠 Alto | 🟡 Médio | 🟢 Baixo.
- Matriz detalhada mantida em planilha viva (Impacto x Probabilidade). Este arquivo é o resumo estático.

## 4. Categorias de Risco
- Financeiro (CMV, preço, faturamento, lucro)
- Regra de Negócio (lógica essencial)
- Técnico (validação, consistência, integridade)
- Segurança (auth/autorizações, IDOR)
- Operacional (usabilidade/fluxo do usuário)

## 5. Riscos e Cenários Prioritários (Resumo)

### Tabela CSV (para colar na planilha)
```
US,Risco,Impacto,Probabilidade,Nível,Cenários prioritários
US005,CMV/custos incorretos; rendimento inválido; owner errado,Alto,Médio,🔴,"Criar ficha válida; rendimento zero/negativo (400); owner errado (403); nome duplicado (409); recálculo após alterar custo"
US006,Simulação incorreta (margem/CMV/preço); simular receita de outro usuário,Alto,Médio,🔴,"Margem mínima/negativa/extrema; receita inexistente (404)/outro usuário (403); CMV alterado; simular sem ficha/entrega"
US007,Vínculo errado (outro usuário); conflito; rendimento zero; custos não sincronizados,Alto,Médio,🔴,"Vincular ficha válida (200); IDs faltantes (400); produto/ficha inexistente (404); ficha de outro usuário (403); já vinculado (409); rendimento zero (400); atualizar ficha e validar ressincronização; remover vínculo e limpar custos; consultar ficha vinculada"
US003,Venda com CMV errado; venda duplicada; itens inválidos; estoque insuficiente,Alto,Baixa/Média,🟠,"Venda válida com produto de ficha; venda duplicada; lista vazia; valor manual divergente; produto sem purchase_price; estoque insuficiente; cancelar e validar impacto"
US004,Faturamento inclui canceladas ou filtros errados,Médio,Baixa,🟡,"Filtrar por período; excluir canceladas; exportar relatório consistente"
US001/US002,Cadastros inválidos ou cross-tenant,Médio,Baixa,🟡,"Campos obrigatórios; e-mail/price/purchase_price inválidos; owner incorreto onde aplicável"
```

### Destaques por US
- **US005 – Ficha Técnica (🔴)**: CMV/custos errados; rendimento zero/negativo bloqueado; owner incorreto (403); recálculo após alterar custo/ingrediente; exportação consistente.
- **US006 – Simulação (🔴)**: margens mín/neg/alta; receita inexistente (404) ou de outro usuário (403); CMV alterado; simular sem ficha; taxas/entrega.
- **US007 – Vínculo Ficha x Produto (🔴)**: IDs faltantes (400); produto/ficha inexistente (404); ficha de outro usuário (403); conflito (409); rendimento zero (400); ressincronizar após atualizar ficha; remover vínculo e limpar custos; consultar ficha vinculada.
- **US003 – Vendas (🟠)**: CMV automático de ficha; duplicidade; itens vazios; valor manual divergente; produto sem purchase_price; estoque insuficiente; cancelamento e impacto em faturamento.
- **US004 – Faturamento (🟡)**: filtros de período; excluir canceladas; exportação coerente.
- **US001/US002 – Cadastros (🟡)**: obrigatórios e validações (e-mail, price, purchase_price); owner incorreto onde aplicável.

## 6. Cobertura de Testes Atual
- **Automatizados (Mocha/Supertest):**
  - US007: sucesso/erros (400/403/404/409), ressincronização de custos, remoção/consulta de vínculo (`test/integration/US007-products-ficha.test.js`).
  - US006: simulação (limites, receita inexistente/IDOR, overheads, GET/POST) (`test/integration/US006-price-simulation.test.js`).
  - US005: rendimento zero (400) e acesso de outro usuário (403) (`test/integration/US005-recipes.test.js`).
  - US003: vendas com CMV automático de ficha, estoque, validações e segurança (`test/integration/US003-sales.test.js`).
  - US001/US002: login, clientes, produtos (obrigatórios/validações).
- **Observação:** matriz viva deve ser atualizada conforme novos testes/regressões.

## 7. Mitigações
- Executar cenários críticos/altos antes de releases.
- Manter testes de API em regressão (já em `npm test`).
- Revisar este artefato e a planilha viva a cada mudança de regra ou bug encontrado.
