-- Fase 5b: desconto na venda (total gravado ja liquido) e limite de desconto do Vendedor/Caixa por empresa (%).
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE company_modules ADD COLUMN IF NOT EXISTS pdv_discount_limit NUMERIC(5, 2) NOT NULL DEFAULT 0;
