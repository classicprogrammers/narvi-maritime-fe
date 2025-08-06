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
  GridItem,
  Badge,
  Progress,
  IconButton,
  useColorModeValue,
  Divider,
  Avatar,
  Icon,
} from "@chakra-ui/react";
import {
  MdPrint,
  MdSettings,
  MdChevronLeft,
  MdChevronRight,
  MdHelpOutline,
  MdSave,
} from "react-icons/md";

export default function ShippingInstructionDetail() {
  const history = useHistory();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingInstruction, setShippingInstruction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Color mode values
  const textColor = useColorModeValue("gray.700", "white");

  // Load shipping instruction data
  useEffect(() => {
    const loadShippingInstruction = () => {
      const savedInstructions = JSON.parse(localStorage.getItem('shippingInstructions') || '[]');
      const instruction = savedInstructions.find(item => item.id === parseInt(id));
      
      if (instruction) {
        setShippingInstruction(instruction);
        // Set current step based on status
        const statusSteps = ["Draft", "Confirmed", "In Transit", "Done"];
        const currentStepIndex = statusSteps.indexOf(instruction.status);
        setCurrentStep(Math.max(0, currentStepIndex));
      } else {
        // Fallback to mock data if not found
        setShippingInstruction({
          id: "SIS/0001",
          status: "Draft",
          salesOrder: "S00025",
          shipmentType: "Single",
          jobNo: "",
          vessel: "",
          modeOfTransport: "Sea",
          from: "",
          to: "",
          consigneeType: "",
          client: "Deco Addict",
          company: "",
          addressLine1: "",
          addressLine2: "",
          postcode: "",
          city: "",
        });
      }
      setIsLoading(false);
    };

    loadShippingInstruction();
  }, [id]);

  const steps = ["Draft", "Confirmed", "In Transit", "Done"];

  const getStepColor = (stepIndex) => {
    if (stepIndex === currentStep) return "teal";
    if (stepIndex < currentStep) return "green";
    return "gray";
  };

  // Button handlers
  const handleBackToShippingInstructions = () => {
    history.push("/admin/forms/shipping-instructions");
  };

  const handleSaveShippingInstruction = () => {
    // Update the shipping instruction status
    if (shippingInstruction) {
      const savedInstructions = JSON.parse(localStorage.getItem('shippingInstructions') || '[]');
      const updatedInstructions = savedInstructions.map(item => 
        item.id === shippingInstruction.id 
          ? { ...item, status: steps[currentStep] }
          : item
      );
      localStorage.setItem('shippingInstructions', JSON.stringify(updatedInstructions));
      
      // Show success message
      alert("Shipping instruction status updated successfully!");
    }
  };

  const handlePrintShippingInstruction = () => {
    alert("Printing shipping instruction...");
  };

  if (isLoading) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">
        <Box bg="white" p={{ base: "4", md: "6" }}>
          <Text>Loading shipping instruction...</Text>
        </Box>
      </Box>
    );
  }

  if (!shippingInstruction) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">
        <Box bg="white" p={{ base: "4", md: "6" }}>
          <Text>Shipping instruction not found.</Text>
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
              onClick={handleBackToShippingInstructions}
              _hover={{ bg: "gray.100" }}
            >
              Back to Shipping Instructions
            </Button>
            <HStack spacing="2">
              <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                Shipping Instruction Detail
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
              onClick={handleSaveShippingInstruction}
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
              onClick={handlePrintShippingInstruction}
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
                Instruction Reference?
              </Text>
              <Icon as={MdHelpOutline} color="gray.400" />
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color="#1c4a95">
              {shippingInstruction.id}
            </Text>
          </Box>

          <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
            {/* SHIPMENT INFO */}
            <Box
              bg="gray.50"
              p={6}
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
            >
              <Text fontSize="lg" fontWeight="bold" mb={4}>
                SHIPMENT INFO
              </Text>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Sales Order?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.salesOrder}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Shipment Type?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.shipmentType}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Job No ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.jobNo || "-"}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Vessel ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.vessel || "-"}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Mode of Transport?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.modeOfTransport}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      From ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.from || "-"}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      To ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.to || "-"}
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
                      Consignee Type ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.consigneeType || "-"}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Client ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.client}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Company ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.company || "-"}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Address Line 1 ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.addressLine1 || "-"}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Address Line 2 ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.addressLine2 || "-"}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      Postcode ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.postcode || "-"}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      City ?
                    </Text>
                    <Icon as={MdHelpOutline} color="gray.400" />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {shippingInstruction.city || "-"}
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
