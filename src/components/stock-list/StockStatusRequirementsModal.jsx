import React from "react";
import {
    Badge,
    Box,
    Button,
    HStack,
    Icon,
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
import { MdErrorOutline, MdRadioButtonUnchecked } from "react-icons/md";

/** Lists, per row, the fields still required for the row's selected stock status. */
export default function StockStatusRequirementsModal({ issues = [], onClose }) {
    const cardBg = useColorModeValue("orange.50", "whiteAlpha.100");
    const cardBorder = useColorModeValue("orange.200", "orange.500");
    const subtle = useColorModeValue("gray.600", "gray.300");

    return (
        <Modal isOpen={issues.length > 0} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
            <ModalOverlay zIndex={2099999} />
            <ModalContent containerProps={{ zIndex: 2100000 }}>
                <ModalHeader>
                    <HStack spacing={2}>
                        <Icon as={MdErrorOutline} color="orange.400" boxSize={6} />
                        <Text>Required fields missing</Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="normal" color={subtle} mt={1}>
                        Complete the fields below for the selected status, then save again.
                    </Text>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={3}>
                        {issues.map((issue) => (
                            <Box
                                key={`${issue.rowNumber}-${issue.status}`}
                                bg={cardBg}
                                borderWidth="1px"
                                borderColor={cardBorder}
                                borderRadius="md"
                                p={3}
                            >
                                <HStack justify="space-between" mb={2}>
                                    <Text fontWeight="semibold">Row {issue.rowNumber}</Text>
                                    <Badge colorScheme="orange">{issue.statusLabel}</Badge>
                                </HStack>
                                <VStack align="stretch" spacing={1}>
                                    {issue.missing.map((label) => (
                                        <HStack key={label} align="flex-start" spacing={2}>
                                            <Icon as={MdRadioButtonUnchecked} color="red.400" mt="3px" />
                                            <Text fontSize="sm">{label}</Text>
                                        </HStack>
                                    ))}
                                </VStack>
                            </Box>
                        ))}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Got it
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
