import React from "react";
import { Alert, AlertIcon, Badge, Flex, Text, useColorModeValue } from "@chakra-ui/react";

export function useEditModeColors() {
    const editModeBg = useColorModeValue("red.50", "red.900");
    const editModeBorderColor = useColorModeValue("red.300", "red.500");
    const editModeAlertBg = useColorModeValue("red.100", "red.800");
    return { editModeBg, editModeBorderColor, editModeAlertBg };
}

export default function EditModeNotice({ entity, name }) {
    const textColor = useColorModeValue("gray.800", "white");
    const { editModeAlertBg, editModeBorderColor } = useEditModeColors();

    return (
        <Alert
            status="error"
            bg={editModeAlertBg}
            borderBottom="2px solid"
            borderColor={editModeBorderColor}
            borderRadius="0"
            py={3}
            px={6}
        >
            <AlertIcon boxSize="24px" color={editModeBorderColor} />
            <Flex align="center" gap={3} flex={1} wrap="wrap">
                <Badge
                    colorScheme="red"
                    fontSize="md"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontWeight="bold"
                    textTransform="uppercase"
                >
                    EDIT MODE
                </Badge>
                <Text fontSize="md" fontWeight="600" color={textColor} flex={1}>
                    You are currently editing {entity}
                    {name ? (
                        <>
                            : <strong>{name}</strong>
                        </>
                    ) : null}
                </Text>
            </Flex>
        </Alert>
    );
}
