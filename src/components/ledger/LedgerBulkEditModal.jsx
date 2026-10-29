import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Textarea,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdCheck } from "react-icons/md";
import { BULK_MAX_IDS } from "utils/ledgerBulkEdit";

// fields: COST_BULK_FIELDS / INVOICE_BULK_FIELDS. onSubmit(enabledValues) where enabledValues is
// { [key]: value | { auto: true } } for ticked fields only (pass to buildBulkUpdatePayload).
// renderAgentPicker(value, onChange, isDisabled) renders the agent control (see useLedgerAgentOptions).
// currencyOptions: [{ id, name }].
const LedgerBulkEditModal = ({
  isOpen,
  onClose,
  fields,
  count,
  onSubmit,
  isSubmitting = false,
  error = "",
  renderAgentPicker,
  currencyOptions = [],
}) => {
  const [enabled, setEnabled] = useState({});
  const [values, setValues] = useState({});
  const [auto, setAuto] = useState({});
  const inputBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  useEffect(() => {
    if (isOpen) {
      setEnabled({});
      setValues({});
      setAuto({});
    }
  }, [isOpen]);

  const tickedKeys = useMemo(() => fields.filter((f) => enabled[f.key]).map((f) => f.key), [fields, enabled]);
  const overLimit = count > BULK_MAX_IDS;
  const fieldErrors = useMemo(() => {
    const errs = {};
    fields.forEach((f) => {
      if (!enabled[f.key] || auto[f.key]) return;
      const v = values[f.key];
      if (f.type === "number" && v != null && String(v).trim() !== "" && !Number.isFinite(Number(v))) {
        errs[f.key] = "Enter a valid number";
      }
    });
    return errs;
  }, [fields, enabled, auto, values]);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  let reason = "";
  if (overLimit) reason = `Bulk edit supports up to ${BULK_MAX_IDS} records.`;
  else if (tickedKeys.length === 0) reason = "Tick at least one field to update.";
  else if (hasFieldErrors) reason = "Fix the highlighted fields.";

  const setValue = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const submit = () => {
    const out = {};
    tickedKeys.forEach((key) => {
      out[key] = auto[key] ? { auto: true } : values[key] ?? "";
    });
    onSubmit(out);
  };

  const renderControl = (field) => {
    const disabled = !enabled[field.key] || isSubmitting || Boolean(auto[field.key]);
    const common = { size: "sm", bg: inputBg, borderColor, isDisabled: disabled, "aria-label": field.label };
    const v = values[field.key] ?? "";
    switch (field.type) {
      case "select":
        return (
          <Select {...common} placeholder="Select..." value={v} onChange={(e) => setValue(field.key, e.target.value)}>
            {(field.options || []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        );
      case "currency":
        return (
          <Select {...common} placeholder="Select..." value={v} onChange={(e) => setValue(field.key, e.target.value)}>
            {currencyOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </Select>
        );
      case "agent":
        return renderAgentPicker ? (
          renderAgentPicker(v, (next) => setValue(field.key, next), disabled)
        ) : null;
      case "date":
        return <Input {...common} type="date" value={v} onChange={(e) => setValue(field.key, e.target.value)} />;
      case "number":
        return (
          <Input {...common} type="number" step="any" value={v} onChange={(e) => setValue(field.key, e.target.value)} />
        );
      case "textarea":
        return <Textarea {...common} rows={2} value={v} onChange={(e) => setValue(field.key, e.target.value)} />;
      default:
        return <Input {...common} value={v} onChange={(e) => setValue(field.key, e.target.value)} />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      size={{ base: "full", md: "xl" }}
      scrollBehavior="inside"
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit {count} selected records</ModalHeader>
        <ModalCloseButton isDisabled={isSubmitting} />
        <ModalBody>
          {error ? (
            <Alert status="error" borderRadius="md" mb="3">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}
          <Alert status="info" variant="subtle" borderRadius="md" mb="4" fontSize="sm">
            <AlertIcon />
            Only fields with Change ticked are updated. All changes apply together or not at all.
          </Alert>
          <VStack align="stretch" spacing="4">
            {fields.map((field) => (
              <Stack key={field.key} direction={{ base: "column", md: "row" }} spacing="3" align={{ md: "flex-start" }}>
                <Checkbox
                  size="sm"
                  colorScheme="blue"
                  minW="90px"
                  pt={{ md: "7" }}
                  isChecked={Boolean(enabled[field.key])}
                  isDisabled={isSubmitting}
                  aria-label={`Change ${field.label}`}
                  onChange={(e) => setEnabled((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                >
                  Change
                </Checkbox>
                <FormControl isInvalid={Boolean(fieldErrors[field.key])} flex="1">
                  <FormLabel fontSize="sm" mb="1">{field.label}</FormLabel>
                  {renderControl(field)}
                  {field.auto ? (
                    <Checkbox
                      size="sm"
                      mt="2"
                      isChecked={Boolean(auto[field.key])}
                      isDisabled={!enabled[field.key] || isSubmitting}
                      onChange={(e) => setAuto((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                    >
                      Set to automatic
                    </Checkbox>
                  ) : null}
                  {fieldErrors[field.key] ? (
                    <FormHelperText color="red.500">{fieldErrors[field.key]}</FormHelperText>
                  ) : null}
                </FormControl>
              </Stack>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter flexDirection={{ base: "column", md: "row" }} gap="2" alignItems={{ base: "stretch", md: "center" }}>
          {reason ? (
            <Box fontSize="xs" color="gray.500" mr={{ md: "auto" }}>{reason}</Box>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            colorScheme="green"
            size="sm"
            leftIcon={<MdCheck />}
            isLoading={isSubmitting}
            loadingText="Updating..."
            isDisabled={Boolean(reason)}
            onClick={submit}
          >
            Update all ({count})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LedgerBulkEditModal;
