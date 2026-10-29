import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { validateDateRanges } from "utils/ledgerListQuery";

// fields: [{ key, label }]; value: { <key>_from, <key>_to }
// onApply(ranges), onClear(); error = server message shown inside the modal
const LedgerDateRangeFilterModal = ({
  isOpen,
  onClose,
  fields,
  value,
  onApply,
  onClear,
  isLoading = false,
  error = "",
}) => {
  const [draft, setDraft] = useState(value || {});
  const inputBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");

  useEffect(() => {
    if (isOpen) setDraft(value || {});
  }, [isOpen, value]);

  const errors = useMemo(() => validateDateRanges(draft, fields), [draft, fields]);
  const hasErrors = Object.keys(errors).length > 0;
  const hasAnyValue = fields.some(({ key }) => draft[`${key}_from`] || draft[`${key}_to`]);
  const hasApplied = fields.some(({ key }) => value?.[`${key}_from`] || value?.[`${key}_to`]);

  const setField = (name, v) => setDraft((prev) => ({ ...prev, [name]: v }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "md" }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Filter by Dates</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {error ? (
            <Alert status="error" borderRadius="md" mb="3">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}
          <Text fontSize="sm" color={muted} mb="4">
            Choose a from and to date for any field. Both ends are inclusive. Leave a side empty for an open range.
          </Text>
          <Stack spacing="4">
            {fields.map(({ key, label }) => (
              <FormControl key={key} isInvalid={Boolean(errors[key])}>
                <FormLabel fontSize="sm" mb="1">{label}</FormLabel>
                <Stack direction={{ base: "column", md: "row" }} spacing="2">
                  {["from", "to"].map((side) => (
                    <HStack key={side} flex="1" spacing="2">
                      <Text fontSize="xs" color={muted} w="8">{side === "from" ? "From" : "To"}</Text>
                      <Input
                        type="date"
                        size="sm"
                        bg={inputBg}
                        borderColor={borderColor}
                        aria-label={`${label} ${side}`}
                        value={draft[`${key}_${side}`] || ""}
                        isDisabled={isLoading}
                        onChange={(e) => setField(`${key}_${side}`, e.target.value)}
                      />
                    </HStack>
                  ))}
                </Stack>
                <FormErrorMessage>{errors[key]}</FormErrorMessage>
              </FormControl>
            ))}
          </Stack>
        </ModalBody>
        <ModalFooter gap="2" flexWrap="wrap">
          {hasAnyValue || hasApplied ? (
            <Button variant="ghost" colorScheme="red" size="sm" isDisabled={isLoading} onClick={onClear}>
              Clear
            </Button>
          ) : null}
          <Button
            colorScheme="blue"
            size="sm"
            isLoading={isLoading}
            isDisabled={hasErrors}
            onClick={() => onApply(draft)}
          >
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LedgerDateRangeFilterModal;
