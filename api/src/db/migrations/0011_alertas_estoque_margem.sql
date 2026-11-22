-- Fase 4: estoque minimo de produtos e margem de referencia (base do alerta de queda de margem).
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS margin_ref NUMERIC(6, 4);

-- Margem de referencia = margem atual dos produtos existentes (o alerta passa a comparar a partir daqui).
UPDATE products
   SET margin_ref = ROUND((price - purchase_price) / price, 4)
 WHERE margin_ref IS NULL AND price > 0 AND purchase_price > 0;
