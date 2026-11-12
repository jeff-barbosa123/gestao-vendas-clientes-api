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
