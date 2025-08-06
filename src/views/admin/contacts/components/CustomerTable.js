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
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Badge,
} from "@chakra-ui/react";
import React, { useMemo, useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import {
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable,
} from "react-table";

// Custom components
import Card from "components/card/Card";

// Assets
import { MdCheckCircle, MdCancel, MdSearch, MdAdd, MdEdit, MdDelete, MdVisibility } from "react-icons/md";

export default function CustomerTable(props) {
  const { columnsData, tableData } = props;
  const history = useHistory();
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    status: "Active",
    joinDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    })
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose
  } = useDisclosure();

  const toast = useToast();
  const cancelRef = useRef();

  const columns = useMemo(() => columnsData, [columnsData]);

  // Filter data based on search and status
  const filteredData = useMemo(() => {
    let filtered = tableData;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply search filter
    if (searchValue) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
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
      initialState: { pageIndex: 0, pageSize: itemsPerPage },
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    setPageSize,
    state: { pageIndex },
  } = tableInstance;

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const searchIconColor = useColorModeValue("gray.700", "white");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const hoverBg = useColorModeValue("blue.50", "gray.700");

  const handleInputChange = (field, value) => {
    setNewCustomer(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditInputChange = (field, value) => {
    setEditingCustomer(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveCustomer = () => {
    // Here you would typically save to your backend
    console.log("Saving new customer:", newCustomer);

    toast({
      title: "Customer Added",
      description: "New customer has been successfully added.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    onClose();

    // Reset form
    setNewCustomer({
      name: "",
      email: "",
      phone: "",
      status: "Active",
      joinDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      })
    });
  };

  const handleSaveEdit = () => {
    // Here you would typically update your backend
    console.log("Updating customer:", editingCustomer);

    toast({
      title: "Customer Updated",
      description: "Customer information has been successfully updated.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    onEditClose();
    setEditingCustomer(null);
  };

  const handleEdit = (customer) => {
    setEditingCustomer({ ...customer });
    onEditOpen();
  };

  const handleDelete = (customer) => {
    setCustomerToDelete(customer);
    onDeleteOpen();
  };

  const confirmDelete = () => {
    // Here you would typically delete from your backend
    console.log("Deleting customer:", customerToDelete);

    toast({
      title: "Customer Deleted",
      description: "Customer has been successfully deleted.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    onDeleteClose();
    setCustomerToDelete(null);
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setNewCustomer({
      name: "",
      email: "",
      phone: "",
      status: "Active",
      joinDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      })
    });
  };

  const handleCancelEdit = () => {
    onEditClose();
    setEditingCustomer(null);
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedItems(page.map(row => row.original));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (item, isChecked) => {
    if (isChecked) {
      setSelectedItems(prev => [...prev, item]);
    } else {
      setSelectedItems(prev => prev.filter(selected => selected !== item));
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;

    toast({
      title: "Bulk Delete",
      description: `${selectedItems.length} customers have been deleted.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    setSelectedItems([]);
  };

  return (
    <>
      <Card
        direction='column'
        w='100%'
        px='0px'
        overflowX={{ sm: "scroll", lg: "hidden" }}>
        <Flex px='25px' justify='space-between' mb='20px' align='center'>
          <Text
            color={textColor}
            fontSize='22px'
            fontWeight='700'
            lineHeight='100%'>
            Customer Management
          </Text>
          <HStack spacing={3}>
            {selectedItems.length > 0 && (
              <Button
                leftIcon={<Icon as={MdDelete} />}
                colorScheme="red"
                size="sm"
                onClick={handleBulkDelete}
              >
                Delete Selected ({selectedItems.length})
              </Button>
            )}
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="blue"
              size="sm"
              onClick={onOpen}
            >
              Add Customer
            </Button>
          </HStack>
        </Flex>

        {/* Filter Section */}
        <Box px='25px' mb='20px'>
          <HStack spacing={4} flexWrap="wrap">
            <InputGroup w={{ base: "100%", md: "300px" }}>
              <InputLeftElement>
                <Icon as={MdSearch} color={searchIconColor} w='15px' h='15px' />
              </InputLeftElement>
              <Input
                variant='outline'
                fontSize='sm'
                bg={inputBg}
                color={inputText}
                fontWeight='500'
                _placeholder={{ color: "gray.400", fontSize: "14px" }}
                borderRadius="8px"
                placeholder="Search customers..."
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
              borderRadius="8px"
              fontSize="sm"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </HStack>
        </Box>

        <Table {...getTableProps()} variant="unstyled" size="sm" minW="100%">
          <Thead bg="gray.100">
            {headerGroups.map((headerGroup, index) => (
              <Tr {...headerGroup.getHeaderGroupProps()} key={index}>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === page.length && page.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </Th>
                {headerGroup.headers.map((column, index) => (
                  <Th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    borderRight="1px"
                    borderColor="gray.200"
                    py="12px"
                    px="16px"
                    key={index}
                    fontSize="12px"
                    fontWeight="600"
                    color="gray.600"
                    textTransform="uppercase">
                    <Flex
                      justify='space-between'
                      align='center'>
                      {column.render("Header")}
                    </Flex>
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {page.map((row, index) => {
              prepareRow(row);
              return (
                <Tr
                  {...row.getRowProps()}
                  key={index}
                  bg={index % 2 === 0 ? "white" : "gray.50"}
                  _hover={{ bg: hoverBg }}
                  borderBottom="1px"
                  borderColor="gray.200">
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(row.original)}
                      onChange={(e) => handleSelectItem(row.original, e.target.checked)}
                    />
                  </Td>
                  {row.cells.map((cell, index) => {
                    let data = "";
                    if (cell.column.Header === "CUSTOMER NAME") {
                      data = (
                        <Text
                          color={textColor}
                          fontSize='sm'
                          fontWeight='600'
                          cursor="pointer"
                          _hover={{ textDecoration: "underline" }}
                          onClick={() => history.push(`/admin/contacts/customer/${row.original.id}`)}
                        >
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "COMPANY") {
                      data = (
                        <Text color={textColor} fontSize='sm'>
                          {cell.value || "-"}
                        </Text>
                      );
                    } else if (cell.column.Header === "EMAIL") {
                      data = (
                        <Text color={textColor} fontSize='sm'>
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "PHONE") {
                      data = (
                        <Text color={textColor} fontSize='sm'>
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "WEBSITE") {
                      data = (
                        <Text color={textColor} fontSize='sm'>
                          {cell.value || "-"}
                        </Text>
                      );
                    } else if (cell.column.Header === "STATUS") {
                      data = (
                        <Badge
                          colorScheme={cell.value === "Active" ? "green" : "red"}
                          variant="subtle"
                          fontSize="xs"
                          px="8px"
                          py="4px"
                          borderRadius="full">
                          <HStack spacing={1}>
                            <Icon
                              as={cell.value === "Active" ? MdCheckCircle : MdCancel}
                              w="12px"
                              h="12px"
                            />
                            <Text>{cell.value}</Text>
                          </HStack>
                        </Badge>
                      );
                    } else if (cell.column.Header === "JOIN DATE") {
                      data = (
                        <Text color={textColor} fontSize='sm'>
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "ACTIONS") {
                      data = (
                        <HStack spacing={2}>
                          <Tooltip label="View Customer">
                            <IconButton
                              icon={<Icon as={MdVisibility} />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => history.push(`/admin/contacts/customer/${row.original.id}`)}
                              aria-label="View customer"
                            />
                          </Tooltip>
                          <Tooltip label="Edit Customer">
                            <IconButton
                              icon={<Icon as={MdEdit} />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => handleEdit(row.original)}
                              aria-label="Edit customer"
                            />
                          </Tooltip>
                          <Tooltip label="Delete Customer">
                            <IconButton
                              icon={<Icon as={MdDelete} />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleDelete(row.original)}
                              aria-label="Delete customer"
                            />
                          </Tooltip>
                        </HStack>
                      );
                    } else {
                      data = (
                        <Text color={textColor} fontSize='sm'>
                          {cell.value}
                        </Text>
                      );
                    }
                    return (
                      <Td
                        {...cell.getCellProps()}
                        key={index}
                        borderRight="1px"
                        borderColor="gray.200"
                        py="12px"
                        px="16px">
                        {data}
                      </Td>
                    );
                  })}
                </Tr>
              );
            })}
          </Tbody>
        </Table>

        {/* Pagination */}
        <Flex px='25px' justify='space-between' align='center' py='20px'>
          <Text fontSize='sm' color='gray.500'>
            Showing {pageIndex * itemsPerPage + 1} to {Math.min((pageIndex + 1) * itemsPerPage, data.length)} of {data.length} results
          </Text>
          <HStack spacing={2}>
            <Button
              size="sm"
              onClick={() => previousPage()}
              isDisabled={!canPreviousPage}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => nextPage()}
              isDisabled={!canNextPage}
              variant="outline"
            >
              Next
            </Button>
          </HStack>
        </Flex>
      </Card>

      {/* Add Customer Modal */}
      <Modal isOpen={isOpen} onClose={handleCancel}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Customer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Customer Name</FormLabel>
                <Input
                  placeholder="Enter customer name"
                  value={newCustomer.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newCustomer.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input
                  placeholder="Enter phone number"
                  value={newCustomer.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={newCustomer.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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
              onClick={handleSaveCustomer}
              isDisabled={!newCustomer.name || !newCustomer.email || !newCustomer.phone}
            >
              Save Customer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={isEditOpen} onClose={handleCancelEdit}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Customer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Customer Name</FormLabel>
                <Input
                  placeholder="Enter customer name"
                  value={editingCustomer?.name || ""}
                  onChange={(e) => handleEditInputChange('name', e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={editingCustomer?.email || ""}
                  onChange={(e) => handleEditInputChange('email', e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input
                  placeholder="Enter phone number"
                  value={editingCustomer?.phone || ""}
                  onChange={(e) => handleEditInputChange('phone', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={editingCustomer?.status || "Active"}
                  onChange={(e) => handleEditInputChange('status', e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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
              isDisabled={!editingCustomer?.name || !editingCustomer?.email || !editingCustomer?.phone}
            >
              Update Customer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Customer
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{customerToDelete?.name}"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
} 