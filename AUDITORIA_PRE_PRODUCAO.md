# 🔴 AUDITORIA CRÍTICA PRÉ-PRODUÇÃO - SGVC

**Data:** 2025-01-27  
**Versão Analisada:** 1.0.0  
**Status:** ❌ **NÃO APROVADO PARA PRODUÇÃO**

---

## 📋 RESUMO EXECUTIVO

Esta auditoria identificou **9 vulnerabilidades CRÍTICAS**, **6 problemas de ALTA severidade**, **8 de MÉDIA severidade** e **7 de BAIXA severidade**. O sistema **NÃO ESTÁ PRONTO** para produção sem correções imediatas.

**Principais problemas:**
- ✅ Senhas armazenadas e comparadas em **texto plano** (SEM HASH)
- ✅ CORS configurado para aceitar **qualquer origem** (`*`)
- ✅ JWT_SECRET com fallback inseguro (`"dev-secret"`)
- ✅ Tokens JWT sendo logados completos no console
- ✅ Tokens armazenados em `localStorage` (vulnerável a XSS)

---

## 🔴 CRÍTICO (Bloqueador para Produção)

| ID | Categoria | Problema | Localização | Ação Corretiva |
|---|---|---|---|---|
| **C-001** | Backend/Segurança | **SENHAS EM TEXTO PLANO**: Senhas são armazenadas e comparadas sem hash. Comparação direta `user.password === password` (linha 284 de `authService.js`). Armazenamento sem hash em `repository.js` (linhas 68, 83, 108, 115). | `api/src/services/authService.js:284`<br>`api/src/db/repository.js:68,83,108,115`<br>`api/src/db/schema.sql:4` | **URGENTE**: Implementar bcrypt ou argon2. Todas as senhas devem ser hasheadas com salt antes do armazenamento. Criar script de migração para hashear senhas existentes. ATUALIZAR: `createUser`, `updateUserPassword`, `changePassword`, `resetPassword` e comparação no `login`. |
| **C-002** | Backend/Segurança | **CORS PERMISSIVO**: CORS configurado com `origin: '*'` permitindo qualquer origem acessar a API (linha 26 de `app.js`). Extremamente perigoso em produção. | `api/src/app.js:26` | Configurar `allowedOrigins` a partir de variável de ambiente `ALLOWED_ORIGINS` (lista separada por vírgula). Validar origem antes de permitir. Remover fallback `'*'`. Implementar whitelist estrita. |
| **C-003** | Backend/Segurança | **JWT_SECRET PADRÃO**: JWT_SECRET usa fallback `"dev-secret"` (linha 10 de `authService.js`). Se variável de ambiente não estiver configurada, usa valor inseguro. | `api/src/services/authService.js:10`<br>`api/src/middleware/authMiddleware.js:4` | Tornar `JWT_SECRET` obrigatório. Lançar erro fatal na inicialização se não estiver configurado. Gerar secret forte (mín. 32 caracteres aleatórios) e armazenar em variável de ambiente segura. Validar força do secret no startup. |
| **C-004** | Backend/Segurança | **TOKENS LOGADOS**: Tokens JWT completos sendo logados no console (linhas 34-36 de `authMiddleware.js`). Expõe credenciais em logs que podem ser acessados por terceiros. | `api/src/middleware/authMiddleware.js:34,36` | Remover `console.log` com tokens. Usar apenas `jti` (ID do token) nos logs. Se necessário, logar apenas hash parcial ou mascarar token (`token.substring(0, 10) + "..."`). Implementar sanitização de logs sensíveis. |
| **C-005** | Frontend/Segurança | **TOKENS EM LOCALSTORAGE**: Tokens JWT armazenados em `localStorage` (linha 367 de `app.js`). Vulnerável a ataques XSS. Qualquer script injetado pode roubar tokens. | `web/public/static/app.js:367,387` | Migrar para `sessionStorage` (expira ao fechar aba) ou implementar httpOnly cookies para tokens. Se manter localStorage, implementar Content Security Policy (CSP) rigorosa e sanitização de inputs. Considerar httpOnly + SameSite cookies. |
| **C-006** | Backend/Segurança | **SENHA MÍNIMA MUITO BAIXA**: Senha mínima aceita apenas 3 caracteres (linha 19 de `authService.js`). Aceita senhas como "123" ou "abc". Extremamente inseguro. | `api/src/services/authService.js:19` | Aumentar mínimo para 8 caracteres. Implementar validação de força: mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 caractere especial. Backend deve rejeitar senhas fracas mesmo que frontend valide. |
| **C-007** | Backend/Segurança | **SENHA ADMIN HARDCODED**: Senha alternativa do admin com fallback hardcoded `"Admin@123!"` (linha 274 de `authService.js`). Backdoor explícito. | `api/src/services/authService.js:274` | Remover fallback hardcoded. Tornar `ADMIN_PASSWORD_ALT` obrigatório ou remover completamente esta funcionalidade. Se necessário manter, validar que não é o padrão em produção. Logar alerta crítico se usar fallback. |
| **C-008** | Backend/Segurança | **HEALTH CHECK INCOMPLETO**: Health check não verifica conectividade do banco de dados (comentado nas linhas 68-77 de `app.js`). Pode indicar "saudável" mesmo com DB offline. | `api/src/app.js:62-80` | Implementar verificação real do banco: `await pool.query("SELECT 1")`. Adicionar checks de memória, disco e latência se necessário. Retornar 503 se DB não responder. Implementar readiness vs liveness probes. |
| **C-009** | Backend/Performance | **RATE LIMITING EM MEMÓRIA**: Rate limiting usa Map em memória sem limpeza (linhas 1-31 de `rateLimit.js`). Pode crescer indefinidamente causando memory leak. Em cluster, cada instância terá contador separado (inconsistente). | `api/src/middleware/rateLimit.js` | Implementar limpeza periódica de entradas expiradas. Considerar Redis para rate limiting distribuído em cluster. Adicionar TTL automático nas entradas. Monitorar tamanho do Map e limpar entries antigas. |

