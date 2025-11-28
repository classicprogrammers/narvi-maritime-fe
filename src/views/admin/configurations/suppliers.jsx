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
} from "@chakra-ui/react";
import { MdAdd, MdEdit, MdDelete } from "react-icons/md";
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

  const toast = useToast();
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data || []);
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
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

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
          )}
        </Box>
      </Box>
    </Box>
  );
}


