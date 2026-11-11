import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@chakra-ui/react";
import { hydrateDrafts, clearDraftsMemory } from "redux/slices/draftsSlice";
import { draftStorageKey, readDrafts, writeDrafts } from "utils/draftStorage";

/**
 * Keeps the drafts slice in sync with localStorage `drafts:<userId>`.
 * Mount once in the admin layout.
 */
export function useDraftsSync() {
  const dispatch = useDispatch();
  const toast = useToast();
  const userId = useSelector((state) => state.user?.user?.id ?? null);
  const draftsUserId = useSelector((state) => state.drafts.userId);
  const hydrated = useSelector((state) => state.drafts.hydrated);
  const items = useSelector((state) => state.drafts.items);

  // Last JSON known to match storage. Stops hydrate -> write -> storage event ping-pong between tabs.
  const syncedJsonRef = useRef(null);
  const warnedRef = useRef(false);

  // Hydrate when the user changes; clear memory (not localStorage) on logout
  useEffect(() => {
    if (userId === null || userId === undefined || userId === "") {
      syncedJsonRef.current = null;
      dispatch(clearDraftsMemory());
      return;
    }
    const stored = readDrafts(userId);
    syncedJsonRef.current = JSON.stringify(stored);
    dispatch(hydrateDrafts({ userId, items: stored }));
  }, [userId, dispatch]);

  // Write after changes
  useEffect(() => {
    if (userId === null || userId === undefined || userId === "") return;
    if (!hydrated || draftsUserId !== userId) return;
    const json = JSON.stringify(items);
    if (json === syncedJsonRef.current) return;
    const result = writeDrafts(userId, items);
    if (result.ok) {
      syncedJsonRef.current = json;
      warnedRef.current = false;
      return;
    }
    // Keep the drafts in memory; tell the user once until a write succeeds again
    if (!warnedRef.current) {
      warnedRef.current = true;
      toast({
        id: "draft-storage-full",
        title: "Draft could not be stored (browser storage full)",
        status: "warning",
        duration: 6000,
        isClosable: true,
      });
    }
  }, [userId, draftsUserId, hydrated, items, toast]);

  // Re-hydrate when another tab changes this user's drafts
  useEffect(() => {
    if (userId === null || userId === undefined || userId === "") return undefined;
    const onStorage = (event) => {
      if (event.key !== null && event.key !== draftStorageKey(userId)) return;
      const stored = readDrafts(userId);
      syncedJsonRef.current = JSON.stringify(stored);
      dispatch(hydrateDrafts({ userId, items: stored }));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId, dispatch]);
}

export default useDraftsSync;
