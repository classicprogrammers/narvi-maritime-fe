import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import narviLetterheadPrint from "../../../assets/letterHead/NarviLetterhead.jpeg";
import { apiString } from "./quotationUtils";

export const DEFAULT_QUOTATION_REPORT_TERMS = [
  "* Our quotation is subject to the space/rates upon booking confirmation!",
  "* The quotation does not include Waiting Time, Overtime Services, DG Fee and any other accessorial charges that may apply during export/delivery to vessel!",
];

function normalizeRemark(value) {
  if (value === false || value == null) return "";
  return String(value);
}

export function formatReportAmount(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "0,00";
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getReportRateName(line) {
  const name = apiString(line?.rate_item_name).trim();
  if (name) return name;
  const freeText = apiString(line?.free_text).trim();
  if (freeText) return freeText;
  return "";
}

export function getReportRateRemark(line) {
  return normalizeRemark(line?.rate_remark).trim();
}

export function getLineReportCurrency(line, headerCurrencyName = "USD") {
  return apiString(line?.computed_currency_name).trim() || headerCurrencyName || "USD";
}

export function filterLinesForReport(lines = []) {
  return lines.filter((line) => {
    const hasContent =
      getReportRateName(line) ||
      getReportRateRemark(line) ||
      (line?.rate_to_client != null && String(line.rate_to_client).trim() !== "");
    return hasContent;
  });
}

export function buildQuotationReportModel({
  quotationId = "",
  quotationName = "",
  clientName = "",
  vesselName = "",
  headerCurrencyName = "USD",
  lines = [],
  terms = DEFAULT_QUOTATION_REPORT_TERMS,
}) {
  const filteredLines = filterLinesForReport(lines);

  const rows = filteredLines.map((line) => {
    const amountRaw = Number(line.rate_to_client);
    return {
      rateName: getReportRateName(line) || "—",
      currency: getLineReportCurrency(line, headerCurrencyName),
      amount: formatReportAmount(line.rate_to_client),
      amountRaw: Number.isNaN(amountRaw) ? 0 : amountRaw,
      remark: getReportRateRemark(line) || "",
    };
  });

  const totalRaw = rows.reduce((sum, row) => sum + row.amountRaw, 0);

  return {
    clientName: clientName || "",
    vesselName: vesselName || "",
    rows,
    total: formatReportAmount(totalRaw),
    totalCurrency: headerCurrencyName || "USD",
    terms,
    fileLabel: quotationName || (quotationId ? String(quotationId) : "quotation"),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildQuotationReportHtml(model) {
  const rowHtml = model.rows
    .map(
      (row) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #b4b4b4;vertical-align:top;">${escapeHtml(row.rateName)}</td>
        <td style="padding:6px 8px;border:1px solid #b4b4b4;text-align:center;white-space:nowrap;">${escapeHtml(row.currency)}</td>
        <td style="padding:6px 8px;border:1px solid #b4b4b4;text-align:right;white-space:nowrap;">${escapeHtml(row.amount)}</td>
        <td style="padding:6px 8px;border:1px solid #b4b4b4;vertical-align:top;">${escapeHtml(row.remark)}</td>
      </tr>`
    )
    .join("");

  const termsHtml = model.terms
    .map((line) => `<p style="margin:8px 0 0;font-size:12px;">${escapeHtml(line)}</p>`)
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;">
    <table style="border-collapse:collapse;width:100%;max-width:900px;margin-bottom:12px;">
      <tr>
        <td style="padding:4px 8px;font-weight:bold;width:120px;">Client</td>
        <td style="padding:4px 8px;">${escapeHtml(model.clientName)}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;font-weight:bold;">Vessel</td>
        <td style="padding:4px 8px;">${escapeHtml(model.vesselName)}</td>
      </tr>
    </table>
    <p style="font-weight:bold;margin:12px 0 6px;">Quotation:</p>
    <table style="border-collapse:collapse;width:100%;max-width:900px;">
      <tbody>
        ${rowHtml}
        <tr>
          <td style="padding:6px 8px;border:1px solid #b4b4b4;font-weight:bold;">Quotation total</td>
          <td style="padding:6px 8px;border:1px solid #b4b4b4;text-align:center;font-weight:bold;">${escapeHtml(model.totalCurrency)}</td>
          <td style="padding:6px 8px;border:1px solid #b4b4b4;text-align:right;font-weight:bold;">${escapeHtml(model.total)}</td>
          <td style="padding:6px 8px;border:1px solid #b4b4b4;"></td>
        </tr>
      </tbody>
    </table>
    ${termsHtml}
  </div>`;
}

export function buildQuotationReportPlainText(model) {
  const lines = [
    `Client: ${model.clientName}`,
    `Vessel: ${model.vesselName}`,
    "",
    "Quotation:",
    ...model.rows.map(
      (row) =>
        `${row.rateName}\t${row.currency}\t${row.amount}${row.remark ? `\t${row.remark}` : ""}`
    ),
    `Quotation total\t${model.totalCurrency}\t${model.total}`,
    "",
    ...model.terms,
  ];
  return lines.join("\n");
}

export async function copyQuotationReportToClipboard(html, plainText) {
  if (navigator.clipboard && window.ClipboardItem) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      }),
    ]);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = plainText;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return true;
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

export async function buildQuotationReportPdf(model) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const contentLeft = 30;
  const contentRight = 30;
  const contentWidth = doc.internal.pageSize.getWidth() - contentLeft - contentRight;
  let cursorY = 160;

  try {
    await loadLetterheadOnPdf(doc);
  } catch (error) {
    console.error("Failed to load letterhead image for quotation PDF:", error);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const writeMetaLine = (label, value, y) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, contentLeft, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(String(value || ""), contentWidth - 70);
    doc.text(wrapped, contentLeft + 70, y);
    return y + Math.max(14, wrapped.length * 12);
  };

  cursorY = writeMetaLine("Client", model.clientName, cursorY);
  cursorY = writeMetaLine("Vessel", model.vesselName, cursorY);
  cursorY += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Quotation:", contentLeft, cursorY);
  cursorY += 10;
  doc.setFont("helvetica", "normal");

  const tableBody = [
    ...model.rows.map((row) => [row.rateName, row.currency, row.amount, row.remark]),
    [
      { content: "Quotation total", styles: { fontStyle: "bold" } },
      { content: model.totalCurrency, styles: { fontStyle: "bold", halign: "center" } },
      { content: model.total, styles: { fontStyle: "bold", halign: "right" } },
      "",
    ],
  ];

  autoTable(doc, {
    startY: cursorY,
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "top",
    },
    margin: { left: contentLeft, right: contentRight },
    tableWidth: contentWidth,
    columnStyles: {
      0: { cellWidth: contentWidth * 0.52 },
      1: { cellWidth: contentWidth * 0.1, halign: "center" },
      2: { cellWidth: contentWidth * 0.14, halign: "right" },
      3: { cellWidth: contentWidth * 0.24 },
    },
  });

  cursorY = (doc.lastAutoTable?.finalY || cursorY) + 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  model.terms.forEach((term) => {
    const wrapped = doc.splitTextToSize(term, contentWidth);
    doc.text(wrapped, contentLeft, cursorY);
    cursorY += wrapped.length * 11 + 4;
  });

  return doc;
}

export function getQuotationReportPdfFilename(model) {
  const dateTag = new Date().toISOString().slice(0, 10);
  const idPart = String(model.fileLabel || "quotation")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `quotation-${idPart || "report"}-${dateTag}.pdf`;
}
