import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import narviLetterheadPrint from "../../../assets/letterHead/NarviLetterhead.jpeg";
import { chargeCategoryLabel } from "../../../utils/rateListForm";

const CONTENT_LEFT = 30;
const CONTENT_TOP = 160;
const CONTENT_RIGHT = 24;
const PDF_TABLE_BORDER_COLOR = [51, 51, 51];
const PDF_TABLE_BORDER_WIDTH = 0.5;
const PDF_TABLE_HEAD_STYLES = {
  fillColor: [255, 255, 255],
  textColor: [0, 0, 0],
  fontStyle: "bold",
  lineColor: PDF_TABLE_BORDER_COLOR,
  lineWidth: PDF_TABLE_BORDER_WIDTH,
};
const PDF_TABLE_BODY_STYLES = {
  fillColor: [255, 255, 255],
  lineColor: PDF_TABLE_BORDER_COLOR,
  lineWidth: PDF_TABLE_BORDER_WIDTH,
};

function displayPdfValue(value) {
  if (value === false || value == null || String(value).trim() === "") return "-";
  return String(value);
}

function formatRateTypeValue(value) {
  if (value === false || value == null || String(value).trim() === "") return "-";
  const key = String(value).trim();
  if (key === "general") return "General";
  if (key === "client_specific") return "Client Specific";
  return key;
}

function formatRateCostValue(item) {
  const rate = item?.rate_float;
  if (rate === false || rate == null || String(rate).trim() === "") return "-";
  return String(rate);
}

export function mapRateItemForPdf(item = {}) {
  return {
    rateType: formatRateTypeValue(item.rate_type),
    location: displayPdfValue(item.location_text || item.location),
    agent: displayPdfValue(item.agent_id?.name || item.agent_text || item.agent),
    client: displayPdfValue(item.client_id?.name || item.client_name || item.client),
    groupName: displayPdfValue(item.import_group),
    rateName: displayPdfValue(item.rate_name),
    chargeCategory: displayPdfValue(chargeCategoryLabel(item.charge_category, item.charge_category_label)),
    rateText: displayPdfValue(item.rate_text),
    rateCalculation: displayPdfValue(item.rate_calculation),
    rateCost: formatRateCostValue(item),
    rateFixed: displayPdfValue(item.fixed_sales_rate),
  };
}

export function sortRateRowsForPdf(rows = []) {
  return [...rows].sort((a, b) => {
    const location = String(a.location).localeCompare(String(b.location));
    if (location !== 0) return location;
    const agent = String(a.agent).localeCompare(String(b.agent));
    if (agent !== 0) return agent;
    return String(a.rateName).localeCompare(String(b.rateName));
  });
}

/**
 * Every PDF is described by one model: a title, optional scope line, one or more table
 * sections ({ title?, head, body }) and optional free-text footer blocks.
 */
export function buildPdfModel({
  title,
  scopeLabel = "",
  sections,
  footerBlocks = [],
  filenameSuffix = "report",
}) {
  return {
    title,
    scopeLabel,
    sections,
    footerBlocks: footerBlocks.filter((block) => String(block || "").trim()),
    filenameSuffix,
    generatedAt: new Date().toLocaleString(),
    rowCount: sections.reduce((total, section) => total + section.body.length, 0),
  };
}

export function buildRateListPdfModel({ items = [], scopeLabel = "" } = {}) {
  const rows = sortRateRowsForPdf(items.map(mapRateItemForPdf));
  return buildPdfModel({
    title: "Rate List Export",
    scopeLabel,
    sections: [
      {
        head: ["Rate Type", "Location", "Client", "Agent", "Rate Name", "Rate Text", "Rate Cost", "Sales"],
        body: rows.map((row) => [
          row.rateType,
          row.location,
          row.client,
          row.agent,
          row.rateName,
          row.rateText,
          row.rateCost,
          row.rateFixed,
        ]),
      },
    ],
    filenameSuffix: "cost-and-fixed",
  });
}

async function loadLetterheadDataUrl() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.onerror = reject;
    img.src = narviLetterheadPrint;
  });
}

export async function buildRateListPdf(model) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - CONTENT_LEFT - CONTENT_RIGHT;
  const tableStartY = CONTENT_TOP + 38;

  let letterheadDataUrl = null;
  const drawLetterhead = () => {
    if (!letterheadDataUrl) return;
    doc.addImage(letterheadDataUrl, "JPEG", 0, 0, pageWidth, pageHeight);
  };

  try {
    letterheadDataUrl = await loadLetterheadDataUrl();
    drawLetterhead();
  } catch (error) {
    console.error("Failed to load letterhead for rate list PDF:", error);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(
    `${model.title} (${model.rowCount} record${model.rowCount === 1 ? "" : "s"})`,
    CONTENT_LEFT,
    CONTENT_TOP
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let metaY = CONTENT_TOP + 14;
  if (model.scopeLabel) {
    doc.text(model.scopeLabel, CONTENT_LEFT, metaY);
    metaY += 12;
  }
  doc.text(`Generated: ${model.generatedAt}`, CONTENT_LEFT, metaY);

  const tableOptions = {
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "top",
      lineColor: PDF_TABLE_BORDER_COLOR,
      lineWidth: PDF_TABLE_BORDER_WIDTH,
    },
    headStyles: PDF_TABLE_HEAD_STYLES,
    bodyStyles: PDF_TABLE_BODY_STYLES,
    margin: { top: tableStartY, left: CONTENT_LEFT, right: CONTENT_RIGHT, bottom: 24 },
    tableWidth,
    pageBreak: "auto",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // Must run BEFORE the page's rows are drawn: the letterhead is a full-page image and
    // would otherwise paint over the table, leaving blank pages after the first.
    willDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) drawLetterhead();
    },
  };

  let nextY = tableStartY;
  model.sections.forEach((section) => {
    if (section.title) {
      if (nextY > pageHeight - 80) {
        doc.addPage();
        drawLetterhead();
        nextY = tableStartY;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(section.title, CONTENT_LEFT, nextY);
      nextY += 8;
    }
    autoTable(doc, { ...tableOptions, startY: nextY, head: [section.head], body: section.body });
    nextY = doc.lastAutoTable.finalY + 16;
  });

  // Free-text blocks (consignee, remarks) go under the last table, wrapping to a new page if needed.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  model.footerBlocks.forEach((block) => {
    const lines = doc.splitTextToSize(String(block), tableWidth);
    const blockHeight = lines.length * 11 + 10;
    if (nextY + blockHeight > pageHeight - 40) {
      doc.addPage();
      drawLetterhead();
      nextY = tableStartY;
    }
    doc.text(lines, CONTENT_LEFT, nextY);
    nextY += blockHeight;
  });

  return doc;
}

export function getRateListPdfFilename(model) {
  const dateTag = new Date().toISOString().slice(0, 10);
  const scopePart = model.scopeLabel
    ? `-${String(model.scopeLabel).replace(/[^w.-]+/g, "-").replace(/-+/g, "-")}`
    : "";
  return `rate-list-${model.filenameSuffix}${scopePart}-${dateTag}.pdf`;
}
