import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
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
  useDisclosure,
  useToast,
  Tooltip,
  Select,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Badge,
  Spinner,
  Checkbox,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Tag,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdDirectionsBoat,
  MdVisibility,
  MdClear,
  MdWarningAmber,
  MdOpenInNew,
} from "react-icons/md";
import { useHistory } from "react-router-dom";
import vesselsAPI from "../../../api/vessels";
import { refreshMasterData, MASTER_KEYS } from "../../../utils/masterDataCache";
import { useMasterData } from "../../../hooks/useMasterData";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";
import { VESSEL_TYPE_SELEC_OPTIONS } from "../../../constants/vesselTypeSelectOptions";

const VESSELS_LIST_STORAGE_KEY = "narvi_vessels_list_state";

const defaultVesselsListState = {
  searchValue: "",
  searchQuery: "",
  clientFilter: "",
  clientFilterLabel: "",
  vesselTypeFilter: "",
  page: 1,
  sortBy: "name",
  sortOrder: "asc",
};

function normalizeFilterId(value) {
  if (value == null || value === "") return "";
  const num = Number(value);
  return Number.isFinite(num) ? num : value;
}

function readPersistedVesselsListState() {
  try {
    const raw = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(VESSELS_LIST_STORAGE_KEY)
      : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      searchValue: typeof parsed.searchValue === "string" ? parsed.searchValue : "",
      searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : "",
      clientFilter: normalizeFilterId(parsed.clientFilter),
      clientFilterLabel: typeof parsed.clientFilterLabel === "string" ? parsed.clientFilterLabel : "",
      vesselTypeFilter: typeof parsed.vesselTypeFilter === "string" ? parsed.vesselTypeFilter : "",
      page: typeof parsed.page === "number" && parsed.page >= 1 ? parsed.page : 1,
      sortBy: typeof parsed.sortBy === "string" ? parsed.sortBy : "name",
      sortOrder: parsed.sortOrder === "desc" ? "desc" : "asc",
    };
  } catch {
    return null;
  }
}

function writePersistedVesselsListState(state) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(VESSELS_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/**
 * Split a "cannot be deleted because it is linked to 1 stock item (SL ID: SL224895)"
 * message into link groups so the references can be listed individually.
 */
function parseDeleteBlockReason(message = "") {
  const text = String(message || "");
  const linkedPart = text.split(/linked to/i)[1] || "";
  const groups = [];
  const groupPattern = /(\d+)\s+([a-z][a-z\s]*?)\s*\(([^)]*)\)/gi;
  let match = groupPattern.exec(linkedPart);
  while (match) {
    const refs = match[3]
      .replace(/^[^:]*:\s*/, "")
      .split(/[,;]\s*/)
      .map((ref) => ref.trim())
      .filter(Boolean);
    groups.push({ count: Number(match[1]), label: match[2].trim(), refs });
    match = groupPattern.exec(linkedPart);
  }
  return groups;
}

function linkGroupKind(label) {
  const text = String(label || "").toLowerCase();
  if (/stock/.test(text)) return "stock";
  if (/shipping|order|\bso\b/.test(text)) return "shipping_order";
  return "other";
}

function blockedItemLinkKinds(item) {
  const groups = parseDeleteBlockReason(item?.message);
  const kinds = new Set(groups.map((group) => linkGroupKind(group.label)));
  const message = String(item?.message || "").toLowerCase();
  if (/stock/.test(message)) kinds.add("stock");
  if (/shipping/.test(message)) kinds.add("shipping_order");
  return {
    groups,
    hasStock: kinds.has("stock"),
    hasShipping: kinds.has("shipping_order"),
  };
}

