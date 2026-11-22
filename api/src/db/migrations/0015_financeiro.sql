-- Fase 7: Financeiro. Contas a pagar/receber (com parcelas), base do fluxo de caixa e da DRE simples.
-- Vendas e PDV continuam sendo a receita; "a receber" cobre o que entra fora delas (ex.: fiado, servicos).
CREATE TABLE IF NOT EXISTS financial_entries (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  paid_at DATE,
  paid_amount NUMERIC(12, 2),
  method TEXT,
  category TEXT,
  supplier TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  notes TEXT,
  group_id UUID,
  installment_no INTEGER,
  installment_total INTEGER,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financial_entries_kind_chk CHECK (kind IN ('PAYABLE', 'RECEIVABLE')),
  CONSTRAINT financial_entries_status_chk CHECK (status IN ('OPEN', 'PAID', 'CANCELED')),
  CONSTRAINT financial_entries_amount_chk CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS idx_financial_entries_owner_due ON financial_entries (owner_id, due_date);
CREATE INDEX IF NOT EXISTS idx_financial_entries_owner_paid ON financial_entries (owner_id, paid_at) WHERE status = 'PAID';
