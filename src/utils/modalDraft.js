/**
 * Decide what Resume does for a list-page modal draft (formState = { formData, editingId }).
 * `apply` carries the form values and the list item being edited (null for create);
 * `missing` means the edited record is not in the loaded list any more (the draft is kept).
 */
export function resolveModalDraft(draft, items) {
  const formData = draft?.formState?.formData;
  if (!formData || typeof formData !== "object") return { status: "none" };
  const editingId = draft.formState.editingId ?? null;
  if (editingId === null || editingId === "") return { status: "apply", formData, item: null };
  const item = (Array.isArray(items) ? items : []).find(
    (entry) => entry != null && String(entry.id) === String(editingId)
  );
  return item ? { status: "apply", formData, item } : { status: "missing" };
}

const SECRET_FIELDS = ["password", "confirm_password", "new_password", "newPassword"];

/**
 * Copy of a form object without password fields. Used for Users / Client access drafts so the
 * stored form state never holds a password (not even an empty one) and only a password in the
 * request payload marks the draft as not retryable.
 */
export function omitSecretFields(formData) {
  const out = { ...(formData || {}) };
  SECRET_FIELDS.forEach((field) => delete out[field]);
  return out;
}

/** formState stored for a modal draft: the form values plus the id of the record being edited. */
export function buildModalFormState(formData, editingItem) {
  return { formData, editingId: editingItem?.id ?? null };
}
