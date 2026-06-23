import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdDelete } from "react-icons/md";
import {
  listCiplSimpleArchivedFormsApi,
  postCiplSimpleFormDeleteApi,
} from "../../../../api/cipl";

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
};

const resolveLabel = (field) => {
  if (field == null || field === false) return "-";
  if (typeof field === "object" && field.name) return String(field.name);
  return String(field);
};

export default function CiPlArchivedList() {
  const history = useHistory();
  const toast = useToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadArchived = useCallback(async () => {
    try {
      setIsLoading(true);
      const forms = await listCiplSimpleArchivedFormsApi({ page: 1, page_size: 80 });
      setItems(Array.isArray(forms) ? forms : []);
    } catch (error) {
      console.error("Failed to load archived CI PL forms:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load archived CI PL forms",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadArchived();
  }, [loadArchived]);

  const openArchivedForm = (formId) => {
    if (!formId) return;
    history.push(`/admin/forms/ci-pl/archived/${formId}`);
  };

  const handleDelete = async (event, formId) => {
    event.stopPropagation();
    if (!formId) return;
    if (!window.confirm("Delete this archived CI PL form? This cannot be undone.")) return;

    try {
      setDeletingId(formId);
      await postCiplSimpleFormDeleteApi({ id: Number(formId) });
      toast({
        title: "Deleted",
        description: "Archived CI PL form deleted",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      await loadArchived();
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete archived CI PL form",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={bgColor} minH="100vh">
      <Box px={{ base: "4", md: "6", lg: "8" }} pb={6}>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>
          Archived CI PL
        </Text>

        <Box overflowX="auto" border="1px" borderColor="gray.200" borderRadius="md">
          {isLoading ? (
            <Flex justify="center" py={12}>
              <Spinner />
            </Flex>
          ) : items.length === 0 ? (
            <Text p={6} color="gray.500">
              No archived CI PL forms yet.
            </Text>
          ) : (
            <Table size="sm">
              <Thead bg="gray.100">
                <Tr>
                  <Th>ID</Th>
                  <Th>STATE</Th>
                  <Th>VESSEL</Th>
                  <Th>AGENT</Th>
                  <Th>SI NUMBER</Th>
                  <Th>DATE</Th>
                  <Th>ARCHIVED AT</Th>
                  <Th textAlign="right">ACTIONS</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((form) => (
                  <Tr
                    key={form.id}
                    cursor="pointer"
                    _hover={{ bg: "gray.50" }}
                    onClick={() => openArchivedForm(form.id)}
                  >
                    <Td>{form.id ?? "-"}</Td>
                    <Td>{form.state || "archived"}</Td>
                    <Td>{form.vessel_name || resolveLabel(form.vessel_id) || "-"}</Td>
                    <Td>{resolveLabel(form.agent_id)}</Td>
                    <Td>{resolveLabel(form.si_number_id)}</Td>
                    <Td>{form.date || form.header_date || "-"}</Td>
                    <Td>{formatDateTime(form.archived_at)}</Td>
                    <Td>
                      <Flex justify="flex-end">
                        <IconButton
                          aria-label="Delete archived CI PL"
                          icon={<Icon as={MdDelete} />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          isLoading={Number(deletingId) === Number(form.id)}
                          onClick={(event) => handleDelete(event, form.id)}
                        />
                      </Flex>
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
