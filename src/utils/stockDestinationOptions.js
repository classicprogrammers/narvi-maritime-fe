/** Helpers for stock destination option lists + display (narvi_stock_* fields only). */

import {
  getStockApDestinationDisplay,
  getStockDestinationDisplay,
  getStockLocationOptionName,
  resolveStockLocationOptionId,
} from "./stockLocationOptions";

export const normalizeStockDestinationOptions = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { id: null, name, key: `txt-${idx}-${name}` } : null;
      }
      if (!item || typeof item !== "object") return null;
      const name = String(item.name ?? item.label ?? "").trim();
      if (!name) return null;
      const rawId = item.id ?? item.value_id ?? null;
      const id = rawId != null && rawId !== "" && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
      return { id, name, key: id != null ? `id-${id}` : `txt-${idx}-${name}` };
    })
    .filter(Boolean);
};

const unwrapStockM2OField = (field) => {
  if (field == null || field === false || field === "") return null;
  if (Array.isArray(field)) {
    if (field.length === 0) return null;
    if (
      field.length === 2 &&
      (typeof field[0] === "number" || typeof field[0] === "string") &&
      (typeof field[1] === "string" || field[1] == null)
    ) {
      return field;
    }
    return field[0];
  }
  return field;
};

export const getStockM2OId = (field) => {
  const value = unwrapStockM2OField(field);
  return resolveStockLocationOptionId(value);
};

export const getStockM2OName = (field) => {
  const value = unwrapStockM2OField(field);
  if (value == null || value === false || value === "") return "";
  const fromHelper = getStockLocationOptionName(value);
  if (fromHelper) return fromHelper;
  if (typeof value === "string") return value.trim();
  return "";
};

export const getTextOptionIdByValue = (list, value) => {
  if (!Array.isArray(list) || value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const match = list.find(
    (opt) => String(opt.name || "").toLowerCase() === trimmed.toLowerCase()
  );
  if (!match || match.id == null || !Number.isFinite(Number(match.id))) return null;
  return Number(match.id);
};

export const formatStockDestinationDisplay = (item, kind = "destination") => {
  if (!item) return "-";
  if (kind === "ap") return getStockApDestinationDisplay(item);
  return getStockDestinationDisplay(item);
};

export const mergeStockDestinationOptions = (options, selectedId, selectedName) => {
  const list = Array.isArray(options) ? [...options] : [];
  const id = getStockM2OId(selectedId);
  const name = String(selectedName ?? "").trim();
  if (id == null && !name) return list;
  if (id != null && !list.some((o) => Number(o.id) === id)) {
    list.unshift({ id, name: name || `Destination ${id}`, key: `id-${id}` });
  } else if (id == null && name && !list.some((o) => String(o.name).toLowerCase() === name.toLowerCase())) {
    list.unshift({ id: null, name, key: `txt-${name}` });
  }
  return list;
};
