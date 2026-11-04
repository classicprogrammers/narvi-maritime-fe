import React from "react";
import {
  Alert,
  AlertIcon,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { isLedgerCancelled, ledgerCancelledText, ledgerViewValue } from "utils/ledgerDisplay";

// Read-only look at one Cost / Invoice list row. columns: COST_COLUMNS / INVOICE_COLUMNS.
const LedgerRecordViewModal = ({ isOpen, onClose, title, record, columns = [], onEdit }) => {
  const labelColor = useColorModeValue("gray.500", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "4xl" }} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLedgerCancelled(record) ? (
            <Alert status="error" borderRadius="md" mb={4}>
              <AlertIcon />
              {ledgerCancelledText(record)}. This record is read-only.
            </Alert>
          ) : null}
          {record ? (
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {columns.map((column) => {
                const value = ledgerViewValue(column, record);
                return (
                  <div key={column.key}>
                    <Text fontSize="xs" fontWeight="600" color={labelColor} mb={1}>
                      {column.label}
                    </Text>
                    <Text
                      fontSize="sm"
                      pb={1}
                      borderBottom="1px"
                      borderColor={borderColor}
                      whiteSpace="pre-wrap"
                      wordBreak="break-word"
                    >
                      {value || "—"}
                    </Text>
                  </div>
                );
              })}
            </SimpleGrid>
          ) : null}
        </ModalBody>
        <ModalFooter gap={2}>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
          {onEdit && !isLedgerCancelled(record) ? (
            <Button size="sm" colorScheme="blue" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LedgerRecordViewModal;
