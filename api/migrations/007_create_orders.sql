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
