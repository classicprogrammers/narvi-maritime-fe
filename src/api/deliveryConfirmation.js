import api from "./axios";

const extractForm = (data) => {
  if (!data || typeof data !== "object") return null;
  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Delivery confirmation request failed");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Delivery confirmation request failed");
  }
  if (data.form != null) return data.form;
  if (data.result?.form != null) return data.result.form;
  return null;
};

const assertSuccess = (data) => {
  if (!data || typeof data !== "object") return;
  if (data.status === "error" || data.result?.status === "error") {
    throw new Error(data.result?.message || data.message || "Request failed");
  }
};

export const getDeliveryConfirmationOptionsApi = async ({
  page = 1,
  page_size = 100,
  q_agent,
  q_cnee,
  q_di,
  q_pic,
  q_to,
  agent_id,
} = {}) => {
  const payload = {};
  const safePage = Number.isFinite(Number(page)) ? Number(page) : 1;
  const safePageSize = Number.isFinite(Number(page_size)) ? Number(page_size) : 100;
  payload.page = safePage;
  payload.page_size = Math.min(200, Math.max(1, safePageSize));
  if (q_agent != null && String(q_agent).trim() !== "") payload.q_agent = String(q_agent);
  if (q_cnee != null && String(q_cnee).trim() !== "") payload.q_cnee = String(q_cnee);
  if (q_di != null && String(q_di).trim() !== "") payload.q_di = String(q_di);
  if (q_pic != null && String(q_pic).trim() !== "") payload.q_pic = String(q_pic);
  if (q_to != null && String(q_to).trim() !== "") payload.q_to = String(q_to);
  if (agent_id != null && agent_id !== "") payload.agent_id = Number(agent_id);

  const response = await api.post("/api/delivery/confirmation/form/options", payload);
  assertSuccess(response.data);
  return response.data;
};

export const postDeliveryConfirmationFormApi = async ({
  latest_only,
  agent_cnee_id,
  di_number_id,
} = {}) => {
  const payload = {};
  if (latest_only === true) payload.latest_only = true;
  if (agent_cnee_id != null && agent_cnee_id !== "") payload.agent_cnee_id = Number(agent_cnee_id);
  if (di_number_id != null && di_number_id !== "") payload.di_number_id = Number(di_number_id);
  if (Object.keys(payload).length === 0) throw new Error("latest_only, agent_cnee_id or di_number_id is required");

  const response = await api.post("/api/delivery/confirmation/form", payload);
  assertSuccess(response.data);
  return extractForm(response.data);
};

export const postDeliveryConfirmationFormUpdateApi = async (payload = {}) => {
  const safe = payload && typeof payload === "object" ? { ...payload } : {};
  if (safe.id != null && safe.id !== "") safe.id = Number(safe.id);
  const response = await api.post("/api/delivery/confirmation/form/update", safe);
  assertSuccess(response.data);
  return extractForm(response.data);
};

