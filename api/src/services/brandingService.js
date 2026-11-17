const repo = require("../db/repositories/branding");
const { isHexColor, normalizeHex, contrastRatio, darken, ensureContrastOn, toRgbChannels, AA_NORMAL_TEXT } = require("../utils/contrast");

const DEFAULTS = Object.freeze({
  primaryColor: "#4f46e5",
  backgroundColor: "#0b1220",
  textColor: "#f1f5f9",
});
// Tema base Grafite Noturno: superficie dos cards (--surface em base.css) e texto branco sobre botoes/cabecalhos.
const WHITE = "#ffffff";
const SURFACE_DARK = "#111c33";
const MAX_LOGO_BYTES = 512 * 1024;
const MAX_COMPANY_NAME = 80;

// Regras WCAG AA (texto normal, 4.5:1): primaria e fundo contra o branco (botoes/cabecalhos); texto contra a superficie escura.
const CONTRAST_RULES = [
  { field: "primaryColor", label: "Cor primaria (texto branco em botoes)", against: WHITE },
  { field: "backgroundColor", label: "Cor de fundo (texto branco sobre o fundo)", against: WHITE },
  { field: "textColor", label: "Cor do texto (sobre superficies escuras)", against: SURFACE_DARK },
];

function httpError(status, message, code, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

function toDto(row) {
  const s = row || {};
  const hasLogo = Boolean(s.has_logo);
  const version = s.logo_version || 0;
  return {
    companyName: s.company_name || null,
    primaryColor: s.primary_color || DEFAULTS.primaryColor,
    backgroundColor: s.background_color || DEFAULTS.backgroundColor,
    textColor: s.text_color || DEFAULTS.textColor,
    hasLogo,
    logoUrl: hasLogo ? `/api/branding/logo?v=${version}` : null,
    isDefault: !row,
    defaults: { ...DEFAULTS },
  };
}

function checkContrast(palette) {
  return CONTRAST_RULES.map((rule) => {
    const ratio = contrastRatio(palette[rule.field], rule.against);
    return {
      field: rule.field,
      label: rule.label,
      ratio: Math.round(ratio * 100) / 100,
      min: AA_NORMAL_TEXT,
      ok: ratio >= AA_NORMAL_TEXT,
    };
  });
}

function parsePalette(body) {
  const palette = {};
  const invalid = [];
  for (const rule of CONTRAST_RULES) {
    const raw = body[rule.field];
    if (!isHexColor(raw)) invalid.push({ field: rule.field, message: "Use o formato #RRGGBB" });
    else palette[rule.field] = normalizeHex(raw);
  }
  if (invalid.length) throw httpError(400, "Cor invalida: use o formato #RRGGBB", "INVALID_COLOR", invalid);
  return palette;
}

async function getBranding(ownerId) {
  return toDto(await repo.getSettings(ownerId));
}

async function saveBranding(ownerId, body) {
  const palette = parsePalette(body || {});
  let companyName = body.companyName;
  if (companyName !== undefined && companyName !== null && typeof companyName !== "string") {
    throw httpError(400, "Nome da empresa invalido", "INVALID_COMPANY_NAME");
  }
  companyName = typeof companyName === "string" ? companyName.trim() : "";
  if (companyName.length > MAX_COMPANY_NAME) {
    throw httpError(400, `Nome da empresa deve ter ate ${MAX_COMPANY_NAME} caracteres`, "INVALID_COMPANY_NAME");
  }
  const results = checkContrast(palette);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    throw httpError(
      422,
      "Paleta fora do contraste minimo WCAG AA (4.5:1). Primaria e fundo precisam de tons escuros; o texto precisa de um tom claro.",
      "CONTRAST_AA",
      failed
    );
  }
  return toDto(await repo.upsertSettings(ownerId, { companyName, ...palette }));
}

async function resetBranding(ownerId) {
  await repo.deleteSettings(ownerId);
  return toDto(null);
}

function detectImageMime(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

// WebP e convertido para PNG no upload: o pdfkit so embute PNG/JPEG, e assim o mesmo arquivo serve painel e PDFs.
// Limita a 1024px de largura/altura (sem ampliar) para o PNG resultante nao crescer demais.
async function webpToPng(buffer) {
  try {
    const sharp = require("sharp");
    return await sharp(buffer, { failOn: "error" })
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch (_err) {
    throw httpError(400, "Nao foi possivel ler a imagem WebP (arquivo corrompido)", "INVALID_LOGO");
  }
}

async function uploadLogo(ownerId, body) {
  const raw = body && body.data;
  if (typeof raw !== "string" || !raw) throw httpError(400, "Envie a imagem em base64 no campo data", "INVALID_LOGO");
  const b64 = raw.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw httpError(400, "Imagem em base64 invalida", "INVALID_LOGO");
  const buffer = Buffer.from(b64, "base64");
  if (buffer.length === 0) throw httpError(400, "Imagem vazia", "INVALID_LOGO");
  if (buffer.length > MAX_LOGO_BYTES) throw httpError(413, "Logo deve ter no maximo 512 KB", "LOGO_TOO_LARGE");
  const mime = detectImageMime(buffer);
  if (!mime) throw httpError(415, "Formato nao suportado: use PNG, JPG ou WebP", "LOGO_UNSUPPORTED_TYPE");
  if (body.contentType && body.contentType !== mime) {
    throw httpError(415, "O conteudo da imagem nao corresponde ao tipo informado", "LOGO_UNSUPPORTED_TYPE");
  }
  if (mime === "image/webp") {
    return toDto(await repo.setLogo(ownerId, await webpToPng(buffer), "image/png"));
  }
  return toDto(await repo.setLogo(ownerId, buffer, mime));
}

async function removeLogo(ownerId) {
  const row = await repo.clearLogo(ownerId);
  return toDto(row);
}

async function getLogo(ownerId) {
  return repo.getLogo(ownerId);
}

// CSS do tema: so sobrescreve tokens; sem configuracao devolve o padrao (vazio).
function buildThemeCss(row) {
  if (!row) return "/* tema padrao */\n";
  const bg = row.background_color;
  const primary = row.primary_color;
  return [
    "/* tema da empresa (gerado) */",
    ":root {",
    `  --accent: ${primary};`,
    `  --accent-dark: ${darken(primary, 0.15)};`,
    `  --rgb-accent: ${toRgbChannels(primary)};`,
    `  --accent-text: ${ensureContrastOn(primary, [SURFACE_DARK, bg])};`,
    `  --bg: ${bg};`,
    `  --bg-dark: ${darken(bg, 0.15)};`,
    `  --ink: ${row.text_color};`,
    `  --slate-900: ${row.text_color};`,
    "}",
    "",
  ].join("\n");
}

async function getThemeCss(ownerId) {
  return buildThemeCss(ownerId ? await repo.getSettings(ownerId) : null);
}

module.exports = {
  DEFAULTS,
  MAX_LOGO_BYTES,
  getBranding,
  saveBranding,
  resetBranding,
  uploadLogo,
  removeLogo,
  getLogo,
  getThemeCss,
  buildThemeCss,
  checkContrast,
};