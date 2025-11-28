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
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../../../api/warehouses";

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nameInput, setNameInput] = useState("");

  const toast = useToast();
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const loadWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getWarehouses();
      setWarehouses(data || []);
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
      setWarehouses([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const resetForm = () => {
    setEditingId(null);
    setNameInput("");
  };

  const handleSubmit = async () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      toast({
        title: "Validation Error",
        description: "Warehouse name is required.",
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
        const res = await updateWarehouse(payload);
        const message =
          (res && (res.message || res.result?.message)) ||
          "Warehouse updated successfully";
        toast({
          title: "Success",
          description: message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const payload = { name: trimmedName };
        const res = await createWarehouse(payload);
        const message =
          (res && (res.message || res.result?.message)) ||
          "Warehouse created successfully";
        toast({
          title: "Success",
          description: message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      await loadWarehouses();
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

  const handleEdit = (warehouse) => {
    setEditingId(warehouse.id);
    setNameInput(warehouse.name || "");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this warehouse?")) return;

    setIsSaving(true);
    try {
      const res = await deleteWarehouse({ id });
      const message =
        (res && (res.message || res.result?.message)) ||
        "Warehouse deleted successfully";
      toast({
        title: "Deleted",
        description: message,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await loadWarehouses();
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
              Warehouses
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Manage warehouses synced with Odoo
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
              placeholder="Warehouse name"
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
              {editingId ? "Update Warehouse" : "Add Warehouse"}
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
          ) : warehouses.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              No warehouses found.
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
                {warehouses.map((warehouse) => (
                  <Tr key={warehouse.id}>
                    <Td>{warehouse.id}</Td>
                    <Td>{warehouse.name}</Td>
                    <Td textAlign="right">
                      <IconButton
                        aria-label="Edit warehouse"
                        icon={<MdEdit />}
                        size="sm"
                        mr={2}
                        onClick={() => handleEdit(warehouse)}
                      />
                      <IconButton
                        aria-label="Delete warehouse"
                        icon={<MdDelete />}
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => handleDelete(warehouse.id)}
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

