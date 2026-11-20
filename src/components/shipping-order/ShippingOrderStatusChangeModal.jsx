import React, { useEffect, useState } from "react";
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  HStack,
  Text,
} from "@chakra-ui/react";
import DateField from "components/forms/DateField";
import {
  normalizeCaseCloseDate,
  normalizePodReceived,
  validateStatusChangeInput,
} from "../../utils/shippingOrderStatusChange";
import { formatDateDMY } from "utils/dateFormat";

/**
 * Asks for the SO case close date and POD received before an Active SO is closed.
 * NO -> Pending POD, YES -> Ready for Invoice (the backend sets the final status).
 */
export default function ShippingOrderStatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  originalCaseCloseDate,
  initialCaseCloseDate,
  initialPodReceived,
}) {
  const existingDate = normalizeCaseCloseDate(originalCaseCloseDate);
  const [caseCloseDate, setCaseCloseDate] = useState("");
  const [podReceived, setPodReceived] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setCaseCloseDate(existingDate || normalizeCaseCloseDate(initialCaseCloseDate));
    setPodReceived(normalizePodReceived(initialPodReceived));
    setError("");
  }, [isOpen, existingDate, initialCaseCloseDate, initialPodReceived]);

  const handleConfirm = () => {
    const message = validateStatusChangeInput({ caseCloseDate, podReceived });
    if (message) {
      setError(message);
      return;
    }
    onConfirm({ caseCloseDate, podReceived });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Close shipping order</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb="4" isInvalid={!!error && !caseCloseDate}>
            <FormLabel>SO Case Close Date</FormLabel>
            {existingDate ? (
              <Text>{formatDateDMY(existingDate)}</Text>
            ) : (
              <DateField
                value={caseCloseDate}
                onChange={(e) => {
                  setCaseCloseDate(e.target.value);
                  setError("");
                }}
              />
            )}
          </FormControl>
          <FormControl isInvalid={!!error && !!caseCloseDate}>
            <FormLabel>Have we received the POD?</FormLabel>
            <RadioGroup
              value={podReceived === null ? "" : podReceived ? "yes" : "no"}
              onChange={(value) => {
                setPodReceived(value === "yes");
                setError("");
              }}
            >
              <HStack spacing="6">
                <Radio value="yes">Yes</Radio>
                <Radio value="no">No</Radio>
              </HStack>
            </RadioGroup>
            {error && <FormErrorMessage>{error}</FormErrorMessage>}
          </FormControl>
          {error && !caseCloseDate && (
            <Text color="red.500" fontSize="sm" mt="2">
              {error}
            </Text>
          )}
          <Text fontSize="sm" color="gray.500" mt="4">
            No sets the status to Pending POD. Yes sets it to Ready for Invoice.
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr="3" onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleConfirm}>
            Confirm
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
