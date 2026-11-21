-- Sessoes ativas no perfil: dispositivo (user-agent) e par access/refresh da mesma sessao.
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS pair_jti TEXT;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_pair ON auth_sessions (pair_jti);
