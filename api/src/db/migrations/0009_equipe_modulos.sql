-- Fase 2: equipe (memberships + convites) e modulos opcionais por empresa.
-- owner_id continua sendo a chave de tenant dos dados; membership liga o usuario a uma empresa com um papel.

CREATE TABLE IF NOT EXISTS memberships (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT memberships_role_chk CHECK (role IN ('owner', 'manager', 'seller', 'stockist')),
  CONSTRAINT memberships_owner_chk CHECK ((role = 'owner') = (user_id = owner_id))
);
CREATE INDEX IF NOT EXISTS idx_memberships_owner ON memberships (owner_id);

-- Todo usuario existente e dono da propria empresa.
INSERT INTO memberships (user_id, owner_id, role)
SELECT id, id, 'owner' FROM users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_invitations_role_chk CHECK (role IN ('manager', 'seller', 'stockist'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_invitations_pending
  ON team_invitations (owner_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Modulos opcionais: chave ausente = habilitado (padrao), false = desligado.
CREATE TABLE IF NOT EXISTS company_modules (
  owner_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  modules JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
