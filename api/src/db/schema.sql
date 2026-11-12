CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verification_token TEXT,
  status_usuario TEXT NOT NULL DEFAULT 'ATIVO',
  data_ultimo_login TIMESTAMPTZ,
  tentativas_falha INTEGER NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_resets_token_hash_idx
  ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS password_resets_user_id_idx
  ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  cnpj TEXT,
  birth_date DATE,
  address_street TEXT,
  address_number TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_postal_code TEXT,
  notes TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL,
  purchase_price NUMERIC(12, 2) NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'PRODUCED',
  owner_id UUID,
  ficha_tecnica_id UUID,
  custo_por_unidade NUMERIC(12, 2),
  preco_minimo NUMERIC(12, 2),
  preco_minimo_sugerido NUMERIC(12, 2),
  cmv_previsto NUMERIC(12, 4),
  cmv_futuro NUMERIC(12, 4),
  data_vinculo TIMESTAMPTZ,
  status_produto TEXT NOT NULL DEFAULT 'ATIVO',
  stock INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY,
  owner_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  yield_qty NUMERIC(12, 2) NOT NULL,
  yield_type TEXT NOT NULL,
  overhead NUMERIC(12, 2) NOT NULL DEFAULT 0,
  labor NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost_ingredients NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  price_minimum NUMERIC(12, 2) NOT NULL DEFAULT 0,
  price_suggested NUMERIC(12, 2) NOT NULL DEFAULT 0,
  margin_label TEXT NOT NULL DEFAULT '0%',
  estimated_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  link_product_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  unit TEXT,
  component TEXT,
  package_quantity NUMERIC(12, 2) NOT NULL,
  pack_unit TEXT,
  cost NUMERIC(12, 2) NOT NULL,
  unit_cost NUMERIC(12, 4) NOT NULL,
  total_cost NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_overheads (
  id UUID PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY,
  customer_id UUID,
  customer_name TEXT,
  owner_id UUID,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cmv NUMERIC(12, 2),
  date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  status_venda TEXT NOT NULL DEFAULT 'ativa',
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID,
  quantity NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  cmv NUMERIC(12, 2)
);


-- ============================================================
-- Antigas migrations 001-007 incorporadas ao schema (fonte unica de verdade).
-- Todas idempotentes (IF NOT EXISTS). Ordem preservada.
-- ============================================================

-- ---- 001_create_error_analytics.sql ----
-- Tabela para analytics de erros
CREATE TABLE IF NOT EXISTS error_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code VARCHAR(100),
  status_code INTEGER NOT NULL,
  message TEXT,
  path TEXT,
  method VARCHAR(10),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_agent TEXT,
  ip_address INET,
  stack_trace TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_error_analytics_error_code ON error_analytics(error_code);
CREATE INDEX IF NOT EXISTS idx_error_analytics_status_code ON error_analytics(status_code);
CREATE INDEX IF NOT EXISTS idx_error_analytics_occurred_at ON error_analytics(occurred_at);
CREATE INDEX IF NOT EXISTS idx_error_analytics_path ON error_analytics(path);
CREATE INDEX IF NOT EXISTS idx_error_analytics_user_id ON error_analytics(user_id);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_error_analytics_code_status_date ON error_analytics(error_code, status_code, occurred_at);

-- Comentários
COMMENT ON TABLE error_analytics IS 'Armazena erros para análise e monitoramento';
COMMENT ON COLUMN error_analytics.error_code IS 'Código semântico do erro (ex: INVALID_EMAIL)';
COMMENT ON COLUMN error_analytics.status_code IS 'Código HTTP do erro (400, 404, 500, etc)';
COMMENT ON COLUMN error_analytics.occurred_at IS 'Data/hora em que o erro ocorreu';

-- ---- 002_add_email_verification.sql ----
-- Migration: add email verification columns to users table
-- Safe to run multiple times

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

-- 002_add_email_verification.sql
-- Adds email verification fields to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

CREATE INDEX IF NOT EXISTS users_email_verification_token_idx
  ON users(email_verification_token);

-- ---- 003_create_auth_sessions.sql ----
-- Sessões de autenticação persistidas (antes ficavam só em memória e se perdiam a cada reinício/deploy)
CREATE TABLE IF NOT EXISTS auth_sessions (
  jti TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions (expires_at);

-- ---- 004_create_ingredients.sql ----
-- Cadastro único de insumos: o preço fica em um lugar só e as fichas técnicas se recalculam
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY,
  owner_id UUID,
  name TEXT NOT NULL,
  package_quantity NUMERIC(12, 3) NOT NULL,
  package_unit TEXT NOT NULL,
  package_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_owner_name ON ingredients (owner_id, lower(name));

-- Histórico de preços (base para acompanhar a variação do CMV)
CREATE TABLE IF NOT EXISTS ingredient_price_history (
  id UUID PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  package_quantity NUMERIC(12, 3) NOT NULL,
  package_unit TEXT NOT NULL,
  package_cost NUMERIC(12, 2) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredient_price_history ON ingredient_price_history (ingredient_id, changed_at DESC);

-- Item da ficha técnica pode apontar para um insumo do cadastro
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients (ingredient_id);

-- Margem da ficha passa a ser gravada (antes só o rótulo "40%" era salvo e a margem se perdia ao editar)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS margin NUMERIC(12, 4);

-- ---- 005_sales_payment_method.sql ----
-- Forma de pagamento da venda (antes era validada pela API e descartada)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales (owner_id, payment_method);

-- ---- 006_ingredient_stock.sql ----
-- Estoque de insumos: quantidade na unidade base (g, ml ou un) e mínimo para aviso de reposição.
-- NULL = o insumo não tem controle de estoque (vendas não descontam nada dele).
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(14, 3);
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS min_stock NUMERIC(14, 3);

-- Movimentações: PURCHASE (compra), SALE (venda), SALE_CANCEL (devolução), ADJUST (contagem)
CREATE TABLE IF NOT EXISTS ingredient_stock_movements (
  id UUID PRIMARY KEY,
  owner_id UUID,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  balance_after NUMERIC(14, 3),
  unit_cost NUMERIC(14, 6),
  sale_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON ingredient_stock_movements (ingredient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_sale ON ingredient_stock_movements (sale_id);

-- ---- 007_create_orders.sql ----
-- Encomendas: pedidos com data de entrega, sinal e status.
-- Na entrega a encomenda vira uma venda (sale_id): é aí que entram faturamento, CMV e baixa de insumos.
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  owner_id UUID,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING (a fazer), READY (pronta), DELIVERED, CANCELED
  deposit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deposit_method TEXT,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  sale_id UUID,
  delivered_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_owner_delivery ON orders (owner_id, delivery_at);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name TEXT,
  quantity NUMERIC(12, 3) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
