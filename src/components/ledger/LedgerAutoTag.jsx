import React from "react";
import { Alert, AlertIcon, Badge, Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";

// Auto / manual tag with optional hint and warning, shown under the label of ROE and due date fields.
// Usage: <LedgerAutoTag mode="auto" date="28 Oct 2026" /> next to the label,
// and <LedgerAutoTag.Notes .../> below the input for hint / warning / error.
const LedgerAutoTag = ({ mode, isLoading = false, onUseAutomatic, compact = false }) => {
  if (!mode) return null;
  return (
    <Flex as="span" display="inline-flex" align="center" gap="1" ml="2" wrap="wrap">
      <Badge
        colorScheme={mode === "manual" ? "orange" : "blue"}
        fontSize="2xs"
        borderRadius="md"
        textTransform="lowercase"
      >
        {mode === "manual" ? "manual" : "auto"}
      </Badge>
      {isLoading ? <Spinner size="xs" /> : null}
      {mode === "manual" && onUseAutomatic && !compact ? (
        <Button variant="link" size="xs" colorScheme="blue" onClick={onUseAutomatic}>
          Use automatic
        </Button>
      ) : null}
    </Flex>
  );
};

// hint (muted), error (red) and warning (alert) lines for under the input
export const LedgerAutoNotes = ({ hint, error, warning }) => (
  <Box mt="1">
    {hint ? (
      <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.400" }}>
        {hint}
      </Text>
    ) : null}
    {error ? (
      <Text fontSize="xs" color="red.500">
        {error}
      </Text>
    ) : null}
    {warning ? (
      <Alert status="warning" variant="subtle" size="sm" borderRadius="md" mt="1" py="1" fontSize="xs">
        <AlertIcon boxSize="3" />
        <Text wordBreak="break-word">{warning}</Text>
      </Alert>
    ) : null}
  </Box>
);

LedgerAutoTag.Notes = LedgerAutoNotes;

export default LedgerAutoTag;
