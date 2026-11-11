# Dashboard MVP (SGVC)

## Objetivo
Consolidar informacoes das US001 a US007 sem criar novas regras de negocio.

## Regras
- Sem novas APIs.
- Apenas consumo das rotas existentes.
- Dashboard protegido por autenticacao.

## Mapeamento por User Story
- **US001 (Login/Autenticacao)**: Status da sessao e usuario autenticado.
- **US002 (Clientes/Produtos)**: Contagem de clientes ativos e produtos cadastrados.
- **US003 (Vendas)**: Vendas no mes (somente vendas ativas).
- **US004 (Faturamento)**: Total faturado via `/reports/revenue`.
- **US005 (Ficha Tecnica)**: Contagem de fichas tecnicas cadastradas.
- **US006 (Simulacao de Preco)**: Indicador de disponibilidade da simulacao.
- **US007 (Vinculo Ficha x Produto)**: Contagem de produtos vinculados a ficha tecnica.

## Fluxo
1. Login em `/` (publico).
2. Token salvo no navegador.
3. Acesso ao dashboard em `/dashboard.html` (privado).
4. Sem token valido, redireciona para `/`.
