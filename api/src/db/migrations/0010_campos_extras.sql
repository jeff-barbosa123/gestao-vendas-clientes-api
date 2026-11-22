-- Fase 3: campos extras opcionais por empresa (produto/cliente). Definicao em custom_fields,
-- valores em extra (JSONB) da propria linha. owner_id continua sendo a chave de tenant.

CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_fields_entity_chk CHECK (entity IN ('product', 'customer')),
  CONSTRAINT custom_fields_type_chk CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select')),
  CONSTRAINT custom_fields_unique UNIQUE (owner_id, entity, key)
);
CREATE INDEX IF NOT EXISTS idx_custom_fields_owner ON custom_fields (owner_id, entity, position);

ALTER TABLE products ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
