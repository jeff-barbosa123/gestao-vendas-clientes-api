-- Forma de pagamento da venda (antes era validada pela API e descartada)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales (owner_id, payment_method);
