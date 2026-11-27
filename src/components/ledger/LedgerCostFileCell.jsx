import React, { useState } from "react";
import { Box, Button, HStack, Icon, IconButton, Input, Text, Tooltip, useColorModeValue } from "@chakra-ui/react";
import { MdAttachFile, MdDeleteOutline, MdDownload, MdUploadFile } from "react-icons/md";
import { formatFileSize } from "utils/ledgerEconomy";
import { COST_INVOICE_FILE_ACCEPT } from "utils/ledgerCostInvoiceFile";

// Compact Files cell of the Cost DB list: the agent invoice file with download, replace and remove.
// onUpload(File) / onDelete() / onDownload(file) are async and report their own errors.
export default function LedgerCostFileCell({ file, inputId, canEdit = true, onUpload, onDelete, onDownload }) {
  const [busyKey, setBusyKey] = useState(null);
  const muted = useColorModeValue("gray.500", "gray.400");

  const run = async (key, action) => {
    setBusyKey(key);
    try {
      await action();
    } finally {
      setBusyKey(null);
    }
  };

  const fileInput = (
    <Input
      type="file"
      accept={COST_INVOICE_FILE_ACCEPT}
      display="none"
      id={inputId}
      onChange={(e) => {
        // Copy first: clearing the input empties its live FileList
        const picked = e.target.files?.[0];
        e.target.value = "";
        if (picked) run("upload", () => onUpload(picked));
      }}
    />
  );

  const uploadLabel = (children) => (
    <label htmlFor={inputId} style={{ cursor: "pointer", display: "inline-block" }}>
      {children}
    </label>
  );

  if (!file) {
    if (!canEdit) return <Text color="gray.400">—</Text>;
    return (
      <Box>
        {fileInput}
        {uploadLabel(
          <Button
            as="span"
            size="xs"
            variant="outline"
            colorScheme="blue"
            leftIcon={<Icon as={MdAttachFile} />}
            isLoading={busyKey === "upload"}
            cursor="pointer"
          >
            Upload
          </Button>
        )}
      </Box>
    );
  }

  const size = formatFileSize(file.file_size);
  return (
    <Box minW="170px">
      {fileInput}
      <Button
        variant="link"
        size="xs"
        colorScheme="blue"
        fontWeight="600"
        maxW="190px"
        justifyContent="flex-start"
        isLoading={busyKey === "download"}
        onClick={() => run("download", () => onDownload(file))}
        title={file.filename}
      >
        <Text as="span" isTruncated>
          {file.filename}
        </Text>
      </Button>
      <HStack spacing={0.5} mt={0.5}>
        {size ? (
          <Text fontSize="2xs" color={muted} mr={1}>
            {size}
          </Text>
        ) : null}
        <Tooltip label="Download" hasArrow>
          <IconButton
            aria-label="Download invoice file"
            icon={<Icon as={MdDownload} />}
            size="xs"
            variant="ghost"
            colorScheme="green"
            isLoading={busyKey === "download"}
            onClick={() => run("download", () => onDownload(file))}
          />
        </Tooltip>
        {canEdit && (
          <>
            <Tooltip label="Replace" hasArrow>
              {uploadLabel(
                <IconButton
                  as="span"
                  aria-label="Replace invoice file"
                  icon={<Icon as={MdUploadFile} />}
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  isLoading={busyKey === "upload"}
                  cursor="pointer"
                />
              )}
            </Tooltip>
            <Tooltip label="Remove" hasArrow>
              <IconButton
                aria-label="Remove invoice file"
                icon={<Icon as={MdDeleteOutline} />}
                size="xs"
                variant="ghost"
                colorScheme="red"
                isLoading={busyKey === "delete"}
                onClick={() => run("delete", () => onDelete())}
              />
            </Tooltip>
          </>
        )}
      </HStack>
    </Box>
  );
}
