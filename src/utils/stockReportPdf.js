import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import narviLetterheadPrint from "../assets/letterHead/NarviLetterhead.jpeg";
import {
  buildStockSoIdM2O,
  getShippingOrderDisplayLabel,
} from "./shippingOrderListState";

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

import { formatStockStatusLabel, normalizeStockStatusKey } from "../constants/stockStatus";
import { formatStockDestinationDisplay } from "./stockDestinationOptions";
import { getDimensionVolumeCbm, sumDimensionsVolumeCbm } from "./stockVolume";

export function formatStatusForPdf(status) {
    const key = normalizeStockStatusKey(status);
    if (!key) return "-";
    if (key === "arrived") return "Arrived under Customs";
    return formatStockStatusLabel(key);
}

function ensureDocNumberPrefix(val, prefix) {
    if (val == null || val === "" || val === false) return "-";
    const str = String(val).trim();
    if (!str) return "-";
    const re = new RegExp(`^${prefix}[- ]?`, "i");
    return re.test(str) ? str : `${prefix}-${str.replace(/^[- ]+/i, "")}`;
}

function clean(value) {
    return value != null && value !== false && String(value).trim() !== "" ? String(value) : "-";
}

function toFixedOrDash(value, digits = 3) {
    return value != null && value !== false && value !== "" && !Number.isNaN(Number(value))
        ? Number(value).toFixed(digits)
        : "-";
}

function formatStockNumberDisplay(item) {
    if (item.stock_number != null && String(item.stock_number).trim() !== "") {
        return String(item.stock_number).trim();
    }
    const id = item.stock_item_id ?? item.stock_id;
    if (id == null || id === "") return "-";
    const s = String(id).trim();
    if (/^SL/i.test(s)) return s;
    const num = parseInt(s, 10);
    if (!Number.isNaN(num)) return `SL${String(num).padStart(5, "0")}`;
    return s;
}

/**
 * Map an admin stock list item (API row) to the normalized row used by buildStockReportPdfDocument.
 * @param {object} item
 * @param {object} helpers
 * @param {(val: unknown) => string} helpers.getDisplayName
 * @param {(soId: unknown) => string} helpers.getSoNumberName
 * @param {(soNumber: unknown) => string} helpers.getSoNumberNameFromNumber
 * @param {(val: unknown) => string} helpers.ensureSoPrefix
 * @param {(status: unknown) => string} [helpers.getStatusLabel]
 * @param {(dateString: unknown) => string} helpers.formatDate
 */
