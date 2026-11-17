const { expect } = require('chai');
const { spawnSync } = require('child_process');
const path = require('path');

describe('Design tokens - guarda contra cores fixas', () => {
  it('DS-001 | Nenhuma cor mapeada fica fixa fora do :root (use var(--token))', () => {
    const script = path.resolve(__dirname, '../../../scripts/design-tokens.js');
    const r = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    expect(r.status, r.stderr || r.stdout).to.equal(0);
  });
});