export default function Vessels() {
  const history = useHistory();
  const [vessels, setVessels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [savedListState] = useState(() => readPersistedVesselsListState() || defaultVesselsListState);
  const [searchValue, setSearchValue] = useState(savedListState.searchValue);
  const [searchQuery, setSearchQuery] = useState(savedListState.searchQuery);
  const [clientFilter, setClientFilter] = useState(savedListState.clientFilter);
  const [clientFilterLabel, setClientFilterLabel] = useState(savedListState.clientFilterLabel);
  const [vesselTypeFilter, setVesselTypeFilter] = useState(savedListState.vesselTypeFilter);
  const [vesselTypeSelecOptions, setVesselTypeSelecOptions] = useState(VESSEL_TYPE_SELEC_OPTIONS);
  const [page, setPage] = useState(savedListState.page);
  const pageSize = 80;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [sortBy, setSortBy] = useState(savedListState.sortBy);
  const [sortOrder, setSortOrder] = useState(savedListState.sortOrder);
  const [deleteVesselId, setDeleteVesselId] = useState(null);
  const [selectedVesselIds, setSelectedVesselIds] = useState([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const { clients } = useMasterData();
  const clientOptions = useMemo(() => {
    const source = Array.isArray(clients) ? clients : [];
    const filtered = source.filter((client) => {
      const hasCompanyMarker =
        client?.is_company !== undefined ||
        client?.company_type !== undefined ||
        client?.partner_type !== undefined;
      const isCompany =
        client?.is_company === true ||
        client?.company_type === "company" ||
        client?.partner_type === "company";
      const isTopLevel =
        client?.parent_id == null ||
        client?.parent_id === false ||
        client?.parent_id === 0 ||
        client?.parent_id === "";
      return hasCompanyMarker ? (isCompany && isTopLevel) : true;
    });

    if (!clientFilter) return filtered;
    if (filtered.some((client) => String(client.id) === String(clientFilter))) {
      return filtered;
    }

    const selectedFromSource = source.find(
      (client) => String(client.id) === String(clientFilter)
    );
    if (selectedFromSource) {
      return [selectedFromSource, ...filtered];
    }

    if (clientFilterLabel) {
      return [{ id: clientFilter, name: clientFilterLabel }, ...filtered];
    }

    return filtered;
  }, [clients, clientFilter, clientFilterLabel]);
  const handleClientFilterChange = useCallback((value) => {
    const nextValue = value || "";
    setClientFilter(nextValue);
    if (!nextValue) {
      setClientFilterLabel("");
      return;
    }
    const source = Array.isArray(clients) ? clients : [];
    const match = source.find((client) => String(client.id) === String(nextValue));
    setClientFilterLabel(match?.name || match?.company_name || "");
  }, [clients]);

  useEffect(() => {
    if (!clientFilter || clientFilterLabel) return;
    const source = Array.isArray(clients) ? clients : [];
    const match = source.find((client) => String(client.id) === String(clientFilter));
    if (match) {
      setClientFilterLabel(match.name || match.company_name || "");
    }
  }, [clientFilter, clientFilterLabel, clients]);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isBulkDeleteOpen, onOpen: onBulkDeleteOpen, onClose: onBulkDeleteClose } = useDisclosure();
  const [blockedDeletes, setBlockedDeletes] = useState([]);
  const closeBlockedDeletes = () => setBlockedDeletes([]);

  // Filter Stock List by this vessel in the vessel dropdown (not the general search box).
  // active=all: inactive stock items also block deletion, so they must be visible too.
  const openLinkedStockList = (vesselId) => {
    if (vesselId == null || vesselId === "") return;
    const params = new URLSearchParams({
      vessel_id: String(vesselId),
      active: "all",
    });
    closeBlockedDeletes();
    history.push(`/admin/stock-list/stocks?${params.toString()}`);
  };

  const openLinkedShippingOrders = (vesselId) => {
    if (vesselId == null || vesselId === "") return;
    const params = new URLSearchParams({
      vessel_id: String(vesselId),
    });
    closeBlockedDeletes();
    history.push(`/admin/shipping-orders?${params.toString()}`);
  };

  const toast = useToast();

  const textColor = useColorModeValue("gray.700", "white");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.700", "white");
  const tableHeaderCellProps = {
    maxW: "240px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const tableCellProps = {
    maxW: "240px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const cellText = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  };
  const teamTableCellProps = {
    maxW: "320px",
    minW: "200px",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflow: "visible",
  };
  const teamCellText = {
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflow: "visible",
    display: "block",
  };

  // Fetch vessels with pagination and search
  const fetchVessels = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await vesselsAPI.getVessels({
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        search: searchQuery,
        client_id: clientFilter || undefined,
        vessel_type_selec: vesselTypeFilter || undefined,
      });
      if (response.vessels && Array.isArray(response.vessels)) {
        setVessels(response.vessels);
        if (Array.isArray(response.vessel_type_selec_options) && response.vessel_type_selec_options.length > 0) {
          setVesselTypeSelecOptions(
            response.vessel_type_selec_options.filter(
              (option) => option?.value != null && String(option.value).trim() !== ""
            )
          );
        }
        setTotalCount(response.total_count || 0);
        setTotalPages(response.total_pages || 0);
        setHasNext(response.has_next || false);
        setHasPrevious(response.has_previous || false);
      } else {
        setVessels([]);
        setTotalCount(0);
        setTotalPages(0);
        setHasNext(false);
        setHasPrevious(false);
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
      setTotalCount(0);
      setTotalPages(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery, clientFilter, vesselTypeFilter, toast]);

  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  useEffect(() => {
    writePersistedVesselsListState({
      searchValue,
      searchQuery,
      clientFilter,
      clientFilterLabel,
      vesselTypeFilter,
      page,
      sortBy,
      sortOrder,
    });
  }, [searchValue, searchQuery, clientFilter, clientFilterLabel, vesselTypeFilter, page, sortBy, sortOrder]);

  const isFirstFilterPageReset = useRef(true);
  useEffect(() => {
    if (isFirstFilterPageReset.current) {
      isFirstFilterPageReset.current = false;
      return;
    }
    setPage(1);
  }, [searchQuery, clientFilter, vesselTypeFilter]);

  // Search on change (debounced) â€“ skip initial mount
  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setSearchQuery(searchValue.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleClearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setClientFilter("");
    setClientFilterLabel("");
    setVesselTypeFilter("");
    setPage(1);
  };

  const handleNewVessel = () => {
    history.push("/admin/configurations/vessels/create");
  };

  const handleEditVessel = (vessel) => {
    history.push(`/admin/configurations/vessels/edit/${vessel.id}`);
  };

  const openBulkEdit = () => {
    if (!selectedVesselIds.length) return;
    history.push(
      `/admin/configurations/vessels/bulk-edit?ids=${selectedVesselIds.join(",")}`,
      {
        vessels: vessels
          .filter((vessel) => selectedVesselIds.includes(vessel.id))
          .map((vessel) => ({ id: vessel.id, name: vessel.name })),
      }
    );
  };

  useEffect(() => {
    const visibleIds = new Set(vessels.map((vessel) => vessel.id));
    setSelectedVesselIds((prev) => {
      const next = prev.filter((id) => visibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [vessels]);

  const allVisibleSelected =
    vessels.length > 0 && vessels.every((vessel) => selectedVesselIds.includes(vessel.id));
  const someVisibleSelected =
    !allVisibleSelected && vessels.some((vessel) => selectedVesselIds.includes(vessel.id));

  const toggleVesselSelected = (vesselId) => {
    setSelectedVesselIds((prev) =>
      prev.includes(vesselId) ? prev.filter((id) => id !== vesselId) : [...prev, vesselId]
    );
  };

  const toggleSelectAllVisible = (checked) => {
    const visibleIds = vessels.map((vessel) => vessel.id);
    setSelectedVesselIds((prev) =>
      checked
        ? Array.from(new Set([...prev, ...visibleIds]))
        : prev.filter((id) => !visibleIds.includes(id))
    );
  };

  const vesselNameById = (id) =>
    vessels.find((vessel) => String(vessel.id) === String(id))?.name || `Vessel ${id}`;

  const confirmBulkDelete = async () => {
    if (!selectedVesselIds.length) return;
    setIsBulkSaving(true);
    try {
      const { deleted, failed } = await vesselsAPI.deleteVessels(selectedVesselIds);
      if (deleted.length) {
        toast({
          title: "Vessels deleted",
          description: `${deleted.length} vessel(s) deleted.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      if (failed.length) {
        setBlockedDeletes(
          failed.map((item) => ({
            id: item.id,
            name: vesselNameById(item.id),
            message: item.message,
          }))
        );
      }
      onBulkDeleteClose();
      setSelectedVesselIds(failed.map((item) => item.id));
      fetchVessels();
      refreshMasterData(MASTER_KEYS.VESSELS).catch(() => { });
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleDeleteVessel = (vessel) => {
    setDeleteVesselId(vessel.id);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      const response = await vesselsAPI.deleteVessel(deleteVesselId);
      const message = response?.result?.message || "Vessel deleted successfully";
      toast({
        title: "Success",
        description: message,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onDeleteClose();
      setDeleteVesselId(null);
      fetchVessels();
      refreshMasterData(MASTER_KEYS.VESSELS).catch(() => { });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message ||
        error.message ||
        "Failed to delete vessel";

      onDeleteClose();
      setBlockedDeletes([
        { id: deleteVesselId, name: vesselNameById(deleteVesselId), message },
      ]);
      setDeleteVesselId(null);
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
          <Flex gap={2} align="center" flexWrap="wrap">
            <InputGroup flex={1} minW={{ base: "100%", md: "200px" }} maxW={{ base: "100%", md: "350px" }}>
              <InputLeftElement pointerEvents="none">
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
                placeholder="Search by vessel name or IMO..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
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
            <Box minW={{ base: "100%", md: "300px" }} maxW={{ base: "100%", md: "350px" }}>
              <SimpleSearchableSelect
                value={clientFilter}
                onChange={handleClientFilterChange}
                options={clientOptions}
                placeholder="Filter by client..."
                displayKey="name"
                valueKey="id"
                formatOption={(c) => c.name || c.company_name || `Client ${c.id}`}
                bg={inputBg}
                color={inputText}
                size="md"
              />
            </Box>
            <Box minW={{ base: "100%", md: "260px" }} maxW={{ base: "100%", md: "300px" }}>
              <Select
                size="md"
                value={vesselTypeFilter}
                onChange={(e) => setVesselTypeFilter(e.target.value)}
                bg={inputBg}
                color={inputText}
                borderRadius="8px"
                placeholder="All vessel types"
              >
                {vesselTypeSelecOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Box>
            {(searchQuery || clientFilter || vesselTypeFilter) && (
              <Button
                variant="outline"
                onClick={handleClearSearch}
                size="sm"
              >
                Clear
              </Button>
            )}
          </Flex>
        </Box>

        {selectedVesselIds.length > 0 && (
          <Box px="25px">
            <Flex
              align="center"
              justify="space-between"
              gap={3}
              flexWrap="wrap"
              bg="blue.50"
              border="1px solid"
              borderColor="blue.100"
              borderRadius="8px"
              px={4}
              py={2}
            >
              <Text fontSize="sm" fontWeight="600" color="blue.700">
                {selectedVesselIds.length} vessel(s) selected
              </Text>
              <HStack spacing={2}>
                <Button size="sm" variant="ghost" onClick={() => setSelectedVesselIds([])}>
                  Clear selection
                </Button>
                <Button size="sm" colorScheme="red" leftIcon={<Icon as={MdEdit} />} onClick={openBulkEdit}>
                  Edit selected
                </Button>
                <Button size="sm" colorScheme="orange" leftIcon={<Icon as={MdDelete} />} onClick={onBulkDeleteOpen}>
                  Delete selected
                </Button>
              </HStack>
            </Flex>
          </Box>
        )}

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
                  <Th py="12px" px="16px" w="40px">
                    <Checkbox
                      isChecked={allVisibleSelected}
                      isIndeterminate={someVisibleSelected}
                      isDisabled={!vessels.length}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      aria-label="Select all vessels on this page"
                    />
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    Vessel
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    Client (Customer)
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    Vessel Type
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    IMO
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    Procurement Person
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    Procurement Email
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    Vessel Email
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...teamTableCellProps}>
                    Team
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    Status
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? (
                  <Tr>
                    <Td colSpan={11} py="40px" textAlign="center">
                      <Spinner size="lg" />
                    </Td>
                  </Tr>
                ) : vessels.length > 0 ? (
                  vessels.map((vessel, index) => (
                    <Tr
                      key={vessel.id}
                      bg={index % 2 === 0 ? "white" : "gray.50"}
                      _hover={{ bg: hoverBg }}
                      cursor="pointer"
                      onClick={() => handleEditVessel(vessel)}
                      borderBottom="1px"
                      borderColor="gray.200"
                    >
                      <Td py="12px" px="16px" w="40px" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          isChecked={selectedVesselIds.includes(vessel.id)}
                          onChange={() => toggleVesselSelected(vessel.id)}
                          aria-label={`Select ${vessel.name || "vessel"}`}
                        />
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <HStack spacing={2}>
                          <Icon as={MdDirectionsBoat} color="blue.500" w="16px" h="16px" />
                          <Text color={textColor} fontSize="sm" fontWeight="500" {...cellText}>
                            {vessel.name || "-"}
                          </Text>
                        </HStack>
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <Text color={textColor} fontSize="sm" fontWeight="500" {...cellText}>
                          {vessel.client_id && typeof vessel.client_id === "object"
                            ? (vessel.client_id.name || "-")
                            : (vessel.client_id || "-")}
                        </Text>
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <Text color={textColor} fontSize="sm" fontWeight="500" {...cellText}>
                          {vessel.vessel_type_selec_label
                            || vessel.vessel_type
                            || "-"}
                        </Text>
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <Text color={textColor} fontSize="sm" fontWeight="500" {...cellText}>
                          {vessel.imo || "-"}
                        </Text>
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <Text color={textColor} fontSize="sm" fontWeight="500" {...cellText}>
                          {vessel.procurement_person && typeof vessel.procurement_person === "object"
                            ? (vessel.procurement_person.name || "-")
                            : (vessel.procurement_person || vessel.procurement_person_id || "-")}
                        </Text>
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <Text color={textColor} fontSize="sm" fontWeight="500" {...cellText}>
                          {vessel.procurement_person && typeof vessel.procurement_person === "object"
                            ? (vessel.procurement_person.email && vessel.procurement_person.email !== false
                              ? vessel.procurement_person.email
                              : (vessel.procurement_email && vessel.procurement_email !== false ? vessel.procurement_email : "no email found"))
                            : (vessel.procurement_email && vessel.procurement_email !== false ? vessel.procurement_email : "no email found")}
                        </Text>
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <Text color={textColor} fontSize="sm" fontWeight="500" {...cellText}>
                          {vessel.vessel_email || "-"}
                        </Text>
                      </Td>
                      <Td py="12px" px="16px" {...teamTableCellProps}>
                        <Text color={textColor} fontSize="sm" fontWeight="500" {...teamCellText}>
                          {vessel.team || "-"}
                        </Text>
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <Badge
                          colorScheme={
                            vessel.status === "active" ? "green" :
                              vessel.status === "inactive" ? "red" :
                                vessel.status === "tbn" ? "yellow" :
                                  vessel.status === "new_building" ? "green" : "gray"
                          }
                          size="sm"
                          textTransform="capitalize"
                        >
                          {vessel.status || "-"}
                        </Badge>
                      </Td>
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <HStack spacing={2}>
                          <Tooltip label="View Vessel Details">
                            <IconButton
                              icon={<Icon as={MdVisibility} />}
                              size="sm"
                              colorScheme="green"
                              variant="ghost"
                              aria-label="View vessel details"
                              onClick={(e) => {
                                e.stopPropagation();
                                history.push(`/admin/configurations/vessels/${vessel.id}`, { vessel });
                              }}
                            />
                          </Tooltip>
                          <Tooltip label="Edit Vessel">
                            <IconButton
                              icon={<Icon as={MdEdit} />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              aria-label="Edit vessel"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditVessel(vessel);
                              }}
                            />
                          </Tooltip>
                          <Tooltip label="Delete Vessel">
                            <IconButton
                              icon={<Icon as={MdDelete} />}
                              size="sm"
                              colorScheme="orange"
                              variant="ghost"
                              aria-label="Delete vessel"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVessel(vessel);
                              }}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={11} py="40px" textAlign="center">
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

        {totalPages > 0 && (
          <Box px="25px">
            <Flex justify="space-between" align="center" py={4} flexWrap="wrap" gap={4}>
              <Text fontSize="sm" color="gray.600">
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
          </Box>
        )}
      </VStack>

      {/* Delete Confirmation Dialog */}
      < AlertDialog
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
      </AlertDialog >

      <AlertDialog
        isOpen={isBulkDeleteOpen}
        onClose={onBulkDeleteClose}
        leastDestructiveRef={undefined}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete {selectedVesselIds.length} vessel(s)
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete the selected vessels? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onBulkDeleteClose} isDisabled={isBulkSaving}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmBulkDelete} ml={3} isLoading={isBulkSaving}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal isOpen={blockedDeletes.length > 0} onClose={closeBlockedDeletes} size="lg" isCentered scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing="3" align="flex-start">
              <Flex
                align="center"
                justify="center"
                boxSize="36px"
                borderRadius="full"
                bg="orange.100"
                color="orange.600"
                flexShrink={0}
              >
                <Icon as={MdWarningAmber} boxSize="20px" />
              </Flex>
              <Box>
                <Text fontSize="md" fontWeight="700" color={textColor}>
                  {blockedDeletes.length === 1
                    ? "This vessel can't be deleted yet"
                    : `${blockedDeletes.length} vessels can't be deleted yet`}
                </Text>
                <Text fontSize="sm" fontWeight="normal" color="gray.500" mt="1">
                  {blockedDeletes.length === 1 ? "It is" : "They are"} still used in other records.
                  Remove the vessel from those records first, then delete it again.
                </Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="3" align="stretch">
              {blockedDeletes.map((item) => {
                const { groups, hasStock, hasShipping } = blockedItemLinkKinds(item);
                return (
                  <Box key={item.id} border="1px" borderColor="gray.200" borderRadius="md" p="3">
                    <Flex align="center" justify="space-between" gap="2" mb="2" flexWrap="wrap">
                      <HStack spacing="2">
                        <Icon as={MdDirectionsBoat} color="blue.500" />
                        <Text fontWeight="700" fontSize="sm" color={textColor}>
                          {item.name}
                        </Text>
                      </HStack>
                      {blockedDeletes.length > 1 && (
                        <HStack spacing="2" flexWrap="wrap">
                          {hasShipping && (
                            <Button
                              size="xs"
                              colorScheme="blue"
                              variant="outline"
                              rightIcon={<Icon as={MdOpenInNew} />}
                              onClick={() => openLinkedShippingOrders(item.id)}
                            >
                              Shipping orders
                            </Button>
                          )}
                          {hasStock && (
                            <Button
                              size="xs"
                              colorScheme="blue"
                              variant={hasShipping ? "solid" : "outline"}
                              rightIcon={<Icon as={MdOpenInNew} />}
                              onClick={() => openLinkedStockList(item.id)}
                            >
                              Stock items
                            </Button>
                          )}
                        </HStack>
                      )}
                    </Flex>
                    {groups.length ? (
                      <VStack spacing="2" align="stretch">
                        {groups.map((group) => {
                          const kind = linkGroupKind(group.label);
                          const openGroup = () => {
                            if (kind === "shipping_order") openLinkedShippingOrders(item.id);
                            else openLinkedStockList(item.id);
                          };
                          return (
                          <Box key={group.label}>
                            <Text fontSize="sm" color="gray.600" mb="1">
                              Linked to {group.count} {group.label}
                            </Text>
                            <Wrap spacing="2">
                              {group.refs.map((ref) => (
                                <WrapItem key={ref}>
                                  <Tooltip
                                    label={
                                      kind === "shipping_order"
                                        ? `Open shipping orders for this vessel`
                                        : `Open stock list for this vessel`
                                    }
                                    hasArrow
                                  >
                                    <Tag
                                      as="button"
                                      type="button"
                                      size="sm"
                                      colorScheme={kind === "shipping_order" ? "blue" : "orange"}
                                      variant="subtle"
                                      fontFamily="mono"
                                      cursor="pointer"
                                      _hover={{ textDecoration: "underline" }}
                                      onClick={openGroup}
                                    >
                                      {ref}
                                    </Tag>
                                  </Tooltip>
                                </WrapItem>
                              ))}
                            </Wrap>
                          </Box>
                          );
                        })}
                      </VStack>
                    ) : (
                      <Text fontSize="sm" color="gray.600">
                        {item.message}
                      </Text>
                    )}
                  </Box>
                );
              })}
            </VStack>
          </ModalBody>
          <ModalFooter gap="2" flexWrap="wrap">
            <Button variant="ghost" onClick={closeBlockedDeletes}>
              Close
            </Button>
            {blockedDeletes.length === 1 && blockedItemLinkKinds(blockedDeletes[0]).hasShipping && (
              <Button colorScheme="blue" variant="outline" onClick={() => openLinkedShippingOrders(blockedDeletes[0].id)}>
                Open Shipping Orders
              </Button>
            )}
            {blockedDeletes.length === 1 && blockedItemLinkKinds(blockedDeletes[0]).hasStock && (
              <Button colorScheme="blue" onClick={() => openLinkedStockList(blockedDeletes[0].id)}>
                Open Stock List
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box >
  );
};


