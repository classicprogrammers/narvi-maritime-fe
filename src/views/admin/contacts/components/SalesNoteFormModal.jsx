import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  IconButton,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdClose } from "react-icons/md";

import SearchableSelect from "components/forms/SearchableSelect";
import DmyDateInput, {
  getLocalTodayIso,
  normalizeToIsoDate,
} from "components/forms/DmyDateInput";
import { useMasterData } from "hooks/useMasterData";
import {
  buildSalesNoteCreatePayload,
  buildSalesNoteUpdatePayload,
  validateSalesNoteForm,
} from "utils/salesNotes";

const buildInitialForm = (mode, note) => {
  if (mode === "edit" && note) {
    return {
      id: note.id,
      client_id: note.client_id?.id ?? note.client_id ?? "",
      remarks: note.remarks || "",
      entry_date: normalizeToIsoDate(note.entry_date).slice(0, 10),
      follow_up_date: normalizeToIsoDate(note.follow_up_date).slice(0, 10),
    };
  }
  return {
    client_id: "",
    remarks: "",
    entry_date: getLocalTodayIso(),
    follow_up_date: "",
  };
};

/**
 * Add/Edit sales note.
 * `onSubmit(payload)` receives the create (mode "create") or update (mode "edit") payload.
 * `error` is the backend message of the last failed save; the user's input is kept.
 */
export default function SalesNoteFormModal({
  isOpen,
  onClose,
  mode = "create",
  initialNote = null,
  onSubmit,
  isSaving = false,
  error = "",
}) {
  const isEdit = mode === "edit";
  const { clients } = useMasterData();
  const [form, setForm] = useState(() => buildInitialForm(mode, initialNote));
  const [touched, setTouched] = useState({});

  const modalBg = useColorModeValue("white", "gray.800");
  const modalBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const modalHeaderBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  // Reset the form each time the modal opens (or switches note)
  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialForm(mode, initialNote));
      setTouched({});
    }
  }, [isOpen, mode, initialNote]);

  const clientOptions = useMemo(
    () =>
      (Array.isArray(clients) ? clients : []).map((client) => ({
        ...client,
        name: client.name || client.client_code || `Client ${client.id}`,
      })),
    [clients]
  );

  const errors = validateSalesNoteForm(form, mode);
  const isValid = Object.keys(errors).length === 0;
  const showError = (field) => (touched[field] ? errors[field] : undefined);

  const touchField = (field) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    touchField(field);
  };

  const handleSave = () => {
    setTouched({ client_id: true, remarks: true, entry_date: true, follow_up_date: true });
    if (!isValid || isSaving) return;
    onSubmit?.(isEdit ? buildSalesNoteUpdatePayload(form) : buildSalesNoteCreatePayload(form));
  };

  const dateInputProps = {
    iconColor: mutedColor,
    bg: inputBg,
    color: inputText,
    border: "2px",
    borderColor,
    borderRadius: "8px",
    _placeholder: { color: placeholderColor, fontSize: "14px" },
  };

  const renderDateField = (field, label, clearLabel) => (
    <FormControl isInvalid={!!showError(field)}>
      <FormLabel color={textColor} fontSize="sm">
        {label}
      </FormLabel>
      <HStack spacing={2} align="center">
        <Box flex="1">
          <DmyDateInput
            id={`sales-note-${field}`}
            value={form[field]}
            onChange={(value) => setField(field, normalizeToIsoDate(value))}
            {...dateInputProps}
          />
        </Box>
        {clearLabel && form[field] && (
          <IconButton
            aria-label={clearLabel}
            size="sm"
            variant="ghost"
            icon={<Icon as={MdClose} />}
            onClick={() => setField(field, "")}
          />
        )}
      </HStack>
      <FormErrorMessage>{showError(field)}</FormErrorMessage>
    </FormControl>
  );

  return (
    <Modal isOpen={isOpen} onClose={isSaving ? () => {} : onClose} size="lg" isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
      <ModalContent bg={modalBg} border="1px" borderColor={modalBorder}>
        <ModalHeader bg={modalHeaderBg} borderBottom="1px" borderColor={modalBorder} color={textColor}>
          {isEdit ? "Edit Sales Note" : "Add Sales Note"}
        </ModalHeader>
        <ModalCloseButton isDisabled={isSaving} />
        <ModalBody py={5}>
          <VStack spacing={4} align="stretch">
            {error ? (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="sm">{error}</AlertDescription>
              </Alert>
            ) : null}

            <FormControl isInvalid={!!showError("client_id")} isRequired={!isEdit}>
              <FormLabel color={textColor} fontSize="sm">
                Client
              </FormLabel>
              {isEdit ? (
                <Text color={inputText} fontWeight="500">
                  {initialNote?.client_id?.name ?? initialNote?.client_name ?? "-"}
                </Text>
              ) : (
                <>
                  <SearchableSelect
                    value={form.client_id}
                    onChange={(value) => setField("client_id", value)}
                    options={clientOptions}
                    placeholder="Select client..."
                    size="md"
                    bg={inputBg}
                    color={inputText}
                    borderColor={borderColor}
                    error={!!showError("client_id")}
                  />
                  {clientOptions.length === 0 && (
                    <Text fontSize="xs" color={mutedColor} mt={1}>
                      No clients loaded yet. Open Client Management to refresh the list.
                    </Text>
                  )}
                  <FormErrorMessage>{showError("client_id")}</FormErrorMessage>
                </>
              )}
            </FormControl>

            <FormControl isInvalid={!!showError("remarks")} isRequired>
              <FormLabel color={textColor} fontSize="sm">
                Remarks
              </FormLabel>
              <Textarea
                value={form.remarks}
                onChange={(e) => setField("remarks", e.target.value)}
                onBlur={() => touchField("remarks")}
                rows={5}
                placeholder="Enter remarks..."
                bg={inputBg}
                color={inputText}
                border="2px"
                borderColor={borderColor}
                borderRadius="8px"
                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
              />
              <FormErrorMessage>{showError("remarks")}</FormErrorMessage>
            </FormControl>

            {renderDateField("entry_date", "Entry date")}
            {renderDateField("follow_up_date", "Follow-up date", "Clear follow-up date")}
          </VStack>
        </ModalBody>
        <ModalFooter borderTop="1px" borderColor={modalBorder}>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSaving}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            isLoading={isSaving}
            isDisabled={!isValid || isSaving}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
