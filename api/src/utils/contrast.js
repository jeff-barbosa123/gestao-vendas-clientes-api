// Contraste WCAG 2.x (AA) e derivacao de tons para o tema da empresa.
const HEX_RE = /^#[0-9a-f]{6}$/i;

function isHexColor(value) {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

function normalizeHex(value) {
  return value.trim().toLowerCase();
}

function hexToRgb(hex) {
  const h = normalizeHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Escurece misturando com preto (amount 0..1)
function darken(hex, amount) {
  return rgbToHex(hexToRgb(hex).map((v) => v * (1 - amount)));
}

// Clareia misturando com branco (amount 0..1)
function lighten(hex, amount) {
  return rgbToHex(hexToRgb(hex).map((v) => v + (255 - v) * amount));
}

const AA_NORMAL_TEXT = 4.5;

// Clareia o tom ate atingir o contraste minimo contra todos os fundos (usado em textos/links sobre superficies escuras).
function ensureContrastOn(hex, backgrounds, min = AA_NORMAL_TEXT) {
  let out = normalizeHex(hex);
  for (let i = 0; i <= 20; i += 1) {
    if (backgrounds.every((bg) => contrastRatio(out, bg) >= min)) return out;
    out = lighten(hex, (i + 1) * 0.05);
  }
  return "#ffffff";
}

// "r g b" (sintaxe de canal CSS: rgb(var(--rgb-accent) / 0.2))
function toRgbChannels(hex) {
  return hexToRgb(hex).join(" ");
}

module.exports = { toRgbChannels, isHexColor, normalizeHex, luminance, contrastRatio, darken, lighten, ensureContrastOn, AA_NORMAL_TEXT };