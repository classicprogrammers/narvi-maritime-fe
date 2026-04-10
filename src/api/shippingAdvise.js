import api from "./axios";

/** Backend may return { status, form } or { result: { status, form } }. */
const extractAdviseForm = (data) => {
  if (!data || typeof data !== "object") return null;
  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Shipping advise request failed");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Shipping advise request failed");
  }
  if (data.form != null) return data.form;
  if (data.result?.form != null) return data.result.form;
  return null;
};

const assertAdviseSuccess = (data) => {
  if (!data || typeof data !== "object") return;
  if (data.status === "error" || data.result?.status === "error") {
    const msg = data.result?.message || data.message || "Request failed";
    throw new Error(msg);
  }
};

/**
 * Shipping Advise APIs (SI Shipping Advise flow).
 * Options: q_agent, q_cnee, q_si, q_from, q_to + page, page_size
 */

export const getShippingAdviseOptionsApi = async ({
  page = 1,
  page_size = 100,
  q_cnee,
  q_si,
  q_agent,
  q_from,
  q_to,
  agent_id,
} = {}) => {
  const payload = {};
  const safePage = Number.isFinite(Number(page)) ? Number(page) : 1;
  const safePageSize = Number.isFinite(Number(page_size)) ? Number(page_size) : 100;
  const clampedPageSize = Math.min(200, Math.max(1, safePageSize));
  payload.page = safePage;
  payload.page_size = clampedPageSize;
  if (q_cnee != null && String(q_cnee).trim() !== "") payload.q_cnee = String(q_cnee);
  if (q_si != null && String(q_si).trim() !== "") payload.q_si = String(q_si);
  if (q_agent != null && String(q_agent).trim() !== "") payload.q_agent = String(q_agent);
  if (q_from != null && String(q_from).trim() !== "") payload.q_from = String(q_from);
  if (q_to != null && String(q_to).trim() !== "") payload.q_to = String(q_to);
  if (agent_id != null && agent_id !== "") payload.agent_id = Number(agent_id);

  const response = await api.post("/api/si/shipping/advise/options", payload);
  assertAdviseSuccess(response.data);
  return response.data;
};

/** Load form by latest_only, agent_cnee_id, or si_number_id */
export const postShippingAdviseFormApi = async ({
  agent_cnee_id,
  si_number_id,
  sic_number_id,
  latest_only,
} = {}) => {
  const payload = {};
  if (latest_only === true) payload.latest_only = true;
  if (agent_cnee_id != null && agent_cnee_id !== "")
    payload.agent_cnee_id = Number(agent_cnee_id);
  if (si_number_id != null && si_number_id !== "")
    payload.si_number_id = Number(si_number_id);
  if (sic_number_id != null && sic_number_id !== "")
    payload.sic_number_id = Number(sic_number_id);

  if (Object.keys(payload).length === 0) {
    throw new Error("latest_only, agent_cnee_id, si_number_id or sic_number_id is required");
  }

  const response = await api.post("/api/si/shipping/advise", payload);
  assertAdviseSuccess(response.data);
  return extractAdviseForm(response.data);
};

/** Optional: GET latest/current record for prefill */
export const getShippingAdviseFormApi = async () => {
  const response = await api.get("/api/si/shipping/advise");
  assertAdviseSuccess(response.data);
  return extractAdviseForm(response.data);
};

/**
 * Update/save — changed fields or full payload.
 * If id is omitted, backend may update the latest record.
 */
export const postShippingAdviseFormUpdateApi = async (payload = {}) => {
  const safePayload = payload && typeof payload === "object" ? { ...payload } : {};
  if (safePayload.id != null && safePayload.id !== "") safePayload.id = Number(safePayload.id);

  const response = await api.post("/api/si/shipping/advise/update", safePayload);
  assertAdviseSuccess(response.data);
  return extractAdviseForm(response.data);
};

/** Create — rarely needed when latest-record update is used */
export const postShippingAdviseFormCreateApi = async (payload = {}) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const response = await api.post("/api/si/shipping/advise/create", body);
  assertAdviseSuccess(response.data);
  return extractAdviseForm(response.data);
};
