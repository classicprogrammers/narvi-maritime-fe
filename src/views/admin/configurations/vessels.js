import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  HStack,
  VStack,
  IconButton,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  useToast,
  Tooltip,
  Select,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Collapse,
  Badge,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdDirectionsBoat,
} from "react-icons/md";
import vesselsAPI from "../../../api/vessels";
import { getStockListApi } from "../../../api/stock";
import destinationsAPI from "../../../api/destinations";
import countriesAPI from "../../../api/countries";
import { getVendorsApi } from "../../../api/vendor";
import { getCustomersApi } from "../../../api/customer";
import SearchableSelect from "../../../components/forms/SearchableSelect";

export default function Vessels() {
  const [vessels, setVessels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingVessel, setEditingVessel] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteVesselId, setDeleteVesselId] = useState(null);
  const [showVesselLines, setShowVesselLines] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState(null);

  // API data state
  const [stockItems, setStockItems] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [countries, setCountries] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);

  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const toast = useToast();

  const textColor = useColorModeValue("gray.700", "white");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.700", "white");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    status: "pending",
    vessel_line_ids: []
  });

  // Vessel line form state
  const [vesselLineForm, setVesselLineForm] = useState({
    name: "",
    client_id: "",
    status: "stock",
    stock_item_id: "",
    supplier_id: "",
    po_number_ids: [],
    so_number_id: "",
    shipping_instruction_id: "",
    shipment_type: "single",
    delivery_instruction_id: "",
    origin: "",
    via_hub: "",
    ap_destination: "",
    destination: "",
    warehouse_id: "",
    ready_ex_supplier: ""
  });

  // Fetch vessels
  const fetchVessels = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await vesselsAPI.getVessels();
      if (response.vessels && Array.isArray(response.vessels)) {
        setVessels(response.vessels);
      } else {
        setVessels([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch vessels: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setVessels([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch API data for dropdowns
  const fetchApiData = useCallback(async () => {
    try {
      setIsLoadingApiData(true);

      // Fetch all API data in parallel
      const [stockResponse, destinationsResponse, countriesResponse, vendorsResponse, customersResponse] = await Promise.allSettled([
        getStockListApi(),
        destinationsAPI.getDestinations(),
        countriesAPI.getCountries(),
        getVendorsApi(),
        getCustomersApi()
      ]);

      // Handle stock items
      if (stockResponse.status === 'fulfilled' && stockResponse.value) {
        const stockData = stockResponse.value.stock_list || stockResponse.value;
        setStockItems(Array.isArray(stockData) ? stockData : []);
      }

      // Handle destinations
      if (destinationsResponse.status === 'fulfilled' && destinationsResponse.value) {
        const destData = destinationsResponse.value.destinations || destinationsResponse.value;
        setDestinations(Array.isArray(destData) ? destData : []);
      }

      // Handle countries
      if (countriesResponse.status === 'fulfilled' && countriesResponse.value) {
        const countriesData = countriesResponse.value.countries || countriesResponse.value;
        setCountries(Array.isArray(countriesData) ? countriesData : []);
      }

      // Handle vendors
      if (vendorsResponse.status === 'fulfilled' && vendorsResponse.value) {
        const vendorsData = vendorsResponse.value.vendors || vendorsResponse.value;
        setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      }

      // Handle customers
      if (customersResponse.status === 'fulfilled' && customersResponse.value) {
        const customersData = customersResponse.value.customers || customersResponse.value;
        setCustomers(Array.isArray(customersData) ? customersData : []);
      }

    } catch (error) {
      console.error("Error fetching API data:", error);
      toast({
        title: "Warning",
        description: "Some dropdown data could not be loaded",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingApiData(false);
    }
  }, [toast]);

  // Load vessels and API data on component mount
  useEffect(() => {
    fetchVessels();
    fetchApiData();
  }, [fetchVessels, fetchApiData]);

  // Filter vessels based on search
  const filteredVessels = useMemo(() => {
    if (!searchValue) return vessels;
    return vessels.filter(vessel =>
      vessel.name?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [vessels, searchValue]);

  // Pagination logic
  const totalPages = Math.ceil(filteredVessels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVessels = filteredVessels.slice(startIndex, endIndex);

  // Reset to first page when search or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, itemsPerPage]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle vessel line form input changes
  const handleVesselLineInputChange = (field, value) => {
    setVesselLineForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add vessel line
  const addVesselLine = () => {
    if (!vesselLineForm.name.trim()) {
      toast({
        title: "Error",
        description: "Vessel line name is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newLine = { ...vesselLineForm };
    setFormData(prev => ({
      ...prev,
      vessel_line_ids: [...prev.vessel_line_ids, newLine]
    }));

    // Reset vessel line form
    setVesselLineForm({
      name: "",
      client_id: "",
      status: "stock",
      stock_item_id: "",
      supplier_id: "",
      po_number_ids: [],
      so_number_id: "",
      shipping_instruction_id: "",
      shipment_type: "single",
      delivery_instruction_id: "",
      origin: "",
      via_hub: "",
      ap_destination: "",
      destination: "",
      warehouse_id: "",
      ready_ex_supplier: ""
    });

    // Auto-collapse the vessel lines section after adding
    setShowVesselLines(false);

    toast({
      title: "Success",
      description: "Vessel line added successfully",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  // Edit vessel line
  const editVesselLine = (index) => {
    const line = formData.vessel_line_ids[index];
    setVesselLineForm(line);
    setEditingLineIndex(index);
  };

  // Update vessel line
  const updateVesselLine = () => {
    if (!vesselLineForm.name.trim()) {
      toast({
        title: "Error",
        description: "Vessel line name is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const updatedLines = [...formData.vessel_line_ids];
    updatedLines[editingLineIndex] = { ...vesselLineForm };

    setFormData(prev => ({
      ...prev,
      vessel_line_ids: updatedLines
    }));

    // Reset vessel line form
    setVesselLineForm({
      name: "",
      client_id: "",
      status: "stock",
      stock_item_id: "",
      supplier_id: "",
      po_number_ids: [],
      so_number_id: "",
      shipping_instruction_id: "",
      shipment_type: "single",
      delivery_instruction_id: "",
      origin: "",
      via_hub: "",
      ap_destination: "",
      destination: "",
      warehouse_id: "",
      ready_ex_supplier: ""
    });
    setEditingLineIndex(null);

    // Auto-collapse the vessel lines section after updating
    setShowVesselLines(false);

    toast({
      title: "Success",
      description: "Vessel line updated successfully",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  // Remove vessel line
  const removeVesselLine = (index) => {
    const updatedLines = formData.vessel_line_ids.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      vessel_line_ids: updatedLines
    }));

    toast({
      title: "Success",
      description: "Vessel line removed successfully",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  // Cancel vessel line editing
  const cancelVesselLineEdit = () => {
    setVesselLineForm({
      name: "",
      client_id: "",
      status: "stock",
      stock_item_id: "",
      supplier_id: "",
      po_number_ids: [],
      so_number_id: "",
      shipping_instruction_id: "",
      shipment_type: "single",
      delivery_instruction_id: "",
      origin: "",
      via_hub: "",
      ap_destination: "",
      destination: "",
      warehouse_id: "",
      ready_ex_supplier: ""
    });
    setEditingLineIndex(null);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      client_id: "",
      status: "pending",
      vessel_line_ids: []
    });
    setVesselLineForm({
      name: "",
      client_id: "",
      status: "stock",
      stock_item_id: "",
      supplier_id: "",
      po_number_ids: [],
      so_number_id: "",
      shipping_instruction_id: "",
      shipment_type: "single",
      delivery_instruction_id: "",
      origin: "",
      via_hub: "",
      ap_destination: "",
      destination: "",
      warehouse_id: "",
      ready_ex_supplier: ""
    });
    setEditingVessel(null);
    setEditingLineIndex(null);
    setShowVesselLines(false);
  };

  // Open modal for creating new vessel
  const handleNewVessel = () => {
    resetForm();
    onModalOpen();
  };

  // Open modal for editing vessel
  const handleEditVessel = (vessel) => {
    setFormData({
      name: vessel.name || "",
      client_id: vessel.client_id || "",
      status: vessel.status || "pending",
      vessel_line_ids: vessel.vessel_line_ids || []
    });
    setEditingVessel(vessel);
    onModalOpen();
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    try {
      // Validate vessel form
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Vessel name is required",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      if (!formData.client_id) {
        toast({
          title: "Error",
          description: "Client ID is required",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Validate vessel lines
      for (let i = 0; i < formData.vessel_line_ids.length; i++) {
        const line = formData.vessel_line_ids[i];
        if (!line.name || !line.name.trim()) {
          toast({
            title: "Error",
            description: `Vessel line ${i + 1}: Line name is required`,
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        if (!line.status) {
          toast({
            title: "Error",
            description: `Vessel line ${i + 1}: Status is required`,
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        if (!line.shipment_type) {
          toast({
            title: "Error",
            description: `Vessel line ${i + 1}: Shipment type is required`,
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }

      setIsLoading(true);

      // Use the form data as is - only include vessel lines that user has actually added
      let finalFormData = { ...formData };


      if (editingVessel) {
        // Update existing vessel
        const response = await vesselsAPI.updateVessel(editingVessel.id, finalFormData);

        // Extract success message from API response
        let successMessage = "Vessel updated successfully";
        let status = "success";

        if (response && response.result) {
          if (response.result && response.result.message) {
            successMessage = response.result.message;
            status = response.result.status;
          } else if (response.result.message) {
            successMessage = response.result.message;
            status = response.result.status;
          }
        }

        toast({
          title: status,
          description: successMessage,
          status: status,
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new vessel
        const response = await vesselsAPI.createVessel(finalFormData);

        // Extract success message from API response
        let successMessage = "Vessel created successfully";
        let status = "success";

        if (response && response.result) {
          if (response.result && response.result.message) {
            successMessage = response.result.message;
            status = response.result.status;
          } else if (response.result.message) {
            successMessage = response.result.message;
            status = response.result.status;
          }
        }

        toast({
          title: status,
          description: successMessage,
          status: status,
          duration: 3000,
          isClosable: true,
        });
      }

      onModalClose();
      resetForm();
      fetchVessels();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = `Failed to ${editingVessel ? 'update' : 'create'} vessel`;
      let status = "error";

      if (error.response && error.response.data) {
        if (error.response.data.result && error.response.data.result.message) {
          errorMessage = error.response.data.result.message;
          status = error.response.data.result.status;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          status = error.response.data.result.status;
        }
      } else if (error.message) {
        errorMessage = error.message;
        status = "error";
      }

      toast({
        title: status,
        description: errorMessage,
        status: status,
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete vessel
  const handleDeleteVessel = (vessel) => {
    setDeleteVesselId(vessel.id);
    onDeleteOpen();
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      const response = await vesselsAPI.deleteVessel(deleteVesselId);

      // Extract success message from API response
      let successMessage = "Vessel deleted successfully";
      let status = "success";

      if (response && response.result) {
        if (response.result && response.result.message) {
          successMessage = response.result.message;
          status = response.result.status;
        } else if (response.result.message) {
          successMessage = response.result.message;
          status = response.result.status;
        }
      }

      toast({
        title: status,
        description: successMessage,
        status: status,
        duration: 3000,
        isClosable: true,
      });

      onDeleteClose();
      setDeleteVesselId(null);
      fetchVessels();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = "Failed to delete vessel";
      let status = "error";

      if (error.response && error.response.data) {
        if (error.response.data.result && error.response.data.result.message) {
          errorMessage = error.response.data.result.message;
          status = error.response.data.result.status;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          status = error.response.data.result.status;
        }
      } else if (error.message) {
        errorMessage = error.message;
        status = "error";
      }

      toast({
        title: status,
        description: errorMessage,
        status: status,
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        {/* Header Section */}
        <Flex justify="space-between" align="center" px="25px">
          <HStack spacing={4}>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="blue"
              size="sm"
              onClick={handleNewVessel}
            >
              New Vessel
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                Vessels
              </Text>
              <Text fontSize="sm" color="gray.500">
                Manage vessel information
              </Text>
            </VStack>
          </HStack>
        </Flex>

        {/* Search Section */}
        <Box px="25px">
          <InputGroup w={{ base: "100%", md: "400px" }}>
            <InputLeftElement>
              <Icon as={MdSearch} color={searchIconColor} w="15px" h="15px" />
            </InputLeftElement>
            <Input
              variant="outline"
              fontSize="sm"
              bg={inputBg}
              color={inputText}
              fontWeight="500"
              _placeholder={{ color: "gray.400", fontSize: "14px" }}
              borderRadius="8px"
              placeholder="Search by vessel name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </InputGroup>
        </Box>

        {/* Vessels Table */}
        <Box px="25px">
          <Box
            maxH="600px"
            overflowY="auto"
            border="1px"
            borderColor="gray.200"
            borderRadius="8px"
            sx={{
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'gray.100',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'gray.300',
                borderRadius: '4px',
                '&:hover': {
                  background: 'gray.400',
                },
              },
            }}
          >
            <Table variant="unstyled" size="sm">
              <Thead bg="gray.100" position="sticky" top="0" zIndex="1">
                <Tr>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Vessel
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Client (Customer)
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Status
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Lines Count
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Stock Status
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Origin
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Destination
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginatedVessels.length > 0 ? (
                  paginatedVessels.map((vessel, index) => {
                    // Get vessel lines information
                    const vesselLines = vessel.vessel_line_ids || [];
                    const stockStatuses = vesselLines.map(line => line.status).filter(Boolean);

                    // Get origin names from countries
                    const origins = vesselLines.map(line => {
                      const country = countries.find(c => c.id === line.origin);
                      return country ? country.name : line.origin;
                    }).filter(Boolean);

                    // Get destination names
                    const destinationNames = vesselLines.map(line => {
                      const destination = destinations.find(d => d.id === line.destination);
                      return destination ? destination.name : line.destination;
                    }).filter(Boolean);

                    return (
                      <Tr
                        key={vessel.id}
                        bg={index % 2 === 0 ? "white" : "gray.50"}
                        _hover={{ bg: hoverBg }}
                        borderBottom="1px"
                        borderColor="gray.200"
                      >
                        <Td py="12px" px="16px" style={{ width: "150px" }}>
                          <HStack spacing={2}>
                            <Icon as={MdDirectionsBoat} color="blue.500" w="16px" h="16px" />
                            <Text color={textColor} fontSize="sm" fontWeight="500">
                              {vessel.name || "-"}
                            </Text>
                          </HStack>
                        </Td>
                        <Td py="12px" px="16px">
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {(() => {
                              const customer = customers.find(c => c.id === vessel.client_id);
                              return customer ? (customer.name || customer.company_name || `Customer ${customer.id}`) : (vessel.client_id || "-");
                            })()}
                          </Text>
                        </Td>
                        <Td py="12px" px="16px">
                          <Badge
                            colorScheme={
                              vessel.status === "pending" ? "yellow" :
                                vessel.status === "stock" ? "green" :
                                  vessel.status === "shipping_instr" ? "blue" :
                                    vessel.status === "delivery_instr" ? "purple" :
                                      vessel.status === "in_transit" ? "orange" :
                                        vessel.status === "arrived_dest" ? "teal" :
                                          vessel.status === "shipped" ? "cyan" :
                                            vessel.status === "delivered" ? "green" :
                                              vessel.status === "irregularities" ? "red" :
                                                vessel.status === "cancelled" ? "gray" : "gray"
                            }
                            size="sm"
                            textTransform="capitalize"
                          >
                            {vessel.status || "-"}
                          </Badge>
                        </Td>
                        <Td py="12px" px="16px">
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {vesselLines.length} lines
                          </Text>
                        </Td>
                        <Td py="12px" px="16px">
                          <VStack spacing={1} align="start">
                            {stockStatuses.length > 0 ? (
                              stockStatuses.slice(0, 3).map((status, idx) => (
                                <Badge
                                  key={idx}
                                  colorScheme={
                                    status === "stock" ? "green" :
                                      status === "shipping_instr" ? "blue" :
                                        status === "delivery_instr" ? "purple" :
                                          status === "in_transit" ? "orange" :
                                            status === "arrived_dest" ? "teal" :
                                              status === "shipped" ? "cyan" :
                                                status === "delivered" ? "green" :
                                                  status === "irregularities" ? "red" :
                                                    status === "cancelled" ? "gray" : "gray"
                                  }
                                  size="xs"
                                  textTransform="capitalize"
                                >
                                  {status}
                                </Badge>
                              ))
                            ) : (
                              <Text color="gray.400" fontSize="xs">-</Text>
                            )}
                            {stockStatuses.length > 3 && (
                              <Text color="gray.500" fontSize="xs">
                                +{stockStatuses.length - 3} more
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td py="12px" px="16px">
                          <VStack spacing={1} align="start">
                            {origins.length > 0 ? (
                              origins.slice(0, 2).map((origin, idx) => (
                                <Text key={idx} color={textColor} fontSize="xs">
                                  {origin}
                                </Text>
                              ))
                            ) : (
                              <Text color="gray.400" fontSize="xs">-</Text>
                            )}
                            {origins.length > 2 && (
                              <Text color="gray.500" fontSize="xs">
                                +{origins.length - 2} more
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td py="12px" px="16px">
                          <VStack spacing={1} align="start">
                            {destinationNames.length > 0 ? (
                              destinationNames.slice(0, 2).map((destination, idx) => (
                                <Text key={idx} color={textColor} fontSize="xs">
                                  {destination}
                                </Text>
                              ))
                            ) : (
                              <Text color="gray.400" fontSize="xs">-</Text>
                            )}
                            {destinationNames.length > 2 && (
                              <Text color="gray.500" fontSize="xs">
                                +{destinationNames.length - 2} more
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td py="12px" px="16px">
                          <HStack spacing={2}>
                            <Tooltip label="Edit Vessel">
                              <IconButton
                                icon={<Icon as={MdEdit} />}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                aria-label="Edit vessel"
                                onClick={() => handleEditVessel(vessel)}
                              />
                            </Tooltip>
                            <Tooltip label="Delete Vessel">
                              <IconButton
                                icon={<Icon as={MdDelete} />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                aria-label="Delete vessel"
                                onClick={() => handleDeleteVessel(vessel)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>
                    );
                  })
                ) : (
                  <Tr>
                    <Td colSpan={8} py="40px" textAlign="center">
                      <VStack spacing={3}>
                        <Icon as={MdDirectionsBoat} color="gray.400" boxSize={12} />
                        <Text color="gray.500" fontSize="md" fontWeight="500">
                          No vessels available
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                          Click "New Vessel" to add your first vessel
                        </Text>
                      </VStack>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>

        {/* Pagination Controls */}
        <Box px="25px">
          <Flex justify="space-between" align="center" py={4}>
            {/* Records per page selector */}
            <HStack spacing={3}>
              <Text fontSize="sm" color="gray.600">
                Records per page:
              </Text>
              <Select
                size="sm"
                w="80px"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Select>
              <Text fontSize="sm" color="gray.600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredVessels.length)} of {filteredVessels.length} records
              </Text>
            </HStack>

            {/* Pagination buttons */}
            <HStack spacing={2}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(1)}
                isDisabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                isDisabled={currentPage === 1}
              >
                Previous
              </Button>

              {/* Page numbers */}
              <HStack spacing={1}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={currentPage === pageNum ? "solid" : "outline"}
                      colorScheme={currentPage === pageNum ? "blue" : "gray"}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </HStack>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                isDisabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(totalPages)}
                isDisabled={currentPage === totalPages}
              >
                Last
              </Button>
            </HStack>
          </Flex>
        </Box>
      </VStack>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="blue.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={editingVessel ? MdEdit : MdAdd} />
              <Text>{editingVessel ? "Edit Vessel" : "Create New Vessel"}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py="6">
            <VStack spacing="4" align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Vessel Name
                </FormLabel>
                <Input
                  size="md"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter vessel name (e.g., Test Vessel)"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Client (Customer)
                </FormLabel>
                <SearchableSelect
                  value={formData.client_id}
                  onChange={(value) => handleInputChange("client_id", value)}
                  options={customers}
                  placeholder={customers.length === 0 ? "No customers found" : "Select customer"}
                  displayKey="name"
                  valueKey="id"
                  formatOption={(customer) => `${customer.name || customer.company_name || `Customer ${customer.id}`} (ID: ${customer.id})`}
                  isLoading={isLoadingApiData}
                  isRequired
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Status
                </FormLabel>
                <Select
                  size="md"
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  borderRadius="md"
                >
                  <option value="pending">Pending</option>
                  <option value="stock">Stock</option>
                  <option value="shipping_instr">On a Shipping Instr</option>
                  <option value="delivery_instr">On a Delivery Instr</option>
                  <option value="in_transit">In Transit</option>
                  <option value="arrived_dest">Arrived Dest</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="irregularities">Irregularities</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormControl>

              {/* Vessel Lines Section */}
              <Box>
                <Flex justify="space-between" align="center" mb={4}>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="lg" fontWeight="bold" color="gray.700">
                      Vessel Lines ({formData.vessel_line_ids.length})
                    </Text>
                    {formData.vessel_line_ids.length === 0 && (
                      <Text fontSize="sm" color="gray.500" fontWeight="medium">
                        Click "Add New Line" to add vessel line details
                      </Text>
                    )}
                    {formData.vessel_line_ids.length > 0 && (
                      <Text fontSize="sm" color="green.600" fontWeight="medium">
                        ✓ {formData.vessel_line_ids.length} line{formData.vessel_line_ids.length !== 1 ? 's' : ''} added
                      </Text>
                    )}
                  </VStack>
                  <Button
                    leftIcon={<Icon as={MdAdd} />}
                    size="sm"
                    colorScheme="blue"
                    onClick={() => setShowVesselLines(true)}
                  >
                    Add New Line
                  </Button>
                </Flex>

                {/* Display Added Vessel Lines */}
                {formData.vessel_line_ids.length > 0 && (
                  <Box mb={4}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={3}>
                      Added Vessel Lines:
                    </Text>
                    <VStack spacing={2} align="stretch">
                      {formData.vessel_line_ids.map((line, index) => (
                        <Box
                          key={index}
                          p={3}
                          border="1px"
                          borderColor="gray.200"
                          borderRadius="md"
                          bg="gray.50"
                        >
                          <Flex justify="space-between" align="center">
                            <VStack align="start" spacing={1}>
                              <Text fontSize="sm" fontWeight="medium">
                                {line.name || `Line ${index + 1}`}
                              </Text>
                              <HStack spacing={2}>
                                <Badge colorScheme="blue" size="sm">
                                  {line.status}
                                </Badge>
                                <Badge colorScheme="green" size="sm">
                                  {line.shipment_type}
                                </Badge>
                                {line.supplier_id && (
                                  <Text fontSize="xs" color="gray.500">
                                    Supplier: {line.supplier_id}
                                  </Text>
                                )}
                                {line.origin && (
                                  <Text fontSize="xs" color="gray.500">
                                    Origin: {(() => {
                                      const country = countries.find(c => c.id === line.origin);
                                      return country ? country.name : line.origin;
                                    })()}
                                  </Text>
                                )}
                                {line.destination && (
                                  <Text fontSize="xs" color="gray.500">
                                    Destination: {(() => {
                                      const destination = destinations.find(d => d.id === line.destination);
                                      return destination ? destination.name : line.destination;
                                    })()}
                                  </Text>
                                )}
                              </HStack>
                            </VStack>
                            <HStack spacing={2}>
                              <Button
                                size="xs"
                                colorScheme="blue"
                                variant="outline"
                                onClick={() => {
                                  editVesselLine(index);
                                  setShowVesselLines(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="outline"
                                onClick={() => removeVesselLine(index)}
                              >
                                Remove
                              </Button>
                            </HStack>
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}

                <Collapse in={showVesselLines}>
                  <VStack spacing={4} align="stretch">
                    {/* Loading indicator for API data */}
                    {isLoadingApiData && (
                      <Box p={4} textAlign="center" bg="blue.50" borderRadius="md">
                        <Text fontSize="sm" color="blue.600">
                          Loading dropdown data...
                        </Text>
                      </Box>
                    )}


                    {/* Add/Edit Vessel Line Form */}
                    <Box p={4} border="1px" borderColor="gray.200" borderRadius="md" bg="white">
                      <Text fontSize="md" fontWeight="medium" color="gray.700" mb={4}>
                        {editingLineIndex !== null ? "Edit Vessel Line" : "Add New Vessel Line"}
                      </Text>

                      <VStack spacing={4} align="stretch">
                        {/* Row 1: Name and Client ID */}
                        <HStack spacing={4}>
                          <FormControl isRequired>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Line Name
                            </FormLabel>
                            <Input
                              size="sm"
                              value={vesselLineForm.name}
                              onChange={(e) => handleVesselLineInputChange("name", e.target.value)}
                              placeholder="Enter line name"
                              borderRadius="md"
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Client (Customer)
                            </FormLabel>
                            <SearchableSelect
                              value={vesselLineForm.client_id}
                              onChange={(value) => handleVesselLineInputChange("client_id", value)}
                              options={customers}
                              placeholder={customers.length === 0 ? "No customers found" : "Select customer"}
                              displayKey="name"
                              valueKey="id"
                              formatOption={(customer) => `${customer.name || customer.company_name || `Customer ${customer.id}`} (ID: ${customer.id})`}
                              isLoading={isLoadingApiData}
                            />
                          </FormControl>
                        </HStack>

                        {/* Row 2: Status and Shipment Type */}
                        <HStack spacing={4}>
                          <FormControl isRequired>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Status
                            </FormLabel>
                            <Select
                              size="sm"
                              value={vesselLineForm.status}
                              onChange={(e) => handleVesselLineInputChange("status", e.target.value)}
                              borderRadius="md"
                            >
                              <option value="stock">Stock</option>
                              <option value="shipping_instr">On a Shipping Instr</option>
                              <option value="delivery_instr">On a Delivery Instr</option>
                              <option value="in_transit">In Transit</option>
                              <option value="arrived_dest">Arrived Dest</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="irregularities">Irregularities</option>
                              <option value="cancelled">Cancelled</option>
                            </Select>
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Shipment Type
                            </FormLabel>
                            <Select
                              size="sm"
                              value={vesselLineForm.shipment_type}
                              onChange={(e) => handleVesselLineInputChange("shipment_type", e.target.value)}
                              borderRadius="md"
                            >
                              <option value="single">Single</option>
                              <option value="combined">Combined</option>
                            </Select>
                          </FormControl>
                        </HStack>

                        {/* Row 3: Stock Item and Supplier */}
                        <HStack spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Stock Item
                            </FormLabel>
                            <SearchableSelect
                              value={vesselLineForm.stock_item_id}
                              onChange={(value) => handleVesselLineInputChange("stock_item_id", value)}
                              options={stockItems}
                              placeholder={stockItems.length === 0 ? "No stock items found" : "Select stock item"}
                              displayKey="item_desc"
                              valueKey="id"
                              formatOption={(item) => `${item.item_desc || item.name || `Item ${item.id}`} (ID: ${item.id})`}
                              isLoading={isLoadingApiData}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Supplier
                            </FormLabel>
                            <SearchableSelect
                              value={vesselLineForm.supplier_id}
                              onChange={(value) => handleVesselLineInputChange("supplier_id", value)}
                              options={vendors}
                              placeholder={vendors.length === 0 ? "No suppliers found" : "Select supplier"}
                              displayKey="name"
                              valueKey="id"
                              formatOption={(vendor) => `${vendor.name || vendor.company_name || `Vendor ${vendor.id}`} (ID: ${vendor.id})`}
                              isLoading={isLoadingApiData}
                            />
                          </FormControl>
                        </HStack>

                        {/* Row 4: SO Number and Shipping Instruction */}
                        <HStack spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              SO Number ID
                            </FormLabel>
                            <NumberInput
                              size="sm"
                              value={vesselLineForm.so_number_id}
                              onChange={(value) => handleVesselLineInputChange("so_number_id", parseInt(value) || "")}
                            >
                              <NumberInputField placeholder="SO Number ID" borderRadius="md" />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Shipping Instruction ID
                            </FormLabel>
                            <NumberInput
                              size="sm"
                              value={vesselLineForm.shipping_instruction_id}
                              onChange={(value) => handleVesselLineInputChange("shipping_instruction_id", parseInt(value) || "")}
                            >
                              <NumberInputField placeholder="Shipping Instruction ID" borderRadius="md" />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          </FormControl>
                        </HStack>

                        {/* Row 5: Delivery Instruction and Origin */}
                        <HStack spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Delivery Instruction ID
                            </FormLabel>
                            <NumberInput
                              size="sm"
                              value={vesselLineForm.delivery_instruction_id}
                              onChange={(value) => handleVesselLineInputChange("delivery_instruction_id", parseInt(value) || "")}
                            >
                              <NumberInputField placeholder="Delivery Instruction ID" borderRadius="md" />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Origin (Country)
                            </FormLabel>
                            <SearchableSelect
                              value={vesselLineForm.origin}
                              onChange={(value) => handleVesselLineInputChange("origin", value)}
                              options={countries}
                              placeholder={countries.length === 0 ? "No countries found" : "Select origin country"}
                              displayKey="name"
                              valueKey="id"
                              formatOption={(country) => `${country.name} (${country.code || country.country_code})`}
                              isLoading={isLoadingApiData}
                            />
                          </FormControl>
                        </HStack>

                        {/* Row 6: Via Hub and AP Destination */}
                        <HStack spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Via Hub
                            </FormLabel>
                            <Input
                              size="sm"
                              value={vesselLineForm.via_hub}
                              onChange={(e) => handleVesselLineInputChange("via_hub", e.target.value)}
                              placeholder="Via Hub"
                              borderRadius="md"
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              AP Destination
                            </FormLabel>
                            <Input
                              size="sm"
                              value={vesselLineForm.ap_destination}
                              onChange={(e) => handleVesselLineInputChange("ap_destination", e.target.value)}
                              placeholder="AP Destination"
                              borderRadius="md"
                            />
                          </FormControl>
                        </HStack>

                        {/* Row 7: Destination and Warehouse ID */}
                        <HStack spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Destination
                            </FormLabel>
                            <SearchableSelect
                              value={vesselLineForm.destination}
                              onChange={(value) => handleVesselLineInputChange("destination", value)}
                              options={destinations}
                              placeholder={destinations.length === 0 ? "No destinations found" : "Select destination"}
                              displayKey="name"
                              valueKey="id"
                              formatOption={(destination) => `${destination.name} (ID: ${destination.id})`}
                              isLoading={isLoadingApiData}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                              Warehouse ID
                            </FormLabel>
                            <NumberInput
                              size="sm"
                              value={vesselLineForm.warehouse_id}
                              onChange={(value) => handleVesselLineInputChange("warehouse_id", parseInt(value) || "")}
                            >
                              <NumberInputField placeholder="Warehouse ID" borderRadius="md" />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          </FormControl>
                        </HStack>

                        {/* Row 8: Ready Ex Supplier */}
                        <FormControl>
                          <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                            Ready Ex Supplier
                          </FormLabel>
                          <Input
                            size="sm"
                            type="date"
                            value={vesselLineForm.ready_ex_supplier}
                            onChange={(e) => handleVesselLineInputChange("ready_ex_supplier", e.target.value)}
                            borderRadius="md"
                          />
                        </FormControl>

                        {/* Action Buttons */}
                        <HStack spacing={2} justify="flex-end">
                          {editingLineIndex !== null && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelVesselLineEdit}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={editingLineIndex !== null ? updateVesselLine : addVesselLine}
                          >
                            {editingLineIndex !== null ? "Update Line" : "Add Line"}
                          </Button>
                        </HStack>
                      </VStack>
                    </Box>
                  </VStack>
                </Collapse>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
            <Button variant="outline" mr={3} onClick={onModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {editingVessel ? "Update Vessel" : "Create Vessel"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        leastDestructiveRef={undefined}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Vessel
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this vessel? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={isLoading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
