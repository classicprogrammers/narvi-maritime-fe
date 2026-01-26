import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
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
  Select,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from "@chakra-ui/react";
import { MdAdd, MdEdit, MdDelete, MdSearch, MdClear } from "react-icons/md";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../../../api/suppliers";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nameInput, setNameInput] = useState("");

  // Search state
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(80);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");

  const toast = useToast();
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

  // Reset to first page when page size or search changes
  useEffect(() => {
    setPage(1);
  }, [pageSize, searchQuery]);

  // Handle search button click
  const handleSearch = () => {
    setSearchQuery(searchValue.trim());
    setPage(1); // Reset to first page when searching
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setPage(1);
  };

  const resetForm = () => {
    setEditingId(null);
    setNameInput("");
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
      resetForm();
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

  const handleEdit = (supplier) => {
    setEditingId(supplier.id);
    setNameInput(supplier.name || "");
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
      if (editingId === id) {
        resetForm();
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
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Box px="25px">
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" mb={1}>
              Suppliers
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Manage suppliers synced with Odoo
            </Text>
          </Box>
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
          mb={6}
        >
          <Flex gap={3} align="center">
            <Input
              placeholder="Supplier name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxW="400px"
            />
            <Button
              leftIcon={<MdAdd />}
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isSaving}
            >
              {editingId ? "Update Supplier" : "Add Supplier"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Cancel
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
              <Table size="sm">
                <Thead>
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
                          onClick={() => handleEdit(supplier)}
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

              {/* Pagination Controls */}
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
                  {/* Page Size Selector and Info */}
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.500">
                      Show
                    </Text>
                    <Select
                      size="sm"
                      w="80px"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={80}>80</option>
                      <option value={100}>100</option>
                    </Select>
                    <Text fontSize="sm" color="gray.500">
                      per page
                    </Text>
                    <Text fontSize="sm" color="gray.500" ml={2}>
                      Showing {suppliers.length} of {totalCount} records
                    </Text>
                  </HStack>

                  {/* Pagination buttons */}
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

                    {/* Page numbers */}
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
    </Box>
  );
}


