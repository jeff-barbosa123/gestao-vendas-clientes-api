const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pool } = require('../../src/db');
const { runMigrations, getStatus, listMigrationFiles } = require('../../src/db/migrate');

describe('DB - migracoes versionadas e indices criticos', () => {
  const EXPECTED_INDEXES = [
    'idx_customers_owner_created',
    'idx_products_owner_created',
    'idx_products_owner_status',
    'idx_recipes_owner_created',
    'idx_sales_owner_date',
    'idx_sales_customer',
    'idx_sale_items_sale',
  ];

  before(async () => {
    await runMigrations(pool);
  });

  it('DB-MIG-001 | Migracoes do repositorio estao aplicadas e sem checksum divergente', async () => {
    const status = await getStatus(pool);
    expect(status.length).to.equal(listMigrationFiles().length);
    status.forEach((m) => {
      expect(m.applied, m.name).to.equal(true);
      expect(m.checksumMismatch, m.name).to.equal(false);
    });
  });

  it('DB-MIG-002 | Indices criticos existem', async () => {
    const { rows } = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1)",
      [EXPECTED_INDEXES]
    );
    expect(rows.map((r) => r.indexname).sort()).to.deep.equal([...EXPECTED_INDEXES].sort());
  });

  it('DB-MIG-003 | Rodar novamente e idempotente (nada a aplicar)', async () => {
    expect(await runMigrations(pool)).to.deep.equal([]);
  });

  it('DB-MIG-004 | Migracao nova roda uma vez, em ordem, e erro faz rollback', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgvc-mig-'));
    const tbl = `mig_tmp_${Date.now()}`;
    try {
      fs.writeFileSync(path.join(dir, '9001_cria.sql'), `CREATE TABLE ${tbl} (id INT);`);
      fs.writeFileSync(path.join(dir, '9002_quebra.sql'), `CREATE TABLE ${tbl}_b (id INT); SELECT * FROM nao_existe;`);
      let erro;
      try {
        await runMigrations(pool, { dir });
      } catch (e) {
        erro = e;
      }
      expect(erro && erro.message).to.match(/9002_quebra/);
      const ok = await pool.query('SELECT to_regclass($1) AS a, to_regclass($2) AS b', [tbl, `${tbl}_b`]);
      expect(ok.rows[0].a).to.not.equal(null);
      expect(ok.rows[0].b).to.equal(null);

      // checksum alterado em migracao aplicada e recusado
      fs.writeFileSync(path.join(dir, '9001_cria.sql'), `CREATE TABLE ${tbl} (id INT, x INT);`);
      fs.unlinkSync(path.join(dir, '9002_quebra.sql'));
      let erro2;
      try {
        await runMigrations(pool, { dir });
      } catch (e) {
        erro2 = e;
      }
      expect(erro2 && erro2.message).to.match(/checksum/i);
    } finally {
      await pool.query(`DROP TABLE IF EXISTS ${tbl}`);
      await pool.query("DELETE FROM schema_migrations WHERE version IN ('9001','9002')");
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});