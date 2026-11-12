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
