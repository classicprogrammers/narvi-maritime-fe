import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import narviLetterheadPrint from "../../../assets/letterHead/NarviLetterhead.jpeg";
import { chargeCategoryLabel } from "../../../utils/rateListForm";

export const RATE_LIST_PDF_TYPES = {
  COST_AND_FIXED: "cost_and_fixed",
  CLIENT_TARIFF: "client_tariff",
};

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

export function buildRateListPdfModel({
  items = [],
  reportType = RATE_LIST_PDF_TYPES.COST_AND_FIXED,
  agentName = "",
  scopeLabel = "",
} = {}) {
  const rows = sortRateRowsForPdf(items.map(mapRateItemForPdf));
  const isClientTariff = reportType === RATE_LIST_PDF_TYPES.CLIENT_TARIFF;

  return {
    reportType,
    title: isClientTariff ? "Client Tariff — Fixed Sales Rates" : "Rate List Export",
    agentName: agentName || "",
    scopeLabel: scopeLabel || "",
    rows,
    generatedAt: new Date().toLocaleString(),
    rowCount: rows.length,
  };
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
  const tableStartY = CONTENT_TOP + 38;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - CONTENT_LEFT - CONTENT_RIGHT;
  const isClientTariff = model.reportType === RATE_LIST_PDF_TYPES.CLIENT_TARIFF;

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

  const recordCount = model.rowCount || model.rows.length;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${model.title || "Rate List Export"} (${recordCount} record${recordCount === 1 ? "" : "s"})`, CONTENT_LEFT, CONTENT_TOP);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const subtitle = model.scopeLabel || model.agentName;
  let metaY = CONTENT_TOP + 14;
  if (subtitle) {
    doc.text(subtitle, CONTENT_LEFT, metaY);
    metaY += 12;
  }
  doc.text(`Generated: ${model.generatedAt}`, CONTENT_LEFT, metaY);

  const head = isClientTariff
    ? [["Rate Type", "Location", "Client", "Agent", "Rate Name", "Rate Text", "Rate Fixed"]]
    : [["Rate Type", "Location", "Client", "Agent", "Rate Name", "Rate Text", "Rate Cost", "Rate Fixed"]];

  const body = model.rows.map((row) =>
    isClientTariff
      ? [row.rateType, row.location, row.client, row.agent, row.rateName, row.rateText, row.rateFixed]
      : [row.rateType, row.location, row.client, row.agent, row.rateName, row.rateText, row.rateCost, row.rateFixed]
  );

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
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
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
        drawLetterhead();
        hookData.settings.margin.top = tableStartY;
      }
    },
  });

  return doc;
}

export function getRateListPdfFilename(model) {
  const dateTag = new Date().toISOString().slice(0, 10);
  const suffix =
    model.reportType === RATE_LIST_PDF_TYPES.CLIENT_TARIFF ? "client-tariffs" : "cost-and-fixed";
  const scopePart = (model.scopeLabel || model.agentName)
    ? `-${String(model.scopeLabel || model.agentName).replace(/[^\w.-]+/g, "-").replace(/-+/g, "-")}`
    : "";
  return `rate-list-${suffix}${scopePart}-${dateTag}.pdf`;
}

export async function fetchAllFilteredRates(api, params = {}) {
  const all = [];
  let page = 1;
  let hasNext = true;
  const baseParams = { ...params };
  delete baseParams.page;
  delete baseParams.page_size;

  while (hasNext) {
    const response = await api.get("/api/rate/list", {
      params: {
        ...baseParams,
        page,
        page_size: 200,
      },
    });
    const result = response?.data || {};
    const batch = Array.isArray(result.data) ? result.data : [];
    all.push(...batch);
    hasNext = Boolean(result.has_next);
    page += 1;
    if (!hasNext || batch.length === 0 || page > 100) break;
  }

  return all;
}
