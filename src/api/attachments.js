import api from "./axios";
import { getApiEndpoint } from "../config/api";
import { normalizeDocumentTypes } from "../utils/documentTypes";

const unwrapError = (data, fallback) => {
  if (data?.result?.status === "error") throw new Error(data.result.message || fallback);
  if (data?.status === "error") throw new Error(data.message || fallback);
};

// GET /api/attachment/document-types -> [{ value, label }]
export const getDocumentTypes = async () => {
  const response = await api.get(getApiEndpoint("ATTACHMENT_DOCUMENT_TYPES"));
  const data = response.data || response;
  unwrapError(data, "Failed to load document types");
  return normalizeDocumentTypes(data);
};

// POST /api/attachment/document-type: one file, or several via { items }. Works on stock item, SO and invoice files.
export const setAttachmentDocumentType = async (attachmentId, documentType) => {
  const response = await api.post(getApiEndpoint("ATTACHMENT_DOCUMENT_TYPE"), {
    attachment_id: attachmentId,
    document_type: documentType,
  });
  const data = response.data || response;
  unwrapError(data, "Failed to change the document type");
  return data;
};

export const setAttachmentDocumentTypes = async (items) => {
  const response = await api.post(getApiEndpoint("ATTACHMENT_DOCUMENT_TYPE"), { items });
  const data = response.data || response;
  unwrapError(data, "Failed to change the document types");
  return data;
};

export default { getDocumentTypes, setAttachmentDocumentType, setAttachmentDocumentTypes };
