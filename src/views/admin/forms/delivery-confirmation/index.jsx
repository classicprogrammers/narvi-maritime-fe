import React, { useState } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Grid,
  GridItem,
  Input,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  IconButton,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdPrint,
  MdSettings,
  MdArrowBack,
  MdArrowForward,
  MdHelp,
  MdAttachFile,
} from "react-icons/md";

export default function DeliveryConfirmation() {
  const [currentRecord, setCurrentRecord] = useState(1);
  const [totalRecords, setTotalRecords] = useState(1);
  const [status, setStatus] = useState("Draft");
  const [formData, setFormData] = useState({
    reference: "DCS/00001",
    deliveryDate: "08/11/2025",
    shipmentType: "Single Shipment",
    receiverPIC: "",
    jobNumber: "",
    pic: "",
    vesselName: "",
    deliveryLocation: "",
    launchStation: "",
    linkedPicking: "WH/OUT/00015",
    selectAgent: "",
    notesInstructions: "",
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrint = () => {
    // Handle print functionality
    console.log("Printing delivery confirmation...");
  };

  const handleSave = () => {
    // Handle save functionality
    console.log("Saving delivery confirmation...");
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        {/* Header Section */}
        <Flex justify="space-between" align="center" px="25px">
          <HStack spacing={4}>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="purple"
              variant="solid"
              size="sm"
            >
              New
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                Delivery Confirmations
              </Text>
              <HStack spacing={2}>
                <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                  {formData.reference}
                </Text>
                <Icon as={MdSettings} color="gray.500" />
              </HStack>
            </VStack>
          </HStack>
          
          <HStack spacing={4}>
            <HStack spacing={2}>
              <Text fontSize="sm" color="gray.600">
                {currentRecord}/{totalRecords}
              </Text>
              <IconButton
                icon={<Icon as={MdArrowBack} />}
                size="sm"
                variant="ghost"
                aria-label="Previous"
              />
              <IconButton
                icon={<Icon as={MdArrowForward} />}
                size="sm"
                variant="ghost"
                aria-label="Next"
              />
            </HStack>
            <HStack spacing={2}>
              <Button
                size="sm"
                variant={status === "Draft" ? "outline" : "ghost"}
                colorScheme="teal"
                onClick={() => setStatus("Draft")}
              >
                Draft
              </Button>
              <Button
                size="sm"
                variant={status === "Closed" ? "outline" : "ghost"}
                colorScheme="gray"
                onClick={() => setStatus("Closed")}
              >
                Closed
              </Button>
            </HStack>
          </HStack>
        </Flex>

        {/* Action Bar */}
        <Box px="25px">
          <Button
            leftIcon={<Icon as={MdPrint} />}
            colorScheme="purple"
            size="md"
            onClick={handlePrint}
          >
            Print Delivery Confirmation
          </Button>
        </Box>

        {/* Main Content */}
        <Box px="25px">
          <VStack spacing={6} align="stretch">
            {/* Reference Section */}
            <Box>
              <HStack spacing={2} mb={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Reference?
                </Text>
                <Icon as={MdHelp} color="gray.400" w="4" h="4" />
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" color="black">
                {formData.reference}
              </Text>
            </Box>

            {/* Form Fields */}
            <Grid templateColumns="repeat(2, 1fr)" gap={8}>
              {/* Left Column - Delivery Details */}
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Delivery Date?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Input
                    value={formData.deliveryDate}
                    onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Shipment Type?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Select
                    value={formData.shipmentType}
                    onChange={(e) => handleInputChange("shipmentType", e.target.value)}
                    size="md"
                  >
                    <option value="Single Shipment">Single Shipment</option>
                    <option value="Multiple Shipment">Multiple Shipment</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Receiver / PIC?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Input
                    value={formData.receiverPIC}
                    onChange={(e) => handleInputChange("receiverPIC", e.target.value)}
                    placeholder="Enter receiver/PIC"
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Job Number?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Input
                    value={formData.jobNumber}
                    onChange={(e) => handleInputChange("jobNumber", e.target.value)}
                    placeholder="Enter job number"
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      PIC?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Input
                    value={formData.pic}
                    onChange={(e) => handleInputChange("pic", e.target.value)}
                    placeholder="Enter PIC"
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Vessel Name?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Input
                    value={formData.vesselName}
                    onChange={(e) => handleInputChange("vesselName", e.target.value)}
                    placeholder="Enter vessel name"
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Delivery Location?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Input
                    value={formData.deliveryLocation}
                    onChange={(e) => handleInputChange("deliveryLocation", e.target.value)}
                    placeholder="Enter delivery location"
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Launch Station?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Input
                    value={formData.launchStation}
                    onChange={(e) => handleInputChange("launchStation", e.target.value)}
                    placeholder="Enter launch station"
                    size="md"
                  />
                </FormControl>
              </VStack>

              {/* Right Column - Linked Information */}
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Linked Picking?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Input
                    value={formData.linkedPicking}
                    onChange={(e) => handleInputChange("linkedPicking", e.target.value)}
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Select Agent?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Select
                    value={formData.selectAgent}
                    onChange={(e) => handleInputChange("selectAgent", e.target.value)}
                    placeholder="Select agent"
                    size="md"
                  >
                    <option value="agent1">Agent 1</option>
                    <option value="agent2">Agent 2</option>
                    <option value="agent3">Agent 3</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <HStack spacing={2} mb={2}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.600" mb={0}>
                      Notes / Instructions?
                    </FormLabel>
                    <Icon as={MdHelp} color="gray.400" w="4" h="4" />
                  </HStack>
                  <Textarea
                    value={formData.notesInstructions}
                    onChange={(e) => handleInputChange("notesInstructions", e.target.value)}
                    placeholder="Enter notes or instructions"
                    size="md"
                    minH="200px"
                  />
                </FormControl>
              </VStack>
            </Grid>

            {/* Navigation Arrow */}
            <Flex justify="flex-end">
              <IconButton
                icon={<Icon as={MdArrowForward} />}
                size="lg"
                colorScheme="gray"
                variant="solid"
                borderRadius="full"
                aria-label="Next"
              />
            </Flex>

            {/* Tabs */}
            <Tabs>
              <TabList>
                <Tab>Cargo Lines</Tab>
                <Tab>Attachments</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Stock Item ID</Th>
                          <Th>Warehouse ID</Th>
                          <Th>AWB Number</Th>
                          <Th>From</Th>
                          <Th>Supplier</Th>
                          <Th>PO Number</Th>
                          <Th>Boxes</Th>
                          <Th>Weight (...)</Th>
                          <Th>Dimensions (LxWxH)</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {/* Empty table body - will be populated with cargo lines */}
                      </Tbody>
                    </Table>
                    <Button
                      leftIcon={<Icon as={MdAdd} />}
                      colorScheme="blue"
                      variant="ghost"
                      size="sm"
                    >
                      Add a line
                    </Button>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Button
                      leftIcon={<Icon as={MdAttachFile} />}
                      colorScheme="blue"
                      variant="ghost"
                      size="sm"
                    >
                      Add Attachment
                    </Button>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
