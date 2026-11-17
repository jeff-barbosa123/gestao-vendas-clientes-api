-- Fase 3 (White-Label): configuracao visual por empresa (owner_id = conta dona dos dados).
CREATE TABLE IF NOT EXISTS company_settings (
  owner_id UUID PRIMARY KEY REFERENCES users(id),
  company_name TEXT,
  primary_color TEXT NOT NULL DEFAULT '#4f46e5',
  background_color TEXT NOT NULL DEFAULT '#3f73c8',
  text_color TEXT NOT NULL DEFAULT '#0f172a',
  logo_data BYTEA,
  logo_mime TEXT,
  logo_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_settings_colors_chk CHECK (
    primary_color ~ '^#[0-9a-f]{6}$' AND background_color ~ '^#[0-9a-f]{6}$' AND text_color ~ '^#[0-9a-f]{6}$'
  ),
  CONSTRAINT company_settings_logo_chk CHECK (
    (logo_data IS NULL AND logo_mime IS NULL) OR (logo_data IS NOT NULL AND logo_mime IN ('image/png','image/jpeg','image/webp'))
  )
);