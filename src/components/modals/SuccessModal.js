import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { CheckCircleIcon } from "@chakra-ui/icons";

const SuccessModal = ({
  isOpen,
  onClose,
  title = "Success!",
  message = "Operation completed successfully.",
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const successColor = "green.500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent
        bg={bgColor}
        borderRadius="xl"
        boxShadow="xl"
        border="1px solid"
        borderColor={borderColor}
        maxW="400px"
        mx="4"
      >
        <ModalHeader textAlign="center" pb="2">
          <VStack spacing="4">
            <CheckCircleIcon
              w="16"
              h="16"
              color={successColor}
              boxShadow="lg"
            />
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color={successColor}
              textAlign="center"
            >
              {title}
            </Text>
          </VStack>
        </ModalHeader>

        <ModalBody textAlign="center" pt="0" pb="6">
          <Text
            fontSize="md"
            color={useColorModeValue("gray.600", "gray.300")}
            lineHeight="1.6"
          >
            {message}
          </Text>
        </ModalBody>

        <ModalFooter justifyContent="center" pt="0">
          <Button
            colorScheme="green"
            size="lg"
            px="8"
            onClick={onClose}
            borderRadius="full"
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "lg",
            }}
            transition="all 0.2s"
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SuccessModal;
