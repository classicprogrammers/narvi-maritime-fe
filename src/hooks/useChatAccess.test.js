import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { useChatAccess } from "./useChatAccess";
import { getChatMe } from "../api/chat";

jest.mock("../api/chat", () => ({
  getChatMe: jest.fn(),
}));

const Probe = () => {
  const { canChat, loading } = useChatAccess();
  return <div data-testid="probe">{loading ? "loading" : canChat ? "yes" : "no"}</div>;
};

describe("useChatAccess", () => {
  beforeEach(() => {
    localStorage.clear();
    getChatMe.mockReset();
  });

  afterEach(cleanup);

  // Logging out and back in as someone else swaps admin_token in localStorage without a
  // full page reload. If the /api/chat/me result is cached regardless of the token, the
  // navbar icon would keep showing the previous user's permission until a hard refresh —
  // this is exactly the bug report ("I have to refresh after logging in").
  test("re-fetches instead of serving a stale result when the token changes", async () => {
    localStorage.setItem("admin_token", "token-a");
    getChatMe.mockResolvedValueOnce({ status: "success", can_chat: false });

    const { unmount } = render(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("no"));
    unmount();

    localStorage.setItem("admin_token", "token-b");
    getChatMe.mockResolvedValueOnce({ status: "success", can_chat: true });

    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("yes"));

    expect(getChatMe).toHaveBeenCalledTimes(2);
  });

  test("does not re-fetch on every mount while the token stays the same", async () => {
    localStorage.setItem("admin_token", "token-a");
    getChatMe.mockResolvedValue({ status: "success", can_chat: true });

    const { unmount } = render(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("yes"));
    unmount();

    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("yes"));

    expect(getChatMe).toHaveBeenCalledTimes(1);
  });
});
