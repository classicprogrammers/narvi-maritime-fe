import React from "react";
import { VStack, HStack, Text, IconButton, Button, Icon } from "@chakra-ui/react";
import { MdVisibility, MdDownload } from "react-icons/md";
import {
    collectListAttachmentsForPreview,
    partitionAttachmentsList,
} from "../../utils/stockReportAttachmentsUi";
import { getStockAttachmentLabel } from "../../utils/stockAttachmentPreview";

/**
 * Files column for stock list tables: other attachments + latest status report;
 * link opens modal for older status reports.
 */
export default function StockListAttachmentsCell({
    attachments,
    stockItemId,
    onPreviewAll,
    onDownloadFile,
    onOpenPreviousReports,
    emptyLabel = "No files",
    /** "reports" = status-report PDFs only; "all" = every attachment (client API) */
    attachmentMode = "reports",
    previousLabel = "Previous status reports",
}) {
    const list = Array.isArray(attachments) ? attachments : [];
    if (list.length === 0) {
        return (
            <Text fontSize="xs" color="gray.500">
                {emptyLabel}
            </Text>
        );
    }

    let nonReportAttachments = [];
    let latestReport = null;
    let olderReports = [];

    if (attachmentMode === "all") {
        const previewItems = collectListAttachmentsForPreview(list, "all");
        latestReport = previewItems[0] ? { att: previewItems[0] } : null;
        olderReports = previewItems.slice(1).map((att, idx) => ({ att, id: att.id ?? idx }));
        nonReportAttachments = [];
    } else {
        const partitioned = partitionAttachmentsList(list);
        nonReportAttachments = partitioned.nonReportAttachments;
        latestReport = partitioned.reportEntries[0] ?? null;
        olderReports = partitioned.reportEntries.slice(1);
    }

    const stockId = stockItemId;
    const previewAttachments = collectListAttachmentsForPreview(list, attachmentMode);

    const fileLabel = (att) => getStockAttachmentLabel(att);

    const renderFileRow = (att, key) => (
        <HStack key={key} spacing={1} align="center">
            <Text
                fontSize="xs"
                isTruncated
                flex={1}
                title={fileLabel(att)}
                color="gray.700"
            >
                {fileLabel(att)}
            </Text>
            {onDownloadFile && att.id && stockId && (
                <IconButton
                    icon={<Icon as={MdDownload} />}
                    size="xs"
                    variant="ghost"
                    colorScheme="green"
                    aria-label="Download file"
                    onClick={() => onDownloadFile(att, stockId)}
                />
            )}
        </HStack>
    );

    if (nonReportAttachments.length === 0 && !latestReport) {
        return (
            <Text fontSize="xs" color="gray.500">
                {emptyLabel}
            </Text>
        );
    }

    return (
        <VStack spacing={1} align="stretch">
            {onPreviewAll && previewAttachments.length > 0 && (
                <Button
                    size="xs"
                    variant="outline"
                    colorScheme="blue"
                    leftIcon={<Icon as={MdVisibility} />}
                    w="100%"
                    onClick={() => onPreviewAll(previewAttachments, stockId, 0)}
                >
                    Preview all ({previewAttachments.length})
                </Button>
            )}
            {nonReportAttachments.map((att, idx) => renderFileRow(att, `other-${att.id ?? idx}`))}
            {latestReport && renderFileRow(latestReport.att, `latest-${latestReport.id ?? "report"}`)}
            {olderReports.length > 0 && onOpenPreviousReports && (
                <Button
                    size="xs"
                    variant="link"
                    colorScheme="blue"
                    fontWeight="normal"
                    justifyContent="flex-start"
                    h="auto"
                    py={0}
                    onClick={() => onOpenPreviousReports(olderReports, stockId)}
                >
                    {previousLabel} ({olderReports.length})
                </Button>
            )}
        </VStack>
    );
}
