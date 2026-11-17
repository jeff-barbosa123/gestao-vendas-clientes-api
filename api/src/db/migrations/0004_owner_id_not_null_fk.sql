-- Isolamento multiempresa: owner_id obrigatorio e com FK para users.
-- Linhas legadas sem dono (ou com dono inexistente) passam para o usuario mais antigo (conta principal).
-- Se existirem linhas sem dono e nenhum usuario, a migracao aborta (nada e apagado).
DO $$
DECLARE
  t TEXT;
  owner UUID;
  orfas BIGINT;
BEGIN
  SELECT id INTO owner FROM users ORDER BY created_at ASC, id ASC LIMIT 1;

  FOREACH t IN ARRAY ARRAY['customers','products','recipes','sales','orders','ingredients','ingredient_stock_movements']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;

    EXECUTE format('SELECT count(*) FROM %I x WHERE x.owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.owner_id)', t) INTO orfas;
    IF orfas > 0 THEN
      IF owner IS NULL THEN
        RAISE EXCEPTION 'Tabela % tem % linha(s) sem dono valido e nao ha usuarios para assumi-las', t, orfas;
      END IF;
      EXECUTE format('UPDATE %I x SET owner_id = $1 WHERE x.owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.owner_id)', t) USING owner;
    END IF;

    EXECUTE format('ALTER TABLE %I ALTER COLUMN owner_id SET NOT NULL', t);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_owner_id_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (owner_id) REFERENCES users(id)', t, t || '_owner_id_fkey');
    END IF;
  END LOOP;
END $$;