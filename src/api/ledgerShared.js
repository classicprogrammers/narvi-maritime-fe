import api from "./axios";

const unwrapError = (data, fallback) => {
  if (data?.result?.status === "error") {
    throw new Error(data.result.message || fallback);
  }
  if (data?.status === "error") {
    throw new Error(data.message || fallback);
  }
};

// Payload can sit in data, data.result, data.data or data.result.data
const pickPayload = (data) => {
  const candidates = [data?.result?.data, data?.data, data?.result, data];
  return candidates.find((c) => c && typeof c === "object" && !Array.isArray(c)) || {};
};

export const previewLedgerRoe = async ({ kind, currency_id, date }) => {
  const body = { kind, currency_id };
  if (date) body.date = date;
  const response = await api.post("/api/ledger/roe/preview", body);
  const data = response.data || response;
  unwrapError(data, "Failed to look up the rate of exchange");
  const payload = pickPayload(data);
  const roe = payload.roe;
  return {
    roe: roe == null || roe === false || roe === "" || !Number.isFinite(Number(roe)) ? null : Number(roe),
    roe_date: payload.roe_date || null,
  };
};

export const previewLedgerDueDate = async ({ partner_id, date }) => {
  const response = await api.post("/api/ledger/due-date/preview", { partner_id, date });
  const data = response.data || response;
  unwrapError(data, "Failed to work out the due date");
  const payload = pickPayload(data);
  return {
    payment_term: payload.payment_term || null,
    rule: payload.rule || null,
    due_date: payload.due_date || null,
  };
};

export const getLedgerAgentOptions = async ({ q = "", limit = 30 } = {}) => {
  const response = await api.post("/api/ledger/agent/options", { q, limit });
  const data = response.data || response;
  unwrapError(data, "Failed to load agents");
  const list = [
    data?.result?.agents,
    data?.result?.data,
    data?.data,
    data?.result,
    data,
  ].find(Array.isArray);
  return list || [];
};

export default { previewLedgerRoe, previewLedgerDueDate, getLedgerAgentOptions };
