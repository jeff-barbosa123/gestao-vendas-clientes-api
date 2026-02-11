-- Tabela para analytics de erros
CREATE TABLE IF NOT EXISTS error_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code VARCHAR(100),
  status_code INTEGER NOT NULL,
  message TEXT,
  path TEXT,
  method VARCHAR(10),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_agent TEXT,
  ip_address INET,
  stack_trace TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_error_analytics_error_code ON error_analytics(error_code);
CREATE INDEX IF NOT EXISTS idx_error_analytics_status_code ON error_analytics(status_code);
CREATE INDEX IF NOT EXISTS idx_error_analytics_occurred_at ON error_analytics(occurred_at);
CREATE INDEX IF NOT EXISTS idx_error_analytics_path ON error_analytics(path);
CREATE INDEX IF NOT EXISTS idx_error_analytics_user_id ON error_analytics(user_id);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_error_analytics_code_status_date ON error_analytics(error_code, status_code, occurred_at);

-- Comentários
COMMENT ON TABLE error_analytics IS 'Armazena erros para análise e monitoramento';
COMMENT ON COLUMN error_analytics.error_code IS 'Código semântico do erro (ex: INVALID_EMAIL)';
COMMENT ON COLUMN error_analytics.status_code IS 'Código HTTP do erro (400, 404, 500, etc)';
COMMENT ON COLUMN error_analytics.occurred_at IS 'Data/hora em que o erro ocorreu';