export function mapAdminStockItemToPdfRow(item, helpers) {
    const {
        getDisplayName,
        getSoNumberName,
        getSoNumberNameFromNumber,
        ensureSoPrefix,
        getStatusLabel,
        formatDate,
    } = helpers;

    const statusRaw = item.stock_status;
    const stockStatusLabel = getStatusLabel ? getStatusLabel(statusRaw) : formatStatusForPdf(statusRaw);

    const soDisplay =
        item.so_id
            ? getSoNumberName(item.so_id)
            : item.stock_so_number
                ? getSoNumberNameFromNumber(item.stock_so_number)
                : ensureSoPrefix(item.so_number);

    const poNo =
        item.po_text != null && String(item.po_text).trim() !== ""
            ? String(item.po_text).replace(/\r?\n/g, ", ").trim()
            : "-";

    const firstEntryLocation =
        item.first_entry_location ||
        item.origin_text ||
        getDisplayName(item.origin_id || item.origin) ||
        "-";

    const destination = formatStockDestinationDisplay(item, "destination");

    const dims = Array.isArray(item.dimensions) ? item.dimensions : [];
    const pcsLines = dims.map((dim, lineIndex) => {
        const hasLwh =
            dim.length_cm != null &&
            dim.width_cm != null &&
            dim.height_cm != null &&
            String(dim.length_cm).trim() !== "" &&
            String(dim.width_cm).trim() !== "" &&
            String(dim.height_cm).trim() !== "";
        const lwh = hasLwh ? `${dim.length_cm} x ${dim.width_cm} x ${dim.height_cm}` : null;
        const pieceCbm = getDimensionVolumeCbm(dim);
        return {
            piece_name: `Piece ${lineIndex + 1}`,
            warehouse_ref: dim.warehouse_ref,
            lwh,
            length_cm: dim.length_cm,
            width_cm: dim.width_cm,
            height_cm: dim.height_cm,
            cbm: pieceCbm > 0 ? pieceCbm : (dim.volume_cbm ?? dim.volume_dim),
            vw: dim.cw_air_freight,
            weight: dim.weight_kg,
        };
    });

    const summedCbm = sumDimensionsVolumeCbm(dims);
    const backendTotalCbm =
        item.total_volume_cbm ?? item.volume_cbm ?? item.cbm_total ?? item.cbm;
    const totalVolumeCbmValue =
        summedCbm > 0 ? summedCbm : backendTotalCbm;

    const piecesCount =
        item.item ?? item.items ?? item.item_id ?? item.stock_items_quantity ?? (pcsLines.length || 0);

    const warehouseId =
        item.warehouse_new || item.warehouse_id || item.stock_warehouse || item.warehouse || "-";

    return {
        vessel: clean(getDisplayName(item.vessel_id || item.vessel)),
        stockNumber: clean(formatStockNumberDisplay(item)),
        supplier: clean(getDisplayName(item.supplier_id || item.supplier)),
        poNo: clean(poNo),
        dgUnNumber: clean(item.dg_un ?? item.dg_un_number),
        boxes: clean(piecesCount),
        weight: clean(item.weight_kg ?? item.weight_kgs ?? item.weight),
        totalVolumeCbm: clean(totalVolumeCbmValue),
        origin: clean(firstEntryLocation),
        location: clean(firstEntryLocation),
        firstEntryLocation: clean(firstEntryLocation),
        viaHub1: clean(item.via_hub ?? item.via_hub_1),
        viaHub2: clean(item.via_hub2 ?? item.via_hub_2),
        apDestination: clean(formatStockDestinationDisplay(item, "ap")),
        destination: clean(destination),
        stockStatus: clean(stockStatusLabel),
        soNumber: clean(soDisplay),
        currency: clean(getDisplayName(item.currency_id || item.currency)),
        value: clean(item.value),
        deliveryIrregularities: clean(item.delivery_irregularities),
        poRemarks: clean(item.po_remarks),
        createDate: clean(item.create_date),
        writeDate: clean(item.write_date),
        dateOnStock: clean(formatDate(item.date_on_stock)),
        firstEntryDate: clean(formatDate(item.first_entry_date || item.date_on_stock)),
        client: clean(getDisplayName(item.client_id || item.client)),
        locationHistory: Array.isArray(item.location_history) ? item.location_history : [],
        remarks: clean(item.remarks ?? item.internal_remark),
        siNumber: clean(ensureDocNumberPrefix(item.si_number, "SI")),
        siCombined: clean(ensureDocNumberPrefix(item.si_combined, "SIC")),
        diNumber: clean(ensureDocNumberPrefix(item.di_no, "DI")),
        shippingDoc: clean(item.shipping_doc),
        exportDoc: clean(item.export_doc),
        exportDoc2: clean(item.export_doc_2),
        pcsLines,
        pcsCount: piecesCount,
        warehouseId: clean(warehouseId),
        priority: clean(item.priority),
    };
}

/**
 * Build a single-stock Stock Report PDF (letterhead + sections) matching the Narvi client template.
 * @param {object} row — shape produced by client stock normalization or mapAdminStockItemToPdfRow
 */
