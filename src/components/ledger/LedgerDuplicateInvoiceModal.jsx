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
const LedgerDuplicateInvoiceModal = ({ isOpen, onClose, duplicates = [], agentLabel = "" }) => {
  const cardBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.600", "gray.300");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "lg" }} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display="flex" alignItems="center" gap="2">
          <Icon as={MdWarning} color="orange.400" />
          Duplicate invoice number
        </ModalHeader>
        <ModalBody>
          <Text fontSize="sm" color={muted} mb="3">
            These numbers are already booked for this agent. Saving is blocked until they are changed.
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
                <Text fontSize="sm" wordBreak="break-word">{formatDuplicateMessage(dup, agentLabel)}</Text>
              </VStack>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" size="sm" w={{ base: "full", md: "auto" }} onClick={onClose}>
            Edit invoice numbers
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LedgerDuplicateInvoiceModal;
