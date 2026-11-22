# Plano de produto SGVC — pré-produção

Decisões (Jefferson, nov/2026):
- **Público amplo e flexível**: alimentação/produção artesanal (fichas técnicas + insumos) **e** varejo (produtos prontos/revenda). Cada empresa ativa só o que faz sentido (módulos opcionais e campos extras em Configurações/White-Label).
- **Equipe**: base de Perfis (Dono, Gerente, Vendedor/Caixa, Estoquista) **antes** de haver dados reais — mudar o modelo multiempresa depois é arriscado.
- **Cobrança**: lançamento gratuito para validar; assinatura fica para fase posterior.

## Fase 1 — Bloco 1: conta e primeiros passos (entregue)
| Item | Entrega |
|---|---|
| Senha p/ usuário Google | `/auth/me` informa `hasPassword`/`authProvider`; perfil troca o formulário por "Enviar link para definir senha"; `change-password` responde `NO_LOCAL_PASSWORD` (400) |
| Campo `@usuário` | Editável no perfil (usa `PUT /auth/me` com `username`) |
| Sessões ativas | Migração 0008 (`user_agent`, `pair_jti`); `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `POST /auth/sessions/revoke-others`; logout passa a invalidar também o refresh token |
| Atalho da empresa | Card "Sua empresa" no perfil → Aparência/White-Label |
| `error-monitoring` | Restrito ao admin da plataforma (`PLATFORM_ADMIN_EMAILS`; fora de produção, o admin do seed). Antes qualquer usuário via erros de todas as empresas |
| Onboarding | Checklist "Primeiros passos" no dashboard (empresa, cliente, produto, ficha opcional, 1ª venda), dispensável |

## Fase 2 — Perfis, Equipe e módulos opcionais (entregue)
- Tabela `memberships` (empresa × usuário × papel) e migração dos usuários atuais como **Dono** da própria empresa (`owner_id` continua sendo a chave de tenant).
- Papéis: **Dono** (tudo), **Gerente** (tudo exceto equipe/cobrança/empresa), **Vendedor/Caixa** (clientes, vendas, consulta de produtos; sem custo/CMV), **Estoquista** (insumos, estoque, produtos; sem financeiro).
- Matriz de permissões única (backend) + middleware `authorize(permissão)`; frontend esconde o que não pode, backend é quem decide.
- Convites por e-mail (token de uso único, expira), troca de papel e remoção de membro.
- Ocultar custo/CMV/margem para quem não tem permissão; auditoria de ações sensíveis.
- Testes: matriz papel × endpoint (Mocha) e navegação por papel (Cypress).

## Decisões da Fase 2
- **Uma conta = uma empresa.** Convite só para e-mail sem conta no SGVC (409 caso contrário); quem sai da equipe mantém a conta, vazia, e perde as sessões.
- **Permissões** (`services/permissions.js`): Gerente = tudo menos equipe/marca/módulos; Vendedor/Caixa = clientes, vendas, encomendas e leitura de produtos, sem custos; Estoquista = insumos e produtos (com custo de compra), fichas só leitura, sem vendas, clientes nem financeiro.
- **Backend decide**: 403 por papel/módulo e remoção dos campos de custo/CMV/margem das respostas; a interface só esconde o que não funcionaria.
- Sem SMTP, o dono copia o link do convite na tela Equipe.

## Fase 3 — Campos extras e novos módulos
- Módulos opcionais por empresa **entregues na Fase 2** (Produção/fichas e Encomendas; chave ausente = ligado; card em Aparência).
- **Entregue na Fase 3:** campos extras opcionais em produto e cliente (rótulo + tipo: texto, número, data, sim/não, lista; obrigatório opcional; até 15 por entidade), configuráveis em Aparência e gravados em `extra` (JSONB). Valores exigem permissão de escrita do cadastro.
- Próximos módulos entram pelo mesmo catálogo de módulos (`services/permissions.js` + card em Aparência) conforme as próximas fases (estoque mínimo, PDV, financeiro).

## Fase 4 — Operação do dia a dia
**Entregue:** estoque mínimo de produtos com alertas (selo na lista e card no dashboard) e alerta de queda de margem com preço de venda sugerido (aplicar ou manter margem). **Caixa/PDV entregue (Fase 5):** abertura/fechamento de caixa, sangria/suprimento, pagamento em várias formas com troco, venda rápida por código de barras e CMV gravado por venda. **CRM leve entregue (Fase 6):** lista de recompra, histórico do cliente, anotações e WhatsApp. **Financeiro entregue (Fase 7):** contas a pagar/receber, fluxo de caixa e DRE simples com o CMV das vendas. **PWA e Mobile entregues (Fase 8):** manifesto, service worker, offline e revisão de responsividade. **Pendente:** nada — plano concluído.

## Fase 5 — Cobrança (posterior)
Planos e assinatura após validar com os primeiros clientes.

## Pendências de produção
- Girar o client secret do Google antes do deploy.
- Definir `PLATFORM_ADMIN_EMAILS`.
- Hospedagem (Render x Railway) em aberto.
