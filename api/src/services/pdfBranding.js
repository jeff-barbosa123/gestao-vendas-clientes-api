// Marca da empresa nos PDFs (pdfkit): logo, nome e paleta definidos em /api/branding.
// Sem personalizacao (nenhuma configuracao, ou so valores padrao) o cabecalho e identico ao layout original.
const repo = require("../db/repositories/branding");
const { DEFAULTS } = require("./brandingService");

const PDF_TEXT = "#0f172a";
const PLAIN = Object.freeze({ custom: false, companyName: null, primary: "#000000", text: "#000", logo: null });

// pdfkit so embute PNG e JPEG. Logos WebP sao convertidos para PNG no upload (brandingService);
// o filtro cobre linhas antigas que ainda estejam em outro formato.
const PDF_IMAGE_MIMES = new Set(["image/png", "image/jpeg"]);

async function loadPdfBranding(ownerId) {
  if (!ownerId) return { ...PLAIN };
  let settings;
  try {
    settings = await repo.getSettings(ownerId);
  } catch (_err) {
    return { ...PLAIN }; // marca e opcional: falha aqui nunca derruba o PDF
  }
  if (!settings) return { ...PLAIN };

  let logo = null;
  if (settings.has_logo && PDF_IMAGE_MIMES.has(settings.logo_mime)) {
    try {
      const row = await repo.getLogo(ownerId);
      logo = row ? row.logo_data : null;
    } catch (_err) {
      logo = null;
    }
  }
  const companyName = settings.company_name || null;
  // A cor de texto da empresa vale para a tela (tema escuro); o papel do PDF e branco, entao o corpo usa tom escuro fixo.
  const colorsChanged = settings.primary_color !== DEFAULTS.primaryColor;
  if (!companyName && !logo && !colorsChanged) return { ...PLAIN };
  return {
    custom: true,
    companyName,
    primary: settings.primary_color,
    text: PDF_TEXT,
    logo,
  };
}

// Cabecalho do documento. Sem marca: exatamente o titulo centralizado de antes.
function drawBrandHeader(doc, branding, title, titleSize = 18) {
  if (!branding || !branding.custom) {
    doc.fontSize(titleSize).text(title, { align: "center" });
    return;
  }
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let textX = left;

  if (branding.logo) {
    try {
      doc.image(branding.logo, left, top, { fit: [120, 40] });
      textX = left + 130;
    } catch (_err) {
      // imagem corrompida: segue so com o nome
    }
  }
  if (branding.companyName) {
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(branding.primary)
      .text(branding.companyName, textX, top + (textX > left ? 12 : 0), {
        width: width - (textX - left),
        lineBreak: false,
        ellipsis: true,
      });
  }
  const lineY = top + 48;
  doc.save();
  doc.moveTo(left, lineY).lineTo(left + width, lineY).lineWidth(2).strokeColor(branding.primary).stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(titleSize).fillColor(branding.primary);
  doc.text(title, left, lineY + 14, { align: "center", width });
  doc.font("Helvetica").fillColor(branding.text);
}

module.exports = { loadPdfBranding, drawBrandHeader, PLAIN };
