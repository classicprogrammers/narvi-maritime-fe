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

/** Resolve display label for API q_job_title from form row + options. */
export const resolveJobTitleLabelForPayload = (row, options = []) => {
  const select = String(row?.job_title_select ?? "").trim();
  if (select) return select;
  const id = row?.job_title_id;
  if (id != null && id !== "" && Array.isArray(options)) {
    const match = options.find((opt) => String(opt.id) === String(id));
    if (match?.name) return String(match.name).trim();
  }
  return "";
};

/** Customer register/update children: send q_job_title text, not job_title_ids id. */
export const applyQJobTitleToPayload = (payload, row, options = []) => {
  if (!payload || !row) return payload;
  delete payload.job_title_ids;
  const label = resolveJobTitleLabelForPayload(row, options);
  payload.q_job_title = label || null;
  return payload;
};

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
