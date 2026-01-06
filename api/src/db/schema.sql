CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
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
