import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Grid,
  Badge,
  Icon,
  IconButton,
  useColorModeValue,
  // div,
  Input,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from "@chakra-ui/react";

// Custom components
import Card from "components/card/Card";

import {
  MdArrowBack,
  MdSettings,
  MdAdd,
  MdEdit,
  MdPrint,
  MdAttachMoney,
  MdCreditCard,
  MdLocalShipping,
  MdEdit as MdEditIcon,
  MdPerson,
  MdBusiness,
} from "react-icons/md";
import tableDataCustomer from "views/admin/contacts/variables/tableDataCustomer.json";

export default function CustomerDetail() {
  const { id } = useParams();
  const history = useHistory();
  const toast = useToast();
  const [customer, setCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");

  useEffect(() => {
    // Find customer by ID
    const foundCustomer = tableDataCustomer.find(c => c.id === id);
    if (foundCustomer) {
      setCustomer(foundCustomer);
      setEditData(foundCustomer);
    }
  }, [id]);

  const handleSave = () => {
    // Here you would typically save to your backend
    console.log("Saving customer:", editData);

    toast({
      title: "Customer Updated",
      description: "Customer information has been successfully updated.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    setCustomer(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(customer);
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  if (!customer) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
        <Text>Customer not found</Text>
      </Box>
    );
  }

  const formatAddress = (address) => {
    if (!address) return "";
    const parts = [
      address.street1,
      address.street2,
      address.city,
      address.state,
      address.zip,
      address.country
    ].filter(part => part && part.trim());
    return parts.join("\n");
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Card>
          <div>
            <Flex justify="space-between" align="center" mb={6}>
              <HStack spacing={4}>
                <Button
                  leftIcon={<Icon as={MdArrowBack} />}
                  variant="ghost"
                  onClick={() => history.goBack()}
                >
                  Back
                </Button>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.500">
                    Customers
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    {customer.name}
                  </Text>
                </VStack>
              </HStack>
              <HStack spacing={2}>
                <IconButton
                  icon={<Icon as={MdSettings} />}
                  variant="ghost"
                  aria-label="Settings"
                />
                <Button
                  leftIcon={<Icon as={MdAdd} />}
                  colorScheme="blue"
                  size="sm"
                >
                  New
                </Button>
              </HStack>
            </Flex>

            {/* Quick Stats */}
            <Grid templateColumns="repeat(5, 1fr)" gap={4} mb={6}>
              <HStack spacing={2}>
                <Icon as={MdAttachMoney} color="green.500" />
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Sales</Text>
                  <Text fontSize="sm" fontWeight="bold">{customer.sales}</Text>
                </VStack>
              </HStack>
              <HStack spacing={2}>
                <Icon as={MdCreditCard} color="blue.500" />
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Purchases</Text>
                  <Text fontSize="sm" fontWeight="bold">{customer.purchases}</Text>
                </VStack>
              </HStack>
              <HStack spacing={2}>
                <Icon as={MdLocalShipping} color="orange.500" />
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">On-time Rate</Text>
                  <Text fontSize="sm" fontWeight="bold">{customer.onTimeRate}</Text>
                </VStack>
              </HStack>
              <HStack spacing={2}>
                <Icon as={MdEditIcon} color="purple.500" />
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Invoiced</Text>
                  <Text fontSize="sm" fontWeight="bold">{customer.invoiced}</Text>
                </VStack>
              </HStack>
              <HStack spacing={2}>
                <Icon as={MdEditIcon} color="gray.500" />
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Partner Ledger</Text>
                  <Text fontSize="sm" fontWeight="bold">-</Text>
                </VStack>
              </HStack>
            </Grid>

            {/* Pagination */}
            <Flex justify="center" align="center">
              <HStack spacing={2}>
                <IconButton
                  icon={<Icon as={MdArrowBack} />}
                  size="sm"
                  variant="ghost"
                  aria-label="Previous"
                />
                <Text fontSize="sm">1/3</Text>
                <IconButton
                  icon={<Icon as={MdArrowBack} />}
                  size="sm"
                  variant="ghost"
                  aria-label="Next"
                  transform="rotate(180deg)"
                />
              </HStack>
            </Flex>
          </div>
        </Card>

        {/* Customer Details */}
        <Card>
          <div>
            <Flex justify="space-between" align="start" mb={6}>
              <VStack align="start" spacing={4} flex={1}>
                {/* Customer Type */}
                <HStack spacing={4}>
                  <HStack spacing={2}>
                    <input
                      type="radio"
                      name="customerType"
                      value="Individual"
                      checked={editData.customerType === "Individual"}
                      onChange={(e) => handleInputChange('customerType', e.target.value)}
                      disabled={!isEditing}
                    />
                    <Icon as={MdPerson} />
                    <Text fontSize="sm">Individual</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <input
                      type="radio"
                      name="customerType"
                      value="Company"
                      checked={editData.customerType === "Company"}
                      onChange={(e) => handleInputChange('customerType', e.target.value)}
                      disabled={!isEditing}
                    />
                    <Icon as={MdBusiness} />
                    <Text fontSize="sm">Company</Text>
                  </HStack>
                </HStack>

                {/* Customer Name */}
                <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                  {isEditing ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      fontSize="2xl"
                      fontWeight="bold"
                      variant="unstyled"
                      p={0}
                    />
                  ) : (
                    customer.name
                  )}
                </Text>

                {/* Two Column Layout */}
                <Grid templateColumns="repeat(2, 1fr)" gap={8} w="100%">
                  {/* Left Column */}
                  <VStack align="start" spacing={4}>
                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Address
                      </FormLabel>
                      {isEditing ? (
                        <VStack align="start" spacing={2}>
                          <Input
                            placeholder="Street 1"
                            value={editData.address?.street1 || ""}
                            onChange={(e) => handleAddressChange('street1', e.target.value)}
                          />
                          <Input
                            placeholder="Street 2"
                            value={editData.address?.street2 || ""}
                            onChange={(e) => handleAddressChange('street2', e.target.value)}
                          />
                          <Input
                            placeholder="City"
                            value={editData.address?.city || ""}
                            onChange={(e) => handleAddressChange('city', e.target.value)}
                          />
                          <Input
                            placeholder="State"
                            value={editData.address?.state || ""}
                            onChange={(e) => handleAddressChange('state', e.target.value)}
                          />
                          <Input
                            placeholder="ZIP"
                            value={editData.address?.zip || ""}
                            onChange={(e) => handleAddressChange('zip', e.target.value)}
                          />
                          <Input
                            placeholder="Country"
                            value={editData.address?.country || ""}
                            onChange={(e) => handleAddressChange('country', e.target.value)}
                          />
                        </VStack>
                      ) : (
                        <Text fontSize="sm" whiteSpace="pre-line">
                          {formatAddress(customer.address)}
                        </Text>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Tax ID?
                      </FormLabel>
                      {isEditing ? (
                        <Input
                          value={editData.taxId || ""}
                          onChange={(e) => handleInputChange('taxId', e.target.value)}
                        />
                      ) : (
                        <Text fontSize="sm">{customer.taxId || "-"}</Text>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Email2?
                      </FormLabel>
                      {isEditing ? (
                        <Input
                          value={editData.email2 || ""}
                          onChange={(e) => handleInputChange('email2', e.target.value)}
                        />
                      ) : (
                        <Text fontSize="sm">{customer.email2 || "-"}</Text>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Phone2?
                      </FormLabel>
                      {isEditing ? (
                        <Input
                          value={editData.phone2 || ""}
                          onChange={(e) => handleInputChange('phone2', e.target.value)}
                        />
                      ) : (
                        <Text fontSize="sm">{customer.phone2 || "-"}</Text>
                      )}
                    </FormControl>
                  </VStack>

                  {/* Right Column */}
                  <VStack align="start" spacing={4}>
                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Phone?
                      </FormLabel>
                      {isEditing ? (
                        <Input
                          value={editData.phone || ""}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      ) : (
                        <Text fontSize="sm">{customer.phone}</Text>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Mobile?
                      </FormLabel>
                      {isEditing ? (
                        <Input
                          value={editData.mobile || ""}
                          onChange={(e) => handleInputChange('mobile', e.target.value)}
                        />
                      ) : (
                        <Text fontSize="sm">{customer.mobile || "-"}</Text>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Email?
                      </FormLabel>
                      {isEditing ? (
                        <Input
                          value={editData.email || ""}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      ) : (
                        <Text fontSize="sm">{customer.email}</Text>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Website?
                      </FormLabel>
                      {isEditing ? (
                        <Input
                          value={editData.website || ""}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                        />
                      ) : (
                        <Text fontSize="sm">{customer.website || "-"}</Text>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" color="gray.600">
                        Tags?
                      </FormLabel>
                      <HStack spacing={2} flexWrap="wrap">
                        {customer.tags?.map((tag, index) => (
                          <Badge
                            key={index}
                            colorScheme="green"
                            variant="subtle"
                            fontSize="xs"
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {tag}
                            {isEditing && (
                              <IconButton
                                size="xs"
                                variant="ghost"
                                icon={<Text fontSize="xs">×</Text>}
                                ml={1}
                                onClick={() => {
                                  const newTags = editData.tags.filter((_, i) => i !== index);
                                  handleInputChange('tags', newTags);
                                }}
                              />
                            )}
                          </Badge>
                        ))}
                        {isEditing && (
                          <Button size="xs" variant="ghost" colorScheme="blue">
                            + Add Tag
                          </Button>
                        )}
                      </HStack>
                    </FormControl>
                  </VStack>
                </Grid>
              </VStack>

              {/* Customer Logo/Avatar */}
              <Box
                w="80px"
                h="80px"
                bg="gray.100"
                borderRadius="md"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                border="1px solid"
                borderColor={borderColor}
              >
                <Text fontSize="2xl" fontWeight="bold" color="gray.600">
                  {customer.name.charAt(0)}
                </Text>
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  {customer.name}
                </Text>
              </Box>
            </Flex>

            {/* Action Buttons */}
            <Flex justify="end" spacing={2} mt={6}>
              {isEditing ? (
                <HStack spacing={2}>
                  <Button variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button colorScheme="blue" onClick={handleSave}>
                    Save
                  </Button>
                </HStack>
              ) : (
                <HStack spacing={2}>
                  <Button
                    leftIcon={<Icon as={MdEdit} />}
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button leftIcon={<Icon as={MdPrint} />} variant="ghost">
                    Print
                  </Button>
                </HStack>
              )}
            </Flex>
          </div>
        </Card>

        {/* Tabs */}
        <Card>
          <div>
            <Tabs>
              <TabList>
                <Tab>Contacts & Addresses</Tab>
                <Tab>Agency Info</Tab>
                <Tab>People</Tab>
                <Tab>Sales & Purchase</Tab>
                <Tab>Accounting</Tab>
                <Tab>Internal Notes</Tab>
                <Tab>Partner Assignment</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Text>Contacts & Addresses content</Text>
                </TabPanel>
                <TabPanel>
                  <Text>Agency Info content</Text>
                </TabPanel>
                <TabPanel>
                  <Text>People content</Text>
                </TabPanel>
                <TabPanel>
                  <Text>Sales & Purchase content</Text>
                </TabPanel>
                <TabPanel>
                  <Text>Accounting content</Text>
                </TabPanel>
                <TabPanel>
                  <Text>Internal Notes content</Text>
                </TabPanel>
                <TabPanel>
                  <Text>Partner Assignment content</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
            <Flex justify="end" mt={4}>
              <Button leftIcon={<Icon as={MdAdd} />} size="sm">
                Add
              </Button>
            </Flex>
          </div>
        </Card>
      </VStack>
    </Box>
  );
}
