const hasText = (value) => value != null && String(value).trim() !== "";

const maxFilledIndex = (data, prefix, first, last, min) => {
  let max = min;
  for (let i = first; i <= last; i += 1) {
    if (hasText(data?.[`${prefix}${i}`])) max = i;
  }
  return max;
};

/**
 * Overlay a Customer or Vendor registration draft on the freshly loaded form state.
 * Uploads are never stored, so attachments stay empty; existing attachments come from the fresh record.
 */
export function applyRegistrationDraft(prevFormData, formState) {
  const draftForm = formState?.formData;
  if (!draftForm || typeof draftForm !== "object") return null;
  const formData = {
    ...prevFormData,
    ...draftForm,
    attachments: [],
    attachment_to_delete: Array.isArray(draftForm.attachment_to_delete) ? draftForm.attachment_to_delete : [],
    existingAttachments: prevFormData?.existingAttachments || [],
  };
  const peopleRows = Array.isArray(formState?.peopleRows)
    ? formState.peopleRows.map((row) => ({
        ...row,
        attachments: [],
        attachment_to_delete: Array.isArray(row?.attachment_to_delete) ? row.attachment_to_delete : [],
        existingAttachments: Array.isArray(row?.existingAttachments) ? row.existingAttachments : [],
      }))
    : [];
  return {
    formData,
    peopleRows,
    cneeRows: Array.isArray(formState?.cneeRows) && formState.cneeRows.length > 0 ? formState.cneeRows : null,
    visibleAddressFields: maxFilledIndex(formData, "street", 3, 7, 2),
    visibleVesselTypeFields: maxFilledIndex(formData, "vessel_type", 2, 3, 1),
  };
}
