import api from "./axios";

const extractForm = (data) => {
  if (!data || typeof data !== "object") return null;
  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Shipping instruction combined request failed");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Shipping instruction combined request failed");
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

export const getShippingInstructionCombinedOptionsApi = async ({
  page = 1,
  page_size = 100,
  q_agent,
  q_cnee,
  q_si,
  q_pic,
  q_ship_by,
  q_from,
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
  if (q_si != null && String(q_si).trim() !== "") payload.q_si = String(q_si);
  if (q_pic != null && String(q_pic).trim() !== "") payload.q_pic = String(q_pic);
  if (q_ship_by != null && String(q_ship_by).trim() !== "") payload.q_ship_by = String(q_ship_by);
  if (q_from != null && String(q_from).trim() !== "") payload.q_from = String(q_from);
  if (q_to != null && String(q_to).trim() !== "") payload.q_to = String(q_to);
  if (agent_id != null && agent_id !== "") payload.agent_id = Number(agent_id);

  const response = await api.post("/api/shipping/instruction/combined/form/options", payload);
  assertSuccess(response.data);
  return response.data;
};

export const postShippingInstructionCombinedFormApi = async ({
  latest_only,
  agent_cnee_id,
  si_number_id,
} = {}) => {
  const payload = {};
  if (latest_only === true) payload.latest_only = true;
  if (agent_cnee_id != null && agent_cnee_id !== "") payload.agent_cnee_id = Number(agent_cnee_id);
  if (si_number_id != null && si_number_id !== "") payload.si_number_id = Number(si_number_id);
  if (Object.keys(payload).length === 0) throw new Error("latest_only, agent_cnee_id or si_number_id is required");

  const response = await api.post("/api/shipping/instruction/combined/form", payload);
  assertSuccess(response.data);
  return extractForm(response.data);
};

export const postShippingInstructionCombinedFormUpdateApi = async (payload = {}) => {
  const safe = payload && typeof payload === "object" ? { ...payload } : {};
  if (safe.id != null && safe.id !== "") safe.id = Number(safe.id);
  const response = await api.post("/api/shipping/instruction/combined/form/update", safe);
  assertSuccess(response.data);
  return extractForm(response.data);
};

