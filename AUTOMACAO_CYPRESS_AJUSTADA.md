# ✅ AUTOMAÇÃO CYPRESS - AJUSTES APLICADOS

## 🎯 Resumo das Melhorias

O script foi **ajustado** para resolver suas preocupações:

### ✅ **1. Criação de Usuário é OPCIONAL**
- **Padrão:** Não cria novo usuário (usa `admin@negocio.com`)
- **Configurável:** Pode criar novo usuário se necessário

### ✅ **2. Criação de Receita SEMPRE Ativa**
- **Padrão:** Sempre cria uma receita nova a cada execução
- **Nome único:** Usa timestamp para evitar conflitos
- **Configurável:** Pode desativar se necessário

---

## 🚀 Como Usar

### Modo Recomendado (Usuário Existente + Cria Receita)

```bash
npm run cypress:run:fluxo-completo
```

**Comportamento:**
- ✅ Usa: `admin@negocio.com` / `Admin@123!`
- ✅ Não cria novo usuário
- ✅ Sempre cria receita nova: `Receita Teste {timestamp}`
- ✅ Executa todas as funcionalidades

### Se Quiser Criar Novo Usuário

```bash
CREATE_NEW_USER=true npm run cypress:run:fluxo-completo
```

### Se Não Quiser Criar Receita (apenas navegar)

```bash
CREATE_RECIPE=false npm run cypress:run:fluxo-completo
```

---

## 📊 Resumo das Configurações

| Configuração | Padrão | Comando |
|--------------|--------|---------|
| Criar novo usuário | ❌ Não | `CREATE_NEW_USER=true` |
| Criar receita | ✅ Sim | `CREATE_RECIPE=false` para desativar |

---

## 📝 Fluxo do Script

1. **Login** → `admin@negocio.com` (padrão)
2. **Dashboard** → Carrega métricas
3. ~~**Criar Usuário**~~ → **PULADO** (padrão)
4. **Clientes** → Lista, cria PF e PJ
5. **Produtos** → Lista e cria
6. **Vendas** → Lista
7. **Receitas** → Lista e **CRIA NOVA** ✅
8. **Relatórios** → Visualiza
9. **Simulação** → Acessa
10. **Vínculos** → Acessa
11. **Perfil** → Atualiza
12. **Logout** → Encerra sessão

---

## ✅ Dados de Teste Gerados

**Receita criada:**
- Nome: `Receita Teste {timestamp}`
- Rendimento: 10 UN
- Ingrediente: Farinha de trigo (500g)
- Margem: 30%

**Cliente PF criado:**
- Nome: Cliente PF Teste
- CPF: 12345678901

**Cliente PJ criado:**
- Nome: Empresa Teste LTDA
- CNPJ: 12345678000190

---

## 🎯 Respostas às Suas Dúvidas

### ❓ "Todas as vezes que rodar cria um novo usuário?"
**❌ NÃO** (por padrão)
- Padrão: Usa usuário existente
- Opcional: Pode criar se configurar `CREATE_NEW_USER=true`

### ❓ "Quiser continuar no mesmo usuário?"
**✅ SIM** (padrão)
- Sempre usa: `admin@negocio.com`
- Não cria novos usuários a cada execução

### ❓ "Sempre que puder criar uma receita nova?"
**✅ SIM** (padrão)
- Sempre cria receita nova
- Nome único com timestamp
- Não conflita com receitas anteriores

---

## 📋 Exemplos Práticos

### Exemplo 1: Uso Diário (Recomendado)
```bash
npm run cypress:run:fluxo-completo
```
**Resultado:**
- Usa `admin@negocio.com`
- Cria receita: `Receita Teste 1704123456789`
- Executa tudo

### Exemplo 2: Testar Registro de Usuário
```bash
CREATE_NEW_USER=true npm run cypress:run:fluxo-completo
```
**Resultado:**
- Cria: `teste1704123456789@automacao.com`
- Cria receita nova
- Executa tudo

### Exemplo 3: Navegação Rápida (sem criar receita)
```bash
CREATE_RECIPE=false npm run cypress:run:fluxo-completo
```
**Resultado:**
- Usa `admin@negocio.com`
- Navega por todas as telas
- Não cria receita

---

## 🔧 Personalização

Para alterar dados da receita criada, edite:

```javascript
const testRecipe = {
  name: `Receita Teste ${timestamp}`,
  description: 'Receita criada automaticamente pelo teste',
  yield: '10',
  yieldType: 'UN',
  overhead: '5', // 5%
  margin: '30', // 30%
  ingredientName: 'Farinha de trigo',
  ingredientQty: '500',
  // ...
};
```

---

**Status:** ✅ **AJUSTADO E PRONTO PARA USO**

**Última atualização:** 2025-01-XX