export async function buildStockReportPdfDocument(row) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
        compress: true,
    });
    const contentLeft = 30;
    const contentTop = 150;

    try {
        await loadLetterheadOnPdf(doc);
    } catch (e) {
        console.error("Failed to load letterhead image for stock PDF:", e);
    }

    const vesselPart = row.vessel && row.vessel !== "-" ? row.vessel : "-";
    const clientPart = row.client && row.client !== "-" ? row.client : "-";
    const generatedAt = row.createDate && row.createDate !== "-" ? row.createDate : new Date().toLocaleString();
    const statusUpdatedAt = row.writeDate && row.writeDate !== "-" ? row.writeDate : generatedAt;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Stock report for the ${vesselPart}`, contentLeft, contentTop);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Client Name: ${clientPart}`, contentLeft, contentTop + 18);

    doc.setFontSize(9);
    let headerY = contentTop + 36;
    doc.text(`Generated: ${generatedAt}`, contentLeft, headerY);
    headerY += 14;

    if (row.statusChangedBy && String(row.statusChangedBy).trim() && row.statusChangedBy !== "-") {
        doc.text(`Status updated by: ${clean(row.statusChangedBy)} (${statusUpdatedAt})`, contentLeft, headerY);
        headerY += 14;
    }

    const fromLabel = formatStatusForPdf(row.statusChangeFrom);
    doc.text(`From: ${fromLabel}`, contentLeft, headerY);
    headerY += 14;

    if (row.statusChangeTo != null && String(row.statusChangeTo).trim() !== "") {
        const toLabel = formatStatusForPdf(row.statusChangeTo);
        doc.text(`To: ${toLabel}`, contentLeft, headerY);
        headerY += 14;
    }

    const drawSectionHeader = (title, yPos) => {
        autoTable(doc, {
            startY: yPos,
            head: [[title]],
            body: [],
            theme: "plain",
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [236, 238, 241], textColor: [33, 33, 33], fontStyle: "bold" },
            margin: { left: contentLeft, right: 24 },
        });
        return (doc.lastAutoTable?.finalY || yPos) + 2;
    };

    const stockDetailsRows = [
        ["PO NO", clean(row.poNo), "Stock Number", clean(row.stockNumber)],
        ["Supplier", clean(row.supplier), "Status", clean(row.stockStatus)],
        ["Origin", clean(row.origin || row.firstEntryLocation), "First Entry Date", clean(row.firstEntryDate)],
        ["Via HUB 1", clean(row.viaHub1), "Shipping docs", clean(row.shippingDoc)],
        ["Currency / Value", `${clean(row.currency)} ${clean(row.value)}`, "DG / UN Number", clean(row.dgUnNumber)],
    ];

    let cursorY = drawSectionHeader("Stock Report details", headerY + 10);
    autoTable(doc, {
        startY: cursorY,
        body: stockDetailsRows,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: { top: 4, right: 5, bottom: 4, left: 5 } },
        margin: { left: contentLeft, right: 24 },
        columnStyles: {
            0: { fontStyle: "bold", cellWidth: 115 },
            1: { cellWidth: 165 },
            2: { fontStyle: "bold", cellWidth: 115 },
            3: { cellWidth: 165 },
        },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;
    cursorY = drawSectionHeader("Remarks", cursorY);
    autoTable(doc, {
        startY: cursorY,
        body: [[clean(row.remarks)]],
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: contentLeft, right: 24 },
        columnStyles: {
            0: { cellWidth: 520 },
        },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;
    const pcsLines = Array.isArray(row.pcsLines) ? row.pcsLines : [];
    const pcsCountDisplay = clean(row.pcsCount || row.boxes || pcsLines.length || 0);
    const totalWeightDisplay = clean(row.weight);
    const totalCbmDisplay =
        toFixedOrDash(row.totalVolumeCbm, 3) !== "-"
            ? toFixedOrDash(row.totalVolumeCbm, 3)
            : clean(row.totalVolumeCbm);
    const pcsSectionTitle = `Pcs (${pcsCountDisplay}) — Total weight: ${totalWeightDisplay} — Total volume (CBM): ${totalCbmDisplay}`;
    cursorY = drawSectionHeader(pcsSectionTitle, cursorY);

    const pcsRows = pcsLines.length
        ? pcsLines.flatMap((line, lineIndex) => {
            const idx = lineIndex + 1;
            const lwhStr = clean(
                line.lwh ||
                (line.length_cm != null && line.width_cm != null && line.height_cm != null
                    ? `${clean(line.length_cm)} x ${clean(line.width_cm)} x ${clean(line.height_cm)}`
                    : "-")
            );
            return [
                [
                    `Piece ${idx}`,
                    clean(line.warehouse_ref || line.id || "-"),
                    "Warehouse ref",
                    clean(line.warehouse_ref),
                ],
                ["L x W x H", lwhStr, "CBM", clean(toFixedOrDash(line.cbm, 3))],
                ["VW", clean(toFixedOrDash(line.vw, 2)), "Weight", clean(toFixedOrDash(line.weight ?? line.weight_kg, 2))],
            ];
        })
        : [
            ["Piece 1", `${clean(row.client)} - ${clean(row.warehouseId)}`, "Warehouse ref", clean(row.warehouseId)],
            ["L x W x H", "-", "CBM", clean(row.totalVolumeCbm)],
            ["VW", "-", "Weight", clean(row.weight)],
        ];

    autoTable(doc, {
        startY: cursorY,
        body: pcsRows,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: contentLeft, right: 24, bottom: 24 },
        columnStyles: {
            0: { fontStyle: "bold", cellWidth: 110 },
            1: { cellWidth: 150 },
            2: { fontStyle: "bold", cellWidth: 110 },
            3: { cellWidth: 150 },
        },
    });

    return doc;
}

