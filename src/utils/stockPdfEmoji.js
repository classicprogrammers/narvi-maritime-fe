const EMOJI_PNG_CACHE = {};

const PDF_EMOJI_TOKENS = ["‼️⛔", "❌", "‼️", "⛔"];

export function listPdfEmojis(value) {
    const text = String(value ?? "");
    if (!text) return [];
    const found = [];
    PDF_EMOJI_TOKENS.forEach((token) => {
        if (text.includes(token) && !found.some((existing) => existing.includes(token) || token.includes(existing))) {
            found.push(token);
        }
    });
    return found;
}

export function stripPdfEmojis(value) {
    let text = String(value ?? "");
    PDF_EMOJI_TOKENS.forEach((token) => {
        text = text.split(token).join(" ");
    });
    return text.replace(/[\uFE0F\u200D]/g, "").replace(/\s+/g, " ").trim();
}

export function renderEmojiDataUrl(emoji, fontPx = 48) {
    const key = `${emoji}:${fontPx}`;
    if (EMOJI_PNG_CACHE[key]) return EMOJI_PNG_CACHE[key];
    if (typeof document === "undefined") return "";

    const measure = document.createElement("canvas");
    const measureCtx = measure.getContext("2d");
    if (!measureCtx) return "";
    const font = `${fontPx}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif`;
    measureCtx.font = font;
    const textWidth = Math.ceil(measureCtx.measureText(emoji).width) || fontPx;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(textWidth, 1);
    canvas.height = fontPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.font = font;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(emoji, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    EMOJI_PNG_CACHE[key] = dataUrl;
    return dataUrl;
}

function cellPaddingLeft(cell) {
    const styles = cell?.styles || {};
    const pad = styles.cellPadding;
    if (pad && typeof pad === "object") return Number(pad.left ?? 4) || 4;
    if (typeof cell?.padding === "function") {
        const value = Number(cell.padding("left"));
        if (Number.isFinite(value)) return value;
    }
    return Number(pad) || 4;
}

export function drawPdfCellEmojis(doc, data, originalValue) {
    const emojis = listPdfEmojis(originalValue);
    if (!emojis.length || !doc?.addImage) return;

    const text = stripPdfEmojis(originalValue);
    const fontSize = Number(data.cell?.styles?.fontSize) || 9;
    const padL = cellPaddingLeft(data.cell);
    try {
        const fontStyle = data.cell?.styles?.fontStyle === "bold" ? "bold" : "normal";
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(fontSize);
    } catch (_err) {
        /* keep current font size */
    }
    const textWidth = text ? doc.getTextWidth(text) : 0;
    const pos = typeof data.cell?.getTextPos === "function" ? data.cell.getTextPos() : data.cell?.textPos;
    const textX = Number(pos?.x);
    const textY = Number(pos?.y);
    const iconH = fontSize;
    let x = (Number.isFinite(textX) ? textX : data.cell.x + padL) + (text ? textWidth + 3 : 0);
    const y = Number.isFinite(textY) ? textY - 1 : data.cell.y + Math.max(2, (data.cell.height - iconH) / 2);
    const maxX = data.cell.x + data.cell.width - 2;

    emojis.forEach((emoji) => {
        const dataUrl = renderEmojiDataUrl(emoji);
        if (!dataUrl) return;
        const iconW = emoji === "‼️⛔" ? iconH * 1.8 : iconH;
        if (x + iconW > maxX) return;
        try {
            doc.addImage(dataUrl, "PNG", x, y, iconW, iconH);
        } catch (_err) {
            /* skip a glyph that the PDF writer cannot embed */
        }
        x += iconW + 2;
    });
}

export function withPdfEmojiCells(doc, tableOptions = {}) {
    const originalHead = tableOptions.head;
    const originalBody = tableOptions.body;
    const previousDidDrawCell = tableOptions.didDrawCell;

    const toSafeRow = (row) =>
        (Array.isArray(row) ? row : []).map((cell) => {
            const original = cell == null ? "" : String(cell);
            const stripped = stripPdfEmojis(original);
            return stripped || (listPdfEmojis(original).length ? "" : original);
        });

    return {
        ...tableOptions,
        head: originalHead ? originalHead.map(toSafeRow) : originalHead,
        body: originalBody ? originalBody.map(toSafeRow) : originalBody,
        didDrawCell: (data) => {
            if (typeof previousDidDrawCell === "function") previousDidDrawCell(data);
            const original =
                data.section === "head"
                    ? originalHead?.[data.row?.index]?.[data.column?.index]
                    : originalBody?.[data.row?.index]?.[data.column?.index];
            drawPdfCellEmojis(doc, data, original);
        },
    };
}
