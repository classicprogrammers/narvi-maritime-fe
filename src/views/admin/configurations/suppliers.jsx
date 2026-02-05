import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Icon,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  useToast,
  useColorModeValue,
  Spinner,
  HStack,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { MdAdd, MdEdit, MdDelete, MdSearch, MdClear } from "react-icons/md";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../../../api/suppliers";
import { refreshMasterData, MASTER_KEYS } from "../../../utils/masterDataCache";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nameInput, setNameInput] = useState("");

  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 80;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");

  const toast = useToast();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const inputBg = useColorModeValue("white", "gray.700");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSuppliers({
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        search: searchQuery,
      });
      setSuppliers(data.suppliers || []);
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 0);
      setHasNext(data.has_next || false);
      setHasPrevious(data.has_previous || false);
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message ||
        error.message;
      toast({
        title: "Error",
        description: apiMessage || "Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setSuppliers([]);
      setTotalCount(0);
      setTotalPages(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery, toast]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleSearch = () => {
    setSearchQuery(searchValue.trim());
    setPage(1);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setPage(1);
  };

  const resetForm = () => {
    setEditingId(null);
    setNameInput("");
    onModalClose();
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setNameInput("");
    onModalOpen();
  };

  const handleOpenEdit = (supplier) => {
    setEditingId(supplier.id);
    setNameInput(supplier.name || "");
    onModalOpen();
  };

  const handleSubmit = async () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      toast({
        title: "Validation Error",
        description: "Supplier name is required.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const payload = { id: editingId, name: trimmedName };
        const res = await updateSupplier(payload);
        const message =
          (res && (res.message || res.result?.message)) ||
          "Supplier updated successfully";
        toast({
          title: "Success",
          description: message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const payload = { name: trimmedName };
        const res = await createSupplier(payload);
        const message =
          (res && (res.message || res.result?.message)) ||
          "Supplier created successfully";
        toast({
          title: "Success",
          description: message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      await loadSuppliers();
      onModalClose();
      setEditingId(null);
      setNameInput("");
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message ||
        error.message ||
        "Operation failed";
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;

    setIsSaving(true);
    try {
      const res = await deleteSupplier({ id });
      const message =
        (res && (res.message || res.result?.message)) ||
        "Supplier deleted successfully";
      toast({
        title: "Deleted",
        description: message,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await loadSuppliers();
      refreshMasterData(MASTER_KEYS.SUPPLIERS).catch(() => { });
      if (editingId === id) {
        setEditingId(null);
        setNameInput("");
        onModalClose();
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message ||
        error.message ||
        "Delete failed";
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg}>
      <Box px="25px">
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" mb={1}>
              Suppliers
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Manage suppliers
            </Text>
          </Box>
          <Button leftIcon={<Icon as={MdAdd} />} colorScheme="blue" onClick={handleOpenAdd}>
            Add Supplier
          </Button>
        </Flex>

        {/* Search Box */}
        <Box
          bg={cardBg}
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={4}
          mb={6}
        >
          <Flex gap={2} align="center">
            <InputGroup flex={1}>
              <InputLeftElement pointerEvents="none">
                <MdSearch color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search suppliers by name or ID..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                bg={inputBg}
              />
              {searchValue && (
                <InputRightElement>
                  <IconButton
                    aria-label="Clear search"
                    icon={<MdClear />}
                    size="sm"
                    variant="ghost"
                    onClick={handleClearSearch}
                    h="1.75rem"
                    w="1.75rem"
                  />
                </InputRightElement>
              )}
            </InputGroup>
            <Button
              leftIcon={<MdSearch />}
              colorScheme="blue"
              onClick={handleSearch}
              isLoading={isLoading}
            >
              Search
            </Button>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={handleClearSearch}
              >
                Clear
              </Button>
            )}
          </Flex>
        </Box>

        <Box
          bg={cardBg}
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={4}
        >
          {isLoading ? (
            <Flex justify="center" align="center" py={10}>
              <Spinner />
            </Flex>
          ) : suppliers.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              No suppliers found.
            </Text>
          ) : (
            <>
              <Box
                maxH="600px"
                overflowY="auto"
                border="1px"
                borderColor={borderColor}
                borderRadius="8px"
                sx={{
                  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
                  "&::-webkit-scrollbar-track": {
                    background: "gray.100",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "gray.300",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb:hover": { background: "gray.400" },
                }}
              >
                <Table size="sm">
                  <Thead bg="gray.100" position="sticky" top={0} zIndex={1}>
                    <Tr>
                      <Th>ID</Th>
                      <Th>Name</Th>
                      <Th textAlign="right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {suppliers.map((supplier) => (
                      <Tr key={supplier.id}>
                        <Td>{supplier.id}</Td>
                        <Td>{supplier.name}</Td>
                        <Td textAlign="right">
                          <IconButton
                            aria-label="Edit supplier"
                            icon={<MdEdit />}
                            size="sm"
                            mr={2}
                            onClick={() => handleOpenEdit(supplier)}
                          />
                          <IconButton
                            aria-label="Delete supplier"
                            icon={<MdDelete />}
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => handleDelete(supplier.id)}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              {totalPages > 0 && (
                <Flex
                  justify="space-between"
                  align="center"
                  mt={6}
                  pt={4}
                  borderTop="1px"
                  borderColor={borderColor}
                  flexWrap="wrap"
                  gap={4}
                >
                  <Text fontSize="sm" color="gray.500">
                    Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} records
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(1)}
                      isDisabled={!hasPrevious || page === 1}
                    >
                      First
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      isDisabled={!hasPrevious}
                    >
                      Previous
                    </Button>

                    <HStack spacing={1}>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={page === pageNum ? "solid" : "outline"}
                            colorScheme={page === pageNum ? "blue" : "gray"}
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </HStack>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      isDisabled={!hasNext}
                    >
                      Next
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(totalPages)}
                      isDisabled={!hasNext || page === totalPages}
                    >
                      Last
                    </Button>
                  </HStack>
                </Flex>
              )}
            </>
          )}
        </Box>
      </Box>

      <Modal isOpen={isModalOpen} onClose={resetForm} size="md">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader>{editingId ? "Edit Supplier" : "Add Supplier"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired>
              <FormLabel>Supplier name</FormLabel>
              <Input
                placeholder="Enter supplier name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                bg={inputBg}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={resetForm}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={isSaving}>
              {editingId ? "Update Supplier" : "Create Supplier"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}


