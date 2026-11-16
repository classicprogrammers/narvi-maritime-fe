import { useEffect, useState } from "react";
import { getChatMe } from "../api/chat";
import { getCurrentStoredToken } from "../utils/authStorage";

// Cached /api/chat/me call, shared by the navbar icon and the chat page, keyed by the
// current token. Without the key, logging out and back in as someone else in the same
// tab (no full page reload) would keep serving the previous user's cached permission —
// that's the "I have to refresh after logging in" bug.
let cachedToken = null;
let mePromise = null;

const loadMe = () => {
  const token = getCurrentStoredToken();
  if (!mePromise || token !== cachedToken) {
    cachedToken = token;
    mePromise = getChatMe().catch((err) => {
      mePromise = null;
      throw err;
    });
  }
  return mePromise;
};

export const useChatAccess = (enabled = true) => {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    loadMe()
      .then((data) => !cancelled && setMe(data))
      .catch(() => !cancelled && setMe(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { me, canChat: Boolean(me?.can_chat), loading };
};

export default useChatAccess;
