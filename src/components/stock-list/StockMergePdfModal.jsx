import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Tag,
  Text,
  useToast,
} from "@chakra-ui/react";
import { getStockListMergePdf } from "api/mergePdf";
import { getDocumentTypes } from "api/attachments";
import { DEFAULT_DOCUMENT_TYPES, fileTypeLabel } from "utils/documentTypes";
import { mergeFilename, normalizeMergePreview, pickAttachmentIds } from "utils/mergePdf";

// Merged PDF of the selected stock items. Shows the files the preset would merge (preview=true) so
// the user can untick some, then downloads the merged PDF built on request by the server.
// preset: "cipl" (no Stock Report / MSDS) | "all"
export default function StockMergePdfModal({ isOpen, onClose, ids, preset, title }) {
  const toast = useToast();
  const [preview, setPreview] = useState(null);
  const [ticked, setTicked] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [types, setTypes] = useState(DEFAULT_DOCUMENT_TYPES);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setPreview(null);
    setError("");
    setIsLoading(true);
    getStockListMergePdf({ ids, preset, preview: true })
      .then((data) => {
        if (cancelled) return;
        const result = normalizeMergePreview(data);
        setPreview(result);
        setTicked(new Set(result.included.map((f) => f.attachment_id)));
      })
      .catch((err) => !cancelled && setError(err?.message || "Failed to load the file list"))
      .finally(() => !cancelled && setIsLoading(false));
    getDocumentTypes()
      .then((list) => !cancelled && list.length && setTypes(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preset, ids.join(",")]);

  const toggle = (id) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const attachmentIds = pickAttachmentIds(preview.included, ticked);
      const { blob } = await getStockListMergePdf({ ids, preset, attachmentIds, download: true });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = mergeFilename(preset === "cipl" ? "cipl" : "merged");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      toast({ title: "Download failed", description: err?.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Flex justify="center" py={8}>
              <Spinner />
            </Flex>
          ) : error ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : preview ? (
            <>
              <Text fontSize="sm" mb={3}>
                {ids.length} item(s): {ticked.size} of {preview.fileCount} PDF file(s) will be merged
                {preview.pageCount ? ` (${preview.pageCount} pages in total)` : ""}. Untick a file to leave it out.
              </Text>
              {preview.included.map((file) => (
                <Flex key={file.attachment_id} align="center" gap={3} py={1}>
                  <Checkbox isChecked={ticked.has(file.attachment_id)} onChange={() => toggle(file.attachment_id)} />
                  <Text fontSize="sm" flex="1" noOfLines={1} title={file.filename}>
                    {file.filename}
                  </Text>
                  <Tag size="sm">{fileTypeLabel(file, types)}</Tag>
                  <Text fontSize="xs" color="gray.500" minW="56px" textAlign="right">
                    {file.pages != null ? `${file.pages} p.` : ""}
                  </Text>
                </Flex>
              ))}
              {preview.included.length === 0 && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  No PDF files to merge for the selected items.
                </Alert>
              )}
              {preview.skipped.length > 0 && (
                <Box mt={4}>
                  <Text fontSize="sm" fontWeight="600" mb={1}>
                    Skipped ({preview.skipped.length})
                  </Text>
                  {preview.skipped.map((file, index) => (
                    <Text key={`${file.filename}-${index}`} fontSize="xs" color="gray.500">
                      {file.filename}: {file.reason}
                    </Text>
                  ))}
                </Box>
              )}
            </>
          ) : null}
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleDownload}
            isLoading={isDownloading}
            isDisabled={!preview || ticked.size === 0}
          >
            Download PDF
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
