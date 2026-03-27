import api from "./axios";

export const getSiFormOptionsApi = async ({
  page = 1,
  page_size = 100,
  q_cnee,
  q_si,
  q_agent,
  q_ship_by,
  q_shipped_by,
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
  // Backend expects search text (ilike on display_name / si_number)
  if (q_cnee != null && String(q_cnee).trim() !== "") payload.q_cnee = String(q_cnee);
  if (q_si != null && String(q_si).trim() !== "") payload.q_si = String(q_si);
  if (q_agent != null && String(q_agent).trim() !== "") payload.q_agent = String(q_agent);
  if (q_ship_by != null && String(q_ship_by).trim() !== "") payload.q_ship_by = String(q_ship_by);
  if (q_shipped_by != null && String(q_shipped_by).trim() !== "") payload.q_shipped_by = String(q_shipped_by);
  if (q_from != null && String(q_from).trim() !== "") payload.q_from = String(q_from);
  if (q_to != null && String(q_to).trim() !== "") payload.q_to = String(q_to);
  if (agent_id != null && agent_id !== "") payload.agent_id = Number(agent_id);

  const response = await api.post("/api/si/form/options", payload);

  const result = response?.data?.result;

  // Handle JSON-RPC-ish error shape used elsewhere in the app
  if (result?.status === "error") {
    throw new Error(result.message || "Failed to fetch SI form options");
  }

  return response.data;
};

export const postSiFormApi = async ({ agent_cnee_id, si_number_id, latest_only } = {}) => {
  const payload = {};
  if (latest_only === true) payload.latest_only = true;
  if (agent_cnee_id != null && agent_cnee_id !== "") payload.agent_cnee_id = Number(agent_cnee_id);
  if (si_number_id != null && si_number_id !== "") payload.si_number_id = Number(si_number_id);

  if (Object.keys(payload).length === 0) {
    throw new Error("latest_only, agent_cnee_id or si_number_id is required");
  }

  const response = await api.post("/api/si/form", payload);

  const result = response?.data?.result;
  if (result?.status === "error") {
    throw new Error(result.message || "Failed to fetch SI form");
  }

  return result?.form ?? null;
};

export const postSiFormUpdateApi = async (payload = {}) => {
  const safePayload = payload && typeof payload === "object" ? { ...payload } : {};
  if (safePayload.id != null && safePayload.id !== "") safePayload.id = Number(safePayload.id);

  const response = await api.post("/api/si/form/update", safePayload);

  const result = response?.data?.result;
  if (result?.status === "error") {
    throw new Error(result.message || "Failed to update SI form");
  }

  // Backend returns full updated form after update
  return result?.form ?? null;
};

