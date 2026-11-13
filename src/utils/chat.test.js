import {
  mergeMessages,
  maxMessageId,
  minMessageId,
  validateOutgoing,
  parseChatDate,
  buildChatItems,
  formatFileSize,
  isImageAttachment,
  buildAttachmentUrl,
  CHAT_MAX_ATTACHMENT_BYTES,
} from "./chat";

describe("chat utils", () => {
  test("mergeMessages dedupes by id and sorts oldest first", () => {
    const merged = mergeMessages([{ id: 3 }, { id: 1 }], [{ id: 3, body: "x" }, { id: 2 }]);
    expect(merged.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(merged[2].body).toBe("x");
  });

  test("max/min message id", () => {
    expect(maxMessageId([])).toBe(0);
    expect(maxMessageId([{ id: 2 }, { id: 9 }])).toBe(9);
    expect(minMessageId([])).toBeNull();
    expect(minMessageId([{ id: 2 }, { id: 9 }])).toBe(2);
  });

  test("validateOutgoing", () => {
    expect(validateOutgoing({ body: "  " })).toMatch(/Type a message/);
    expect(validateOutgoing({ body: "hi" })).toBe("");
    expect(validateOutgoing({ body: "a".repeat(5001) })).toMatch(/too long/);
    expect(validateOutgoing({ file: { size: CHAT_MAX_ATTACHMENT_BYTES + 1 } })).toMatch(/too large/);
    expect(validateOutgoing({ file: { size: 10 } })).toBe("");
  });

  test("parseChatDate treats value as UTC", () => {
    expect(parseChatDate("2026-11-13 07:30:00").toISOString()).toBe("2026-11-13T07:30:00.000Z");
    expect(parseChatDate("")).toBeNull();
    expect(parseChatDate("nope")).toBeNull();
  });

  test("buildChatItems inserts one separator per day", () => {
    const items = buildChatItems(
      [
        { id: 1, create_date: "2026-11-12 12:00:00" },
        { id: 2, create_date: "2026-11-12 12:05:00" },
        { id: 3, create_date: "2026-11-13 12:00:00" },
      ],
      new Date("2026-11-13T12:30:00Z")
    );
    expect(items.map((i) => i.type)).toEqual(["day", "message", "message", "day", "message"]);
    expect(items[0].label).toBe("Yesterday");
    expect(items[3].label).toBe("Today");
  });

  test("formatFileSize", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  test("isImageAttachment", () => {
    expect(isImageAttachment({ mimetype: "image/png" })).toBe(true);
    expect(isImageAttachment({ mimetype: "application/pdf" })).toBe(false);
    expect(isImageAttachment(null)).toBe(false);
  });

  test("buildAttachmentUrl", () => {
    expect(buildAttachmentUrl("http://h/", "/api/chat/attachment/1", "t k")).toBe(
      "http://h/api/chat/attachment/1?token=t%20k"
    );
    expect(buildAttachmentUrl("http://h", "/a/1", "t", { download: true })).toBe(
      "http://h/a/1?token=t&download=true"
    );
    expect(buildAttachmentUrl("http://h", "", "t")).toBe("");
  });
});

import { countUnread, messagePreview } from "./chat";

describe("chat unread and preview", () => {
  test("countUnread ignores own and already-seen", () => {
    const list = [
      { id: 1, is_mine: false },
      { id: 2, is_mine: true },
      { id: 3, is_mine: false },
    ];
    expect(countUnread(list, 1)).toBe(1);
    expect(countUnread(list, 0)).toBe(2);
    expect(countUnread(list, 3)).toBe(0);
  });

  test("messagePreview", () => {
    expect(messagePreview(null)).toBe("");
    expect(messagePreview({ body: " hi " })).toBe("hi");
    expect(messagePreview({ body: "", attachment: { mimetype: "image/png", name: "a.png" } })).toBe("📷 Photo");
    expect(messagePreview({ body: "", attachment: { mimetype: "application/pdf", name: "a.pdf" } })).toBe("📎 a.pdf");
  });
});

import { replyPreview } from "./chat";

describe("replyPreview", () => {
  test("original unavailable", () => {
    expect(replyPreview(null)).toEqual({ name: "", text: "Original message unavailable", missing: true });
  });
  test("body wins, else attachment name", () => {
    expect(replyPreview({ body: " hi ", sender: { name: "A" } })).toEqual({ name: "A", text: "hi", missing: false });
    expect(replyPreview({ body: "", attachment_name: "a.pdf", sender: { name: "A" } }).text).toBe("📎 a.pdf");
  });
});

import { readDraftBody, writeDraftBody } from "./chat";

describe("chat draft persistence", () => {
  beforeEach(() => window.localStorage.clear());

  test("round-trips through localStorage", () => {
    expect(readDraftBody()).toBe("");
    writeDraftBody("hello");
    expect(readDraftBody()).toBe("hello");
    writeDraftBody("");
    expect(readDraftBody()).toBe("");
  });
});
