-- Login social (Google): usuarios sem senha local e vinculo por google_sub.
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uidx ON users (google_sub) WHERE google_sub IS NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_provider_chk;
ALTER TABLE users ADD CONSTRAINT users_auth_provider_chk CHECK (auth_provider IN ('local', 'google'));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_password_required_local_chk;
ALTER TABLE users ADD CONSTRAINT users_password_required_local_chk
  CHECK (password IS NOT NULL OR google_sub IS NOT NULL);
