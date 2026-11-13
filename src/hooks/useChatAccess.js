import { useEffect, useState } from "react";
import { getChatMe } from "../api/chat";

// One /api/chat/me call per page load, shared by the sidebar and the chat page
let mePromise = null;

const loadMe = () => {
  if (!mePromise) {
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
