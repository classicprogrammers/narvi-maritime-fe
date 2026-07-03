import {
    downloadStockItemAttachmentApi,
    getStockItemAttachmentsApi,
} from "../api/stock";

export function getStockAttachmentLabel(att) {
    return att?.filename || att?.name || "File";
}

export function getStockAttachmentMimeType(att) {
    const name = getStockAttachmentLabel(att);
    const fromField = att?.mimetype || att?.type;
    if (fromField) return fromField;
    if (/\.(jpe?g|png|gif|webp)$/i.test(name)) return "image/jpeg";
    if (/\.pdf$/i.test(name)) return "application/pdf";
    return "application/octet-stream";
}

export function isPreviewableInBrowser(mimeType) {
    return String(mimeType || "").startsWith("image/") || mimeType === "application/pdf";
}

function base64ToBlobUrl(base64Data, mimeType) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
}

async function resolveFromLegacyAttachmentsApi(attachment, stockItemId) {
    const response = await getStockItemAttachmentsApi(stockItemId);
    let attachmentData = null;

    if (response.data instanceof Blob) {
        const mimeType = response.type || attachment.mimetype || "application/octet-stream";
        return {
            fileUrl: URL.createObjectURL(response.data),
            mimeType,
            filename: getStockAttachmentLabel(attachment),
            shouldRevoke: true,
        };
    }

    if (response.result?.attachments && Array.isArray(response.result.attachments)) {
        attachmentData = attachment.id
            ? response.result.attachments.find((att) => att.id === attachment.id)
            : response.result.attachments[0];
    } else if (response.attachments && Array.isArray(response.attachments)) {
        attachmentData = attachment.id
            ? response.attachments.find((att) => att.id === attachment.id)
            : response.attachments[0];
    } else if (response.result?.data) {
        attachmentData = response.result.data;
    } else if (response.data && !(response.data instanceof Blob)) {
        attachmentData = response.data;
    }

    if (!attachmentData) {
        throw new Error("Attachment not found in API response");
    }

    if (attachmentData.datas) {
        const mimeType = attachmentData.mimetype || attachment.mimetype || "application/octet-stream";
        return {
            fileUrl: base64ToBlobUrl(attachmentData.datas, mimeType),
            mimeType,
            filename: getStockAttachmentLabel(attachmentData),
            shouldRevoke: true,
        };
    }

    if (attachmentData.url && !attachmentData.url.includes("/api/stock/list/")) {
        return {
            fileUrl: attachmentData.url,
            mimeType: getStockAttachmentMimeType(attachmentData),
            filename: getStockAttachmentLabel(attachmentData),
            shouldRevoke: false,
        };
    }

    if (attachmentData.file || attachmentData.blob) {
        const file = attachmentData.file || attachmentData.blob;
        return {
            fileUrl: URL.createObjectURL(file),
            mimeType: getStockAttachmentMimeType(attachmentData),
            filename: getStockAttachmentLabel(attachmentData),
            shouldRevoke: true,
        };
    }

    throw new Error("Attachment data format not supported");
}

/** Resolve a stock attachment to a URL suitable for iframe/img preview. */
export async function resolveStockAttachmentPreviewUrl(attachment, stockItemId = null) {
    if (!attachment) {
        throw new Error("No attachment provided");
    }

    if (attachment instanceof File || attachment instanceof Blob) {
        const mimeType = attachment.type || "application/octet-stream";
        return {
            fileUrl: URL.createObjectURL(attachment),
            mimeType,
            filename: attachment.name || "File",
            shouldRevoke: true,
        };
    }

    if (stockItemId && attachment.id) {
        const response = await downloadStockItemAttachmentApi(stockItemId, attachment.id, false);
        if (response.data instanceof Blob) {
            const mimeType = response.type || attachment.mimetype || "application/octet-stream";
            return {
                fileUrl: URL.createObjectURL(response.data),
                mimeType,
                filename: getStockAttachmentLabel(attachment),
                shouldRevoke: true,
            };
        }
        throw new Error("Invalid response format from server");
    }

    if (
        attachment.url
        && attachment.url.includes("/api/stock/list/")
        && attachment.url.includes("/attachments")
    ) {
        let stockId = stockItemId;
        if (!stockId) {
            const urlMatch = attachment.url.match(/\/api\/stock\/list\/(\d+)\/attachments/);
            if (urlMatch?.[1]) stockId = urlMatch[1];
        }
        if (!stockId) {
            throw new Error("Unable to determine stock item ID from attachment URL");
        }
        return resolveFromLegacyAttachmentsApi(attachment, stockId);
    }

    if (attachment.datas) {
        const mimeType = getStockAttachmentMimeType(attachment);
        return {
            fileUrl: base64ToBlobUrl(attachment.datas, mimeType),
            mimeType,
            filename: getStockAttachmentLabel(attachment),
            shouldRevoke: true,
        };
    }

    if (attachment.url) {
        return {
            fileUrl: attachment.url,
            mimeType: getStockAttachmentMimeType(attachment),
            filename: getStockAttachmentLabel(attachment),
            shouldRevoke: false,
        };
    }

    if (attachment.id) {
        const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "";
        return {
            fileUrl: `${baseUrl}/web/content/${attachment.id}`,
            mimeType: getStockAttachmentMimeType(attachment),
            filename: getStockAttachmentLabel(attachment),
            shouldRevoke: false,
        };
    }

    if (attachment.path) {
        return {
            fileUrl: attachment.path,
            mimeType: getStockAttachmentMimeType(attachment),
            filename: getStockAttachmentLabel(attachment),
            shouldRevoke: false,
        };
    }

    throw new Error("Unable to preview file. File data not available.");
}
