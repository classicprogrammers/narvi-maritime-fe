import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { MdAttachFile, MdClose as MdRemove, MdDownload } from "react-icons/md";
import { downloadShippingOrderAttachmentApi } from "../../api/shippingOrders";
import {
  filesToShippingAttachments,
  resolveShippingOrderDownloadFilename,
} from "../../utils/shippingOrderAttachments";

/**
 * CIPL form report upload for shipping order create/edit forms.
 * Expects formData: { cipl_files, existingCiplFiles, cipl_files_to_delete, id? }
 */
export default function ShippingOrderCiplFilesField({
  formData,
  setFormData,
  orderId = null,
}) {
  const toast = useToast();
  const [loadingFileId, setLoadingFileId] = useState(null);
  const resolvedOrderId = orderId ?? formData?.id ?? null;

  const existing = formData?.existingCiplFiles || [];
  const pending = (formData?.cipl_files || []).filter(
    (att) => att && att.datas != null && String(att.datas).trim() !== ""
  );

  const handleUpload = async (fileList) => {
    if (!fileList?.length) return;
    const invalid = Array.from(fileList).some(
      (file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
    );
    if (invalid) {
      toast({
        title: "PDF only",
        description: "CIPL form report must be a PDF file.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    try {
      const newFiles = await filesToShippingAttachments(fileList);
      setFormData((prev) => ({
        ...prev,
        cipl_files: [...(prev.cipl_files || []), ...newFiles],
      }));
    } catch (err) {
      console.error("CIPL file upload:", err);
      toast({
        title: "Upload failed",
        description: err?.message || "Could not read file(s).",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRemovePending = (index) => {
    setFormData((prev) => ({
      ...prev,
      cipl_files: (prev.cipl_files || []).filter((_, i) => i !== index),
    }));
  };

  const handleDeleteExisting = (fileId) => {
    setFormData((prev) => ({
      ...prev,
      existingCiplFiles: (prev.existingCiplFiles || []).filter(
        (att) => att.id !== fileId
      ),
      cipl_files_to_delete: [...(prev.cipl_files_to_delete || []), fileId],
    }));
  };

  const triggerBlobDownload = (blob, filename) => {
    const fileUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(fileUrl);
  };

  const handleDownload = async (att) => {
    const displayName = att.filename || att.name || "cipl.pdf";

    if (!resolvedOrderId || !att.id) {
      if (att.datas) {
        const mimeType = att.mimetype || "application/pdf";
        const byteCharacters = atob(att.datas);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
        triggerBlobDownload(blob, displayName);
        return;
      }
      toast({
        title: "Cannot download",
        description: "Save the order first to download this file.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoadingFileId(att.id);
      const response = await downloadShippingOrderAttachmentApi(resolvedOrderId, att.id, true);
      if (response?.data instanceof Blob) {
        const filename = resolveShippingOrderDownloadFilename(att, response);
        triggerBlobDownload(response.data, filename);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err?.message || "Failed to download file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingFileId(null);
    }
  };

  const renderFileRow = (att, key, { onRemove }) => (
    <Flex key={key} align="center" justify="space-between" fontSize="sm" gap={1}>
      <Text isTruncated flex={1} title={att.filename || att.name}>
        {att.filename || att.name || "CIPL PDF"}
      </Text>
      <HStack spacing={0}>
        <IconButton
          aria-label="Download CIPL file"
          icon={<Icon as={MdDownload} />}
          size="xs"
          variant="ghost"
          colorScheme="green"
          isLoading={loadingFileId === att.id}
          onClick={() => handleDownload(att)}
        />
        <IconButton
          aria-label="Remove CIPL file"
          icon={<Icon as={MdRemove} />}
          size="xs"
          variant="ghost"
          colorScheme="red"
          onClick={onRemove}
        />
      </HStack>
    </Flex>
  );

  return (
    <Box>
      <FormControl>
        <FormLabel>CIPL Form Report (PDF)</FormLabel>
        <Text fontSize="xs" color="gray.500" mb={2}>
          Upload the CIPL form PDF used when generating the shipping package link.
        </Text>
        <VStack spacing={2} align="stretch">
          <Input
            type="file"
            multiple
            accept="application/pdf,.pdf"
            display="none"
            id="shipping-order-cipl-file-upload"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <label htmlFor="shipping-order-cipl-file-upload">
            <Button
              as="span"
              size="sm"
              variant="outline"
              colorScheme="blue"
              leftIcon={<Icon as={MdAttachFile} />}
              cursor="pointer"
              w="100%"
            >
              Upload CIPL PDF
            </Button>
          </label>
          {existing.map((att) =>
            renderFileRow(att, `existing-cipl-${att.id}`, {
              onRemove: () => handleDeleteExisting(att.id),
            })
          )}
          {pending.map((att, idx) =>
            renderFileRow(att, `pending-cipl-${idx}`, {
              onRemove: () => handleRemovePending(idx),
            })
          )}
          {existing.length === 0 && pending.length === 0 && (
            <Text fontSize="xs" color="gray.500">
              No CIPL file uploaded
            </Text>
          )}
        </VStack>
      </FormControl>
    </Box>
  );
}
