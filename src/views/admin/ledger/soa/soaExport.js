import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { autoTableCjk as autoTable } from "utils/pdfCjkText";
import { loadLetterheadDataUrl } from "views/admin/quotations/rateListPdf";
import { formatDateDMY } from "utils/dateFormat";
import { buildSoaTable, SOA_BANK_DETAILS, SOA_COLUMNS, soaFilenameBase } from "utils/soaReport";

const LEFT = 30;
const RIGHT = 24;
const TOP = 160; // below the letterhead

const BORDER = [51, 51, 51];

/** SOA as an A4 PDF: letterhead, bank details, title block, table, grand total. */
export async function downloadSoaPdf({ rows, currency, asOfDate, clientName }) {
  const table = buildSoaTable(rows);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let letterhead;
  try {
    letterhead = await loadLetterheadDataUrl();
  } catch (error) {
    throw new Error("Could not load the Narvi letterhead. Please try again.");
  }
  const drawn = new Set();
  const drawLetterhead = () => {
    const page = doc.internal.getCurrentPageInfo().pageNumber;
    if (drawn.has(page)) return;
    drawn.add(page);
    doc.addImage(letterhead, "JPEG", 0, 0, pageWidth, pageHeight);
  };
  drawLetterhead();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("STATEMENT OF ACCOUNT (SOA)", LEFT, TOP);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`As at: ${formatDateDMY(asOfDate)}`, LEFT, TOP + 14);
  doc.text(`Currency: ${currency}`, LEFT, TOP + 26);
  if (clientName) doc.text(`Client: ${clientName}`, LEFT, TOP + 38);

  // Bank details, right-hand side of the same block
  const bankX = pageWidth - RIGHT - 190;
  doc.setFont("helvetica", "bold");
  doc.text(SOA_BANK_DETAILS.title, bankX, TOP);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  [...SOA_BANK_DETAILS.lines, ...SOA_BANK_DETAILS.extra].forEach((line, index) => {
    doc.text(line, bankX, TOP + 12 + index * 10);
  });

  const startY = TOP + 12 + (SOA_BANK_DETAILS.lines.length + SOA_BANK_DETAILS.extra.length) * 10 + 10;
  const numericColumns = {};
  SOA_COLUMNS.forEach((column, index) => {
    if (column.type === "number") numericColumns[index] = { halign: "right" };
  });

  autoTable(doc, {
    startY,
    head: [table.head],
    body: table.body,
    foot: [table.totalRow],
    showFoot: "lastPage",
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top", lineColor: BORDER, lineWidth: 0.5 },
    headStyles: { fillColor: [31, 78, 140], textColor: [255, 255, 255], fontStyle: "bold", lineColor: BORDER, lineWidth: 0.5 },
    bodyStyles: { fillColor: [255, 255, 255] },
    footStyles: { fillColor: [235, 240, 248], textColor: [0, 0, 0], fontStyle: "bold", lineColor: BORDER, lineWidth: 0.5 },
    columnStyles: numericColumns,
    margin: { top: startY, left: LEFT, right: RIGHT, bottom: 24 },
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // Before the rows are drawn: the letterhead is a full-page image and would paint over them.
    willDrawPage: (hook) => {
      if (hook.pageNumber > 1) drawLetterhead();
    },
  });

  doc.save(`${soaFilenameBase({ currency, asOfDate, clientName })}.pdf`);
}

/** SOA as .xlsx: company/bank header lines, then the table and the grand total. */
export function downloadSoaExcel({ rows, currency, asOfDate, clientName }) {
  const table = buildSoaTable(rows);
  const header = [
    ["Narvi Maritime Pte Ltd"],
    ["28 Jalan Lempeng #12-05, 128807 Singapore"],
    ["contact@narvimaritime.com", "T +65 8711 2752", "www.narvimaritime.com"],
    [],
    [SOA_BANK_DETAILS.title],
    ...SOA_BANK_DETAILS.lines.map((line) => [line]),
    ...SOA_BANK_DETAILS.extra.map((line) => [line]),
    [],
    ["STATEMENT OF ACCOUNT (SOA)"],
    ["As at", formatDateDMY(asOfDate)],
    ["Currency", currency],
    ...(clientName ? [["Client", clientName]] : []),
    [],
  ];
  // Amount cells are real numbers in Excel so they can be summed and filtered.
  const numericIdx = SOA_COLUMNS.map((column, index) => (column.type === "number" ? index : -1)).filter((i) => i >= 0);
  const body = table.body.map((line, r) =>
    line.map((cell, c) => (numericIdx.includes(c) ? rows[r][SOA_COLUMNS[c].key] : cell))
  );
  const totalLine = table.totalRow.map((cell, c) =>
    numericIdx.includes(c) ? table.total[SOA_COLUMNS[c].key] : cell
  );
  const sheetRows = [...header, table.head, ...body, totalLine];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const headRow = header.length;
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: headRow },
      e: { c: table.head.length - 1, r: headRow + Math.max(table.body.length, 1) },
    }),
  };
  // 1,234.00 style for the amount cells (table rows + grand total)
  for (let r = headRow + 1; r <= headRow + body.length + 1; r += 1) {
    numericIdx.forEach((c) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "n") cell.z = "#,##0.00";
    });
  }
  worksheet["!cols"] = [28, 10, 14, 18, 24, 22, 16, 16, 16].map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SOA");
  XLSX.writeFile(workbook, `${soaFilenameBase({ currency, asOfDate, clientName })}.xlsx`);
}
