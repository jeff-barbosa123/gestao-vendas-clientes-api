#!/usr/bin/env node
// Fase 2 - design tokens.
// Uso:
//   node scripts/design-tokens.js --apply   troca cores fixas mapeadas por var(--token) em web/public (CSS e <style> de HTML)
//   node scripts/design-tokens.js --check   falha se sobrar cor fixa mapeada fora do :root (guarda contra regressao)
//   node scripts/design-tokens.js --parity  compara o CSS resolvido (var -> hex) com o do git HEAD (paridade visual)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PUBLIC = path.resolve(__dirname, '../web/public');

// hex (minusculo) -> nome do token. Marca/fundo reaproveitam os tokens ja existentes (--accent, --accent-dark, --bg).
const TOKENS = {
  '#ffffff': '--white',
  '#f8fafc': '--slate-50',
  '#f1f5f9': '--slate-100',
  '#e2e8f0': '--slate-200',
  '#64748b': '--slate-500',
  '#475569': '--slate-600',
  '#334155': '--slate-700',
  '#1e293b': '--slate-800',
  '#0f172a': '--slate-900',
  '#e5e7eb': '--gray-200',
  '#1f2937': '--gray-800',
  '#ecfdf3': '--success-50',
  '#a7f3d0': '--success-200',
  '#16a34a': '--success-600',
  '#065f46': '--success-800',
  '#fff1f2': '--danger-50',
  '#fee2e2': '--danger-100',
  '#fecdd3': '--danger-200',
  '#fecaca': '--danger-300',
  '#ef4444': '--danger-500',
  '#b91c1c': '--danger-700',
  '#7f1d1d': '--danger-900',
  '#fffbeb': '--warning-50',
  '#92400e': '--warning-800',
  '#e0e7ff': '--brand-100',
  '#3730a3': '--brand-800',
  '#4f46e5': '--accent',
  '#4338ca': '--accent-dark',
  '#3f73c8': '--bg',
  '#2f5fae': '--bg-dark',
};

// Tokens novos declarados no :root de base.css (os existentes --bg, --accent, --accent-dark ja estao la).
const NEW_ROOT = Object.entries(TOKENS).filter(([, t]) => !['--bg', '--accent', '--accent-dark', '--bg-dark'].includes(t));

const HEX = /#[0-9a-fA-F]{6}\b/g;

function listFiles() {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!/node_modules|vendor/.test(e.name)) walk(p);
      } else if (/\.(css|html)$/.test(e.name)) out.push(p);
    }
  })(PUBLIC);
  return out;
}

// Aplica fn apenas nos trechos de CSS (arquivo .css inteiro, ou blocos <style> em .html)
function mapCss(file, text, fn) {
  if (file.endsWith('.css')) return fn(text, file.endsWith('base.css'));
  return text
    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, a, b, c) => a + fn(b, false) + c)
    .replace(/(\sstyle=")([^"]*)(")/gi, (_m, a, b, c) => a + fn(b, false) + c);
}

// Separa o bloco :root de base.css (declaracoes de token nao podem virar var(--proprio-token))
function splitRoot(css) {
  const m = css.match(/^:root\s*\{[\s\S]*?\}\n?/);
  return m ? [m[0], css.slice(m[0].length)] : ['', css];
}

function replaceHex(css) {
  return css.replace(HEX, (h) => {
    const t = TOKENS[h.toLowerCase()];
    return t ? `var(${t})` : h;
  });
}

function apply() {
  let changed = 0;
  for (const f of listFiles()) {
    const raw = fs.readFileSync(f, 'utf8');
    const crlf = raw.includes('\r\n');
    const text = raw.replace(/\r\n/g, '\n');
    const out = mapCss(f, text, (css, isBase) => {
      if (!isBase) return replaceHex(css);
      const [root, rest] = splitRoot(css);
      let newRoot = root;
      const missing = NEW_ROOT.filter(([, t]) => !root.includes(`${t}:`));
      if (missing.length) {
        const decl = missing.map(([h, t]) => `  ${t}: ${h};`).join('\n');
        newRoot = root.replace(/\n\}\n?$/, `\n  /* Design tokens (Fase 2): paleta primitiva; Fase 3 sobrescreve marca/fundo por empresa */\n  --bg-dark: #2f5fae;\n${decl}\n}\n`);
      }
      return newRoot + replaceHex(rest);
    });
    if (out !== text) {
      fs.writeFileSync(f, crlf ? out.replace(/\n/g, '\r\n') : out);
      changed += 1;
    }
  }
  console.log(`${changed} arquivo(s) atualizado(s).`);
}

function leftovers() {
  const res = [];
  for (const f of listFiles()) {
    const text = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
    mapCss(f, text, (css, isBase) => {
      const body = isBase ? splitRoot(css)[1] : css;
      (body.match(HEX) || []).forEach((h) => {
        if (TOKENS[h.toLowerCase()]) res.push(`${path.relative(PUBLIC, f)}: ${h}`);
      });
      return css;
    });
  }
  return res;
}

function check() {
  const left = leftovers();
  if (left.length) {
    console.error(`Cores fixas com token disponivel (${left.length}):\n` + left.slice(0, 40).join('\n'));
    process.exit(1);
  }
  console.log('OK: nenhuma cor fixa mapeada fora do :root.');
}

// Resolve var(--token) de volta para o hex e compara com o arquivo do git HEAD
function parity() {
  const rootDecl = {};
  NEW_ROOT.forEach(([h, t]) => { rootDecl[t] = h; });
  rootDecl['--bg'] = '#3f73c8';
  rootDecl['--accent'] = '#4f46e5';
  rootDecl['--accent-dark'] = '#4338ca';
  rootDecl['--bg-dark'] = '#2f5fae';
  let bad = 0;
  for (const f of listFiles()) {
    const rel = path.relative(path.resolve(__dirname, '..'), f).replace(/\\/g, '/');
    let head;
    try {
      head = execSync(`git show HEAD:${rel}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (_e) { continue; }
    const now = fs.readFileSync(f, 'utf8');
    const norm = (s) => s.replace(/\r\n/g, '\n');
    const resolve = (css) => css.replace(/var\((--[a-z0-9-]+)\)/g, (m, n) => (TOKENS && Object.values(TOKENS).includes(n) ? rootDecl[n] : m));
    const a = mapCss(f, norm(head), (c, isBase) => resolve(isBase ? splitRoot(c)[1] : c));
    const b = mapCss(f, norm(now), (c, isBase) => resolve(isBase ? splitRoot(c)[1] : c));
    if (a.toLowerCase() !== b.toLowerCase()) {
      bad += 1;
      console.error(`DIFERE: ${rel}`);
    }
  }
  if (bad) process.exit(1);
  console.log('OK: CSS resolvido identico ao HEAD (fora o bloco :root).');
}

const arg = process.argv[2];
if (arg === '--apply') apply();
else if (arg === '--check') check();
else if (arg === '--parity') parity();
else console.log('Uso: node scripts/design-tokens.js --apply | --check | --parity');
