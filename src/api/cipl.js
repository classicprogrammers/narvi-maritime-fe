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
  agent_cnee_id,
  si_number_id,
  sic_number_id,
  di_number_id,
} = {}) => {
  const payload = {};
  if (latest_only === true) payload.latest_only = true;
  if (agent_cnee_id != null && agent_cnee_id !== "") payload.agent_cnee_id = Number(agent_cnee_id);
  if (si_number_id != null && si_number_id !== "") payload.si_number_id = Number(si_number_id);
  if (sic_number_id != null && sic_number_id !== "") payload.sic_number_id = Number(sic_number_id);
  if (di_number_id != null && di_number_id !== "") payload.di_number_id = Number(di_number_id);
  if (Object.keys(payload).length === 0) {
    throw new Error("latest_only, agent_cnee_id, si_number_id, sic_number_id or di_number_id is required");
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

export const getCiplPerUnitFormOptionsApi = async (params = {}) =>
  postOptions("/api/cipl/perunit/form/options", params, "Failed to fetch CIPL per-unit form options");

export const postCiplPerUnitFormApi = async (params = {}) =>
  postForm("/api/cipl/perunit/form", params, "Failed to fetch CIPL per-unit form");

export const postCiplPerUnitFormCreateApi = async (payload = {}) =>
  postCreate("/api/cipl/perunit/form/create", payload, "Failed to create CIPL per-unit form");

export const postCiplPerUnitFormUpdateApi = async (payload = {}) =>
  postUpdate("/api/cipl/perunit/form/update", payload, "Failed to update CIPL per-unit form");