---

## 🟠 ALTA (Deve ser corrigido antes da produção)

| ID | Categoria | Problema | Localização | Ação Corretiva |
|---|---|---|---|---|
| **A-001** | Backend/Segurança | **REFRESH TOKEN TTL MUITO LONGO**: Refresh token expira em 7 dias (linha 14 de `authService.js`). Janela de ataque muito grande. | `api/src/services/authService.js:14` | Reduzir para 24-48 horas. Implementar rotação de refresh tokens. Invalidar refresh token antigo ao gerar novo. Adicionar refresh token family para detectar reutilização. |
| **A-002** | Backend/Segurança | **ACCESS TOKEN TTL**: Access token expira em 30 minutos (linha 9 de `authService.js`). Para aplicações críticas, considerar redução. | `api/src/services/authService.js:9` | Avaliar necessidade de reduzir para 15 minutos. Implementar refresh automático no frontend. Considerar tokens mais curtos (5-10 min) para operações sensíveis. |
| **A-003** | Backend/Segurança | **VALIDAÇÃO DE SENHA FRACA NO BACKEND**: Backend aceita senhas de 3 caracteres enquanto frontend exige 8. Inconsistência permite bypass via API direta. | `api/src/utils/authConfig.js`<br>`api/src/services/authService.js:156-186` | Alinhar validação backend com frontend: mínimo 8 chars. Adicionar validação de força (maiúscula, minúscula, número, especial). Rejeitar senhas comuns/fracas (lista de bloqueio). |
| **A-004** | Backend/Performance | **TOKENSTORE EM MEMÓRIA**: TokenStore e RefreshStore usam Map em memória (linha 7 de `authService.js`). Em cluster, tokens não são compartilhados entre instâncias. Logout em uma instância não invalida token em outras. | `api/src/models/db.js`<br>`api/src/services/authService.js:235-252` | Migrar para Redis ou banco de dados para armazenamento de tokens. Implementar sincronização entre instâncias. Se manter em memória, implementar broadcast de revogação entre instâncias (pub/sub). |
| **A-005** | Backend/Segurança | **FALTA CSP HEADER**: Não há Content Security Policy (CSP) configurado. Vulnerável a XSS. | `api/src/middleware/securityHeaders.js` | Adicionar header `Content-Security-Policy` rigoroso. Bloquear inline scripts e styles. Whitelist apenas origens confiáveis. Implementar nonce para scripts dinâmicos se necessário. |
| **A-006** | Backend/Segurança | **SEM HTTPS ENFORCEMENT**: Não há redirecionamento forçado para HTTPS. Em produção, HTTP não deve ser aceito. | `api/src/app.js` | Adicionar middleware que força HTTPS em produção. Retornar 301/308 para requisições HTTP. Validar header `X-Forwarded-Proto` quando atrás de proxy. Configurar HSTS (Strict-Transport-Security). |

---

## 🟡 MÉDIA (Recomendado corrigir)

