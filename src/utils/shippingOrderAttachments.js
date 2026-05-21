/**
 * Shipping order file attachments (create/update payloads and save responses).
 */

/** Parse filename from Content-Disposition (quoted, unquoted, UTF-8). */
export function parseContentDispositionFilename(header) {
  if (!header || typeof header !== "string") return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1].trim();
  const unquoted = header.match(/filename=([^;\s]+)/i);
  if (unquoted?.[1]) return unquoted[1].replace(/"/g, "").trim();
  return null;
}

/** Prefer attachment metadata name; fall back to response header. */
export function resolveShippingOrderDownloadFilename(attachment, response) {
  const fromMeta = attachment?.filename || attachment?.name;
  if (fromMeta && String(fromMeta).trim()) return String(fromMeta).trim();
  const fromHeader = parseContentDispositionFilename(response?.filename);
  if (fromHeader) return fromHeader;
  return "download";
}

/** Map API attachment metadata for form state. */
export function mapExistingAttachmentsFromOrder(order = {}) {
  const list = Array.isArray(order.attachments) ? order.attachments : [];
  return list
    .filter((att) => att && att.id != null)
    .map((att) => ({
      id: att.id,
      filename: att.filename || att.name || `File ${att.id}`,
      mimetype: att.mimetype || "application/octet-stream",
      file_size: att.file_size,
      url: att.url,
      download_url: att.download_url,
    }));
}

/** Read FileList into API attachment objects. */
export function filesToShippingAttachments(files) {
  const fileArray = Array.from(files || []);
  return Promise.all(
    fileArray.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result || "";
            const base64data =
              typeof result === "string" && result.includes(",")
                ? result.split(",")[1]
                : result;
            resolve({
              filename: file.name,
              datas: base64data,
              mimetype: file.type || "application/octet-stream",
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

/** Attach pending uploads and deletions to create/update payload. */
export function applyShippingOrderAttachmentsToPayload(payload, formData = {}) {
  if (!payload || !formData) return payload;
  if (Array.isArray(formData.attachments) && formData.attachments.length > 0) {
    payload.attachments = formData.attachments;
  }
  if (
    Array.isArray(formData.attachment_to_delete) &&
    formData.attachment_to_delete.length > 0
  ) {
    payload.attachment_to_delete = formData.attachment_to_delete;
  }
  return payload;
}

/** Toast helper for success / partial_success after create or update. */
export function notifyShippingOrderSaveResult(response, toast, { created = false } = {}) {
  const data = response?.result && typeof response.result === "object" ? response.result : response;
  const status = data?.status || response?.status;
  const createdCount = data?.attachments_created ?? response?.attachments_created;
  const errors = data?.attachment_errors || response?.attachment_errors || [];

  if (status === "partial_success") {
    const errText = Array.isArray(errors) && errors.length ? errors.join("; ") : "";
    toast({
      title: created ? "SO created with attachment warnings" : "SO saved with attachment warnings",
      description:
        errText ||
        (createdCount != null
          ? `${createdCount} file(s) attached. Some uploads may have failed.`
          : "Some file uploads failed."),
      status: "warning",
      duration: 8000,
      isClosable: true,
    });
    return { ok: true, partial: true };
  }

  if (status === "success" || status === undefined) {
    if (createdCount > 0) {
      toast({
        title: created ? "SO created" : "SO updated",
        description: `${createdCount} file(s) attached.`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      return { ok: true, partial: false };
    }
    return { ok: true, partial: false, silent: true };
  }

  return { ok: false, partial: false };
}
