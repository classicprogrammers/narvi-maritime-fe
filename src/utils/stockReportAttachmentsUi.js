/**
 * Helpers for listing auto-generated stock status report PDFs alongside other row attachments.
 */

export function isStockReportFilename(name) {
    const n = String(name || "")
        .toLowerCase()
        .trim();
    if (!n.endsWith(".pdf")) return false;
    if (n.startsWith("stock-report")) return true;
    const base = n.replace(/\.pdf$/i, "");
    return /^sl\d+(\s+\+\s+.+)?(-\d{10,})?$/i.test(base);
}

export function isStockReportAttachment(att) {
    return isStockReportFilename(att?.filename || att?.name);
}

/** Higher = newer (timestamp suffix from status-change PDFs, else server id). */
export function rankStockReportAttachment(att) {
    const name = String(att?.filename || att?.name || "");
    const m = name.match(/-(\d{10,})\.pdf$/i);
    if (m) return parseInt(m[1], 10);
    if (att?.id != null && !Number.isNaN(Number(att.id))) return Number(att.id);
    return 0;
}

/**
 * Stock report PDF rows for a form row, newest first.
 * @returns {Array<{ att: object, source: 'existing'|'new', id?: string|number, newIndex?: number }>}
 */
export function getStockReportEntriesFromRow(row) {
    const existing = row.existingAttachments || [];
    const pending = row.attachments || [];

    const entries = [
        ...existing.filter(isStockReportAttachment).map((att) => ({ att, source: "existing", id: att.id })),
        ...pending
            .map((att, newIndex) => (isStockReportAttachment(att) ? { att, source: "new", newIndex } : null))
            .filter(Boolean),
    ];
    entries.sort((a, b) => rankStockReportAttachment(b.att) - rankStockReportAttachment(a.att));
    return entries;
}

/**
 * Split row attachments into non–stock-report files vs stock report entries (newest first).
 */
export function partitionAttachmentsRow(row) {
    const existing = row.existingAttachments || [];
    const pending = row.attachments || [];
    const nonReportExisting = existing.filter((a) => !isStockReportAttachment(a));
    const nonReportPending = pending
        .map((att, newIndex) => ({ att, newIndex }))
        .filter(({ att }) => !isStockReportAttachment(att));
    const reportEntries = getStockReportEntriesFromRow(row);
    return { nonReportExisting, nonReportPending, reportEntries };
}

/**
 * Stock report entries from a saved stock list item's attachments array (newest first).
 * @returns {Array<{ att: object, source: 'saved', id?: string|number }>}
 */
export function getStockReportEntriesFromAttachments(attachments) {
    const list = Array.isArray(attachments) ? attachments : [];
    return list
        .filter(isStockReportAttachment)
        .map((att) => ({ att, source: "saved", id: att.id }))
        .sort((a, b) => rankStockReportAttachment(b.att) - rankStockReportAttachment(a.att));
}

/** Newest-first stock report PDFs from API attachment metadata on a list/detail item. */
export function getStockReportAttachmentsFromList(attachments) {
    return getStockReportEntriesFromAttachments(attachments).map((entry) => entry.att);
}

/** Split saved attachments (list/detail views) into other files vs status reports. */
export function partitionAttachmentsList(attachments) {
    const list = Array.isArray(attachments) ? attachments : [];
    return {
        nonReportAttachments: list.filter((a) => !isStockReportAttachment(a)),
        reportEntries: getStockReportEntriesFromAttachments(attachments),
    };
}

/** All attachments newest first (client portal — any file type from API). */
export function getAttachmentEntriesNewestFirst(attachments) {
    const list = Array.isArray(attachments) ? attachments : [];
    return [...list]
        .sort((a, b) => {
            const rankA = rankStockReportAttachment(a) || Number(a.id) || 0;
            const rankB = rankStockReportAttachment(b) || Number(b.id) || 0;
            return rankB - rankA;
        })
        .map((att) => ({ att, source: "saved", id: att.id }));
}

/** Filenames shown inline in tables/exports (other files + latest status report only). */
export function getInlineAttachmentDisplayNames(attachments) {
    const { nonReportAttachments, reportEntries } = partitionAttachmentsList(attachments);
    return [
        ...nonReportAttachments.map((a) => a.filename || a.name),
        ...(reportEntries[0] ? [reportEntries[0].att.filename || reportEntries[0].att.name] : []),
    ].filter(Boolean);
}
