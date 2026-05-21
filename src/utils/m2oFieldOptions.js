/** Shared helpers for Many2one-style API fields (id + name objects) */

export const normalizeM2OOptions = (raw) => {
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

export const getM2OId = (field) => {
  if (field == null || field === false || field === "") return null;
  if (typeof field === "object" && field.id != null) {
    const id = Number(field.id);
    return Number.isFinite(id) ? id : null;
  }
  const id = Number(field);
  return Number.isFinite(id) ? id : null;
};

export const getM2OName = (field) => {
  if (field == null || field === false || field === "") return "";
  if (typeof field === "object" && field.name != null && field.name !== false) {
    return String(field.name);
  }
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

/** @param {unknown} clearValue Value sent when selection is cleared (false for stock, null for job titles) */
export const buildM2OIdsPayload = (optionId, selectName, options = [], clearValue = false) => {
  const name = String(selectName ?? "").trim();
  const id =
    optionId != null && optionId !== "" && Number.isFinite(Number(optionId))
      ? Number(optionId)
      : null;

  if (!name && id == null) return clearValue;

  if (id != null) return id;

  const match = Array.isArray(options)
    ? options.find((opt) => String(opt.name || "").toLowerCase() === name.toLowerCase())
    : null;
  if (match?.id != null && Number.isFinite(Number(match.id))) {
    return Number(match.id);
  }

  return { name };
};

export const mergeM2OOptions = (options, selectedId, selectedName) => {
  const list = Array.isArray(options) ? [...options] : [];
  const id = getM2OId(selectedId);
  const name = String(selectedName ?? "").trim();
  if (id == null && !name) return list;
  if (id != null && !list.some((o) => Number(o.id) === id)) {
    list.unshift({ id, name: name || `Option ${id}`, key: `id-${id}` });
  } else if (id == null && name && !list.some((o) => String(o.name).toLowerCase() === name.toLowerCase())) {
    list.unshift({ id: null, name, key: `txt-${name}` });
  }
  return list;
};
