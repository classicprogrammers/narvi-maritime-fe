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

export const buildCiPlExclusiveNumberFields = (data) => {
  const siNumberId =
    data.siNo != null && data.siNo !== "" && Number.isFinite(Number(data.siNo))
      ? Number(data.siNo)
      : null;
  const sicNumberId =
    data.sicNo != null && data.sicNo !== "" && Number.isFinite(Number(data.sicNo))
      ? Number(data.sicNo)
      : null;
  const diNumberId =
    data.diNo != null && data.diNo !== "" && Number.isFinite(Number(data.diNo))
      ? Number(data.diNo)
      : null;
  const activeNumberKey =
    siNumberId != null ? "si_number_id" : sicNumberId != null ? "sic_number_id" : diNumberId != null ? "di_number_id" : null;
  if (!activeNumberKey) {
    return { si_number_id: null, sic_number_id: null, di_number_id: null };
  }
  return {
    si_number_id: activeNumberKey === "si_number_id" ? siNumberId : null,
    sic_number_id: activeNumberKey === "sic_number_id" ? sicNumberId : null,
    di_number_id: activeNumberKey === "di_number_id" ? diNumberId : null,
  };
};
