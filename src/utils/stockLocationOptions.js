/** Helpers for narvi_stock_* location fields (hubs / AP destination / destination). */

export const STOCK_VIA_HUB1_KEY = "narvi_stock_via_hub1";
export const STOCK_VIA_HUB2_KEY = "narvi_stock_via_hub2";
export const STOCK_AP_DESTINATION_KEY = "narvi_stock_ap_destination";
export const STOCK_DESTINATION_KEY = "narvi_stock_destination";

export const getStockViaHub1Display = (item) =>
    getStockLocationDisplay(item, STOCK_VIA_HUB1_KEY);

export const getStockViaHub2Display = (item) =>
    getStockLocationDisplay(item, STOCK_VIA_HUB2_KEY);

export const getStockApDestinationDisplay = (item) =>
    getStockLocationDisplay(item, STOCK_AP_DESTINATION_KEY);

export const getStockDestinationDisplay = (item) =>
    getStockLocationDisplay(item, STOCK_DESTINATION_KEY);

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

    const existingIdx = id != null ? list.findIndex((o) => String(o?.id) === String(id)) : -1;
    if (existingIdx >= 0) {
        // Prefer a real label over placeholder names injected by pin/merge helpers
        const existing = list[existingIdx];
        const existingName = String(existing?.name ?? "").trim();
        const isPlaceholder =
            !existingName ||
            /^#\d+$/.test(existingName) ||
            /^Option \d+$/i.test(existingName);
        if (name && (isPlaceholder || !existingName)) {
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

const STOCK_LOCATION_NAME_ALIASES = {
    narvi_stock_via_hub1: ["narviStockViaHub1Name", "narvi_stock_via_hub1_name", "via_hub", "via_hub_1"],
    narvi_stock_via_hub2: ["narviStockViaHub2Name", "narvi_stock_via_hub2_name", "via_hub2", "via_hub_2"],
    narvi_stock_ap_destination: [
        "narviStockApDestinationName",
        "narvi_stock_ap_destination_name",
        "ap_destination_display",
        "ap_destination_new",
        "ap_destination",
        "ap_destination_ids",
    ],
    narvi_stock_destination: [
        "destinationName",
        "narvi_stock_destination_name",
        "destination_display",
        "destination_new",
        "destination",
        "destination_ids",
    ],
};

const STOCK_LOCATION_VALUE_ALIASES = {
    narvi_stock_via_hub1: ["via_hub", "via_hub_1"],
    narvi_stock_via_hub2: ["via_hub2", "via_hub_2"],
    narvi_stock_ap_destination: [
        "ap_destination_display",
        "ap_destination_new",
        "ap_destination",
        "ap_destination_ids",
    ],
    narvi_stock_destination: [
        "destination_display",
        "destination_new",
        "destination",
        "destination_ids",
    ],
};

const getCompanionLocationName = (item, fieldKey) => {
    const aliases = STOCK_LOCATION_NAME_ALIASES[fieldKey] || [];
    for (const key of aliases) {
        const name = getStockLocationOptionName(item[key]);
        if (name) return name;
    }
    return "";
};

/**
 * Combine a stored location id + display name into a many2one-like value for PDF/list display.
 * Form rows keep these separately (e.g. narviStockViaHub1 / narviStockViaHub1Name).
 */
export const toStockLocationDisplayValue = (idOrValue, name) => {
    const resolvedName = String(name ?? "").trim();
    const resolvedId = resolveStockLocationOptionId(idOrValue);
    const nameFromValue = getStockLocationOptionName(idOrValue);
    const displayName = resolvedName || nameFromValue;
    if (displayName && resolvedId != null) {
        return { id: resolvedId, name: displayName };
    }
    if (displayName) return displayName;
    return idOrValue;
};

export const getStockLocationDisplay = (item, fieldKey) => {
    if (!item) return "-";
    const keys = [fieldKey, ...(STOCK_LOCATION_VALUE_ALIASES[fieldKey] || [])];
    for (const key of keys) {
        const nameFromM2O = getStockLocationOptionName(item[key]);
        if (nameFromM2O) return nameFromM2O;
    }
    const companionName = getCompanionLocationName(item, fieldKey);
    if (companionName) return companionName;
    const id = resolveStockLocationOptionId(item[fieldKey]);
    if (id != null) return String(id);
    return "-";
};

export const toStockFieldDisplay = (value, empty = "-") => {
    if (value == null || value === false || value === "") return empty;
    if (typeof value === "object") {
        const name = getStockLocationOptionName(value);
        return name || empty;
    }
    const text = String(value).trim();
    if (!text || text.toLowerCase() === "false" || text === "[object Object]") return empty;
    return text;
};

export const getStockOriginDisplay = (item) => {
    const originText = toStockFieldDisplay(item?.origin_text, "");
    if (originText) return originText;
    return toStockFieldDisplay(item?.origin, "-");
};

export const getStockEffectiveHubDisplay = (item) => {
    const explicit =
        toStockFieldDisplay(item?.effective_hub, "") || toStockFieldDisplay(item?.hub, "");
    if (explicit) return explicit;
    const hub2 = getStockViaHub2Display(item);
    if (hub2 && hub2 !== "-") return hub2;
    return getStockViaHub1Display(item);
};

export const toStockLocationPayloadId = (value) => {
    const id = resolveStockLocationOptionId(value);
    return id != null ? id : false;
};

/** AP destination save — only narvi_stock_ap_destination (false clears). */
export const buildNarviApDestinationSaveFields = (optionId) => ({
    narvi_stock_ap_destination: toStockLocationPayloadId(optionId),
});

/** Destination save — only narvi_stock_destination (false clears). */
export const buildNarviDestinationSaveFields = (optionId) => ({
    narvi_stock_destination: toStockLocationPayloadId(optionId),
});

/**
 * Many2one / id fields for stock update: keep id when set, send `false` to clear (Odoo-style).
 * Prefer this over empty string so clears actually unlink on the backend.
 */
export const toClearableRelationId = (value) => {
    if (value == null || value === "" || value === false) return false;
    if (typeof value === "object") {
        const rawId = value.id ?? value.value_id ?? null;
        if (rawId == null || rawId === "" || rawId === false) return false;
        const text = String(rawId).trim();
        return text === "" ? false : text;
    }
    const text = String(value).trim();
    return text === "" ? false : text;
};

/** Date / optional scalar clear: empty → false. */
export const toClearableDateValue = (value) => {
    if (value == null || value === false || value === "") return false;
    const text = String(value).trim();
    return text === "" ? false : text;
};
