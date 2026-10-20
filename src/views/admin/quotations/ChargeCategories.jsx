import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdAdd, MdArchive, MdDelete, MdEdit, MdRefresh, MdSearch, MdUnarchive } from "react-icons/md";
import Card from "components/card/Card";
import {
  createChargeCategoryApi,
  deleteChargeCategoryApi,
  getChargeCategoriesApi,
  normalizeChargeCategoryList,
  updateChargeCategoryApi,
} from "../../../api/chargeCategory";

const EMPTY_FORM = { id: null, name: "", code: "", sequence: "", is_standard: false, active: true };

function errorMessage(error, fallback) {
  return (
    error?.response?.data?.result?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default function ChargeCategories() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelDeleteRef = useRef(null);

  const textColor = useColorModeValue("gray.700", "white");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const headerBg = useColorModeValue("gray.600", "gray.700");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getChargeCategoriesApi({
        fetch_all: true,
        active: activeFilter,
        search: debouncedSearch || undefined,
      });
      setRows(normalizeChargeCategoryList(result));
    } catch (error) {
      toast({
        title: "Could not load charge categories",
        description: errorMessage(error, "Please try again."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, debouncedSearch, toast]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const openCreate = () => setForm({ ...EMPTY_FORM });
  const openEdit = (row) =>
    setForm({
      id: row.id,
      name: row.name || "",
      code: row.code || "",
      sequence: row.sequence ?? "",
      is_standard: Boolean(row.is_standard),
      active: row.active !== false,
    });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    const sequence = form.sequence === "" ? undefined : Number(form.sequence);
    setIsSaving(true);
    try {
      if (form.id == null) {
        await createChargeCategoryApi({
          name: form.name.trim(),
          sequence,
          is_standard: form.is_standard,
          active: form.active,
        });
      } else {
        const original = rows.find((row) => row.id === form.id) || {};
        const changes = {};
        if (form.name.trim() !== (original.name || "")) changes.name = form.name.trim();
        if (sequence !== undefined && sequence !== original.sequence) changes.sequence = sequence;
        if (form.is_standard !== Boolean(original.is_standard)) changes.is_standard = form.is_standard;
        if (form.active !== (original.active !== false)) changes.active = form.active;
        if (Object.keys(changes).length) {
          await updateChargeCategoryApi({ id: form.id, ...changes });
        }
      }
      toast({ title: "Charge category saved", status: "success", duration: 3000, isClosable: true });
      setForm(null);
      loadRows();
    } catch (error) {
      toast({
        title: "Could not save",
        description: errorMessage(error, "Please try again."),
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const setActive = async (row, active) => {
    setBusyId(row.id);
    try {
      await updateChargeCategoryApi({ id: row.id, active });
      toast({
        title: active ? "Category restored" : "Category archived",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await loadRows();
    } catch (error) {
      toast({
        title: "Could not update",
        description: errorMessage(error, "Please try again."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setBusyId(null);
    }
  };

  const closeDelete = () => {
    setToDelete(null);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteChargeCategoryApi(toDelete.id);
      toast({ title: "Category deleted", status: "success", duration: 3000, isClosable: true });
      await loadRows();
      closeDelete();
    } catch (error) {
      // Typically "in use": show the server message and offer Archive instead.
      setDeleteError(errorMessage(error, "Could not delete this category."));
    } finally {
      setIsDeleting(false);
    }
  };

  const archiveFromDelete = async () => {
    const row = toDelete;
    closeDelete();
    await setActive(row, false);
  };

  const headerCell = {
    bg: headerBg,
    color: "white",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    px: "8px",
    py: "12px",
    borderColor: "gray.500",
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex justify="space-between" align="center" mb="4" flexWrap="wrap" gap="3">
        <Text fontSize="xl" fontWeight="700" color={textColor}>
          Charge Categories
        </Text>
        <HStack spacing="3" flexWrap="wrap">
          <InputGroup w="240px" size="sm">
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color={mutedColor} />
            </InputLeftElement>
            <Input
              placeholder="Search name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              borderRadius="md"
            />
          </InputGroup>
          <Select
            size="sm"
            w="140px"
            borderRadius="md"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="true">Active</option>
            <option value="false">Archived</option>
            <option value="all">All</option>
          </Select>
          <IconButton
            size="sm"
            variant="outline"
            aria-label="Refresh"
            icon={<Icon as={MdRefresh} />}
            onClick={loadRows}
            isLoading={isLoading}
          />
          <Button size="sm" colorScheme="blue" leftIcon={<Icon as={MdAdd} />} onClick={openCreate}>
            New Category
          </Button>
        </HStack>
      </Flex>

      <Card p="0" overflow="hidden">
        <Box overflowX="auto" opacity={isLoading && rows.length ? 0.6 : 1} transition="opacity 0.15s">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th {...headerCell}>Sequence</Th>
                <Th {...headerCell}>Name</Th>
                <Th {...headerCell}>Code</Th>
                <Th {...headerCell}>Counts as Standard</Th>
                <Th {...headerCell} isNumeric>
                  Rate List
                </Th>
                <Th {...headerCell} isNumeric>
                  Quotation Lines
                </Th>
                <Th {...headerCell}>Status</Th>
                <Th {...headerCell}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td borderColor={borderColor}>{row.sequence ?? "-"}</Td>
                  <Td borderColor={borderColor} fontWeight="600">
                    {row.name}
                  </Td>
                  <Td borderColor={borderColor} color={mutedColor}>
                    {row.code}
                  </Td>
                  <Td borderColor={borderColor}>{row.is_standard ? "Yes" : "No"}</Td>
                  <Td borderColor={borderColor} isNumeric>
                    {row.rate_list_count ?? 0}
                  </Td>
                  <Td borderColor={borderColor} isNumeric>
                    {row.quotation_line_count ?? 0}
                  </Td>
                  <Td borderColor={borderColor}>
                    <Badge colorScheme={row.active === false ? "gray" : "green"}>
                      {row.active === false ? "Archived" : "Active"}
                    </Badge>
                  </Td>
                  <Td borderColor={borderColor}>
                    <HStack spacing="1">
                      <Tooltip label="Edit" hasArrow>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                          aria-label="Edit category"
                          icon={<Icon as={MdEdit} />}
                          isDisabled={busyId === row.id}
                          onClick={() => openEdit(row)}
                        />
                      </Tooltip>
                      <Tooltip label={row.active === false ? "Restore" : "Archive"} hasArrow>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorScheme="orange"
                          aria-label={row.active === false ? "Restore category" : "Archive category"}
                          icon={<Icon as={row.active === false ? MdUnarchive : MdArchive} />}
                          isLoading={busyId === row.id}
                          isDisabled={busyId != null && busyId !== row.id}
                          onClick={() => setActive(row, row.active === false)}
                        />
                      </Tooltip>
                      <Tooltip
                        label={
                          row.in_use
                            ? "In use by rates or quotations. Archive it instead."
                            : "Delete"
                        }
                        hasArrow
                      >
                        <Box as="span">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            aria-label="Delete category"
                            icon={<Icon as={MdDelete} />}
                            isDisabled={Boolean(row.in_use) || busyId === row.id}
                            onClick={() => setToDelete(row)}
                          />
                        </Box>
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
              {!rows.length && (
                <Tr>
                  <Td colSpan={8} textAlign="center" py="8" color={mutedColor} borderColor={borderColor}>
                    {isLoading ? "Loading..." : "No charge categories found."}
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Card>

      <Modal isOpen={Boolean(form)} onClose={() => !isSaving && setForm(null)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{form?.id == null ? "New Charge Category" : "Edit Charge Category"}</ModalHeader>
          <ModalCloseButton isDisabled={isSaving} />
          <ModalBody>
            {form && (
              <Flex direction="column" gap="4">
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Port Charges"
                  />
                </FormControl>
                {form.id != null && (
                  <FormControl>
                    <FormLabel>Code</FormLabel>
                    <Input value={form.code} isReadOnly isDisabled />
                    <Text fontSize="xs" color={mutedColor} mt="1">
                      Generated from the name when created and cannot be changed.
                    </Text>
                  </FormControl>
                )}
                <FormControl>
                  <FormLabel>Sequence</FormLabel>
                  <Input
                    type="number"
                    value={form.sequence}
                    onChange={(e) => setForm((prev) => ({ ...prev, sequence: e.target.value }))}
                  />
                  <Text fontSize="xs" color={mutedColor} mt="1">
                    Sets the order of categories in dropdowns and quotation sections.
                  </Text>
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <Switch
                    id="category-is-standard"
                    isChecked={form.is_standard}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_standard: e.target.checked }))}
                    mr="3"
                  />
                  <FormLabel htmlFor="category-is-standard" mb="0">
                    Counts as Standard (included in quotation Standard totals)
                  </FormLabel>
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <Switch
                    id="category-active"
                    isChecked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                    mr="3"
                  />
                  <FormLabel htmlFor="category-active" mb="0">
                    Active
                  </FormLabel>
                </FormControl>
              </Flex>
            )}
          </ModalBody>
          <ModalFooter gap="2">
            <Button variant="ghost" onClick={() => setForm(null)} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={isSaving}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={Boolean(toDelete)} leastDestructiveRef={cancelDeleteRef} onClose={closeDelete} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete charge category
            </AlertDialogHeader>
            <AlertDialogBody>
              {deleteError ? (
                <>
                  <Text color="red.500" mb="3">
                    {deleteError}
                  </Text>
                  <Text>Archive it instead? Archived categories stay on existing records but are hidden from new ones.</Text>
                </>
              ) : (
                <Text>
                  Delete <b>{toDelete?.name}</b> permanently? This cannot be undone.
                </Text>
              )}
            </AlertDialogBody>
            <AlertDialogFooter gap="2">
              <Button ref={cancelDeleteRef} onClick={closeDelete} isDisabled={isDeleting}>
                Cancel
              </Button>
              {deleteError ? (
                <Button colorScheme="orange" onClick={archiveFromDelete}>
                  Archive
                </Button>
              ) : (
                <Button colorScheme="red" onClick={confirmDelete} isLoading={isDeleting}>
                  Delete
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
