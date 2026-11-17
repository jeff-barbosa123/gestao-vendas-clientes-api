-- Fase 1: login por e-mail ou usuario. username e opcional, unico sem diferenciar maiusculas/minusculas.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uidx ON users (lower(username)) WHERE username IS NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_format_chk;
ALTER TABLE users ADD CONSTRAINT users_username_format_chk
  CHECK (username IS NULL OR username ~ '^[a-z0-9._-]{3,30}$');
