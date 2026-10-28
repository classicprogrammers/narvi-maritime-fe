import api from "./axios";

const assertSuccess = (data, fallbackMessage) => {
  if (!data || typeof data !== "object") return;
  if (data.status === "error" || data.result?.status === "error") {
    throw new Error(data.result?.message || data.message || fallbackMessage);
  }
};

const extractForm = (data, fallbackMessage) => {
  assertSuccess(data, fallbackMessage);
  if (data?.form != null) return data.form;
  if (data?.result?.form != null) return data.result.form;
  if (data?.archived_form != null) return data.archived_form;
  if (data?.result?.archived_form != null) return data.result.archived_form;
  if (data?.record != null) return data.record;
  if (data?.result?.record != null) return data.result.record;
  const root = data?.result && typeof data.result === "object" ? data.result : data;
  if (root?.id != null && (root?.state != null || root?.stock_list != null || root?.vessel_name != null || root?.agent_id != null)) {
    return root;
  }
  if (data?.id != null && (data?.state != null || data?.stock_list != null || data?.vessel_name != null || data?.agent_id != null)) {
    return data;
  }
  return null;
};

const buildOptionsPayload = ({
  page = 1,
  page_size = 100,
  q_cnee,
  q_si,
  q_sic,
  q_di,
  q_agent,
  q_ship_by,
  q_pic,
  q_from,
  q_to,
  agent_id,
} = {}) => {
  const payload = {};
  const safePage = Number.isFinite(Number(page)) ? Number(page) : 1;
  const safePageSize = Number.isFinite(Number(page_size)) ? Number(page_size) : 100;
  payload.page = safePage;
  payload.page_size = Math.min(200, Math.max(1, safePageSize));
  if (q_cnee != null && String(q_cnee).trim() !== "") payload.q_cnee = String(q_cnee);
  if (q_si != null && String(q_si).trim() !== "") payload.q_si = String(q_si);
  if (q_sic != null && String(q_sic).trim() !== "") payload.q_sic = String(q_sic);
  if (q_di != null && String(q_di).trim() !== "") payload.q_di = String(q_di);
  if (q_agent != null && String(q_agent).trim() !== "") payload.q_agent = String(q_agent);
  if (q_ship_by != null && String(q_ship_by).trim() !== "") payload.q_ship_by = String(q_ship_by);
  if (q_pic != null && String(q_pic).trim() !== "") payload.q_pic = String(q_pic);
  if (q_from != null && String(q_from).trim() !== "") payload.q_from = String(q_from);
  if (q_to != null && String(q_to).trim() !== "") payload.q_to = String(q_to);
  if (agent_id != null && agent_id !== "") payload.agent_id = Number(agent_id);
  return payload;
};

const buildFormLoadPayload = ({
  latest_only,
  archived_only,
  id,
  page,
  page_size,
  agent_cnee_id,
  si_number_id,
  sic_number_id,
  di_number_id,
} = {}) => {
  const payload = {};
  if (latest_only === true) payload.latest_only = true;
  if (archived_only === true) payload.archived_only = true;
  if (id != null && id !== "") payload.id = Number(id);
  if (page != null && page !== "") {
    payload.page = Number.isFinite(Number(page)) ? Number(page) : 1;
  }
  if (page_size != null && page_size !== "") {
    const safePageSize = Number.isFinite(Number(page_size)) ? Number(page_size) : 80;
    payload.page_size = Math.min(200, Math.max(1, safePageSize));
  }
  if (agent_cnee_id != null && agent_cnee_id !== "") payload.agent_cnee_id = Number(agent_cnee_id);
  if (si_number_id != null && si_number_id !== "") payload.si_number_id = Number(si_number_id);
  if (sic_number_id != null && sic_number_id !== "") payload.sic_number_id = Number(sic_number_id);
  if (di_number_id != null && di_number_id !== "") payload.di_number_id = Number(di_number_id);
  if (Object.keys(payload).length === 0) {
    throw new Error("latest_only, archived_only, id, agent_cnee_id, si_number_id, sic_number_id or di_number_id is required");
  }
  return payload;
};

const sanitizeUpdatePayload = (payload = {}) => {
  const safePayload = payload && typeof payload === "object" ? { ...payload } : {};
  if (safePayload.id != null && safePayload.id !== "") safePayload.id = Number(safePayload.id);
  return safePayload;
};

const postOptions = async (url, params, fallbackMessage) => {
  const response = await api.post(url, buildOptionsPayload(params));
  assertSuccess(response.data, fallbackMessage);
  return response.data;
};

const postForm = async (url, params, fallbackMessage) => {
  const response = await api.post(url, buildFormLoadPayload(params));
  return extractForm(response.data, fallbackMessage);
};

