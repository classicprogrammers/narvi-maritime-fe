import { getM2OId, getM2OName } from "./m2oFieldOptions";

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

/** Build job_title_ids for save: { id, name }, { name }, id only, or null. */
export const buildJobTitleIdsPayload = (optionId, selectName, options = []) => {
  const name = String(selectName ?? "").trim();
  const id =
    optionId != null && optionId !== "" && Number.isFinite(Number(optionId))
      ? Number(optionId)
      : null;

  if (!name && id == null) return null;

  if (id != null && name) return { id, name };

  if (id != null) return id;

  const match = Array.isArray(options)
    ? options.find((opt) => String(opt.name || "").toLowerCase() === name.toLowerCase())
    : null;
  if (match?.id != null && Number.isFinite(Number(match.id))) {
    return { id: Number(match.id), name: match.name || name };
  }

  return { name };
};

export const applyJobTitleIdsToPayload = (payload, row, options = []) => {
  if (!payload || !row) return payload;
  delete payload.q_job_title;
  delete payload.job_title;
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