| ID | Categoria | Problema | Localização | Ação Corretiva |
|---|---|---|---|---|
| **M-001** | Backend/Validação | **VALIDAÇÃO DE EMAIL DUPLICADO NO REGISTRO**: Registro de usuário não valida se email já existe antes de tentar criar (linha 371 de `authService.js`). Race condition possível. | `api/src/services/authService.js:369-376` | Adicionar validação explícita antes de inserir. Usar transação com lock para evitar race condition. Unique constraint no banco já existe, mas melhor tratar explicitamente. |
| **M-002** | Frontend/UX | **INCONSISTÊNCIA VALIDAÇÃO SENHA**: Frontend exige 8 caracteres (linha 861 de `app.js`) mas backend aceita 3. Usuário pode criar conta via frontend mas não conseguir logar se usar API direta com senha curta criada antes. | `web/public/static/app.js:861`<br>`api/src/services/authService.js:19` | Alinhar validações frontend e backend. Backend deve ser a fonte da verdade. Frontend apenas UX, backend valida sempre. |
| **M-003** | Backend/Logs | **LOGS PODEM EXPOR SENSÍVEIS**: Logger pode expor dados sensíveis se não filtrado adequadamente. Payloads de request podem conter informações sensíveis. | `api/src/middleware/requestLogger.js`<br>`api/src/middleware/auditLogger.js` | Expandir lista de `SENSITIVE_KEYS` em `auditLogger.js`. Sanitizar todos os campos de senha, token, CVV, etc. Não logar bodies completos em produção. Implementar máscara para dados sensíveis. |
| **M-004** | Backend/Segurança | **FALTA VALIDAÇÃO DE TIPO MIME**: Endpoints não validam Content-Type adequadamente em todas as rotas. `loginValidator` valida, mas outras rotas podem aceitar tipos incorretos. | `api/src/middleware/loginValidator.js:12` | Adicionar middleware global que valida Content-Type para rotas POST/PUT/PATCH. Rejeitar requisições com Content-Type incorreto. Validar charset também. |
| **M-005** | Backend/Erros | **MENSAGENS DE ERRO GENÉRICAS**: Alguns erros retornam mensagens genéricas que não ajudam no debug mas podem expor estrutura interna. | `api/src/controllers/*.js` | Padronizar mensagens de erro. Não expor stack traces em produção. Retornar códigos de erro semânticos. Logar detalhes apenas no servidor, não na resposta. |
| **M-006** | Frontend/Performance | **FALTA LAZY LOADING**: Todos os scripts são carregados no index.html. Pode impactar performance inicial. | `web/public/index.html` | Implementar code splitting. Carregar scripts apenas quando necessário. Lazy load de componentes/modais. Otimizar bundle size. |
| **M-007** | Backend/Testes | **COBERTURA DE TESTES**: Não há visibilidade da cobertura de testes. Pode haver gaps em casos de borda. | `api/test/integration/` | Implementar ferramenta de cobertura (nyc, jest coverage). Definir meta de cobertura mínima (80%+). Adicionar testes para casos de borda: senhas extremas, emails malformados, tokens inválidos, race conditions. |
| **M-008** | Backend/Segurança | **FALTA RATE LIMITING GLOBAL**: Rate limiting existe apenas para login (`rateLimitLogin.js`). Outras rotas críticas não têm proteção. | `api/src/routes/*.js` | Adicionar rate limiting em rotas sensíveis: registro, forgot password, refresh token. Implementar rate limiting diferenciado por endpoint (login mais restritivo). |

---

## 🔵 BAIXA (Melhorias recomendadas)

| ID | Categoria | Problema | Localização | Ação Corretiva |
|---|---|---|---|---|
| **B-001** | Backend/Performance | **SEM PAGINAÇÃO**: Listagens de clientes, produtos, vendas não têm paginação. Pode causar problemas com grandes volumes. | `api/src/services/*Service.js` | Implementar paginação (limit/offset ou cursor-based). Adicionar parâmetros `page` e `limit` nas rotas de listagem. Retornar metadados (total, página atual, etc). |
| **B-002** | Frontend/UX | **FALTA FEEDBACK DE LOADING**: Algumas operações não mostram feedback visual durante carregamento. Usuário pode pensar que sistema travou. | `web/public/static/*.js` | Adicionar indicadores de loading em todas as operações assíncronas. Desabilitar botões durante requisições. Mostrar progresso quando possível. |
| **B-003** | Backend/Monitoramento | **FALTA APM/METRICS**: Não há integração com ferramentas de APM (Application Performance Monitoring). Difícil identificar gargalos em produção. | `api/src/middleware/metrics.js` | Integrar com New Relic, Datadog, ou Prometheus. Adicionar métricas de latência, throughput, erros por endpoint. Alertas para anomalias. |
| **B-004** | Backend/Logs | **LOGS NÃO ESTRUTURADOS**: Logs são JSON mas não seguem padrão estruturado (ELK, CloudWatch). Dificulta análise em produção. | `api/src/utils/logger.js` | Padronizar formato de logs (JSON estruturado). Adicionar correlation IDs. Timestamps em formato ISO. Níveis de log adequados. Contexto adicional (user ID, request ID). |
| **B-005** | Frontend/Acessibilidade | **FALTA ARIA LABELS**: Alguns elementos podem ter labels ARIA ausentes ou incompletos. Impacta acessibilidade. | `web/public/index.html`<br>`web/public/*.html` | Revisar todos os elementos interativos. Adicionar `aria-label`, `aria-describedby` onde necessário. Testar com leitores de tela. Validar com axe-core. |
| **B-006** | Backend/Segurança | **DOCKER COMPOSE COM SENHA FRACA**: docker-compose.yml tem senha hardcoded "sgvc123" (linha 9). Pode ser commitada no repo. | `docker-compose.yml:9` | Usar variáveis de ambiente para senhas. Adicionar ao .gitignore se necessário. Usar docker secrets em produção. Não commitar credenciais. |
| **B-007** | Backend/Documentação | **SWAGGER PODE ESTAR DESATUALIZADO**: Swagger pode não refletir todas as rotas e parâmetros corretamente. | `api/resources/swagger.json` | Revisar documentação Swagger. Garantir que todas as rotas estão documentadas. Validar exemplos. Adicionar schemas de erro. Atualizar versionamento. |

