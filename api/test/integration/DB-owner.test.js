const { expect } = require('chai');
const { randomUUID: uuid } = require("crypto");
const { pool } = require('../../src/db');

const TABLES = ['customers', 'products', 'recipes', 'sales', 'orders', 'ingredients', 'ingredient_stock_movements'];

describe('DB - isolamento multiempresa (owner_id NOT NULL + FK)', () => {
  it('DB-OWN-001 | owner_id e obrigatorio em todas as tabelas de negocio', async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema='public' AND column_name='owner_id' AND table_name = ANY($1) AND is_nullable = 'NO'`,
      [TABLES]
    );
    expect(rows.map((r) => r.table_name).sort()).to.deep.equal([...TABLES].sort());
  });

  it('DB-OWN-002 | Cada tabela tem FK de owner_id para users', async () => {
    const { rows } = await pool.query(
      `SELECT conrelid::regclass::text AS tbl FROM pg_constraint
        WHERE contype='f' AND confrelid='users'::regclass AND conname LIKE '%_owner_id_fkey'`
    );
    expect(rows.map((r) => r.tbl).sort()).to.deep.equal([...TABLES, 'company_settings', 'company_modules','custom_fields', 'cash_registers', 'cash_movements', 'sale_payments', 'customer_interactions', 'memberships', 'team_invitations'].sort());
  });

  it('DB-OWN-003 | Inserir cliente sem dono ou com dono inexistente e rejeitado', async () => {
    const base = `INSERT INTO customers (id, name, email, owner_id) VALUES ($1,'X','x@x.com',$2)`;
    let e1;
    try { await pool.query(base, [uuid(), null]); } catch (e) { e1 = e; }
    expect(e1 && e1.code).to.equal('23502');
    let e2;
    try { await pool.query(base, [uuid(), uuid()]); } catch (e) { e2 = e; }
    expect(e2 && e2.code).to.equal('23503');
  });
});