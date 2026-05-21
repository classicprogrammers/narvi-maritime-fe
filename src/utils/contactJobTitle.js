import {
  buildM2OIdsPayload,
  getM2OId,
  getM2OName,
} from "./m2oFieldOptions";

/** Resolve API job_title_ids (object, id number, or name string). */
export const resolveJobTitleFromField = (field) => {
  if (field == null || field === false || field === "") {
    return { id: null, name: "" };
  }
  if (typeof field === "number") {
    return Number.isFinite(field) ? { id: field, name: "" } : { id: null, name: "" };
  }
  if (typeof field === "string") {
    const trimmed = field.trim();
    if (!trimmed) return { id: null, name: "" };
    if (/^\d+$/.test(trimmed)) {
      const id = Number(trimmed);
      return Number.isFinite(id) ? { id, name: "" } : { id: null, name: "" };
    }
    return { id: null, name: trimmed };
  }
  return {
    id: getM2OId(field),
    name: getM2OName(field),
  };
};

export const mapJobTitleFieldsFromContact = (contact = {}) => {
  const legacy =
    contact.job_title != null && contact.job_title !== false
      ? String(contact.job_title).trim()
      : "";
  const { id, name } = resolveJobTitleFromField(contact.job_title_ids);
  return {
    job_title_id: id,
    job_title_select: name || legacy,
  };
};

export const formatJobTitleDisplay = (contact = {}) => {
  const { name } = resolveJobTitleFromField(contact?.job_title_ids);
  if (name) return name;
  if (contact?.job_title != null && contact.job_title !== false && String(contact.job_title).trim() !== "") {
    return String(contact.job_title).trim();
  }
  return "";
};

export const buildJobTitleIdsPayload = (optionId, selectName, options = []) =>
  buildM2OIdsPayload(optionId, selectName, options, null);

export const applyJobTitleIdsToPayload = (payload, row, options = []) => {
  if (!payload || !row) return payload;
  const hasSelect = String(row.job_title_select ?? "").trim() !== "";
  const hasId = row.job_title_id != null && row.job_title_id !== "";
  if (!hasSelect && !hasId) {
    payload.job_title_ids = null;
    return payload;
  }
  payload.job_title_ids = buildJobTitleIdsPayload(
    row.job_title_id,
    row.job_title_select,
    options
  );
  return payload;
};
