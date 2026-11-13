export const CHAT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const CHAT_MAX_BODY_LENGTH = 5000;
export const CHAT_POLL_INTERVAL_MS = 4000;

// Merge incoming messages into the list, de-duplicated by id, oldest first
export const mergeMessages = (existing = [], incoming = []) => {
  const byId = new Map();
  [...existing, ...incoming].forEach((m) => {
    if (m && m.id != null) byId.set(m.id, m);
  });
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
};

export const maxMessageId = (messages = []) =>
  messages.reduce((max, m) => (m.id > max ? m.id : max), 0);

export const minMessageId = (messages = []) =>
  messages.length ? messages.reduce((min, m) => (m.id < min ? m.id : min), messages[0].id) : null;

// Returns an error string, or "" when the message can be sent
export const validateOutgoing = ({ body = "", file = null }) => {
  const text = String(body || "").trim();
  if (!text && !file) return "Type a message or attach a file.";
  if (text.length > CHAT_MAX_BODY_LENGTH) {
    return `Message is too long (max ${CHAT_MAX_BODY_LENGTH} characters).`;
  }
  if (file && file.size > CHAT_MAX_ATTACHMENT_BYTES) {
    return "File is too large (max 10 MB).";
  }
  return "";
};

// Backend sends "YYYY-MM-DD HH:mm:ss" in UTC
export const parseChatDate = (value) => {
  if (!value) return null;
  const d = new Date(String(value).replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
};

const pad = (n) => String(n).padStart(2, "0");

export const formatChatTime = (value) => {
  const d = parseChatDate(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "";
};

const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const formatChatDay = (value, now = new Date()) => {
  const d = parseChatDate(value);
  if (!d) return "";
  if (dayKey(d) === dayKey(now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

// Items for rendering: day separators interleaved with messages
export const buildChatItems = (messages = [], now = new Date()) => {
  const items = [];
  let lastKey = null;
  messages.forEach((m) => {
    const d = parseChatDate(m.create_date);
    const key = d ? dayKey(d) : null;
    if (key && key !== lastKey) {
      items.push({ type: "day", key: `day-${key}`, label: formatChatDay(m.create_date, now) });
      lastKey = key;
    }
    items.push({ type: "message", key: `msg-${m.id}`, message: m });
  });
  return items;
};

export const formatFileSize = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const isImageAttachment = (attachment) =>
  Boolean(attachment?.mimetype && attachment.mimetype.startsWith("image/"));

export const buildAttachmentUrl = (baseUrl, downloadUrl, token, { download = false } = {}) => {
  if (!downloadUrl) return "";
  const base = String(baseUrl || "").replace(/\/$/, "");
  const params = [];
  if (token) params.push(`token=${encodeURIComponent(token)}`);
  if (download) params.push("download=true");
  const qs = params.length ? `?${params.join("&")}` : "";
  return `${base}${downloadUrl}${qs}`;
};

// Messages from other people newer than the last one the user saw
export const countUnread = (messages = [], lastSeenId = 0) =>
  messages.filter((m) => !m.is_mine && m.id > lastSeenId).length;

export const messagePreview = (message) => {
  if (!message) return "";
  const text = String(message.body || "").trim();
  if (text) return text;
  if (message.attachment) return isImageAttachment(message.attachment) ? "📷 Photo" : `📎 ${message.attachment.name}`;
  return "";
};

const SEEN_KEY = "chat:lastSeenId";

export const readLastSeenId = () => {
  try {
    return Number(window.localStorage.getItem(SEEN_KEY)) || 0;
  } catch (e) {
    return 0;
  }
};

export const writeLastSeenId = (id) => {
  try {
    window.localStorage.setItem(SEEN_KEY, String(id));
    window.dispatchEvent(new Event("chat:seen"));
  } catch (e) {
    // storage unavailable; unread badge just won't persist
  }
};

// Quoted preview for a reply. reply_to is null when the original was deleted.
export const replyPreview = (replyTo) => {
  if (!replyTo) return { name: "", text: "Original message unavailable", missing: true };
  const text =
    String(replyTo.body || "").trim() || (replyTo.attachment_name ? "📎 " + replyTo.attachment_name : "");
  return { name: replyTo.sender?.name || "", text, missing: false };
};

// Unsent composer text, kept across refresh/navigation until sent or cleared by the user.
// Not per-user: this is a shared room, but the draft only ever lives in this browser.
const DRAFT_KEY = "chat:draftBody";

export const readDraftBody = () => {
  try {
    return window.localStorage.getItem(DRAFT_KEY) || "";
  } catch (e) {
    return "";
  }
};

export const writeDraftBody = (body) => {
  try {
    if (body) window.localStorage.setItem(DRAFT_KEY, body);
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    // storage unavailable; draft just won't survive a refresh
  }
};
