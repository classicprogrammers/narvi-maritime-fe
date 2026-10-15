import { formatStockStatusLabel, normalizeStockStatusKey } from "../constants/stockStatus";

const isFilled = (value) => {
    if (value == null || value === false) return false;
    if (typeof value === "number") return true;
    return String(value).trim() !== "";
};

const hasRelation = (value) => isFilled(value);

const hasPositiveNumber = (value) => {
    if (!isFilled(value)) return false;
    const n = Number(value);
    return !Number.isNaN(n) && n > 0;
};

const hasPoOrReq = (row) => isFilled(row.poNumber) || isFilled(row.reqNo);

const hasDimensions = (row) => {
    if (hasPositiveNumber(row.volumeNoDim) || hasPositiveNumber(row.volumeCbm)) return true;
    if (hasPositiveNumber(row.lengthCm) && hasPositiveNumber(row.widthCm) && hasPositiveNumber(row.heightCm)) {
        return true;
    }
    if (isFilled(row.lwhText)) return true;
    return (Array.isArray(row.dimensions) ? row.dimensions : []).some(
        (dim) =>
            hasPositiveNumber(dim?.volume_cbm) ||
            hasPositiveNumber(dim?.volume_dim) ||
            (hasPositiveNumber(dim?.length_cm) && hasPositiveNumber(dim?.width_cm) && hasPositiveNumber(dim?.height_cm))
    );
};

const hasAttachments = (row) =>
    (Array.isArray(row.attachments) && row.attachments.length > 0) ||
    (Array.isArray(row.existingAttachments) && row.existingAttachments.length > 0);

const hasViaHub2OrApDestination = (row) =>
    hasRelation(row.narviStockViaHub2) || hasRelation(row.narviStockApDestination);

const hasWarehouseIdOrNa = (row) => isFilled(row.warehouseId);

/** Fields every status up to "stock" shares. */
const BASE = [
    ["Client", (r) => hasRelation(r.client)],
    ["Vessel", (r) => hasRelation(r.vessel)],
    ["PIC", (r) => hasRelation(r.pic)],
    ["Supplier", (r) => hasRelation(r.supplier)],
    ["REQ# or PO#", hasPoOrReq],
    ["Origin", (r) => isFilled(r.origin_text)],
    ["HUB 1", (r) => hasRelation(r.narviStockViaHub1)],
    ["Client Access", (r) => r.clientAccess === true || r.clientAccess === false],
];

const STOCK_FIELDS = [
    ...BASE,
    ["Warehouse ID (or N/A)", hasWarehouseIdOrNa],
    ["Date on Stock", (r) => isFilled(r.dateOnStock)],
    ["PCS", (r) => hasPositiveNumber(r.item)],
    ["Weight", (r) => hasPositiveNumber(r.weightKgs)],
    ["Dimensions", hasDimensions],
    ["Value", (r) => isFilled(r.value)],
    ["Currency", (r) => hasRelation(r.currency)],
];

const REQUIREMENTS = {
    pending: BASE,
    stock: STOCK_FIELDS,
    on_shipping: [
        ...BASE,
        ["Via HUB 2 or AP Destination", hasViaHub2OrApDestination],
        ["SO number", (r) => hasRelation(r.soId)],
        ["SI number or SI Combined number", (r) => isFilled(r.siNumber) || isFilled(r.siCombined)],
    ],
    on_delivery: [
        ...BASE,
        ["Destination", (r) => hasRelation(r.destinationId)],
        ["SO number", (r) => hasRelation(r.soId)],
        ["DI Number", (r) => isFilled(r.diNumber)],
    ],
    in_transit: [
        ...BASE,
        ["PCS", (r) => hasPositiveNumber(r.item)],
        ["Weight kgs", (r) => hasPositiveNumber(r.weightKgs)],
        ["Dimensions", hasDimensions],
        ["Via HUB 2 or AP Destination", hasViaHub2OrApDestination],
        [
            "Shipping docs or Export Doc 1 or Export Doc 2",
            (r) => isFilled(r.shippingDoc) || isFilled(r.exportDoc) || isFilled(r.exportDoc2) || hasAttachments(r),
        ],
    ],
    released: [["Delivered Date", (r) => isFilled(r.deliveredDate)]],
    shipped: [["Shipped Date", (r) => isFilled(r.shippedDate)]],
    delivered: [["Delivered Date", (r) => isFilled(r.deliveredDate)]],
    cancelled: [["Cancel Reason", (r) => isFilled(r.cancelText)]],
};

// The STOCK "backdoor": without CI PL / DN documents the status may still be set, but Warning must explain why.
const stockDocsMissing = (row) => !hasAttachments(row);

/**
 * Returns one issue per row whose status requirements are not met:
 * { rowNumber, status, statusLabel, missing: string[] }.
 * Rows with no status (or a status without requirements, e.g. arrived/irregular) are skipped.
 * With `requireStockReport`, a row moved to Stock in this session (`stockReportRequired`) must also
 * have its Stock Report (SL Report) generated (`stockReportLocked`).
 */
export function getMissingStatusIssues(rows, { requireStockReport = false } = {}) {
    const issues = [];
    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
        const status = normalizeStockStatusKey(row?.stockStatus);
        const checks = REQUIREMENTS[status];
        if (!checks) return;

        const missing = checks.filter(([, ok]) => !ok(row)).map(([label]) => label);
        if (status === "stock" && stockDocsMissing(row) && !isFilled(row.warning)) {
            missing.push("Upload docs (CI PL or at least a DN) — or fill in Warning ‼️⛔ to explain what is missing");
        }
        if (requireStockReport && status === "stock" && row.stockReportRequired && !row.stockReportLocked) {
            missing.push("SL Report — click “Generate Stock Report” and confirm the preview");
        }
        if (missing.length > 0) {
            issues.push({ rowNumber: index + 1, status, statusLabel: formatStockStatusLabel(status), missing });
        }
    });
    return issues;
}