---

## ✅ PONTOS POSITIVOS

1. **SQL Injection Protegido**: Uso de prepared statements ($1, $2) protege contra SQL injection.
2. **Validação de XSS/SQL**: Existe validação contra SQL injection e XSS em campos de entrada (customersService.js).
3. **Validação de CPF/CNPJ**: Implementada validação de dígitos verificadores.
4. **Audit Logging**: Existe middleware de auditoria para operações críticas.
5. **Error Handling**: Tratamento centralizado de erros com códigos semânticos.
6. **Security Headers**: Alguns headers de segurança estão configurados (X-Frame-Options, etc).
7. **Refresh Token Rotation**: Implementado sistema de refresh tokens com revogação.

---

## 📊 ESTATÍSTICAS

- **Total de Problemas Identificados:** 30
- **Críticos:** 9 (30%)
- **Altos:** 6 (20%)
- **Médios:** 8 (27%)
- **Baixos:** 7 (23%)

---

## 🚀 PLANO DE AÇÃO RECOMENDADO

### Fase 1 - BLOQUEADORES (Antes de qualquer deploy)
1. ✅ Implementar hash de senhas (C-001)
2. ✅ Corrigir CORS (C-002)
3. ✅ Remover JWT_SECRET padrão (C-003)
4. ✅ Remover logs de tokens (C-004)
5. ✅ Migrar tokens do localStorage (C-005)
6. ✅ Aumentar senha mínima (C-006)
7. ✅ Remover senha admin hardcoded (C-007)
8. ✅ Implementar health check real (C-008)
9. ✅ Corrigir rate limiting em memória (C-009)

### Fase 2 - ALTA PRIORIDADE (Antes da produção)
1. ✅ Ajustar TTL de tokens (A-001, A-002)
2. ✅ Migrar TokenStore para Redis/DB (A-004)
3. ✅ Adicionar CSP headers (A-005)
4. ✅ Implementar HTTPS enforcement (A-006)

### Fase 3 - MÉDIA PRIORIDADE (Ideal antes da produção)
1. ✅ Alinhar validações frontend/backend (M-002)
2. ✅ Adicionar cobertura de testes (M-007)
3. ✅ Expandir rate limiting (M-008)

### Fase 4 - MELHORIAS (Pós-produção)
1. ✅ Implementar paginação (B-001)
2. ✅ Adicionar APM/Metrics (B-003)
3. ✅ Melhorar acessibilidade (B-005)

---

## ⚠️ CONCLUSÃO

**O sistema NÃO ESTÁ PRONTO para produção.** Existem 9 vulnerabilidades CRÍTICAS que devem ser corrigidas antes de qualquer deploy. O problema mais grave é o armazenamento de senhas em texto plano, o que viola todas as boas práticas de segurança e pode resultar em exposição completa de credenciais em caso de vazamento de banco de dados.

**Prazo estimado para correções críticas:** 3-5 dias de desenvolvimento + 2 dias de testes.

**Recomendação final:** ❌ **BLOQUEAR DEPLOY ATÉ CORREÇÃO DOS ITENS CRÍTICOS**

---

**Auditor realizado por:** Auto (AI Assistant)  
**Método:** Análise estática de código, revisão de segurança, validação de boas práticas  
**Referências:** OWASP Top 10, CWE, NIST Guidelines
