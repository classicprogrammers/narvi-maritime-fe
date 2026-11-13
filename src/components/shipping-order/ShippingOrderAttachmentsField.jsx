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
import { setAttachmentDocumentType } from "../../api/attachments";
import DocumentTypeSelect from "../forms/DocumentTypeSelect";
import { DEFAULT_DOCUMENT_TYPE, withFileDocumentType } from "../../utils/documentTypes";
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
  // Type given to the files picked next; each file's type can still be changed in its row
  const [uploadType, setUploadType] = useState(DEFAULT_DOCUMENT_TYPE);
  const resolvedOrderId = orderId ?? formData?.id ?? null;

  const existing = formData?.existingAttachments || [];
  /** Only not-yet-saved uploads (base64); ignore server files wrongly placed in attachments */
  const pending = (formData?.attachments || []).filter(
    (att) => att && att.datas != null && String(att.datas).trim() !== ""
  );

  const handleUpload = async (fileList) => {
    if (!fileList?.length) return;
    try {
      const newAttachments = (await filesToShippingAttachments(fileList)).map((att) => ({
        ...att,
        document_type: uploadType,
      }));
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

  const handlePendingTypeChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).map((att, i) =>
        i === index ? { ...att, document_type: value } : att
      ),
    }));
  };

  // A saved file is retagged on the server right away
  const handleExistingTypeChange = async (attachmentId, value) => {
    try {
      await setAttachmentDocumentType(attachmentId, value);
      setFormData((prev) => ({
        ...prev,
        existingAttachments: withFileDocumentType(prev.existingAttachments, attachmentId, value),
      }));
    } catch (err) {
      toast({
        title: "Could not change the file type",
        description: err?.response?.data?.result?.message || err?.message || "Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
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

  const renderFileRow = (att, key, { onRemove, onTypeChange }) => (
    <Flex key={key} align="center" justify="space-between" fontSize="sm" gap={1}>
      <Text isTruncated flex={1} title={att.filename || att.name}>
        {att.filename || att.name || "File"}
      </Text>
      <DocumentTypeSelect
        value={att.document_type}
        onChange={onTypeChange}
        w="130px"
        flexShrink={0}
        ariaLabel={`Type of ${att.filename || att.name || "file"}`}
      />
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
          <HStack spacing={2}>
            <DocumentTypeSelect
              value={uploadType}
              onChange={setUploadType}
              w="150px"
              flexShrink={0}
              ariaLabel="Type for new files"
            />
            <label htmlFor="shipping-order-file-upload" style={{ flex: 1 }}>
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
          </HStack>
          {existing.map((att) =>
            renderFileRow(att, `existing-${att.id}`, {
              onRemove: () => handleDeleteExisting(att.id),
              onTypeChange: (value) => handleExistingTypeChange(att.id, value),
            })
          )}
          {pending.map((att, idx) =>
            renderFileRow(att, `pending-${idx}`, {
              onRemove: () => handleRemovePending(idx),
              onTypeChange: (value) => handlePendingTypeChange(idx, value),
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
