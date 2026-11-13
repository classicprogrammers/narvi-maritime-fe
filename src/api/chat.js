import api from "./axios";
import { API_CONFIG } from "../config/api";

const { ENDPOINTS } = API_CONFIG;

// Odoo JSON routes reply under `result`; both shapes carry status/message
const unwrap = (response, fallback) => {
  const data = response?.data || response || {};
  const payload = data.result && typeof data.result === "object" ? data.result : data;
  if (payload.status === "error") {
    throw new Error(payload.message || fallback);
  }
  return payload;
};

export const getChatMe = async () =>
  unwrap(await api.post(ENDPOINTS.CHAT_ME, {}), "Failed to load chat");

export const getChatMembers = async () => {
  const payload = unwrap(await api.post(ENDPOINTS.CHAT_MEMBERS, {}), "Failed to load participants");
  return payload.members || [];
};

export const getChatMessages = async ({ limit, beforeId, afterId } = {}) => {
  const body = {};
  if (limit) body.limit = limit;
  if (beforeId != null) body.before_id = beforeId;
  if (afterId != null) body.after_id = afterId;
  const payload = unwrap(await api.post(ENDPOINTS.CHAT_MESSAGES, body), "Failed to load messages");
  return { messages: payload.messages || [], hasMore: Boolean(payload.has_more) };
};

// attachment: { filename, mimetype, datas } where datas is a base64 / data URL string
export const sendChatMessage = async ({ body, attachment, replyToId }) => {
  const payload = {};
  if (replyToId != null) payload.reply_to_id = replyToId;
  if (body) payload.body = body;
  if (attachment) payload.attachment = attachment;
  const result = unwrap(await api.post(ENDPOINTS.CHAT_SEND, payload), "Failed to send message");
  return result.message;
};