const extractFormList = (data) => {
  if (!data || typeof data !== "object") return [];
  const root = data?.result && typeof data.result === "object" ? data.result : data;
  const candidates = [root?.forms, root?.records, root?.items, data?.forms, data?.records, data?.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const postFormList = async (url, params, fallbackMessage) => {
  const response = await api.post(url, buildFormLoadPayload(params));
  assertSuccess(response.data, fallbackMessage);
  const list = extractFormList(response.data);
  if (list.length > 0) return list;
  const single = extractForm(response.data, fallbackMessage);
  return single ? [single] : [];
};

const postCreate = async (url, payload = {}, fallbackMessage) => {
  const response = await api.post(url, payload && typeof payload === "object" ? payload : {});
  return extractForm(response.data, fallbackMessage);
};

const postUpdate = async (url, payload = {}, fallbackMessage) => {
  const response = await api.post(url, sanitizeUpdatePayload(payload));
  return extractForm(response.data, fallbackMessage);
};

export const getCiplSimpleFormOptionsApi = async (params = {}) =>
  postOptions("/api/cipl/form/options", params, "Failed to fetch CIPL simple form options");

export const postCiplSimpleFormApi = async (params = {}) =>
  postForm("/api/cipl/form", params, "Failed to fetch CIPL simple form");

export const postCiplSimpleFormCreateApi = async (payload = {}) =>
  postCreate("/api/cipl/form/create", payload, "Failed to create CIPL simple form");

export const postCiplSimpleFormUpdateApi = async (payload = {}) =>
  postUpdate("/api/cipl/form/update", payload, "Failed to update CIPL simple form");

/** Refresh the rate on every simple CIPL line without a manual ROE; returns the updated form. */
export const postCiplSimpleFormConvertApi = async (payload = {}) =>
  postUpdate("/api/cipl/form/convert", payload, "Failed to convert CIPL form currency");

/** Preview ROE (units of to_currency for 1 unit of from_currency). roe is null when no rate exists. */
export const postCurrencyRoeApi = async ({ from_currency_id, to_currency_id, date } = {}) => {
  const payload = {
    from_currency_id: Number(from_currency_id),
    to_currency_id: Number(to_currency_id),
  };
  if (date) payload.date = date;
  const response = await api.post("/api/currency/roe", payload);
  assertSuccess(response.data, "Failed to fetch exchange rate");
  const root = response.data?.result && typeof response.data.result === "object"
    ? response.data.result
    : response.data;
  return {
    roe: root?.roe != null && root.roe !== false ? Number(root.roe) : null,
    roeDate: root?.roe_date && root.roe_date !== false ? String(root.roe_date) : "",
  };
};

const extractArchiveResponse = (data, fallbackMessage) => {
  assertSuccess(data, fallbackMessage);
  const root = data?.result && typeof data.result === "object" ? data.result : data;
  return {
    archivedForm: root?.archived_form ?? data?.archived_form ?? null,
    draftForm: root?.draft_form ?? data?.draft_form ?? null,
    raw: data,
  };
};

export const postCiplSimpleFormArchiveApi = async (payload = {}) => {
  const response = await api.post("/api/cipl/form/archive", sanitizeUpdatePayload(payload));
  return extractArchiveResponse(response.data, "Failed to archive CIPL simple form");
};

export const listCiplSimpleArchivedFormsApi = async (params = {}) =>
  postFormList("/api/cipl/form", { archived_only: true, ...params }, "Failed to list archived CIPL forms");

export const getCiplSimpleFormByIdApi = async (id) => {
  const response = await api.post("/api/cipl/form", buildFormLoadPayload({ id }));
  const form = extractForm(response.data, "Failed to fetch CIPL simple form");
  if (form) return form;
  const list = extractFormList(response.data);
  if (list.length > 0) return list[0];
  throw new Error("Failed to fetch CIPL simple form");
};

export const postCiplSimpleFormDeleteApi = async (payload = {}) => {
  const response = await api.post("/api/cipl/form/delete", sanitizeUpdatePayload(payload));
  assertSuccess(response.data, "Failed to delete CIPL simple form");
  return response.data;
};

export const getCiplPerUnitFormOptionsApi = async (params = {}) =>
  postOptions("/api/cipl/perunit/form/options", params, "Failed to fetch CIPL per-unit form options");

export const postCiplPerUnitFormApi = async (params = {}) =>
  postForm("/api/cipl/perunit/form", params, "Failed to fetch CIPL per-unit form");

export const postCiplPerUnitFormCreateApi = async (payload = {}) =>
  postCreate("/api/cipl/perunit/form/create", payload, "Failed to create CIPL per-unit form");

export const postCiplPerUnitFormUpdateApi = async (payload = {}) =>
  postUpdate("/api/cipl/perunit/form/update", payload, "Failed to update CIPL per-unit form");

export const postCiplPerUnitFormArchiveApi = async (payload = {}) => {
  const response = await api.post("/api/cipl/perunit/form/archive", sanitizeUpdatePayload(payload));
  return extractArchiveResponse(response.data, "Failed to archive CIPL per-unit form");
};

