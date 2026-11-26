import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  MdAttachFile,
  MdDeleteOutline,
  MdDownload,
  MdImage,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdUploadFile,
} from "react-icons/md";
import { formatFileSize } from "utils/ledgerEconomy";
import { COST_INVOICE_FILE_ACCEPT } from "utils/ledgerCostInvoiceFile";

const iconForFile = (filename) => {
  const ext = String(filename || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return { as: MdPictureAsPdf, color: "red" };
  if (["png", "jpg", "jpeg"].includes(ext)) return { as: MdImage, color: "purple" };
  return { as: MdInsertDriveFile, color: "blue" };
};

// The agent's invoice file of one Cost DB record (a single file; uploading again replaces it).
// Uploads need a saved record, so the hint shows until it exists.
// onUpload(File) / onDelete() / onDownload(file) are async and throw on failure (the page shows the toast).
export default function LedgerCostInvoiceFileField({
  file,
  canUpload,
  hint,
  onUpload,
  onDelete,
  onDownload,
  labelProps,
  gridColumn,
}) {
  const [busyKey, setBusyKey] = useState(null);
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const cardBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  const run = async (key, action) => {
    setBusyKey(key);
    try {
      await action();
    } finally {
      setBusyKey(null);
    }
  };

  const fileIcon = file ? iconForFile(file.filename) : null;
  const uploadButton = (
    <label
      htmlFor="ledger-cost-invoice-file-upload"
      style={{ cursor: canUpload ? "pointer" : "not-allowed", display: "inline-block" }}
    >
      <Button
        as="span"
        size="sm"
        variant={file ? "outline" : "solid"}
        colorScheme="blue"
        leftIcon={<Icon as={file ? MdUploadFile : MdAttachFile} />}
        isDisabled={!canUpload}
        isLoading={busyKey === "upload"}
        pointerEvents={canUpload ? "auto" : "none"}
      >
        {file ? "Replace" : "Upload invoice file"}
      </Button>
    </label>
  );

  return (
    <FormControl gridColumn={gridColumn}>
      <FormLabel {...labelProps}>Invoice File</FormLabel>
      <Input
        type="file"
        accept={COST_INVOICE_FILE_ACCEPT}
        display="none"
        id="ledger-cost-invoice-file-upload"
        isDisabled={!canUpload}
        onChange={(e) => {
          // Copy first: clearing the input empties its live FileList
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (picked) run("upload", () => onUpload(picked));
        }}
      />
      <Box
        border="1px"
        borderStyle={file ? "solid" : "dashed"}
        borderColor={borderColor}
        bg={cardBg}
        borderRadius="md"
        px={4}
        py={3}
        maxW="560px"
      >
        {file ? (
          <Flex align="center" gap={3} wrap="wrap">
            <Flex
              align="center"
              justify="center"
              boxSize="40px"
              borderRadius="md"
              bg={`${fileIcon.color}.50`}
              color={`${fileIcon.color}.500`}
              flexShrink={0}
            >
              <Icon as={fileIcon.as} boxSize={6} />
            </Flex>
            <Box flex="1" minW="160px">
              <Text fontSize="sm" fontWeight="600" noOfLines={1} title={file.filename}>
                {file.filename}
              </Text>
              {formatFileSize(file.file_size) ? (
                <Text fontSize="xs" color={mutedColor}>
                  {formatFileSize(file.file_size)}
                </Text>
              ) : null}
            </Box>
            <HStack spacing={2} flexShrink={0}>
              <Button
                size="sm"
                variant="outline"
                colorScheme="green"
                leftIcon={<Icon as={MdDownload} />}
                isLoading={busyKey === "download"}
                onClick={() => run("download", () => onDownload(file))}
              >
                Download
              </Button>
              {canUpload && uploadButton}
              {canUpload && (
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  leftIcon={<Icon as={MdDeleteOutline} />}
                  isLoading={busyKey === "delete"}
                  onClick={() => run("delete", () => onDelete())}
                >
                  Remove
                </Button>
              )}
            </HStack>
          </Flex>
        ) : (
          <Flex align="center" gap={3} wrap="wrap">
            <Icon as={MdAttachFile} boxSize={5} color={mutedColor} />
            <Text flex="1" minW="160px" fontSize="sm" color={mutedColor}>
              No invoice file attached
            </Text>
            {uploadButton}
          </Flex>
        )}
      </Box>
      <Text fontSize="xs" color={mutedColor} mt={1}>
        {hint || (file ? "A new upload replaces this file." : "PDF, image, Word or Excel, up to 10 MB.")}
      </Text>
    </FormControl>
  );
}
