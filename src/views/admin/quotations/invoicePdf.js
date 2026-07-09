import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import narviLetterheadPrint from "../../../assets/letterHead/NarviLetterhead.jpeg";

const CONTENT_LEFT = 30;
const CONTENT_TOP = 160;

const BANK_DETAILS = `DBS Bank Ltd
DBS ASIA Central MBFC Tower 3
12 Marina Boulevard
018982 Singapore`;

const COMPANY_DETAILS = `In the name of : Narvi Maritime Pte Ltd
GST Reg. No. 202008258Z
Account number : 0339059927(USD)
SWIFT Code/BIG : DBSSSGSG`;

const LEGAL_LINES = [
  "Invoice amount to be paid in full without deduction of any bank fees or charges",
  "Discrepancies in this invoice should be lodged within 14 days from the date of invoice, otherwise the invoice amount will be treated as true & correct.",
  "Interests of 3% per month will be levelled on all accounts beyond payment terms in case of no further agreement made.",
  "This is a computer generated Invoice - No signature is required",
  "All cheques should be crossed and made payable to Narvi Maritime Pte Ltd",
];

function display(value) {
  if (value == null || value === false) return "";
  return String(value).trim();
}

function displayDash(value) {
  const text = display(value);
  return text || "-";
}

export function formatInvoiceMoney(value) {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildTaxInvoiceSnapshot(formState) {
  const lineItems = Array.isArray(formState.lineItems) ? formState.lineItems : [];
  const totalAmount = lineItems.reduce((sum, item) => {
    const n = Number(String(item.amount ?? "").replace(/,/g, "").trim());
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const totalAgentCost = lineItems.reduce((sum, item) => {
    const n = Number(String(item.agentCost ?? "").replace(/,/g, "").trim());
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const gst = Number(String(formState.gstAmount ?? "").replace(/,/g, "").trim());
  const gstAmount = Number.isFinite(gst) ? gst : 0;

  return {
    billTo: display(formState.billTo),
    invoiceAddress: display(formState.invoiceAddress),
    date: display(formState.date),
    pageNo: display(formState.pageNo) || "1 OF 1",
    taxInvoiceNumber: display(formState.taxInvoiceNumber),
    attention: display(formState.attention),
    yourRef: display(formState.yourRef),
    jobCargoDescription: display(formState.jobCargoDescription),
    jobNo: display(formState.jobNo),
    approvedBy: display(formState.approvedBy),
    paymentTerms: display(formState.paymentTerms),
    invoiceCurrency: display(formState.invoiceCurrency) || "USD",
    lineItems: lineItems.map((item) => ({
      description: display(item.description),
      amount: display(item.amount),
      agentCost: display(item.agentCost),
    })),
    gstAmount: display(formState.gstAmount),
    totalAmount,
    totalAgentCost,
    grandTotal: totalAmount + gstAmount,
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

export function getTaxInvoicePdfFilename(snapshot) {
  const dateTag = new Date().toISOString().slice(0, 10);
  const ref = (snapshot?.taxInvoiceNumber || "draft").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
  return `tax-invoice-${ref}-${dateTag}.pdf`;
}

export async function buildTaxInvoicePdf(snapshot) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const margin = CONTENT_LEFT;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - margin * 2;
  const col1 = tableWidth * 0.18;
  const col2 = tableWidth * 0.32;
  const col3 = tableWidth * 0.18;
  const col4 = tableWidth * 0.16;
  const col5 = tableWidth * 0.16;

  let letterheadDataUrl = null;
  const drawLetterhead = () => {
    if (!letterheadDataUrl) return;
    doc.addImage(letterheadDataUrl, "JPEG", 0, 0, pageWidth, pageHeight);
  };

  const tableStyles = {
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "top",
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    margin: { left: margin, right: margin, top: CONTENT_TOP },
    tableWidth,
    didParseCell: (hookData) => {
      hookData.cell.styles.textColor = [0, 0, 0];
    },
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
        drawLetterhead();
        hookData.settings.margin.top = CONTENT_TOP;
      }
    },
  };

  try {
    letterheadDataUrl = await loadLetterheadDataUrl();
    drawLetterhead();
  } catch (error) {
    console.error("Failed to load invoice letterhead for PDF:", error);
  }

  const startY = CONTENT_TOP;

  autoTable(doc, {
    ...tableStyles,
    startY,
    body: [
      [
        {
          content: `BILL TO :\n${displayDash(snapshot.billTo)}\n\nINVOICE ADDRESS\n${displayDash(snapshot.invoiceAddress)}`,
          colSpan: 2,
        },
        {
          content: `DATE : ${displayDash(snapshot.date)}\nPAGE : ${displayDash(snapshot.pageNo)}`,
          colSpan: 3,
        },
      ],
      [
        {
          content: "TAX INVOICE NUMBER :",
          colSpan: 5,
          styles: {
            halign: "center",
            valign: "middle",
            fontStyle: "bold",
            fontSize: 14,
            minCellHeight: 32,
            cellPadding: 8,
          },
        },
      ],
      [
        {
          content: displayDash(snapshot.taxInvoiceNumber),
          colSpan: 5,
          styles: {
            halign: "center",
            valign: "middle",
            fontStyle: "bold",
            fontSize: 10,
            minCellHeight: 22,
            cellPadding: 6,
          },
        },
      ],
      ["ATTENTION :", displayDash(snapshot.attention), "JOB NO :", { content: displayDash(snapshot.jobNo), colSpan: 2 }],
      ["YOUR REF :", displayDash(snapshot.yourRef), "APPROVED BY :", { content: displayDash(snapshot.approvedBy), colSpan: 2 }],
      [
        "JOB/CARGO DESCRIPTION :",
        displayDash(snapshot.jobCargoDescription),
        "PAYMENT TERMS :",
        { content: displayDash(snapshot.paymentTerms), colSpan: 2 },
      ],
    ],
    columnStyles: {
      0: { cellWidth: col1 },
      1: { cellWidth: col2 },
      2: { cellWidth: col3 },
      3: { cellWidth: col4 },
      4: { cellWidth: col5 },
    },
  });

  const lineRows = (snapshot.lineItems || []).map((item) => [
    { content: displayDash(item.description), colSpan: 2 },
    "",
    displayDash(item.amount),
    displayDash(item.agentCost),
  ]);

  autoTable(doc, {
    ...tableStyles,
    startY: doc.lastAutoTable.finalY,
    head: [
      [
        { content: "DESCRIPTION", colSpan: 2 },
        `INVOICE CURRENCY:\n${snapshot.invoiceCurrency || "USD"}`,
        "AMOUNT",
        { content: "AGENT COST", styles: { textColor: [0, 0, 0], fontStyle: "bold" } },
      ],
    ],
    body: [
      ...lineRows,
      [
        { content: `***Bank Details :\n${BANK_DETAILS}`, colSpan: 2, rowSpan: 3, styles: { fontStyle: "bolditalic" } },
        { content: COMPANY_DETAILS, rowSpan: 3 },
        { content: "TOTAL", styles: { halign: "right", fontStyle: "bold" } },
        { content: formatInvoiceMoney(snapshot.totalAmount), styles: { halign: "right", fontStyle: "bold" } },
      ],
      [
        { content: "GST AMOUNT", styles: { halign: "right", fontStyle: "bold" } },
        { content: displayDash(snapshot.gstAmount) || formatInvoiceMoney(0), styles: { halign: "right" } },
      ],
      [
        { content: `GRAND TOTAL ${snapshot.invoiceCurrency || "USD"}`, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatInvoiceMoney(snapshot.grandTotal), styles: { halign: "right", fontStyle: "bold" } },
      ],
      [
        { content: "", colSpan: 3, styles: { lineWidth: { top: 0 } } },
        { content: formatInvoiceMoney(snapshot.totalAgentCost), styles: { halign: "right", fontStyle: "bold" } },
      ],
    ],
    columnStyles: {
      0: { cellWidth: col1 },
      1: { cellWidth: col2 },
      2: { cellWidth: col3 },
      3: { cellWidth: col4 },
      4: { cellWidth: col5 },
    },
  });

  doc.setTextColor(0, 0, 0);
  let textY = doc.lastAutoTable.finalY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(LEGAL_LINES[0], pageWidth / 2, textY, { align: "center" });
  textY += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  LEGAL_LINES.slice(1).forEach((line) => {
    const wrapped = doc.splitTextToSize(line, tableWidth);
    doc.text(wrapped, margin, textY);
    textY += wrapped.length * 9 + 2;
  });

  return doc;
}
