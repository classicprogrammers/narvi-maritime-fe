/** Helpers for diff-based partial updates on shipping-related forms */

export const snapshotValue = (value) => {
  if (value == null || value === false) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const text = String(value).trim();
  return text === "" ? null : text;
};

export const pickChangedFields = (candidate, baseline = {}) => {
  const changed = {};
  Object.keys(candidate).forEach((key) => {
    if (snapshotValue(candidate[key]) !== snapshotValue(baseline[key])) {
      changed[key] = candidate[key];
    }
  });
  return changed;
};

export const toIdOrNull = (value) => {
  if (value == null || value === "" || value === false) return null;
  if (typeof value === "object" && value !== null && value.id != null) {
    const id = Number(value.id);
    return Number.isFinite(id) ? id : null;
  }
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

/** Returns a numeric form id, or undefined when empty — omit from save payloads. */
export const toOptionalFormId = (value) => {
  const id = toIdOrNull(value);
  return id == null ? undefined : id;
};

/** Include only form id fields that have a value (never send sibling ids as null). */
export const withOptionalFormIds = (entries = {}) => {
  const result = {};
  Object.entries(entries).forEach(([key, raw]) => {
    const id = toOptionalFormId(raw);
    if (id != null) result[key] = id;
  });
  return result;
};

/** Drop null/undefined keys from partial form update payloads. */
export const omitNullPayloadFields = (payload = {}) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value != null));

export const buildCiPlExclusiveNumberFields = (data) => {
  const siNumberId = toOptionalFormId(data.siNo);
  const sicNumberId = toOptionalFormId(data.sicNo);
  const diNumberId = toOptionalFormId(data.diNo);
  if (siNumberId != null) return { si_number_id: siNumberId };
  if (sicNumberId != null) return { sic_number_id: sicNumberId };
  if (diNumberId != null) return { di_number_id: diNumberId };
  return {};
};