/** Strip characters unsafe in common filesystems; normalize whitespace; cap length. */
function sanitizePdfFilenameSegment(value, maxLen = 150) {
    if (value == null || value === false) return "";
    const s = String(value).trim();
    if (s === "" || s === "-") return "";
    const without = s
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!without) return "";
    return without.length > maxLen ? without.slice(0, maxLen) : without;
}

/**
 * Legacy names: `stock-report SL00055 + vessel-1779347492336.pdf` → `SL00055 + vessel.pdf`
 */
export function normalizeLegacyStockReportFilename(filename) {
    if (filename == null || filename === "") return filename;
    let n = String(filename).trim();
    n = n.replace(/^stock-report\s+/i, "");
    const tsMatch = n.match(/^(.+)-(\d{10,})\.pdf$/i);
    if (tsMatch) {
        n = `${tsMatch[1]}.pdf`;
    }
    return n;
}

/**
 * Filename for stock report PDFs on status change, e.g. `SL00055 + testingg.pdf`.
 */
export function getStockReportPdfFilename(row) {
    let numPart = sanitizePdfFilenameSegment(row.stockNumber);
    if (!numPart) numPart = "stock";
    const vesselPart = sanitizePdfFilenameSegment(row.vessel);
    if (vesselPart) {
        return `${numPart} + ${vesselPart}.pdf`;
    }
    return `${numPart}.pdf`;
}

/**
 * Helpers for PDF row mapping on create/edit pages (resolve IDs via master lists).
 */
