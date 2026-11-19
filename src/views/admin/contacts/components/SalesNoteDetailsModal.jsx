import React from "react";
import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";

/** Read-only popup with the full remarks and to-do remarks of a sales note. */
export default function SalesNoteDetailsModal({ isOpen, onClose, note, onEdit }) {
  const modalBg = useColorModeValue("white", "gray.800");
  const modalBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const modalHeaderBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const boxBg = useColorModeValue("gray.50", "gray.700");

  const clientName = note?.client_id?.name ?? note?.client_name ?? "";

  const renderBlock = (label, value) => (
    <Box>
      <Text fontSize="sm" fontWeight="600" color={textColor} mb={1}>
        {label}
      </Text>
      <Box bg={boxBg} borderRadius="8px" p={3} maxH="260px" overflowY="auto">
        <Text fontSize="sm" color={value ? textColor : mutedColor} whiteSpace="pre-wrap">
          {value || "-"}
        </Text>
      </Box>
    </Box>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered scrollBehavior="inside">
      <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
      <ModalContent bg={modalBg} border="1px" borderColor={modalBorder}>
        <ModalHeader bg={modalHeaderBg} borderBottom="1px" borderColor={modalBorder} color={textColor}>
          Sales Note{clientName ? ` - ${clientName}` : ""}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={5}>
          <VStack spacing={4} align="stretch">
            {renderBlock("Remarks", note?.remarks)}
            {renderBlock("To-do remarks", note?.todo_remarks)}
          </VStack>
        </ModalBody>
        <ModalFooter borderTop="1px" borderColor={modalBorder}>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
          {onEdit ? (
            <Button colorScheme="blue" onClick={() => onEdit(note)}>
              Edit
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
