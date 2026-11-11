import { useEffect, useRef, useState } from "react";
import { useToast } from "@chakra-ui/react";
import { useResumeDraft } from "hooks/useResumeDraft";
import { resolveModalDraft } from "utils/modalDraft";

/**
 * Resume for category C (list page + modal). Once the list is loaded (`ready`), calls
 * `onApply({ formData, item, draft })` to reopen the modal prefilled. `items` is the loaded list
 * (or `(draft) => list` when a page has several modals). Returns the draft that is linked to the
 * open modal (`activeDraft`, for `resolveDraftSource`); it is released when the modal closes (`isOpen`).
 */
export function useResumeModalDraft(moduleKeys, { ready, items, isOpen, onApply }) {
  const toast = useToast();
  const { draft } = useResumeDraft(moduleKeys, { ready });
  const appliedRef = useRef(false);
  const [activeDraft, setActiveDraft] = useState(null);

  useEffect(() => {
    if (!draft || appliedRef.current) return;
    appliedRef.current = true;
    const list = typeof items === "function" ? items(draft) : items;
    const resolved = resolveModalDraft(draft, list);
    if (resolved.status === "apply") {
      setActiveDraft(draft);
      onApply({ formData: resolved.formData, item: resolved.item, draft });
    } else if (resolved.status === "missing") {
      toast({
        id: "draft-resume-missing",
        title: "Record not found",
        description: "The record for this draft no longer exists. The draft was kept in Drafts.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    if (!isOpen) setActiveDraft(null);
  }, [isOpen]);

  return { activeDraft };
}

export default useResumeModalDraft;