export function createStockPdfRowHelpers({
    clients = [],
    vessels = [],
    vendors = [],
    suppliers = [],
    currencies = [],
    shippingOrders = [],
} = {}) {
    const supplierList = Array.isArray(vendors) && vendors.length ? vendors : suppliers || [];

    const getDisplayName = (val) => {
        if (val == null || val === false || val === "") return "-";
        if (typeof val === "object" && val !== null && val.name != null) return String(val.name);
        const id = String(val);
        const pick = (arr) => {
            if (!Array.isArray(arr)) return null;
            const x = arr.find((e) => String(e.id) === id);
            return x?.name != null ? String(x.name) : null;
        };
        return pick(clients) || pick(vessels) || pick(supplierList) || pick(currencies) || id;
    };

    const ensureSoPrefix = (val) => {
        if (val == null || val === "" || val === false) return "-";
        const str = String(val).replace(/^SO[- ]?/i, "").trim();
        return str ? `SO-${str}` : "-";
    };

    const getSoNumberName = (soId) => {
        if (!soId) return "-";
        if (typeof soId === "object" && soId?.so_id != null) return `SO-${soId.so_id}`;
        if (typeof soId === "object" && soId?.name != null) return ensureSoPrefix(soId.name);
        if (typeof soId === "object" && soId?.id != null) return ensureSoPrefix(soId.id);
        const so = shippingOrders.find((s) => String(s.id) === String(soId));
        return so
            ? so.so_id != null
                ? `SO-${so.so_id}`
                : ensureSoPrefix(so.so_number || so.name || so.id)
            : ensureSoPrefix(soId);
    };

    const getSoNumberNameFromNumber = (soNumber) => {
        if (!soNumber) return "-";
        if (typeof soNumber === "object" && soNumber?.so_id != null) return `SO-${soNumber.so_id}`;
        if (typeof soNumber === "object" && soNumber?.name != null) return ensureSoPrefix(soNumber.name);
        if (typeof soNumber === "object" && soNumber?.id != null) return ensureSoPrefix(soNumber.id);
        const so = shippingOrders.find(
            (s) =>
                (s.so_id != null && String(s.so_id) === String(soNumber)) ||
                String(s.so_number || s.name || "") === String(soNumber) ||
                String(s.id) === String(soNumber)
        );
        return so
            ? so.so_id != null
                ? `SO-${so.so_id}`
                : ensureSoPrefix(so.so_number || so.name || soNumber)
            : ensureSoPrefix(soNumber);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const parsed = new Date(dateString);
        return Number.isNaN(parsed.getTime()) ? String(dateString) : parsed.toLocaleDateString();
    };

    const getStatusLabel = (status) => formatStatusForPdf(status);

    return {
        getDisplayName,
        getSoNumberName,
        getSoNumberNameFromNumber,
        ensureSoPrefix,
        getStatusLabel,
        formatDate,
    };
}

function totalVolumeFromDimensions(dimensions, fallback) {
    const sum = sumDimensionsVolumeCbm(dimensions);
    if (sum > 0) return sum;
    const f = parseFloat(fallback);
    return !Number.isNaN(f) && f > 0 ? f : fallback ?? "";
}

/** Stock DB main edit form row → API-like item for {@link mapAdminStockItemToPdfRow}. */
export function mapMainDbEditRowToAdminItem(row, helpers = {}) {
    const dims = Array.isArray(row.dimensions) ? row.dimensions : [];
    const totalCbm = totalVolumeFromDimensions(dims, row.volumeCbm);
    const shippingOrders = helpers.shippingOrders || [];
    const soM2O = buildStockSoIdM2O(row.soId, shippingOrders);
    const soDisplay = soM2O ? getShippingOrderDisplayLabel(
        shippingOrders.find((s) => String(s.id) === String(row.soId))
    ) : "";
    return {
        stock_item_id: row.stockItemId,
        stock_number: row.stockItemId || row.stockNumber,
        stock_id: row.stockId,
        stock_status: row.stockStatus,
        client_id: row.client,
        vessel_id: row.vessel,
        supplier_id: row.supplier,
        po_text: row.poNumber,
        origin_text: row.origin_text,
        via_hub: row.viaHub1,
        via_hub2: row.viaHub2,
        ap_destination_new: row.apDestination,
        destination_new: row.destination,
        warehouse_new: row.warehouseId,
        date_on_stock: row.dateOnStock,
        first_entry_date: row.dateOnStock,
        weight_kg: row.weightKgs,
        volume_cbm: totalCbm,
        total_volume_cbm: totalCbm,
        item: row.item || row.items,
        items: row.items,
        stock_items_quantity: row.items,
        currency_id: row.currency,
        value: row.value,
        dg_un: row.dgUn,
        so_id: soM2O,
        so_number: soDisplay || undefined,
        dimensions: dims,
        remarks: row.remarks,
        internal_remark: row.internalRemark,
        po_remarks: row.internalRemark,
        si_number: row.siNumber,
        si_combined: row.siCombined,
        di_no: row.diNumber,
        shipping_doc: row.shippingDoc,
        export_doc: row.exportDoc,
        export_doc_2: row.exportDoc2,
        location_history: [],
    };
}

