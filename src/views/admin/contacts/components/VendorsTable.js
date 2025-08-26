import {
  Flex,
  Table,
  Icon,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  HStack,
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  useDisclosure,
  VStack,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import React, { useMemo, useState } from "react";
import {
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable,
} from "react-table";

// Custom components
import Card from "components/card/Card";
import Menu from "components/menu/MainMenu";

// Assets
import {
  MdCheckCircle,
  MdCancel,
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
} from "react-icons/md";

export default function VendorsTable(props) {
  const { columnsData, tableData } = props;
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newVendor, setNewVendor] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "Active",
  });
  const [editingVendor, setEditingVendor] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  const columns = useMemo(() => columnsData, [columnsData]);

  // Filter data based on search and status
  const filteredData = useMemo(() => {
    let filtered = tableData;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Apply search filter
    if (searchValue) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.company.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.email.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.phone.includes(searchValue)
      );
    }

    return filtered;
  }, [tableData, searchValue, statusFilter]);

  const data = useMemo(() => filteredData, [filteredData]);

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 5 },
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const { getTableProps, getTableBodyProps, headerGroups, page, prepareRow } =
    tableInstance;

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const searchIconColor = useColorModeValue("gray.700", "white");
  const inputBg = useColorModeValue("secondaryGray.300", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");

  const handleInputChange = (field, value) => {
    setNewVendor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditInputChange = (field, value) => {
    setEditingVendor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveVendor = () => {
    // Here you would typically save to your backend
    console.log("Saving new vendor:", newVendor);

    // For demo purposes, we'll just close the modal
    // In a real app, you'd add the vendor to your data source
    onClose();

    // Reset form
    setNewVendor({
      name: "",
      company: "",
      email: "",
      phone: "",
      status: "Active",
    });
  };

  const handleSaveEdit = () => {
    // Here you would typically update your backend
    console.log("Updating vendor:", editingVendor);

    onEditClose();
    setEditingVendor(null);
  };

  const handleEdit = (vendor) => {
    setEditingVendor({ ...vendor });
    onEditOpen();
  };

  const handleDelete = (vendor) => {
    // Here you would typically delete from your backend
    console.log("Deleting vendor:", vendor);

    // For demo purposes, just log the action
    // In a real app, you'd remove the vendor from your data source
    alert(`Vendor "${vendor.name}" would be deleted`);
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setNewVendor({
      name: "",
      company: "",
      email: "",
      phone: "",
      status: "Active",
    });
  };

  const handleCancelEdit = () => {
    onEditClose();
    setEditingVendor(null);
  };

  return (
    <>
      <Card
        direction="column"
        w="100%"
        px="0px"
        overflowX={{ sm: "scroll", lg: "hidden" }}
      >
        <Flex px="25px" justify="space-between" mb="20px" align="center">
          <Text
            color={textColor}
            fontSize="22px"
            fontWeight="700"
            lineHeight="100%"
          >
            Vendor Management
          </Text>
          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="blue"
            size="sm"
            onClick={onOpen}
          >
            Add Vendor
          </Button>
        </Flex>

        {/* Filter Section */}
        <Box px="25px" mb="20px">
          <HStack spacing={4} flexWrap="wrap">
            <InputGroup w={{ base: "100%", md: "300px" }}>
              <InputLeftElement>
                <Icon as={MdSearch} color={searchIconColor} w="15px" h="15px" />
              </InputLeftElement>
              <Input
                variant="search"
                fontSize="sm"
                bg={inputBg}
                color={inputText}
                fontWeight="500"
                _placeholder={{ color: "gray.400", fontSize: "14px" }}
                borderRadius="30px"
                placeholder="Search vendors..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </InputGroup>

            <Select
              w={{ base: "100%", md: "200px" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              bg={inputBg}
              color={inputText}
              borderRadius="30px"
              fontSize="sm"
              border="2px"
              borderColor={borderColor}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
              }}
              _hover={{
                borderColor: "blue.300",
              }}
              sx={{
                option: {
                  bg: inputBg,
                  color: inputText,
                  _hover: {
                    bg: useColorModeValue("blue.50", "blue.900"),
                  },
                },
              }}
            >
              <option value="all">📊 All Status</option>
              <option value="Active">✅ Active</option>
              <option value="Inactive">❌ Inactive</option>
            </Select>
          </HStack>
        </Box>

        <Table {...getTableProps()} variant="simple" color="gray.500" mb="24px">
          <Thead>
            {headerGroups.map((headerGroup, index) => (
              <Tr {...headerGroup.getHeaderGroupProps()} key={index}>
                {headerGroup.headers.map((column, index) => (
                  <Th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    pe="10px"
                    key={index}
                    borderColor={borderColor}
                  >
                    <Flex
                      justify="space-between"
                      align="center"
                      fontSize={{ sm: "10px", lg: "12px" }}
                      color="gray.400"
                    >
                      {column.render("Header")}
                    </Flex>
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody {...getTableBodyProps()}>
            {page.map((row, index) => {
              prepareRow(row);
              return (
                <Tr {...row.getRowProps()} key={index}>
                  {row.cells.map((cell, index) => {
                    let data = "";
                    if (cell.column.Header === "VENDOR NAME") {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "COMPANY") {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "STATUS") {
                      data = (
                        <Flex align="center">
                          <Icon
                            w="24px"
                            h="24px"
                            me="5px"
                            color={
                              cell.value === "Active"
                                ? "green.500"
                                : cell.value === "Inactive"
                                ? "red.500"
                                : null
                            }
                            as={
                              cell.value === "Active"
                                ? MdCheckCircle
                                : cell.value === "Inactive"
                                ? MdCancel
                                : null
                            }
                          />
                          <Text
                            color={textColor}
                            fontSize="sm"
                            fontWeight="700"
                          >
                            {cell.value}
                          </Text>
                        </Flex>
                      );
                    } else if (cell.column.Header === "ACTIONS") {
                      data = (
                        <HStack spacing={2}>
                          <Tooltip label="Edit Vendor">
                            <IconButton
                              icon={<Icon as={MdEdit} />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => handleEdit(row.original)}
                              aria-label="Edit vendor"
                            />
                          </Tooltip>
                          <Tooltip label="Delete Vendor">
                            <IconButton
                              icon={<Icon as={MdDelete} />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleDelete(row.original)}
                              aria-label="Delete vendor"
                            />
                          </Tooltip>
                        </HStack>
                      );
                    } else {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    }
                    return (
                      <Td
                        {...cell.getCellProps()}
                        key={index}
                        fontSize={{ sm: "14px" }}
                        minW={{ sm: "150px", md: "200px", lg: "auto" }}
                        borderColor="transparent"
                      >
                        {data}
                      </Td>
                    );
                  })}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Card>

      {/* Add Vendor Modal */}
      <Modal isOpen={isOpen} onClose={handleCancel}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Vendor</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Vendor Name</FormLabel>
                <Input
                  placeholder="Enter vendor name"
                  value={newVendor.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Company</FormLabel>
                <Input
                  placeholder="Enter company name"
                  value={newVendor.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newVendor.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input
                  placeholder="Enter phone number"
                  value={newVendor.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={newVendor.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                  }}
                  sx={{
                    option: {
                      bg: inputBg,
                      color: inputText,
                      _hover: {
                        bg: useColorModeValue("blue.50", "blue.900"),
                      },
                    },
                  }}
                >
                  <option value="Active">✅ Active</option>
                  <option value="Inactive">❌ Inactive</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveVendor}
              isDisabled={
                !newVendor.name ||
                !newVendor.company ||
                !newVendor.email ||
                !newVendor.phone
              }
            >
              Save Vendor
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Vendor Modal */}
      <Modal isOpen={isEditOpen} onClose={handleCancelEdit}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Vendor</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Vendor Name</FormLabel>
                <Input
                  placeholder="Enter vendor name"
                  value={editingVendor?.name || ""}
                  onChange={(e) =>
                    handleEditInputChange("name", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Company</FormLabel>
                <Input
                  placeholder="Enter company name"
                  value={editingVendor?.company || ""}
                  onChange={(e) =>
                    handleEditInputChange("company", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={editingVendor?.email || ""}
                  onChange={(e) =>
                    handleEditInputChange("email", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input
                  placeholder="Enter phone number"
                  value={editingVendor?.phone || ""}
                  onChange={(e) =>
                    handleEditInputChange("phone", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={editingVendor?.status || "Active"}
                  onChange={(e) =>
                    handleEditInputChange("status", e.target.value)
                  }
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                  }}
                  sx={{
                    option: {
                      bg: inputBg,
                      color: inputText,
                      _hover: {
                        bg: useColorModeValue("blue.50", "blue.900"),
                      },
                    },
                  }}
                >
                  <option value="Active">✅ Active</option>
                  <option value="Inactive">❌ Inactive</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveEdit}
              isDisabled={
                !editingVendor?.name ||
                !editingVendor?.company ||
                !editingVendor?.email ||
                !editingVendor?.phone
              }
            >
              Update Vendor
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
