// jsPDF built-in fonts have no Chinese / Japanese / Korean glyphs, so such text comes out as
// garbage. Same approach as stockPdfEmoji.js: draw those pieces with the browser's own fonts onto a
// canvas and place the result in the PDF as an image.
//
//  - autoTableCjk(doc, options): drop-in for autoTable(doc, options). Cells with CJK are laid out
//    blank with the right height, then the image is drawn over them. Tables without CJK go straight
//    to autoTable.
//  - textCjk(doc, text, x, y, options): drop-in for doc.text for single lines (titles, headings).
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const CJK_RE = /[⺀-鿿가-힯豈-﫿︰-﹏＀-￯　-〿]/;
const FONT_FAMILY = '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC","Noto Sans SC","SimSun",Arial,sans-serif';
const PX_PER_PT = 4;

export const hasCjk = (value) => CJK_RE.test(String(value ?? ""));

// Wraps text to maxWidth using measure(text) -> width. Breaks at spaces, or per character when a
// word is wider than the line (Chinese has no spaces).
export const wrapTextLines = (text, maxWidth, measure) => {
  const lines = [];
  let current = "";
  Array.from(String(text ?? "")).forEach((char) => {
    const next = current + char;
    if (current && measure(next) > maxWidth) {
      const lastSpace = current.lastIndexOf(" ");
      if (char !== " " && lastSpace > 0 && !hasCjk(char)) {
        lines.push(current.slice(0, lastSpace));
        current = current.slice(lastSpace + 1) + char;
      } else {
        lines.push(current);
        current = char === " " ? "" : char;
      }
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

const cssColor = (color) => {
  if (Array.isArray(color) && color.length >= 3) return `rgb(${color[0]},${color[1]},${color[2]})`;
  if (typeof color === "number") return `rgb(${color},${color},${color})`;
  return "#000";
};

// -> { dataUrl, width, height } in PDF points (width = widest line), or null without a canvas
export const renderTextImage = (text, maxWidthPt, fontPt, { bold = false, color } = {}) => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const font = `${bold ? "bold " : ""}${fontPt * PX_PER_PT}px ${FONT_FAMILY}`;
  ctx.font = font;
  const measure = (t) => ctx.measureText(t).width;
  const lines = String(text ?? "")
    .split("\n")
    .flatMap((part) => wrapTextLines(part, maxWidthPt * PX_PER_PT, measure));
  const lineHeightPx = Math.ceil(fontPt * PX_PER_PT * 1.3);
  canvas.width = Math.max(1, Math.ceil(Math.max(...lines.map(measure))));
  canvas.height = lineHeightPx * lines.length;
  ctx.font = font; // resizing the canvas resets the context
  ctx.fillStyle = cssColor(color);
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => ctx.fillText(line, 0, lineHeightPx * i + lineHeightPx / 2));
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width / PX_PER_PT,
    height: canvas.height / PX_PER_PT,
  };
};

const addImageSafe = (doc, image, x, y) => {
  try {
    doc.addImage(image.dataUrl, "PNG", x, y, image.width, image.height);
  } catch (_err) {
    /* leave it blank rather than fail the whole PDF */
  }
};

const cellContent = (cell) =>
  cell != null && typeof cell === "object" && !Array.isArray(cell) ? cell.content : cell;

const rowsHaveCjk = (rows) =>
  Array.isArray(rows) && rows.some((row) => Array.isArray(row) && row.some((cell) => hasCjk(cellContent(cell))));

// CJK cells become blank (optionally with a reserved height); everything else is untouched
const blankCjkCells = (rows, section, heights = {}) =>
  (rows || []).map((row, r) =>
    Array.isArray(row)
      ? row.map((cell, c) => {
          if (!hasCjk(cellContent(cell))) return cell;
          const base = cell != null && typeof cell === "object" ? cell : {};
          const minCellHeight = heights[`${section}:${r}:${c}`];
          return {
            ...base,
            content: "",
            styles: { ...(base.styles || {}), ...(minCellHeight ? { minCellHeight } : {}) },
          };
        })
      : row
  );

const originalText = (options, data) => {
  const rows = data.section === "head" ? options.head : data.section === "foot" ? options.foot : options.body;
  return cellContent(rows?.[data.row.index]?.[data.column.index]);
};

const cellPad = (cell, side) => {
  const value = typeof cell.padding === "function" ? Number(cell.padding(side)) : NaN;
  return Number.isFinite(value) ? value : 3;
};

const cellImage = (cell, text) => {
  const availableWidth = cell.width - cellPad(cell, "left") - cellPad(cell, "right");
  const styles = cell.styles || {};
  return renderTextImage(text, availableWidth, Number(styles.fontSize) || 9, {
    bold: styles.fontStyle === "bold",
    color: styles.textColor,
  });
};

const cellKey = (data) => `${data.section}:${data.row.index}:${data.column.index}`;

const withBlankedCells = (options, heights) => ({
  ...options,
  head: blankCjkCells(options.head, "head", heights),
  body: blankCjkCells(options.body, "body", heights),
  foot: blankCjkCells(options.foot, "foot", heights),
});

export const autoTableCjk = (doc, options = {}) => {
  if (!["head", "body", "foot"].some((section) => rowsHaveCjk(options[section]))) {
    autoTable(doc, options);
    return;
  }

  // Pass 1 on a scratch page (nothing kept): only autoTable knows how wide each cell ends up
  const heights = {};
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const scratch = new jsPDF({
    unit: "pt",
    format: [pageWidth, pageHeight],
    orientation: pageWidth > pageHeight ? "landscape" : "portrait",
  });
  autoTable(scratch, {
    ...withBlankedCells(options),
    willDrawCell: undefined,
    willDrawPage: undefined,
    didDrawPage: undefined,
    didDrawCell: (data) => {
      const text = originalText(options, data);
      if (!hasCjk(text)) return;
      const image = cellImage(data.cell, text);
      if (image) heights[cellKey(data)] = image.height + cellPad(data.cell, "top") + cellPad(data.cell, "bottom");
    },
  });

  // Pass 2: the real table, CJK cells blank but tall enough, images drawn on top
  const previous = options.didDrawCell;
  autoTable(doc, {
    ...withBlankedCells(options, heights),
    didDrawCell: (data) => {
      if (typeof previous === "function") previous(data);
      const text = originalText(options, data);
      if (!hasCjk(text)) return;
      const cell = data.cell;
      const image = cellImage(cell, text);
      if (!image) return;
      const left = cellPad(cell, "left");
      const available = cell.width - left - cellPad(cell, "right");
      const align = cell.styles?.halign;
      const offset = align === "center" ? (available - image.width) / 2 : align === "right" ? available - image.width : 0;
      addImageSafe(doc, image, cell.x + left + Math.max(0, offset), cell.y + cellPad(cell, "top"));
    },
  });
};

// doc.text for one line. options.align: "left" | "center" | "right". Set font size / colour on doc
// first, as with doc.text; pass options.color ([r, g, b]) and options.bold for the CJK image.
export const textCjk = (doc, text, x, y, options = {}) => {
  if (!hasCjk(text)) {
    doc.text(String(text ?? ""), x, y, options.align ? { align: options.align } : undefined);
    return;
  }
  const fontSize = doc.getFontSize();
  const image = renderTextImage(text, 1000, fontSize, { bold: options.bold, color: options.color });
  if (!image) {
    doc.text(String(text), x, y, options.align ? { align: options.align } : undefined);
    return;
  }
  const left = options.align === "center" ? x - image.width / 2 : options.align === "right" ? x - image.width : x;
  addImageSafe(doc, image, left, y - fontSize * 0.85);
};
