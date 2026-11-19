import React, { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  HStack,
  Heading,
  Icon,
  IconButton,
  Text,
  Textarea,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdArrowBack, MdClose } from "react-icons/md";
import { Redirect, useHistory, useLocation, useParams } from "react-router-dom";

import Card from "components/card/Card";
import SearchableSelect from "components/forms/SearchableSelect";
import DmyDateInput, {
  getLocalTodayIso,
  normalizeToIsoDate,
} from "components/forms/DmyDateInput";
import { SuccessModal } from "components/modals";
import { createClientSale, updateClientSale } from "api/clientSales";
import { useMasterData } from "hooks/useMasterData";
import {
  applyNumberedListEnter,
  buildSalesNoteCreatePayload,
  buildSalesNoteUpdatePayload,
  validateSalesNoteForm,
} from "utils/salesNotes";

function Section({ title, hint, children }) {
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const titleColor = useColorModeValue("secondaryGray.900", "white");
  const hintColor = useColorModeValue("gray.500", "gray.400");
  return (
    <Box border="1px" borderColor={border} borderRadius="12px" overflow="hidden">
      <Flex bg={headerBg} px={5} py={3} borderBottom="1px" borderColor={border} align="baseline" gap={3} flexWrap="wrap">
        <Text fontWeight="700" color={titleColor}>
          {title}
        </Text>
        {hint ? (
          <Text fontSize="xs" color={hintColor}>
            {hint}
          </Text>
        ) : null}
      </Flex>
      <Box p={5}>{children}</Box>
    </Box>
  );
}

const LIST_PATH = "/admin/contacts/sales";

const buildInitialForm = (note) => {
  if (note) {
    return {
      id: note.id,
      client_id: note.client_id?.id ?? note.client_id ?? "",
      remarks: note.remarks || "",
      todo_remarks: note.todo_remarks || "",
      entry_date: normalizeToIsoDate(note.entry_date).slice(0, 10),
      follow_up_date: normalizeToIsoDate(note.follow_up_date).slice(0, 10),
    };
  }
  return {
    client_id: "",
    remarks: "",
    todo_remarks: "",
    entry_date: getLocalTodayIso(),
    follow_up_date: "",
  };
};

/**
 * Full-page Add / Edit sales note.
 * Routes: /contacts/sales/new and /contacts/sales/edit/:id (the note comes from router state,
 * there is no endpoint to fetch a single note).
 */
export default function SalesNoteForm() {
  const history = useHistory();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  const note = location.state?.note || null;
  const { clients } = useMasterData();

  const [form, setForm] = useState(() => buildInitialForm(isEdit ? note : null));
  const [touched, setTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  const clientOptions = useMemo(
    () =>
      (Array.isArray(clients) ? clients : []).map((client) => ({
        ...client,
        name: client.name || client.client_code || `Client ${client.id}`,
      })),
    [clients]
  );

  // Edit opened without a note (page refresh / direct link): back to the list
  if (isEdit && !note) return <Redirect to={LIST_PATH} />;

  const mode = isEdit ? "edit" : "create";
  const errors = validateSalesNoteForm(form, mode);
  const isValid = Object.keys(errors).length === 0;
  const showError = (field) => (touched[field] ? errors[field] : undefined);
  const touchField = (field) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    touchField(field);
  };

  // Enter creates a numbered list, like the Remarks field in the client edit modal
  const numberedListKeyDown = (field) => (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    const target = e.target;
    const result = applyNumberedListEnter(target.value, target.selectionStart);
    setField(field, result.value);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = result.cursor;
    }, 0);
  };

  const handleSave = async () => {
    setTouched({ client_id: true, remarks: true, entry_date: true, follow_up_date: true });
    if (!isValid || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      if (isEdit) await updateClientSale(buildSalesNoteUpdatePayload(form));
      else await createClientSale(buildSalesNoteCreatePayload(form));
      setSuccessMessage(isEdit ? "Sales note updated successfully." : "Sales note added successfully.");
    } catch (err) {
      // Stay on the page with the user's input; show the backend message
      setError(err?.response?.data?.message || err?.message || "Failed to save sales note");
    } finally {
      setIsSaving(false);
    }
  };

  const goToList = () => history.push(LIST_PATH);

  const textareaProps = {
    bg: inputBg,
    color: inputText,
    border: "2px",
    borderColor,
    borderRadius: "8px",
    rows: 9,
    placeholder: "Type here...",
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
            iconColor={mutedColor}
            bg={inputBg}
            color={inputText}
            border="2px"
            borderColor={borderColor}
            borderRadius="8px"
            _placeholder={{ color: placeholderColor, fontSize: "14px" }}
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
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Card p={{ base: 4, md: 6 }} bg={cardBg} border="1px" borderColor={borderColor}>
        <Flex justify="space-between" align="center" mb={6} pb={4} borderBottom="1px" borderColor={borderColor} flexWrap="wrap" gap={3}>
          <HStack spacing={3}>
            <IconButton
              aria-label="Back to sales notes"
              icon={<Icon as={MdArrowBack} />}
              variant="ghost"
              onClick={goToList}
            />
            <Heading size="lg" color={textColor}>
              {isEdit ? "Edit Sales Note" : "Add Sales Note"}
            </Heading>
          </HStack>
        </Flex>

        <VStack spacing={6} align="stretch">
          {error ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm" whiteSpace="pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          ) : null}

          <Section title="Note details">
            <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }} gap={5} alignItems="start">
              <FormControl isInvalid={!!showError("client_id")} isRequired={!isEdit}>
                <FormLabel color={textColor} fontSize="sm">
                  Client
                </FormLabel>
                {isEdit ? (
                  <Text color={inputText} fontWeight="600" fontSize="md" py={2}>
                    {note?.client_id?.name ?? note?.client_name ?? "-"}
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
              {renderDateField("entry_date", "Entry date")}
              {renderDateField("follow_up_date", "Follow-up date", "Clear follow-up date")}
            </Grid>
          </Section>

          <Section title="Remarks" hint="Press Enter to create a numbered list, Shift+Enter for a plain new line.">
            <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={5}>
              <FormControl>
                <FormLabel color={textColor} fontSize="sm">
                  Remarks
                </FormLabel>
                <Textarea
                  value={form.remarks}
                  onChange={(e) => setField("remarks", e.target.value)}
                  onKeyDown={numberedListKeyDown("remarks")}
                  {...textareaProps}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={textColor} fontSize="sm">
                  To-do remarks
                </FormLabel>
                <Textarea
                  value={form.todo_remarks}
                  onChange={(e) => setField("todo_remarks", e.target.value)}
                  onKeyDown={numberedListKeyDown("todo_remarks")}
                  {...textareaProps}
                />
              </FormControl>
            </Grid>
          </Section>

          <HStack justify="flex-end" spacing={3} pt={4} borderTop="1px" borderColor={borderColor}>
            <Button variant="outline" onClick={goToList} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSave}
              isLoading={isSaving}
              isDisabled={!isValid || isSaving}
              minW="120px"
            >
              {isEdit ? "Save changes" : "Save note"}
            </Button>
          </HStack>
        </VStack>
      </Card>

      <SuccessModal
        isOpen={!!successMessage}
        onClose={goToList}
        title="Success!"
        message={successMessage}
      />
    </Box>
  );
}
