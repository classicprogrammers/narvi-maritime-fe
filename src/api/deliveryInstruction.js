import api from "./axios";

const isDeliveryInstructionOptionsResult = (value) =>
  Boolean(
    value &&
    typeof value === "object" &&
    (Array.isArray(value.di_number_options) ||
      Array.isArray(value.si_number_options) ||
      Array.isArray(value.so_number_options) ||
      Array.isArray(value.job_no_options))
  );

const isDeliveryInstructionFormResult = (value) =>
  Boolean(
    value &&
    typeof value === "object" &&
    !isDeliveryInstructionOptionsResult(value) &&
    (Object.prototype.hasOwnProperty.call(value, "id") ||
      Object.prototype.hasOwnProperty.call(value, "stock_list") ||
      Object.prototype.hasOwnProperty.call(value, "di_number_id") ||
      Object.prototype.hasOwnProperty.call(value, "si_number") ||
      Object.prototype.hasOwnProperty.call(value, "so_number") ||
      Object.prototype.hasOwnProperty.call(value, "in_liason_with"))
  );

const extractForm = (data) => {
  if (!data || typeof data !== "object") return null;
  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Delivery instruction request failed");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Delivery instruction request failed");
  }
  if (data.form != null && typeof data.form === "object") return data.form;
  if (data.result?.form != null && typeof data.result.form === "object") return data.result.form;
  if (isDeliveryInstructionFormResult(data.result)) return data.result;
  if (isDeliveryInstructionFormResult(data)) return data;
  return null;
};

const assertSuccess = (data) => {
  if (!data || typeof data !== "object") return;
  if (data.status === "error" || data.result?.status === "error") {
    throw new Error(data.result?.message || data.message || "Request failed");
  }
};

export const getDeliveryInstructionOptionsApi = async ({
  page = 1,
  page_size = 100,
  q_agent,
  q_cnee,
  q_di,
  q_job,
  q_pic,
  q_si,
  q_so,
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
  if (q_job != null && String(q_job).trim() !== "") payload.q_job = String(q_job);
  if (q_pic != null && String(q_pic).trim() !== "") payload.q_pic = String(q_pic);
  if (q_si != null && String(q_si).trim() !== "") payload.q_si = String(q_si);
  if (q_so != null && String(q_so).trim() !== "") payload.q_so = String(q_so);
  if (q_to != null && String(q_to).trim() !== "") payload.q_to = String(q_to);
  if (agent_id != null && agent_id !== "") payload.agent_id = Number(agent_id);

  const response = await api.post("/api/delivery/instruction/form/options", payload);
  assertSuccess(response.data);
  return response.data;
};

export const postDeliveryInstructionFormApi = async ({
  latest_only,
  agent_cnee_id,
  di_number_id,
} = {}) => {
  const payload = {};
  if (latest_only === true) payload.latest_only = true;
  if (agent_cnee_id != null && agent_cnee_id !== "") payload.agent_cnee_id = Number(agent_cnee_id);
  if (di_number_id != null && di_number_id !== "") payload.di_number_id = Number(di_number_id);
  if (Object.keys(payload).length === 0) throw new Error("latest_only, agent_cnee_id or di_number_id is required");

  const response = await api.post("/api/delivery/instruction/form", payload);
  assertSuccess(response.data);
  return extractForm(response.data);
};

export const postDeliveryInstructionFormUpdateApi = async (payload = {}) => {
  const safe = payload && typeof payload === "object" ? { ...payload } : {};
  if (safe.id != null && safe.id !== "") safe.id = Number(safe.id);
  const response = await api.post("/api/delivery/instruction/form/update", safe);
  assertSuccess(response.data);
  return extractForm(response.data);
};

