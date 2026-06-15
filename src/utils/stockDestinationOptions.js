/** Helpers for stock list destination_ids / ap_destination_ids M2O fields */

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
  if (Array.isArray(field)) return field.length > 0 ? field[0] : null;
  return field;
};

export const getStockM2OId = (field) => {
  const value = unwrapStockM2OField(field);
  if (value == null || value === false || value === "") return null;
  if (typeof value === "object" && value.id != null) {
    const id = Number(value.id);
    return Number.isFinite(id) ? id : null;
  }
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

export const getStockM2OName = (field) => {
  const value = unwrapStockM2OField(field);
  if (value == null || value === false || value === "") return "";
  if (typeof value === "object") {
    const name = value.name ?? value.label;
    if (name != null && name !== false && String(name).trim() !== "") {
      return String(name);
    }
    return "";
  }
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

/** Build API payload for destination_ids / ap_destination_ids */
export const buildStockDestinationIdsPayload = (optionId, selectName, options = []) => {
  const name = String(selectName ?? "").trim();
  const id =
    optionId != null && optionId !== "" && Number.isFinite(Number(optionId))
      ? Number(optionId)
      : null;

  if (!name && id == null) return false;

  if (id != null) return id;

  const match = Array.isArray(options)
    ? options.find((opt) => String(opt.name || "").toLowerCase() === name.toLowerCase())
    : null;
  if (match?.id != null && Number.isFinite(Number(match.id))) {
    return Number(match.id);
  }

  return { name };
};

export const formatStockDestinationDisplay = (item, kind = "destination") => {
  if (!item) return "-";
  if (kind === "ap") {
    const m2oName = getStockM2OName(item.ap_destination_ids);
    if (m2oName) return m2oName;
    const m2oId = getStockM2OId(item.ap_destination_ids);
    if (m2oId != null) return String(m2oId);
    const text =
      (item.ap_destination_new && item.ap_destination_new !== false
        ? String(item.ap_destination_new)
        : "") ||
      item.ap_destination_id ||
      item.ap_destination ||
      "";
    return text || "-";
  }
  const m2oName = getStockM2OName(item.destination_ids);
  if (m2oName) return m2oName;
  const m2oId = getStockM2OId(item.destination_ids);
  if (m2oId != null) return String(m2oId);
  const text =
    (item.destination_new && item.destination_new !== false
      ? String(item.destination_new)
      : "") ||
    item.destination_id ||
    item.destination ||
    item.stock_destination ||
    "";
  return text || "-";
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
