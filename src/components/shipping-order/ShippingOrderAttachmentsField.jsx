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
 * Files section for shipping order create/edit forms.
 * Expects formData: { attachments, existingAttachments, attachment_to_delete, id? }
 */
export default function ShippingOrderAttachmentsField({
  formData,
  setFormData,
  orderId = null,
}) {
  const toast = useToast();
  const [loadingAttachmentId, setLoadingAttachmentId] = useState(null);
  const resolvedOrderId = orderId ?? formData?.id ?? null;

  const pending = formData?.attachments || [];
  const existing = formData?.existingAttachments || [];

  const handleUpload = async (fileList) => {
    if (!fileList?.length) return;
    try {
      const newAttachments = await filesToShippingAttachments(fileList);
      setFormData((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAttachments],
      }));
    } catch (err) {
      console.error("Shipping order file upload:", err);
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
      attachments: (prev.attachments || []).filter((_, i) => i !== index),
    }));
  };

  const handleDeleteExisting = (attachmentId) => {
    setFormData((prev) => ({
      ...prev,
      existingAttachments: (prev.existingAttachments || []).filter(
        (att) => att.id !== attachmentId
      ),
      attachment_to_delete: [...(prev.attachment_to_delete || []), attachmentId],
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
    const displayName = att.filename || att.name || "download";

    if (!resolvedOrderId || !att.id) {
      if (att.datas) {
        const mimeType = att.mimetype || "application/octet-stream";
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
      setLoadingAttachmentId(att.id);
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
      setLoadingAttachmentId(null);
    }
  };

  const renderFileRow = (att, key, { onRemove }) => (
    <Flex key={key} align="center" justify="space-between" fontSize="sm" gap={1}>
      <Text isTruncated flex={1} title={att.filename || att.name}>
        {att.filename || att.name || "File"}
      </Text>
      <HStack spacing={0}>
        <IconButton
          aria-label="Download file"
          icon={<Icon as={MdDownload} />}
          size="xs"
          variant="ghost"
          colorScheme="green"
          isLoading={loadingAttachmentId === att.id}
          onClick={() => handleDownload(att)}
        />
        <IconButton
          aria-label="Remove file"
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
        <FormLabel>Files</FormLabel>
        <VStack spacing={2} align="stretch">
          <Input
            type="file"
            multiple
            accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
            display="none"
            id="shipping-order-file-upload"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <label htmlFor="shipping-order-file-upload">
            <Button
              as="span"
              size="sm"
              variant="outline"
              colorScheme="blue"
              leftIcon={<Icon as={MdAttachFile} />}
              cursor="pointer"
              w="100%"
            >
              Upload Files
            </Button>
          </label>
          {existing.map((att) =>
            renderFileRow(att, `existing-${att.id}`, {
              onRemove: () => handleDeleteExisting(att.id),
            })
          )}
          {pending.map((att, idx) =>
            renderFileRow(att, `pending-${idx}`, {
              onRemove: () => handleRemovePending(idx),
            })
          )}
          {existing.length === 0 && pending.length === 0 && (
            <Text fontSize="xs" color="gray.500">
              No files attached
            </Text>
          )}
        </VStack>
      </FormControl>
    </Box>
  );
}
