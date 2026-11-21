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

## Fase 2 — Perfis e Equipe (próxima, após validação do Bloco 1)
- Tabela `memberships` (empresa × usuário × papel) e migração dos usuários atuais como **Dono** da própria empresa (`owner_id` continua sendo a chave de tenant).
- Papéis: **Dono** (tudo), **Gerente** (tudo exceto equipe/cobrança/empresa), **Vendedor/Caixa** (clientes, vendas, consulta de produtos; sem custo/CMV), **Estoquista** (insumos, estoque, produtos; sem financeiro).
- Matriz de permissões única (backend) + middleware `authorize(permissão)`; frontend esconde o que não pode, backend é quem decide.
- Convites por e-mail (token de uso único, expira), troca de papel e remoção de membro.
- Ocultar custo/CMV/margem para quem não tem permissão; auditoria de ações sensíveis.
- Testes: matriz papel × endpoint (Mocha) e navegação por papel (Cypress).

## Fase 3 — Módulos opcionais por empresa
- Flags em `company_settings` (ex.: Produção/Fichas técnicas, Encomendas, Estoque de insumos) — varejo simples não vê o que não usa.
- Campos extras opcionais em produto/cliente (rótulo + tipo), configuráveis pela empresa.

## Fase 4 — Operação do dia a dia
Caixa/PDV rápido; estoque mínimo com alertas; alerta de margem baixa; CRM leve (histórico, recompra, WhatsApp); financeiro (contas a receber/pagar); PWA.

## Fase 5 — Cobrança (posterior)
Planos e assinatura após validar com os primeiros clientes.

## Pendências de produção
- Girar o client secret do Google antes do deploy.
- Definir `PLATFORM_ADMIN_EMAILS`.
- Hospedagem (Render x Railway) em aberto.
