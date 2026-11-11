# Variáveis de Ambiente Necessárias

Este documento lista todas as variáveis de ambiente necessárias para execução da API em produção.

## ⚠️ OBRIGATÓRIAS EM PRODUÇÃO

### Segurança - JWT Secrets
```bash
# Gerar secrets seguros: openssl rand -base64 32
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters-long
JWT_REFRESH_SECRET=your-secure-refresh-secret-minimum-32-characters-long
```

### CORS
```bash
# Lista separada por vírgula de origens permitidas
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Configuração de Banco de Dados
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/database

# Configuração do Pool de Conexões (Opcional - valores padrão recomendados)
DB_POOL_MAX=20                    # Máximo de conexões no pool (padrão: 20)
DB_POOL_MIN=2                     # Mínimo de conexões no pool (padrão: 2)
DB_POOL_IDLE_TIMEOUT=30000        # Timeout de conexões ociosas em ms (padrão: 30000)
DB_POOL_CONNECTION_TIMEOUT=2000   # Timeout ao obter conexão em ms (padrão: 2000)
DB_POOL_MAX_USES=7500            # Máximo de usos por cliente antes de fechar (padrão: 7500)
```

## Configuração JWT
```bash
JWT_TTL_SECONDS=900                    # 15 minutos (access token)
JWT_REFRESH_TTL_SECONDS=86400          # 24 horas (refresh token)
JWT_PREVIOUS_SECRET=                   # Para rotação de secrets (opcional)
JWT_REFRESH_PREVIOUS_SECRET=           # Para rotação de secrets (opcional)
```

## Configuração de Senhas
```bash
BCRYPT_SALT_ROUNDS=12                  # Rodadas de hash bcrypt (recomendado: 12)
LOGIN_MIN_PASSWORD_LENGTH=8            # Mínimo 8 caracteres
LOGIN_MAX_PASSWORD_LENGTH=128          # Máximo 128 caracteres
LOGIN_MAX_FAILED_ATTEMPTS=3            # Tentativas antes de bloquear
LOGIN_BLOCK_MINUTES=15                 # Minutos de bloqueio
```

## Configuração da Aplicação
```bash
NODE_ENV=production                    # development | production
PORT=3000                              # Porta da API
WEB_BASE_URL=https://yourdomain.com    # URL base do frontend
ENABLE_SWAGGER_UI=false                # Habilitar Swagger UI (padrão: true, deve ser false em produção)
```

## Usuários Padrão (apenas para seed inicial)
```bash
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=Admin@123!ChangeMe
OTHER_USER_EMAIL=user@yourdomain.com
OTHER_USER_PASSWORD=User@123!ChangeMe
```

## Recuperação de Senha
```bash
RESET_TOKEN_TTL_MINUTES=30             # TTL do token de reset
RESET_TOKEN_SECRET=                    # Opcional, usa JWT_SECRET se não definido
```

## Email (Opcional - para recuperação de senha)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

## Logging
```bash
CONSOLE_LOG_LEVEL=info                 # error | warn | info | debug
```

## Limites de Requisição
```bash
JSON_LIMIT=1mb                         # Tamanho máximo do body JSON
```

## ⚠️ IMPORTANTE

1. **NUNCA** commite o arquivo `.env` no repositório
2. **SEMPRE** use secrets seguros gerados aleatoriamente para produção
3. **VALIDE** que `JWT_SECRET` e `JWT_REFRESH_SECRET` não estão usando valores padrão
4. **CONFIGURE** `ALLOWED_ORIGINS` adequadamente para produção
5. **ALTERE** senhas padrão dos usuários admin antes de produção

## Scripts Úteis

### Gerar JWT Secret
```bash
openssl rand -base64 32
```

### Gerar Password Hash (para testes)
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Senha@123!', 12).then(console.log);"
```

### Migrar senhas existentes
```bash
node scripts/migrate-passwords.js
```
