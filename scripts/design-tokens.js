#!/usr/bin/env node
// Guarda dos design tokens (Fases 2, 5 e 7).
// Uso:
//   node scripts/design-tokens.js --check   falha se existir cor fixa (#hex ou rgb/rgba literal) fora do :root de base.css
//
// Regras:
//  - CSS e blocos <style>/atributos style= de HTML em web/public: nenhuma cor literal; use var(--token) ou
//    rgb(var(--rgb-canal) / alfa). Declaracoes de token so no :root de base.css (e no /theme.css gerado pela API).
//  - JS em web/public: nenhuma cor literal, exceto appearance.js (valores padrao e regras de contraste da tela de
//    aparencia, que sao dados e nao estilo) e print.js (HTML de impressao em janela propria, papel branco, sem o CSS do app).
const fs = require('fs');
const path = require('path');

const PUBLIC = path.resolve(__dirname, '../web/public');
const COLOR = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])|\brgba?\(\s*\d/g;
const JS_ALLOW = new Set(['appearance.js', 'print.js']);

function listFiles() {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!/node_modules|vendor/.test(e.name)) walk(p);
      } else if (/\.(css|html|js)$/.test(e.name)) out.push(p);
    }
  })(PUBLIC);
  return out;
}

// Remove o bloco :root de base.css (unico lugar onde cores literais sao permitidas)
function stripRoot(text) {
  return text.replace(/^:root\s*\{[\s\S]*?\n\}\n?/m, '');
}

// Entidades HTML numericas (&#233;) nao sao cores
function stripEntities(text) {
  return text.replace(/&#x?[0-9a-fA-F]+;/g, '');
}

function scan(file) {
  const rel = path.relative(PUBLIC, file).replace(/\\/g, '/');
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let text = raw;
  if (file.endsWith('base.css')) text = stripRoot(text);
  if (file.endsWith('.js') && JS_ALLOW.has(path.basename(file))) return [];
  if (file.endsWith('.html')) {
    // so estilo: blocos <style> e atributos style=; o resto do HTML (texto, atributos) nao e cor
    const parts = [];
    raw.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_m, css) => parts.push(css));
    raw.replace(/\sstyle="([^"]*)"/gi, (_m, css) => parts.push(css));
    text = parts.join('\n');
  }
  const found = [];
  stripEntities(text).split('\n').forEach((line) => {
    // comentarios de bloco em uma linha e URLs nao contam
    const clean = line.replace(/\/\*.*?\*\//g, '').replace(/https?:\/\/\S+/g, '');
    (clean.match(COLOR) || []).forEach((c) => found.push(`${rel}: ${c.trim()}  <- ${clean.trim().slice(0, 80)}`));
  });
  return found;
}

function check() {
  const left = listFiles().flatMap(scan);
  if (left.length) {
    console.error(`Cores fixas fora do :root (${left.length}). Use var(--token) ou rgb(var(--rgb-*) / alfa):\n` + left.slice(0, 40).join('\n'));
    process.exit(1);
  }
  console.log('OK: nenhuma cor fixa fora do :root (CSS, HTML e JS de web/public).');
}

const arg = process.argv[2];
if (arg === '--check') check();
else console.log('Uso: node scripts/design-tokens.js --check');
