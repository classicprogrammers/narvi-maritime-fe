import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Button,
  Text,
  Icon,
  Box,
} from "@chakra-ui/react";
import { MdCheckCircle, MdInfo } from "react-icons/md";

// Global modal state
let globalModalState = {
  isOpen: false,
  type: "success",
  title: "",
  message: "",
};

// Global modal listeners
const modalListeners = new Set();

// Function to show modal from anywhere
export const showApiModal = (type, title, message) => {
  globalModalState = { isOpen: true, type, title, message };
  modalListeners.forEach((listener) => listener(globalModalState));
};

// Function to hide modal
export const hideApiModal = () => {
  globalModalState = { ...globalModalState, isOpen: false };
  modalListeners.forEach((listener) => listener(globalModalState));
};

// Hook to use the modal
export const useApiModal = () => {
  const [modal, setModal] = useState(globalModalState);

  useEffect(() => {
    const handleModalChange = (newModal) => {
      setModal(newModal);
    };

    modalListeners.add(handleModalChange);
    return () => modalListeners.delete(handleModalChange);
  }, []);

  return { modal, showModal: showApiModal, hideModal: hideApiModal };
};

// Main modal component
const ApiModal = () => {
  const { modal, hideModal } = useApiModal();
  const { isOpen, type, title, message } = modal;

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <Box
            w="60px"
            h="60px"
            borderRadius="full"
            bg="green.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
            mb={4}
          >
            <Icon as={MdCheckCircle} color="white" boxSize={8} />
          </Box>
        );
      case "error":
        return (
          <Box
            w="60px"
            h="60px"
            borderRadius="full"
            bg="red.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
            mb={4}
          >
            <Text color="white" fontSize="3xl" fontWeight="bold">
              !
            </Text>
          </Box>
        );
      case "info":
        return (
          <Box
            w="60px"
            h="60px"
            borderRadius="full"
            bg="blue.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
            mb={4}
          >
            <Icon as={MdInfo} color="white" boxSize={8} />
          </Box>
        );
      default:
        return (
          <Box
            w="60px"
            h="60px"
            borderRadius="full"
            bg="blue.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
            mb={4}
          >
            <Icon as={MdInfo} color="white" boxSize={8} />
          </Box>
        );
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case "success":
        return "green.500";
      case "error":
        return "red.500";
      case "info":
        return "blue.500";
      default:
        return "blue.500";
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "success":
        return "green.500";
      case "error":
        return "#FF6B6B"; // Coral/reddish color like in the image
      case "info":
        return "blue.500";
      default:
        return "blue.500";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={hideModal} isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
      <ModalContent
        bg="white"
        borderRadius="16px"
        border="none"
        boxShadow="0 10px 30px rgba(0, 0, 0, 0.3)"
        maxW="400px"
        mx={4}
      >
        <ModalBody p={8} textAlign="center">
          {getIcon()}

          <Text fontSize="xl" fontWeight="bold" color={getHeaderColor()} mb={4}>
            {title}
          </Text>

          <Text fontSize="md" color="gray.700" lineHeight="1.6" mb={6}>
            {message}
          </Text>

          <Button
            bg={getButtonColor()}
            color="white"
            _hover={{ bg: getButtonColor(), opacity: 0.9 }}
            _active={{ bg: getButtonColor() }}
            borderRadius="8px"
            px={8}
            py={3}
            fontSize="md"
            fontWeight="500"
            onClick={hideModal}
            w="full"
          >
            Close
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ApiModal;
