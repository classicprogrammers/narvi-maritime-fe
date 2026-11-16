import React from "react";
import {
  Button,
  Icon,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdWarning } from "react-icons/md";
import { formatDuplicateMessage } from "utils/ledgerInvoiceNumbers";

// duplicates: [{ invoice, record_id, so_number, booked_by, booked_on }] from checkLedgerCostInvoices.
// onClose closes the modal; the caller focuses the Invoices textarea afterwards.
// onUseAnyway: when given, the numbers belong to ANOTHER agent (each item carries agent_name) and the operator
// may keep them. Without it the modal blocks saving, as for the same agent.
// finalFocusRef: field that gets the focus when the modal closes (otherwise the browser returns it to the
// previously focused field, so "Edit invoice numbers" would not take the operator to the invoice field)
const LedgerDuplicateInvoiceModal = ({
  isOpen,
  onClose,
  onUseAnyway,
  duplicates = [],
  agentLabel = "",
  finalFocusRef,
}) => {
  const cardBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.600", "gray.300");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size={{ base: "full", md: "lg" }}
      isCentered
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display="flex" alignItems="center" gap="2">
          <Icon as={MdWarning} color="orange.400" />
          {onUseAnyway ? "Invoice number already used" : "Duplicate invoice number"}
        </ModalHeader>
        <ModalBody>
          <Text fontSize="sm" color={muted} mb="3">
            {onUseAnyway
              ? "These numbers are already booked under another agent. Agents can occasionally use the same number, so check the agent and continue only if this is correct."
              : "These numbers are already booked for this agent. Saving is blocked until they are changed."}
          </Text>
          <VStack align="stretch" spacing="2" maxH="50vh" overflowY="auto">
            {duplicates.map((dup, index) => (
              <VStack
                key={`${dup.invoice}-${dup.record_id ?? index}`}
                align="stretch"
                spacing="1"
                p="3"
                border="1px"
                borderColor={borderColor}
                bg={cardBg}
                borderRadius="md"
              >
                <Text fontWeight="600" wordBreak="break-all">{dup.invoice}</Text>
                <Text fontSize="sm" wordBreak="break-word">
                  {formatDuplicateMessage(dup, onUseAnyway ? dup.agent_name : agentLabel)}
                </Text>
              </VStack>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter gap="2">
          {onUseAnyway && (
            <Button variant="outline" size="sm" w={{ base: "full", md: "auto" }} onClick={onUseAnyway}>
              Use it anyway
            </Button>
          )}
          <Button colorScheme="blue" size="sm" w={{ base: "full", md: "auto" }} onClick={onClose}>
            Edit invoice numbers
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LedgerDuplicateInvoiceModal;
