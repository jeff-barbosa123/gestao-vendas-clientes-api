# 📧 COMO TESTAR: Email de Recuperação de Senha

## ✅ Implementação Completa

O sistema de email está **100% implementado** e funcionando! Agora você tem **duas opções**:

---

## 🚀 Opção 1: Ethereal Email (Automático - Já Funciona!)

**Não precisa configurar NADA!** O sistema usa Ethereal Email automaticamente.

### Como Testar:

1. **Reinicie o servidor** (se estiver rodando):
   ```bash
   # Pare o servidor (Ctrl+C) e inicie novamente
   cd api
   npm run dev
   ```

2. **No console, você verá:**
   ```
   [EMAIL] Conta Ethereal criada para desenvolvimento
   [EMAIL] Email de teste: ...
   [EMAIL] Servidor SMTP: smtp.ethereal.email:587
   ```

3. **Acesse a aplicação:**
   - Vá para http://localhost:4000
   - Clique em "Esqueci minha senha"
   - Preencha um email cadastrado (ex: `admin@sgvc.local`)
   - Clique em "Enviar link"

4. **O modal mostrará:**
   - ✅ Link para **ver o email enviado** (Preview do Ethereal)
   - ✅ Link para **resetar a senha**
   - ✅ Botões para copiar e abrir links

5. **Clique em "Ver Email Enviado"** para ver o email completo no navegador!

---

## 📨 Opção 2: SMTP Real (Gmail, etc.)

Se quiser usar email real, configure SMTP:

### Configurar Gmail:

1. **Ative verificação em duas etapas** na sua conta Google
2. **Gere uma "Senha de app"**:
   - Acesse: https://myaccount.google.com/apppasswords
   - Selecione "Email" e "Outro (nome personalizado)"
   - Digite "SGVC" e clique em "Gerar"
   - **Copie a senha gerada** (16 caracteres)

3. **Configure no `.env.local`** (na pasta `api`):
   ```env
   USE_ETHEREAL_EMAIL=false
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=seu-email@gmail.com
   SMTP_PASS=a-senha-de-app-gerada-aqui
   SMTP_FROM=noreply@sgvc.local
   SMTP_FROM_NAME=SGVC
   ```

4. **Reinicie o servidor**

5. Agora os emails serão enviados **realmente** para a caixa de entrada!

---

## 🎯 Status Atual

### ✅ **Já Está Funcionando:**

- ✅ Ethereal Email automático (sem configuração)
- ✅ Preview de emails no navegador
- ✅ Link de reset aparece no modal
- ✅ Botões para copiar e abrir links
- ✅ Suporte a SMTP personalizado

### 🔄 **Para Ativar Email Real:**

- Configure SMTP no `.env.local` (veja Opção 2 acima)

---

## 💡 Dica

**Para desenvolvimento:** Use Ethereal Email (automático) - é mais rápido e não precisa configurar nada!

**Para produção:** Configure SMTP real (Gmail, SendGrid, etc.)

---

**Teste agora mesmo!** Basta reiniciar o servidor e tentar recuperar senha. O sistema usará Ethereal automaticamente! 🎉
