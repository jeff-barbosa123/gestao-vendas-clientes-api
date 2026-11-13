const PDFDocument = require("pdfkit");
const { normalizeIngredients } = require("./normalizers");

async function renderRecipeExport(recipe, format = "csv") {
  
  // Recalcular os ingredientes para garantir que os custos estão corretos
  // (importante para receitas antigas que foram salvas com unidades mistas)
  let recalculatedIngredients = [];
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    try {
      recalculatedIngredients = normalizeIngredients(recipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        packageQuantity: ing.packageQuantity,
        packUnit: ing.packUnit,
        cost: ing.cost,
        component: ing.component,
      })));
    } catch (err) {
      // Se houver erro no recálculo, usar os valores originais
      recalculatedIngredients = recipe.ingredients;
    }
  }

  if (format === "csv" || format === "excel") {
    const csvEscape = (value) => {
      if (value === null || value === undefined) return "";
      const text = String(value);
      if (/[;"\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const formatNumber = (value) => {
      if (!Number.isFinite(value)) return "";
      return value.toFixed(2).replace(".", ",");
    };
    const priceTotal = Number.isFinite(recipe.priceSuggested) && Number.isFinite(recipe.yield)
      ? recipe.priceSuggested * recipe.yield
      : null;
    const lines = [
      "Campo;Valor",
      `Nome;${csvEscape(recipe.name)}`,
      `Rendimento;${csvEscape(recipe.yield)}`,
      `Unidade;${csvEscape(recipe.yieldType)}`,
      `Custo total;${formatNumber(recipe.totalCost)}`,
      `Custo unitário;${formatNumber(recipe.costPerUnit)}`,
      `Preço mínimo;${formatNumber(recipe.priceMinimum)}`,
      `Preço sugerido;${formatNumber(recipe.priceSuggested)}`,
      `Preço total da receita;${formatNumber(priceTotal)}`,
      `Margem;${csvEscape(recipe.marginLabel)}`,
      `Lucro estimado;${formatNumber(recipe.estimatedProfit)}`,
      "",
      "Ingredientes",
      "Ingrediente;Quantidade;Unidade;Custo unitário;Custo total",
      ...(recalculatedIngredients.length > 0 ? recalculatedIngredients : (recipe.ingredients || [])).map((ing) =>
        [
          csvEscape(ing.name),
          csvEscape(ing.quantity),
          csvEscape(ing.unit || ""),
          formatNumber(ing.unitCost),
          formatNumber(ing.totalCost),
        ].join(";")
      ),
    ];
    const body = lines.join("\n");
    const contentType = format === "excel" ? "application/vnd.ms-excel" : "text/csv";
    return { contentType, body };
  }

  if (format === "pdf") {
    const formatNumber = (value) => {
      if (!Number.isFinite(value)) return "0,00";
      return value.toFixed(2).replace(".", ",");
    };
    const priceTotal = Number.isFinite(recipe.priceSuggested) && Number.isFinite(recipe.yield)
      ? recipe.priceSuggested * recipe.yield
      : 0;
    const costIngredients = Number.isFinite(recipe.costIngredients) ? recipe.costIngredients : 0;
    const overheadTotal = Number.isFinite(recipe.overhead) ? recipe.overhead : 0;
    const laborTotal = Number.isFinite(recipe.labor) ? recipe.labor : 0;
    const generatedAt = new Date().toLocaleString("pt-BR");

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));

    doc.fontSize(18).text("Ficha Técnica", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Gerado em: ${generatedAt}`, { align: "right" });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Nome: ${recipe.name}`);
    doc.text(`Rendimento: ${recipe.yield} (${recipe.yieldType})`);
    doc.text(`Custo ingredientes: R$ ${formatNumber(costIngredients)}`);
    doc.text(`Custos indiretos: R$ ${formatNumber(overheadTotal)}`);
    doc.text(`Mão de obra: R$ ${formatNumber(laborTotal)}`);
    doc.text(`Custo total: R$ ${formatNumber(recipe.totalCost)}`);
    doc.text(`Custo unitário: R$ ${formatNumber(recipe.costPerUnit)}`);
    doc.text(`Preço mínimo: R$ ${formatNumber(recipe.priceMinimum)}`);
    doc.font("Helvetica-Bold").text(
      `Preço sugerido: R$ ${formatNumber(recipe.priceSuggested)} (${recipe.marginLabel})`
    );
    doc.font("Helvetica");
    doc.text(`Preço total da receita: R$ ${formatNumber(priceTotal)}`);
    doc.text(`Lucro estimado: R$ ${formatNumber(recipe.estimatedProfit)}`);

    doc.moveDown();
    doc.fontSize(14).text("Ingredientes");
    doc.moveDown(0.5);
    doc.fontSize(10);

    // Usar ingredientes recalculados se disponíveis
    const ingredientsForPDF = recalculatedIngredients.length > 0 
      ? recalculatedIngredients 
      : (recipe.ingredients || []);

    const tableX = doc.x;
    const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rowHeight = 20;
    const colWidths = [
      tableWidth * 0.50,
      tableWidth * 0.12,
      tableWidth * 0.08,
      tableWidth * 0.14,
      tableWidth * 0.16,
    ];
    const colAlign = ["left", "right", "center", "right", "right"];
    const colX = [
      tableX,
      tableX + colWidths[0],
      tableX + colWidths[0] + colWidths[1],
      tableX + colWidths[0] + colWidths[1] + colWidths[2],
      tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    ];

    const drawHeader = () => {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
      const y = doc.y;
      doc.save();
      doc.fillOpacity(1);
      doc.rect(tableX, y - 2, tableWidth, rowHeight).fill("#e6e6e6");
      doc.restore();
      doc.font("Helvetica-Bold").fillColor("#000");
      const headers = ["Ingrediente", "Qtd", "Un", "Custo un.", "Custo total"];
      headers.forEach((text, idx) => {
        doc.text(text, colX[idx], y, {
          width: colWidths[idx],
          align: colAlign[idx],
          lineBreak: false,
        });
      });
      doc.moveDown(1);
    };

    const drawRow = (values) => {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      doc.font("Helvetica").fillColor("#000");
      values.forEach((text, idx) => {
        doc.text(text, colX[idx], y, {
          width: colWidths[idx],
          align: colAlign[idx],
          lineBreak: false,
        });
      });
      doc.moveDown(0.9);
    };

    drawHeader();

    ingredientsForPDF.forEach((ing) => {
      drawRow([
        String(ing.name || ""),
        formatNumber(ing.quantity),
        String(ing.unit || ""),
        `R$ ${formatNumber(ing.unitCost)}`,
        `R$ ${formatNumber(ing.totalCost)}`,
      ]);
    });

    doc.font("Helvetica");
    doc.end();

    return new Promise((resolve) => {
      doc.on("end", () => {
        resolve({ contentType: "application/pdf", body: Buffer.concat(chunks) });
      });
    });
  }

  const err = new Error("Formato de exportação inválido");
  err.status = 400;
  throw err;
}

module.exports = {
  renderRecipeExport,
};
