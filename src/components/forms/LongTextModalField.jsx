import React from "react";
import {
    Box,
    Text,
    Textarea,
    Button,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    useDisclosure,
    useColorModeValue,
} from "@chakra-ui/react";

export default function LongTextModalField({
    value = "",
    onChange,
    onKeyDown,
    numberedListHandler,
    placeholder = "Click to enter text...",
    modalTitle = "Edit Text",
    boxWidth = "100%",
    minH = "80px",
    textareaRows = 12,
    textareaPlaceholder,
}) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [localValue, setLocalValue] = React.useState(value);

    const borderColor = useColorModeValue("gray.200", "whiteAlpha.300");
    const inputBg = useColorModeValue("white", "navy.800");
    const textColor = useColorModeValue("gray.800", "white");

    React.useEffect(() => {
        if (isOpen) {
            setLocalValue(value || "");
        }
    }, [isOpen, value]);

    const handleSave = () => {
        onChange(localValue);
        onClose();
    };

    const handleCancel = () => {
        setLocalValue(value || "");
        onClose();
    };

    const textareaKeyDownHandler = numberedListHandler
        ? numberedListHandler(setLocalValue)
        : onKeyDown;

    return (
        <>
            <Box
                w={boxWidth}
                minH={minH}
                px={3}
                py={2}
                borderRadius="md"
                border="1px solid"
                borderColor={borderColor}
                bg={inputBg}
                cursor="pointer"
                _hover={{ borderColor: "blue.400", bg: "whiteAlpha.50" }}
                _focusWithin={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                onClick={onOpen}
            >
                <Text
                    fontSize="sm"
                    color={value?.trim() ? textColor : "gray.500"}
                    noOfLines={3}
                    whiteSpace="pre-wrap"
                >
                    {value?.trim() || placeholder}
                </Text>
            </Box>

            <Modal isOpen={isOpen} onClose={handleCancel} size="2xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent maxH="90vh">
                    <ModalHeader>{modalTitle}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <Textarea
                            value={localValue}
                            onChange={(e) => setLocalValue(e.target.value)}
                            onKeyDown={textareaKeyDownHandler}
                            placeholder={textareaPlaceholder || placeholder}
                            size="md"
                            rows={textareaRows}
                            resize="vertical"
                            minH="200px"
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button colorScheme="blue" onClick={handleSave}>
                            Save
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
