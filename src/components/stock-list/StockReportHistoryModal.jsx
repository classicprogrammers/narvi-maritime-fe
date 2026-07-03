import React from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Flex,
    Text,
    IconButton,
    HStack,
    VStack,
    Button,
    Icon,
} from "@chakra-ui/react";
import { MdRemove, MdDownload, MdVisibility } from "react-icons/md";
import { normalizeLegacyStockReportFilename } from "../../utils/stockReportPdf";

/**
 * Lists older auto-generated status report PDFs (newest-latest is shown inline on the row).
 */
export default function StockReportHistoryModal({
    isOpen,
    onClose,
    title = "Previous status reports",
    entries = [],
    rowIndex,
    stockItemId = null,
    showFileActions = false,
    allowDelete = true,
    onPreviewAll,
    onDownloadFile,
    onDeleteExisting,
    onDeletePending,
}) {
    const canDownloadSaved = (entry) =>
        (entry.source === "existing" || entry.source === "saved") && stockItemId && entry.att?.id;

    const previewAttachments = entries.map((entry) => entry.att).filter(Boolean);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{title}</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {entries.length === 0 ? (
                        <Text fontSize="sm" color="gray.500">
                            No previous status reports.
                        </Text>
                    ) : (
                        <VStack spacing={2} align="stretch">
                            {showFileActions && onPreviewAll && previewAttachments.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    colorScheme="blue"
                                    leftIcon={<Icon as={MdVisibility} />}
                                    onClick={() => onPreviewAll(previewAttachments, stockItemId, 0)}
                                >
                                    Preview all ({previewAttachments.length})
                                </Button>
                            )}
                            {entries.map((entry, idx) => {
                                const att = entry.att;
                                const key =
                                    entry.source === "existing"
                                        ? `existing-${entry.id ?? idx}`
                                        : entry.source === "saved"
                                          ? `saved-${entry.id ?? idx}`
                                          : `new-${entry.newIndex ?? idx}`;
                                const label =
                                    normalizeLegacyStockReportFilename(att.filename || att.name) ||
                                    att.filename ||
                                    att.name ||
                                    `Report ${idx + 1}`;
                                return (
                                    <Flex
                                        key={key}
                                        align="center"
                                        justify="space-between"
                                        fontSize="sm"
                                        gap={2}
                                        py={1}
                                    >
                                        <Text isTruncated flex={1} title={label}>
                                            {label}
                                        </Text>
                                        <HStack spacing={0} flexShrink={0}>
                                            {showFileActions && onDownloadFile && canDownloadSaved(entry) && (
                                                <IconButton
                                                    aria-label="Download file"
                                                    icon={<Icon as={MdDownload} />}
                                                    size="xs"
                                                    variant="ghost"
                                                    colorScheme="green"
                                                    onClick={() => onDownloadFile(att, stockItemId)}
                                                />
                                            )}
                                            {allowDelete !== false && onDeleteExisting && onDeletePending && (
                                                <IconButton
                                                    aria-label="Remove report"
                                                    icon={<Icon as={MdRemove} />}
                                                    size="xs"
                                                    variant="ghost"
                                                    colorScheme="red"
                                                    onClick={() =>
                                                        entry.source === "existing"
                                                            ? onDeleteExisting(rowIndex, entry.id)
                                                            : onDeletePending(rowIndex, entry.newIndex)
                                                    }
                                                />
                                            )}
                                        </HStack>
                                    </Flex>
                                );
                            })}
                        </VStack>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
