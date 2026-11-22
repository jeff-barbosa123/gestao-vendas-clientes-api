-- Fase 6: CRM leve. Historico de contatos/anotacoes por cliente (recompra e WhatsApp usam as vendas ja existentes).
CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_interactions_kind_chk CHECK (kind IN ('NOTE', 'WHATSAPP'))
);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer ON customer_interactions (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_owner ON customer_interactions (owner_id);
