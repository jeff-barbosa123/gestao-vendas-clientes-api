-- Fase 5: Caixa/PDV. Abertura/fechamento de caixa, sangria/suprimento, pagamentos multiplos
-- (com troco) por venda e codigo de barras no produto. owner_id continua sendo a chave de tenant.

CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OPEN',
  opening_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  counted_amount NUMERIC(12, 2),
  expected_amount NUMERIC(12, 2),
  difference NUMERIC(12, 2),
  close_note TEXT,
  CONSTRAINT cash_registers_status_chk CHECK (status IN ('OPEN', 'CLOSED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_registers_open_operator
  ON cash_registers (owner_id, operator_id) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_cash_registers_owner ON cash_registers (owner_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_movements_type_chk CHECK (type IN ('SANGRIA', 'SUPRIMENTO')),
  CONSTRAINT cash_movements_amount_chk CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON cash_movements (register_id);

CREATE TABLE IF NOT EXISTS sale_payments (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  register_id UUID REFERENCES cash_registers(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  received NUMERIC(12, 2),
  change_amount NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_register ON sale_payments (register_id);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES cash_registers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_register ON sales (register_id) WHERE register_id IS NOT NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_owner_barcode ON products (owner_id, barcode) WHERE barcode IS NOT NULL;
