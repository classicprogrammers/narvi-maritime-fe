import React, { useEffect, useState } from "react";
import {
    Badge,
    Box,
    Button,
    Checkbox,
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
    Textarea,
    VStack,
    useColorModeValue,
} from "@chakra-ui/react";
import { MdErrorOutline, MdRadioButtonUnchecked } from "react-icons/md";

/**
 * Lists, per row, the fields still required for the row's selected stock status.
 * With `onSaveAnyway`, the user can tick "Save anyway" and give a reason (e.g. sub-item of a
 * combined shipment) to continue without the missing fields.
 */
export default function StockStatusRequirementsModal({
    issues = [],
    onClose,
    onSaveAnyway,
    overrideLabel = "Save anyway — these fields are not available (e.g. sub-item of a combined shipment)",
    confirmLabel = "Save anyway",
}) {
    const cardBg = useColorModeValue("orange.50", "whiteAlpha.100");
    const cardBorder = useColorModeValue("orange.200", "orange.500");
    const subtle = useColorModeValue("gray.600", "gray.300");
    const [saveAnyway, setSaveAnyway] = useState(false);
    const [reason, setReason] = useState("");

    const isOpen = issues.length > 0;
    useEffect(() => {
        if (!isOpen) {
            setSaveAnyway(false);
            setReason("");
        }
    }, [isOpen]);

    // Stock keeps its strict rules (and its own Warning exception), so it can never be overridden here.
    const canOverride = Boolean(onSaveAnyway) && issues.every((issue) => issue.status !== "stock");
    const canConfirm = saveAnyway && reason.trim() !== "";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
            <ModalOverlay zIndex={2099999} />
            <ModalContent containerProps={{ zIndex: 2100000 }}>
                <ModalHeader>
                    <HStack spacing={2}>
                        <Icon as={MdErrorOutline} color="orange.400" boxSize={6} />
                        <Text>Required fields missing</Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="normal" color={subtle} mt={1}>
                        {canOverride
                            ? "Complete the fields below, or save anyway if they are not available."
                            : "Complete the fields below for the selected status, then save again."}
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
                        {canOverride && (
                            <Box borderTopWidth="1px" pt={3}>
                                <Checkbox
                                    isChecked={saveAnyway}
                                    onChange={(e) => setSaveAnyway(e.target.checked)}
                                    colorScheme="orange"
                                    alignItems="flex-start"
                                >
                                    <Text fontSize="sm">{overrideLabel}</Text>
                                </Checkbox>
                                {saveAnyway && (
                                    <Textarea
                                        mt={3}
                                        size="sm"
                                        rows={3}
                                        resize="vertical"
                                        autoFocus
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Reason, e.g. Sub-item of SL225247"
                                    />
                                )}
                                {saveAnyway && (
                                    <Text fontSize="xs" color={subtle} mt={1}>
                                        The reason is saved in the Warning field of the affected rows.
                                    </Text>
                                )}
                            </Box>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    {canOverride ? (
                        <>
                            <Button variant="ghost" mr={3} onClick={onClose}>
                                Go back
                            </Button>
                            <Button
                                colorScheme="orange"
                                isDisabled={!canConfirm}
                                onClick={() => onSaveAnyway(reason.trim())}
                            >
                                {confirmLabel}
                            </Button>
                        </>
                    ) : (
                        <Button colorScheme="blue" onClick={onClose}>
                            Got it
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
