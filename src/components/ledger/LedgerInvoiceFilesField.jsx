import React, { useState } from "react";
import { Button, Flex, FormControl, FormLabel, HStack, Icon, IconButton, Input, Text, VStack } from "@chakra-ui/react";
import { MdAttachFile, MdClose, MdDownload } from "react-icons/md";
import { formatFileSize } from "utils/ledgerEconomy";

// Files of one Invoice DB record. Uploads need a saved record, so the hint shows until it exists.
// onUpload(FileList) / onDelete(file) / onDownload(file) are async and throw on failure (the page shows the toast).
export default function LedgerInvoiceFilesField({
  files = [],
  canUpload,
  hint,
  onUpload,
  onDelete,
  onDownload,
  labelProps,
}) {
  const [busyKey, setBusyKey] = useState(null);

  const run = async (key, action) => {
    setBusyKey(key);
    try {
      await action();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <FormControl gridColumn={{ md: "span 2" }}>
      <FormLabel {...labelProps}>Invoice Files</FormLabel>
      <VStack align="stretch" spacing={2}>
        <Input
          type="file"
          multiple
          accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
          display="none"
          id="ledger-invoice-file-upload"
          isDisabled={!canUpload}
          onChange={(e) => {
            // Copy first: clearing the input empties its live FileList
            const picked = Array.from(e.target.files || []);
            e.target.value = "";
            if (picked.length) run("upload", () => onUpload(picked));
          }}
        />
        <label htmlFor="ledger-invoice-file-upload" style={{ cursor: canUpload ? "pointer" : "not-allowed" }}>
          <Button
            as="span"
            size="sm"
            variant="outline"
            colorScheme="blue"
            leftIcon={<Icon as={MdAttachFile} />}
            w={{ base: "100%", md: "auto" }}
            isDisabled={!canUpload}
            isLoading={busyKey === "upload"}
            pointerEvents={canUpload ? "auto" : "none"}
          >
            Upload invoice files
          </Button>
        </label>
        {files.map((file) => (
          <Flex key={file.id} align="center" justify="space-between" gap={2} fontSize="sm">
            <Text flex={1} isTruncated title={file.filename || file.name}>
              {file.filename || file.name || `File ${file.id}`}
              {formatFileSize(file.file_size) ? (
                <Text as="span" color="gray.500">{` · ${formatFileSize(file.file_size)}`}</Text>
              ) : null}
            </Text>
            <HStack spacing={0}>
              <IconButton
                aria-label="Download file"
                icon={<Icon as={MdDownload} />}
                size="xs"
                variant="ghost"
                colorScheme="green"
                isLoading={busyKey === `download-${file.id}`}
                onClick={() => run(`download-${file.id}`, () => onDownload(file))}
              />
              {canUpload && (
                <IconButton
                  aria-label="Remove file"
                  icon={<Icon as={MdClose} />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  isLoading={busyKey === `delete-${file.id}`}
                  onClick={() => run(`delete-${file.id}`, () => onDelete(file))}
                />
              )}
            </HStack>
          </Flex>
        ))}
        {files.length === 0 && (
          <Text fontSize="xs" color="gray.500">
            {hint || "No files attached"}
          </Text>
        )}
        {files.length > 0 && hint ? (
          <Text fontSize="xs" color="gray.500">
            {hint}
          </Text>
        ) : null}
      </VStack>
    </FormControl>
  );
}
