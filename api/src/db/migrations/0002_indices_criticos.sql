-- Indices criticos para as tabelas principais (filtros por owner_id, relatorios por data, joins por FK).
CREATE INDEX IF NOT EXISTS idx_customers_owner_created ON customers (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_owner_created ON products (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_owner_status ON products (owner_id, status_produto);
CREATE INDEX IF NOT EXISTS idx_recipes_owner_created ON recipes (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_link_product ON recipes (link_product_id) WHERE link_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_owner_date ON sales (owner_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product_id) WHERE product_id IS NOT NULL;