# SGVC ? Sistema de Gest?o de Vendas e Clientes (API)

## ?? Vis?o Geral
O SGVC ? uma API REST desenvolvida para microempreendedores (confeiteiros, boleiras e cozinheiros),
com foco em **controle financeiro real**, **CMV**, **precifica??o consciente** e **qualidade de dados**.

O sistema foi projetado com abordagem **API-first**, garantindo seguran?a, escalabilidade e integra??o fluida com frontend e relat?rios.

---

## ?? Funcionalidades Implementadas (MVP 1.0)

- ?? Autentica??o de usu?rios (JWT + refresh)
- ?? Cadastro de clientes e produtos
- ?? Registro de vendas
- ?? Faturamento autom?tico e relat?rio financeiro
- ?? Cadastro de ficha t?cnica (custos, overhead, rendimento)
- ?? Simula??o de pre?o ideal (pr?-venda)
- ?? V?nculo ficha t?cnica ? produto (CMV autom?tico)

---

## ?? Arquitetura
- Node.js
- Express
- JWT
- Banco em mem?ria (mock)
- API RESTful
- Testes automatizados com SuperTest + Chai

---

## ?? Qualidade & Testes
O projeto possui QA completo desde o in?cio, incluindo:

- ? Planos de Teste baseados na ISO 29119-3
- ? Testes automatizados de API
- ? Testes de seguran?a (JWT, IDOR, SQLi, XSS)
- ? Testes de performance
- ? Testes explorat?rios baseados em heur?sticas
- ? Tabela de rastreabilidade por User Story

Cobertura atual:
- US001 a US007: **100% testadas (API)**

---

## ?? Seguran?a
- Autentica??o JWT
- Ownership por usu?rio
- Prote??o contra IDOR
- Valida??o de payloads maliciosos
- Limite de tamanho de requisi??o (DoS)

---

## ?? Status do Projeto
- Backend: ? Finalizado (MVP)
- QA: ? Completo (API)
- Frontend: ?? Em desenvolvimento
- CI/CD: ?? Planejado

---

## ????? Autor
Jefferson Paulo  
QA | Automa??o | Qualidade de Software

Projeto desenvolvido como parte de um sistema real para microempreendedores.
