import { useCallback, useEffect, useRef, useState } from "react";
import { getChatMessages, sendChatMessage } from "../api/chat";
import {
  CHAT_POLL_INTERVAL_MS,
  maxMessageId,
  mergeMessages,
  minMessageId,
} from "../utils/chat";

const PAGE_SIZE = 50;

export const useChat = (enabled) => {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef([]);
  const pollingRef = useRef(false);

  const apply = useCallback((updater) => {
    const next = updater(messagesRef.current);
    messagesRef.current = next;
    setMessages(next);
  }, []);

  // Latest page
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    getChatMessages({ limit: PAGE_SIZE })
      .then(({ messages: list, hasMore: more }) => {
        if (cancelled) return;
        apply(() => mergeMessages([], list));
        setHasMore(more);
        setError("");
      })
      .catch((err) => !cancelled && setError(err.message || "Failed to load messages"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [enabled, apply]);

  // New messages
  useEffect(() => {
    if (!enabled || loading) return undefined;
    const poll = async () => {
      if (pollingRef.current || document.hidden) return;
      pollingRef.current = true;
      try {
        const { messages: list } = await getChatMessages({
          afterId: maxMessageId(messagesRef.current),
        });
        if (list.length) apply((prev) => mergeMessages(prev, list));
      } catch (err) {
        // transient poll failures are ignored; the next tick retries
      } finally {
        pollingRef.current = false;
      }
    };
    const timer = setInterval(poll, CHAT_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, loading, apply]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return false;
    setLoadingOlder(true);
    try {
      const { messages: list, hasMore: more } = await getChatMessages({
        limit: PAGE_SIZE,
        beforeId: minMessageId(messagesRef.current),
      });
      apply((prev) => mergeMessages(prev, list));
      setHasMore(more);
      return true;
    } catch (err) {
      setError(err.message || "Failed to load older messages");
      return false;
    } finally {
      setLoadingOlder(false);
    }
  }, [apply, hasMore, loadingOlder]);

  const send = useCallback(
    async (payload) => {
      const message = await sendChatMessage(payload);
      if (message) apply((prev) => mergeMessages(prev, [message]));
      return message;
    },
    [apply]
  );

  return { messages, hasMore, loading, loadingOlder, error, loadOlder, send };
};

export default useChat;
