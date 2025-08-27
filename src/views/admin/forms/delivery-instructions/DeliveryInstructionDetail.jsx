import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Grid,
  Badge,
  Progress,
  IconButton,
  useColorModeValue,
  Icon,
} from "@chakra-ui/react";
import {
  MdPrint,
  MdSettings,
  MdChevronLeft,
  MdHelpOutline,
  MdSave,
} from "react-icons/md";

export default function DeliveryInstructionDetail() {
  const history = useHistory();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [deliveryInstruction, setDeliveryInstruction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Color mode values
  const textColor = useColorModeValue("gray.700", "white");

  // Load delivery instruction data
  useEffect(() => {
    const loadDeliveryInstruction = () => {
      const savedInstructions = JSON.parse(localStorage.getItem('deliveryInstructions') || '[]');
      const instruction = savedInstructions.find(item => item.id === parseInt(id));
      
      if (instruction) {
        setDeliveryInstruction(instruction);
        // Set current step based on status
        const statusSteps = ["Draft", "Confirmed", "In Transit", "Delivered"];
        const currentStepIndex = statusSteps.indexOf(instruction.status);
        setCurrentStep(Math.max(0, currentStepIndex));
      } else {
        // Fallback to mock data if not found
        setDeliveryInstruction({
          id: "DIS/00001",
          status: "Draft",
          vesselName: "Ajx",
          jobNumber: "JOB001",
          soNumber: "SO001",
          location: "Port of Los Angeles",
          dateIssued: "2024-01-15",
          deliveryDeadline: "2024-01-30",
          consigneeName: "Global Trading Co",
          consigneeAddress: "123 Harbor Drive, Los Angeles, CA 90210",
          specialInstructions: "Handle with care - fragile items",
          contactPerson: "John Smith",
          contactPhone: "+1-555-0123",
          contactEmail: "john.smith@globaltrading.com",
        });
      }
      setIsLoading(false);
    };

    loadDeliveryInstruction();
  }, [id]);

  const steps = ["Draft", "Confirmed", "In Transit", "Delivered"];

  const getStepColor = (stepIndex) => {
    if (stepIndex === currentStep) return "teal";
    if (stepIndex < currentStep) return "green";
    return "gray";
  };

  // Button handlers
  const handleBackToDeliveryInstructions = () => {
    history.push("/admin/forms/delivery-instructions");
  };

  const handleSaveDeliveryInstruction = () => {
    // Update the delivery instruction status
    if (deliveryInstruction) {
      const savedInstructions = JSON.parse(localStorage.getItem('deliveryInstructions') || '[]');
      const updatedInstructions = savedInstructions.map(item => 
        item.id === deliveryInstruction.id 
          ? { ...item, status: steps[currentStep] }
          : item
      );
      localStorage.setItem('deliveryInstructions', JSON.stringify(updatedInstructions));
      
      // Show success message
      alert("Delivery instruction status updated successfully!");
    }
  };

  const handlePrintDeliveryInstruction = () => {
    alert("Printing delivery instruction...");
  };

  if (isLoading) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">
        <Box bg="white" p={{ base: "4", md: "6" }}>
          <Text>Loading delivery instruction...</Text>
        </Box>
      </Box>
    );
  }

  if (!deliveryInstruction) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">
        <Box bg="white" p={{ base: "4", md: "6" }}>
          <Text>Delivery instruction not found.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">
      {/* Main Content Area */}
      <Box bg="white" p={{ base: "4", md: "6" }}>
        {/* Top Section with Back Button, Title, and Action Buttons */}
        <Flex
          justify="space-between"
          align="center"
          mb="6"
          flexDir={{ base: "column", lg: "row" }}
          gap={{ base: "4", lg: "0" }}
        >
          <HStack spacing="4">
            <Button
              leftIcon={<Icon as={MdChevronLeft} />}
              variant="ghost"
              size="sm"
              onClick={handleBackToDeliveryInstructions}
              _hover={{ bg: "gray.100" }}
            >
              Back to Delivery Instructions
            </Button>
            <HStack spacing="2">
              <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                Delivery Instruction Detail
              </Text>
              <IconButton
                size="xs"
                icon={<Icon as={MdSettings} color={textColor} />}
                variant="ghost"
                aria-label="Settings"
                _hover={{ bg: "gray.100" }}
              />
            </HStack>
          </HStack>

          {/* Action Buttons */}
          <HStack spacing="3">
            <Button
              leftIcon={<Icon as={MdSave} />}
              bg="#1c4a95"
              color="white"
              size="sm"
              px="6"
              py="3"
              borderRadius="md"
              _hover={{ bg: "#173f7c" }}
              onClick={handleSaveDeliveryInstruction}
            >
              Save
            </Button>
            <Button
              leftIcon={<Icon as={MdPrint} />}
              variant="outline"
              size="sm"
              px="6"
              py="3"
              borderRadius="md"
              onClick={handlePrintDeliveryInstruction}
            >
              Print
            </Button>
          </HStack>
        </Flex>

        {/* Content Area */}
        <Box>
          {/* Status Progress */}
          <Box mb={6}>
            <HStack spacing={4} mb={4}>
              {steps.map((step, index) => (
                <Badge
                  key={step}
                  colorScheme={getStepColor(index)}
                  px={4}
                  py={2}
                  borderRadius="full"
                  fontSize="sm"
                >
                  {step}
                </Badge>
              ))}
            </HStack>
            <Progress
              value={(currentStep / (steps.length - 1)) * 100}
              colorScheme="teal"
              size="sm"
              borderRadius="full"
            />
          </Box>

          {/* Instruction Reference */}
          <Box mb={6}>
            <HStack spacing={2} mb={2}>
              <Text fontSize="lg" fontWeight="bold">
                Delivery Instruction Reference?
              </Text>
              <Icon as={MdHelpOutline} color="gray.400" />
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color="#1c4a95">
              {deliveryInstruction.id}
            </Text>
          </Box>

          <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
            {/* DELIVERY INFO */}
            <Box
              bg="gray.50"
              p={6}
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
            >
              <Text fontSize="lg" fontWeight="bold" mb={4}>
                DELIVERY INFO
              </Text>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Vessel Name?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.vesselName}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Job Number?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.jobNumber}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      SO Number?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.soNumber}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Location?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.location}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Date Issued?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.dateIssued}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Delivery Deadline?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.deliveryDeadline}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* CONSIGNEE INFO */}
            <Box
              bg="gray.50"
              p={6}
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
            >
              <Text fontSize="lg" fontWeight="bold" mb={4}>
                CONSIGNEE INFO
              </Text>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Consignee Name?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.consigneeName}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Contact Person?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.contactPerson}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Contact Phone?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.contactPhone}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Contact Email?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.contactEmail}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Consignee Address?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.consigneeAddress}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Special Instructions?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {deliveryInstruction.specialInstructions || "-"}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
