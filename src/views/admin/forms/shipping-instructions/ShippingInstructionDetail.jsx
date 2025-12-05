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
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  FormControl,
  FormLabel,
  Select,
  Textarea,
} from "@chakra-ui/react";
import {
  MdPrint,
  MdSettings,
  MdChevronLeft,
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
  const bgColor = useColorModeValue("white", "gray.800");

  // Form state
  const [formData, setFormData] = useState({
    vessel: "M/V ANTHOS",
    consignTo: "M/V ANTHOS",
    careOf: "Narvi Maritime Pte. Ltd.",
    address1: "119 Airport Cargo Road #01-03/04",
    address2: "Changi Cargo Megaplex 1",
    postcode: "819454",
    city: "Singapore",
    att: "Zhi Lin GOH",
    phone: "(+65) 6542 0626",
    email: "spares@narvimaritime.com",
    siNo: "SI 2849 1.2",
    jobNo: "SO 2849",
    shippedBy: "AIR",
    from: "ROTTERDAM (RTM)",
    to: "SINGAPORE (SIN)",
    deadline: "27/04/25",
    pic: "IPN",
    date: "24/04/2025",
    selectConsignee: "Narvi SIN (A/F, C/F, O/F)",
    company: "C/o Narvi Maritime Pte. Ltd.",
    consigneeAddress1: "119 Airport Cargo Road #01-03/04",
    consigneeAddress2: "Changi Cargo Megaplex 1",
    consigneePostcode: "819454",
    consigneeCity: "Singapore",
    consigneeCountry: "Singapore",
    regNo: "2020082582",
    consigneeEmail: "spares@narvimaritime.com",
    consigneePhone: "(+65) 6542 0626",
    consigneePhone2: "",
    web: "www.narvimaritime.com",
    cneeText: "Ships Spares in transit for:",
    agentsPIC: "Zhi Lin GOH",
    warnings: "",
  });

  // Cargo items
  const [cargoItems, setCargoItems] = useState([
    {
      id: 1,
      origin: "PVG",
      warehouseId: "PVG-45778",
      supplier: "ATLANTIC ENG",
      poNumber: "07/1U",
      details: "",
      boxes: 1,
      kg: 1.00,
      cbm: 0.00,
      lwh: "20x13x16",
      ww: 0.69,
      stockItemId: "SL218224",
    },
    {
      id: 2,
      origin: "PVG",
      warehouseId: "PVG-45779",
      supplier: "ATLANTIC ENG",
      poNumber: "02/1U",
      details: "",
      boxes: 1,
      kg: 138.00,
      cbm: 0.16,
      lwh: "66x65x37",
      ww: 26.92,
      stockItemId: "SL218223",
    },
  ]);

  // Calculate totals
  const totals = {
    boxes: cargoItems.reduce((sum, item) => sum + item.boxes, 0),
    kg: cargoItems.reduce((sum, item) => sum + item.kg, 0),
    cbm: cargoItems.reduce((sum, item) => sum + item.cbm, 0),
    ww: cargoItems.reduce((sum, item) => sum + item.ww, 0),
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Button handlers
  const handleBackToShippingInstructions = () => {
    history.push("/admin/forms/shipping-instructions");
  };

  const handleSaveShippingInstruction = () => {
    // Save logic here
    alert("Shipping instruction saved successfully!");
  };

  const handlePrintShippingInstruction = () => {
    window.print();
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={bgColor} minH="100vh">
      <Box p={{ base: "4", md: "6", lg: "8" }} mx="auto">
        {/* Header with Back Button and Actions */}
        <Flex justify="space-between" align="center" mb={6}>
          <Button
            leftIcon={<Icon as={MdChevronLeft} />}
            variant="ghost"
            size="sm"
            onClick={handleBackToShippingInstructions}
          >
            Back
          </Button>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={MdPrint} />}
              variant="outline"
              size="sm"
              onClick={handlePrintShippingInstruction}
            >
              Print
            </Button>
          </HStack>
        </Flex>

        {/* Document Title */}
        <Text fontSize="2xl" fontWeight="bold" mb={6}>
          INSTRUCTION / CARGO MANIFEST FOR {formData.vessel}
        </Text>

        {/* Main Section: Two Columns (Left and Right) */}
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={4} mb={6}>
          {/* Left Section */}
          <Box>
            {/* Two Columns: CONSIGN TO and SI NO */}
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={4}>
              {/* Left Column: CONSIGN TO */}
              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={2}>CONSIGN TO:</Text>
                <VStack align="stretch" spacing={1} fontSize="sm">
                  <Text fontWeight="semibold">{formData.consignTo}</Text>
                  <Text>C/o {formData.careOf}</Text>
                  <Text>{formData.address1}</Text>
                  <Text>{formData.address2}</Text>
                  <Text>{formData.postcode} {formData.city}</Text>
                  <Text mt={2}>Att.: {formData.att}</Text>
                  <Text>Phone: {formData.phone}</Text>
                  <Text>E-mail: {formData.email}</Text>
                </VStack>
              </Box>

              {/* Right Column: SI NO Section */}
              <Box bg="orange.400" p={3} borderRadius="md">
                <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                  <Text fontWeight="bold" textTransform="uppercase" >
                    SI NO:
                  </Text>
                  <Text color="white" fontWeight="medium">
                    {formData.siNo}
                  </Text>

                  <Text fontWeight="bold" textTransform="uppercase" >
                    JOB NO:
                  </Text>
                  <Box bg="orange.200" px={2} py={1} borderRadius="sm">
                    <Text color="gray.800" fontWeight="medium">
                      {formData.jobNo}
                    </Text>
                  </Box>

                  <Text fontWeight="bold" textTransform="uppercase" >
                    TO BE SHIPPED BY:
                  </Text>
                  <Text color="white" fontWeight="medium">
                    {formData.shippedBy}
                  </Text>

                  <Text fontWeight="bold" textTransform="uppercase" >
                    FROM:
                  </Text>
                  <Text color="white" fontWeight="medium">
                    {formData.from}
                  </Text>

                  <Text fontWeight="bold" textTransform="uppercase" >
                    TO:
                  </Text>
                  <Text color="white" fontWeight="medium">
                    {formData.to}
                  </Text>

                  <Text fontWeight="bold" textTransform="uppercase" >
                    DEADLINE:
                  </Text>
                  <Text color="white" fontWeight="medium">
                    {formData.deadline} !!!!
                  </Text>

                  <Text fontWeight="bold" textTransform="uppercase" >
                    PIC:
                  </Text>
                  <Text color="white" fontWeight="medium">
                    {formData.pic}
                  </Text>

                  <Text fontWeight="bold" textTransform="uppercase" >
                    DATE:
                  </Text>
                  <Text color="white" fontWeight="medium">
                    {formData.date}
                  </Text>
                </Grid>
              </Box>
            </Grid>

            {/* Cargo Table Section - Full Width */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>
                CARGO TO BE INCLUDED IN THIS SHIPPING INSTRUCTION:
              </Text>
              <Box overflowX="auto">
                <Table variant="simple" size="sm" border="1px" borderColor="gray.300">
                  <Thead bg="gray.100">
                    <Tr>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">ORIGIN</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">WAREHOUSE ID</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">SUPPLIER</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">PO NUMBER</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">DETAILS</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">BOXES</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">KG</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">CBM</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">LWH</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" bg="yellow.200">WW</Th>
                      <Th py={2} px={2} fontSize="xs" fontWeight="bold">StockItemID</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {cargoItems.map((item, index) => (
                      <Tr key={item.id} bg={index % 2 === 0 ? "white" : "gray.50"}>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.origin}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.warehouseId}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.supplier}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.poNumber}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.details || ""}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.boxes}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.kg.toFixed(2)}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.cbm.toFixed(2)}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.lwh}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="yellow.100">{item.ww.toFixed(2)}</Td>
                        <Td py={2} px={2} fontSize="xs">{item.stockItemId}</Td>
                      </Tr>
                    ))}
                    {/* Summary Row */}
                    <Tr bg="gray.100" fontWeight="bold">
                      <Td colSpan={5} borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">
                        CARGO TO BE SHIPPED:
                      </Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{totals.boxes}</Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{totals.kg.toFixed(2)}</Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="yellow.100"></Td>
                      <Td py={2} px={2} fontSize="xs"></Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            </Box>
          </Box>

          {/* Right Section: Select Consignee */}
          <Box bg="orange.50" p={3} border="1px" borderColor="orange.200">
            <Text fontSize="sm" fontWeight="bold" mb={3}>Select Consignee:</Text>
            <Grid templateColumns="1fr 2fr" gap={2} fontSize="xs">
              <Box fontWeight="bold">Select Consignee:</Box>
              <Box>{formData.selectConsignee}</Box>

              <Box fontWeight="bold">Company:</Box>
              <Box>{formData.company}</Box>

              <Box fontWeight="bold">Address 1:</Box>
              <Box>{formData.consigneeAddress1}</Box>

              <Box fontWeight="bold">Address 2:</Box>
              <Box>{formData.consigneeAddress2}</Box>

              <Box fontWeight="bold">Post code:</Box>
              <Box>{formData.consigneePostcode}</Box>

              <Box fontWeight="bold">City:</Box>
              <Box>{formData.consigneeCity}</Box>

              <Box fontWeight="bold">Country:</Box>
              <Box>{formData.consigneeCountry}</Box>

              <Box fontWeight="bold">RegNo:</Box>
              <Box>{formData.regNo}</Box>

              <Box fontWeight="bold">E-mail 1:</Box>
              <Box>{formData.consigneeEmail}</Box>

              <Box fontWeight="bold">Phone 1:</Box>
              <Box>{formData.consigneePhone}</Box>

              <Box fontWeight="bold">Phone 2:</Box>
              <Box>{formData.consigneePhone2 || ""}</Box>

              <Box fontWeight="bold">Web:</Box>
              <Box>{formData.web}</Box>

              <Box fontWeight="bold">CNEE Text:</Box>
              <Box>{formData.cneeText}</Box>

              <Box fontWeight="bold">Agents PIC:</Box>
              <Box>{formData.agentsPIC}</Box>

              <Box fontWeight="bold">Warnings:</Box>
              <Box>{formData.warnings || ""}</Box>
            </Grid>
          </Box>
        </Grid>

        {/* Bottom Section */}
        <Flex justify="space-between" align="flex-start">
          <HStack spacing={2}>
            <Box bg="orange.200" px={3} py={2} fontSize="xs" fontWeight="bold">
              Change total value to:
            </Box>
            <Box bg="orange.200" px={3} py={2} fontSize="xs" fontWeight="bold">
              Remember to reset!
            </Box>
          </HStack>

          {/* Instructions Box */}
          <Box bg="blue.600" color="white" p={4} maxW="300px" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold" mb={2}>INSTRUCTIONS:</Text>
            <VStack align="stretch" spacing={1} fontSize="xs">
              <Text>All fields with white text must be filled in manually.</Text>
              <Text>If using the totals override remember to delete after use.</Text>
            </VStack>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}
