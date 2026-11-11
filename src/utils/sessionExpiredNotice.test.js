import {
  markSessionExpired,
  consumeSessionExpired,
  SESSION_EXPIRED_MESSAGE,
  SESSION_EXPIRED_WITH_DRAFTS_MESSAGE,
} from "./sessionExpiredNotice";

describe("sessionExpiredNotice", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when no flag is set", () => {
    expect(consumeSessionExpired()).toBeNull();
  });

  it("returns the plain message without drafts and clears the flag", () => {
    markSessionExpired();
    expect(consumeSessionExpired()).toBe(SESSION_EXPIRED_MESSAGE);
    expect(consumeSessionExpired()).toBeNull();
  });

  it("mentions Drafts when a draft is stored after the flag was set", () => {
    markSessionExpired();
    localStorage.setItem(
      "drafts:7",
      JSON.stringify({ version: 1, items: [{ id: "d1", key: "stock:new", module: "stock" }] })
    );
    expect(consumeSessionExpired()).toBe(SESSION_EXPIRED_WITH_DRAFTS_MESSAGE);
  });
});