/** New stock / StockForm row → API-like item for {@link mapAdminStockItemToPdfRow}. */
export function mapStandardFormRowToAdminItem(row, helpers = {}) {
    const dims = Array.isArray(row.dimensions) ? row.dimensions : [];
    const totalCbm = totalVolumeFromDimensions(dims, row.volumeCbm);
    const shippingOrders = helpers.shippingOrders || [];
    const soM2O = buildStockSoIdM2O(row.soId, shippingOrders);
    const soDisplay = soM2O ? getShippingOrderDisplayLabel(
        shippingOrders.find((s) => String(s.id) === String(row.soId))
    ) : "";
    return {
        stock_item_id: row.stockItemId,
        stock_number: row.stockItemId || row.stockNumber,
        stock_id: row.stockId,
        stock_status: row.stockStatus,
        client_id: row.client,
        vessel_id: row.vessel,
        supplier_id: row.supplier,
        po_text: row.poNumber,
        origin_text: row.origin_text,
        via_hub: row.viaHub,
        via_hub2: row.viaHub2,
        ap_destination_new: row.apDestination,
        destination_new: row.destination,
        warehouse_new: row.warehouseId,
        date_on_stock: row.dateOnStock,
        first_entry_date: row.dateOnStock,
        weight_kg: row.weightKgs,
        volume_cbm: totalCbm,
        total_volume_cbm: totalCbm,
        item: row.item,
        items: row.items,
        stock_items_quantity: row.item || row.items,
        currency_id: row.currency,
        value: row.value,
        dg_un: row.dgUn,
        so_id: soM2O,
        so_number: soDisplay || undefined,
        dimensions: dims,
        remarks: row.remarks,
        internal_remark: row.internalRemark,
        po_remarks: row.internalRemark,
        si_number: row.siNumber,
        si_combined: row.siCombined,
        di_no: row.diNumber,
        shipping_doc: row.shippingDoc,
        export_doc: row.exportDoc,
        export_doc_2: row.exportDoc2,
        location_history: [],
    };
}

/**
 * Build a stock report PDF as an attachment object `{ filename, mimetype, datas }` for API payloads.
 * @param {object} [meta] — optional audit for status-change PDFs
 * @param {string} [meta.changedByName] — display name of user who changed status
 * @param {string} [meta.previousStatus] — raw previous stock_status value
 * @param {string} [meta.newStatus] — raw new stock_status value
 */
export async function buildStockReportPdfAttachmentForItem(adminItem, helpers, meta = {}) {
    const pdfRow = mapAdminStockItemToPdfRow(adminItem, helpers);
    if (meta.changedByName) {
        pdfRow.statusChangedBy = meta.changedByName;
        pdfRow.statusChangeFrom = meta.previousStatus;
        pdfRow.statusChangeTo = meta.newStatus;
    }
    const doc = await buildStockReportPdfDocument(pdfRow);
    const dataUri = doc.output("datauristring");
    const comma = dataUri.indexOf(",");
    const datas = comma >= 0 ? dataUri.slice(comma + 1) : dataUri;
    const filename = getStockReportPdfFilename(pdfRow);
    return {
        filename,
        name: filename,
        mimetype: "application/pdf",
        datas,
    };
}
