import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import narviLetterheadPrint from "../../../assets/letterHead/NarviLetterhead.jpeg";

export const RATE_LIST_PDF_TYPES = {
  COST_AND_FIXED: "cost_and_fixed",
  CLIENT_TARIFF: "client_tariff",
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
    client: displayPdfValue(item.client_id?.name),
    rateName: displayPdfValue(item.rate_name),
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
    title: isClientTariff ? "Client Tariff — Fixed Sales Rates" : "Rate List — Cost + Fixed Sales Rates",
    agentName: agentName || "",
    scopeLabel: scopeLabel || "",
    rows,
    generatedAt: new Date().toLocaleString(),
    rowCount: rows.length,
  };
}

async function loadLetterheadOnPdf(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      doc.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight);
      resolve();
    };
    img.onerror = reject;
    img.src = narviLetterheadPrint;
  });
}

export async function buildRateListPdf(model) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const contentLeft = 30;
  const contentRight = 30;
  const contentWidth = doc.internal.pageSize.getWidth() - contentLeft - contentRight;
  let cursorY = 120;

  try {
    await loadLetterheadOnPdf(doc);
  } catch (error) {
    console.error("Failed to load letterhead for rate list PDF:", error);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(model.title || "Rate List", contentLeft, cursorY);
  cursorY += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const subtitle = model.scopeLabel || model.agentName;
  if (subtitle) {
    doc.text(subtitle, contentLeft, cursorY);
    cursorY += 12;
  }
  doc.text(`Generated: ${model.generatedAt} · ${model.rowCount} rate(s)`, contentLeft, cursorY);
  cursorY += 14;

  const isClientTariff = model.reportType === RATE_LIST_PDF_TYPES.CLIENT_TARIFF;
  const head = isClientTariff
    ? [["Rate Type", "Location", "Agent", "Rate Name", "Rate Text", "Rate Fixed"]]
    : [["Rate Type", "Location", "Agent", "Rate Name", "Rate Text", "Rate Calculation", "Rate Cost", "Rate Fixed"]];

  const body = model.rows.map((row) =>
    isClientTariff
      ? [row.rateType, row.location, row.agent, row.rateName, row.rateText, row.rateFixed]
      : [row.rateType, row.location, row.agent, row.rateName, row.rateText, row.rateCalculation, row.rateCost, row.rateFixed]
  );

  autoTable(doc, {
    startY: cursorY,
    head,
    body,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [23, 70, 147], textColor: 255, fontStyle: "bold" },
    margin: { top: cursorY, left: contentLeft, right: contentRight, bottom: 24 },
    tableWidth: contentWidth,
    pageBreak: "auto",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        data.settings.margin.top = 36;
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
