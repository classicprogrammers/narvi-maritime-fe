import React from "react";
import { VStack, HStack, Text, IconButton, Button, Icon } from "@chakra-ui/react";
import { MdVisibility, MdDownload } from "react-icons/md";
import {
    getAttachmentEntriesNewestFirst,
    partitionAttachmentsList,
} from "../../utils/stockReportAttachmentsUi";
import { normalizeLegacyStockReportFilename } from "../../utils/stockReportPdf";

/**
 * Files column for stock list tables: other attachments + latest status report;
 * link opens modal for older status reports.
 */
export default function StockListAttachmentsCell({
    attachments,
    stockItemId,
    onViewFile,
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
        const entries = getAttachmentEntriesNewestFirst(list);
        latestReport = entries[0] ?? null;
        olderReports = entries.slice(1);
    } else {
        const partitioned = partitionAttachmentsList(list);
        nonReportAttachments = partitioned.nonReportAttachments;
        latestReport = partitioned.reportEntries[0] ?? null;
        olderReports = partitioned.reportEntries.slice(1);
    }

    const stockId = stockItemId;

    const fileLabel = (att) =>
        normalizeLegacyStockReportFilename(att.filename || att.name) || att.filename || att.name || "File";

    const renderFileRow = (att, key) => (
        <HStack key={key} spacing={1} align="center">
            <Text
                fontSize="xs"
                isTruncated
                flex={1}
                title={fileLabel(att)}
                cursor="pointer"
                color="blue.500"
                _hover={{ textDecoration: "underline" }}
                onClick={() => onViewFile(att, stockId)}
            >
                {fileLabel(att)}
            </Text>
            <IconButton
                icon={<Icon as={MdVisibility} />}
                size="xs"
                variant="ghost"
                colorScheme="blue"
                aria-label="View file"
                onClick={() => onViewFile(att, stockId)}
            />
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
