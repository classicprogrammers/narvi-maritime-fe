/** Helpers for narvi_stock_via_hub1 / narvi_stock_via_hub2 / narvi_stock_ap_destination option fields */

export const STOCK_VIA_HUB1_KEY = "narvi_stock_via_hub1";
export const STOCK_VIA_HUB2_KEY = "narvi_stock_via_hub2";
export const STOCK_AP_DESTINATION_KEY = "narvi_stock_ap_destination";

const LEGACY_VIA_HUB1_FIELDS = ["via_hub", "via_hub_1", "via_hub1"];
const LEGACY_VIA_HUB2_FIELDS = ["via_hub2", "via_hub_2"];
const LEGACY_AP_DESTINATION_FIELDS = ["ap_destination_new", "ap_destination", "ap_destination_id"];

export const getStockViaHub1Display = (item) =>
    getStockLocationDisplay(item, STOCK_VIA_HUB1_KEY, LEGACY_VIA_HUB1_FIELDS);

export const getStockViaHub2Display = (item) =>
    getStockLocationDisplay(item, STOCK_VIA_HUB2_KEY, LEGACY_VIA_HUB2_FIELDS);

export const getStockApDestinationDisplay = (item) =>
    getStockLocationDisplay(item, STOCK_AP_DESTINATION_KEY, LEGACY_AP_DESTINATION_FIELDS);

const toSortValue = (display) =>
    display != null && display !== "" && display !== "-" ? String(display).toLowerCase().trim() : "";

export const getStockViaHub1SortValue = (item) => toSortValue(getStockViaHub1Display(item));

export const getStockViaHub2SortValue = (item) => toSortValue(getStockViaHub2Display(item));

export const getStockApDestinationSortValue = (item) => toSortValue(getStockApDestinationDisplay(item));

/** Effective hub for status sorts: hub2 if set, otherwise hub1. */
export const getStockEffectiveHubSortValue = (item) =>
    getStockViaHub2SortValue(item) || getStockViaHub1SortValue(item);

export const normalizeStockIdNameOptions = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item, idx) => {
            if (!item || typeof item !== "object") return null;
            const name = String(item.name ?? item.label ?? "").trim();
            if (!name) return null;
            const rawId = item.id ?? item.value_id ?? null;
            const id = rawId != null && rawId !== "" && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
            if (id == null) return null;
            return { id, name, key: `id-${id}` };
        })
        .filter(Boolean);
};

/**
 * Resolve a stock location option id from API shapes:
 * - number / numeric string
 * - { id, name } / { value_id, label }
 * - Odoo many2one tuple [id, "Name"]
 */
export const resolveStockLocationOptionId = (value) => {
    if (value == null || value === false || value === "") return null;

    // Odoo many2one: [id, "Display Name"]
    if (Array.isArray(value)) {
        if (value.length === 0) return null;
        return resolveStockLocationOptionId(value[0]);
    }

    if (typeof value === "object") {
        const rawId = value.id ?? value.value_id ?? null;
        if (rawId == null || rawId === false || rawId === "") return null;
        const id = Number(rawId);
        return Number.isFinite(id) ? id : null;
    }

    const trimmed = String(value).trim();
    if (!trimmed || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
    const id = Number(trimmed);
    return Number.isFinite(id) ? id : null;
};

export const getStockLocationOptionName = (value) => {
    if (value == null || value === false || value === "") return "";

    // Odoo many2one: [id, "Display Name"]
    if (Array.isArray(value)) {
        if (value.length >= 2 && value[1] != null && value[1] !== false) {
            return String(value[1]).trim();
        }
        if (value.length >= 1) return getStockLocationOptionName(value[0]);
        return "";
    }

    if (typeof value === "object") {
        const name = value.name ?? value.label ?? value.display_name;
        return name != null && name !== false ? String(name).trim() : "";
    }

    // Non-numeric strings are legacy name-only values
    const text = String(value).trim();
    if (text && !/^-?\d+(\.\d+)?$/.test(text)) return text;
    return "";
};

export const mergeStockIdNameOptions = (options, selectedId, selectedName) => {
    const list = Array.isArray(options) ? [...options] : [];
    const id = resolveStockLocationOptionId(selectedId);
    const name = String(selectedName ?? "").trim();
    if (id == null && !name) return list;

    const existingIdx = id != null ? list.findIndex((o) => Number(o.id) === id) : -1;
    if (existingIdx >= 0) {
        // Prefer a real label over placeholder names injected by pin/merge helpers
        const existing = list[existingIdx];
        const existingName = String(existing?.name ?? "").trim();
        const isPlaceholder =
            !existingName ||
            /^#\d+$/.test(existingName) ||
            /^Option \d+$/i.test(existingName);
        if (name && isPlaceholder) {
            list[existingIdx] = { ...existing, name, key: existing.key || `id-${id}` };
        }
        return list;
    }

    if (id != null) {
        list.unshift({ id, name: name || `Option ${id}`, key: `id-${id}` });
    } else if (name && !list.some((o) => String(o.name).toLowerCase() === name.toLowerCase())) {
        // Legacy text-only value without id — show for display but cannot save until re-selected
        list.unshift({ id: `legacy-${name}`, name, key: `legacy-${name}`, legacy: true });
    }
    return list;
};

export const getStockLocationDisplay = (item, fieldKey, legacyTextFields = []) => {
    if (!item) return "-";
    const direct = item[fieldKey];
    const nameFromM2O = getStockLocationOptionName(direct);
    if (nameFromM2O) return nameFromM2O;
    const id = resolveStockLocationOptionId(direct);
    if (id != null) return String(id);
    for (const legacyField of legacyTextFields) {
        const legacy = item[legacyField];
        if (legacy != null && legacy !== false && String(legacy).trim() !== "") {
            return String(legacy).trim();
        }
    }
    return "-";
};

export const toStockLocationPayloadId = (value) => {
    const id = resolveStockLocationOptionId(value);
    return id != null ? id : false;
};
