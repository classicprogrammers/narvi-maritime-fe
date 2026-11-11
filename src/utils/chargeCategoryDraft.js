/**
 * Request for saving the charge category modal form.
 * create: full payload. update: only the changed fields against `original` (payload is null when nothing changed).
 */
export function buildChargeCategorySave(form, original = {}) {
  const name = String(form?.name ?? "").trim();
  const sequence = form?.sequence === "" || form?.sequence == null ? undefined : Number(form.sequence);
  if (form?.id == null) {
    return {
      mode: "create",
      api: "createChargeCategoryApi",
      payload: { name, sequence, is_standard: form.is_standard, active: form.active },
    };
  }
  const changes = {};
  if (name !== (original.name || "")) changes.name = name;
  if (sequence !== undefined && sequence !== original.sequence) changes.sequence = sequence;
  if (form.is_standard !== Boolean(original.is_standard)) changes.is_standard = form.is_standard;
  if (form.active !== (original.active !== false)) changes.active = form.active;
  return {
    mode: "update",
    api: "updateChargeCategoryApi",
    payload: Object.keys(changes).length ? { id: form.id, ...changes } : null,
  };
}

/** Modal form restored from a draft's formState, or null when the draft has none. */
export function chargeCategoryFormFromDraft(formState) {
  const form = formState?.form;
  if (!form || typeof form !== "object") return null;
  return {
    id: form.id ?? null,
    name: form.name ?? "",
    code: form.code ?? "",
    sequence: form.sequence ?? "",
    is_standard: Boolean(form.is_standard),
    active: form.active !== false,
  };
}
