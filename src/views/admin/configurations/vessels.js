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
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdDirectionsBoat,
  MdVisibility,
  MdPrint,
  MdClear,
} from "react-icons/md";
import { CloseIcon } from "@chakra-ui/icons";
import { List, ListItem } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import vesselsAPI from "../../../api/vessels";
import { refreshMasterData, MASTER_KEYS } from "../../../utils/masterDataCache";
import { useMasterData } from "../../../hooks/useMasterData";
import SearchableSelect from "../../../components/forms/SearchableSelect";

export default function Vessels() {
  const history = useHistory();
  const [vessels, setVessels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 80;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [editingVessel, setEditingVessel] = useState(null);
  const [deleteVesselId, setDeleteVesselId] = useState(null);

  const { clients } = useMasterData();
  const clientOptions = useMemo(() => {
    const source = Array.isArray(clients) ? clients : [];
    return source.filter((client) => {
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
  }, [clients]);
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    status: "active",
    imo: "",
    vessel_type: "",
    procurement_person_id: "",
    procurement_email: "",
    vessel_email: "",
    team: "",
    attachments: [],
    // For updates: IDs of existing attachments the user removed
    attachment_to_delete: [],
  });
  const [procurementPeopleOptions, setProcurementPeopleOptions] = useState([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const lastSavedSignatureRef = useRef("");
  const createdVesselIdRef = useRef(null);
  const createInFlightRef = useRef(false);
  const clientChangeUserControlledRef = useRef(false);

  const [previewFile, setPreviewFile] = useState(null);

  const handleView = (file) => {
    let fileUrl = null;

    // ✅ Case 1: actual uploaded file
    if (file instanceof File || file instanceof Blob) {
      fileUrl = URL.createObjectURL(file);
    }

    // ✅ Case 2: backend URL
    else if (file.url) {
      fileUrl = file.url;
    }

    // ✅ Case 3: base64 data (like your case)
    else if (file.datas) {
      const mimeType = file.mimetype || "application/octet-stream";
      fileUrl = `data:${mimeType};base64,${file.datas}`;
    }

    // ✅ Case 4: fallback path
    else if (file.path) {
      fileUrl = file.path;
    }

    const fileType =
      file.mimetype ||
      file.type ||
      file.filename?.split(".").pop() ||
      "application/octet-stream";

    if (fileUrl) {
      setPreviewFile({ ...file, fileUrl, fileType });
    } else {
      console.warn("⚠️ No valid file URL found for preview:", file);
    }
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
      });
      if (response.vessels && Array.isArray(response.vessels)) {
        setVessels(response.vessels);
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
  }, [page, pageSize, sortBy, sortOrder, searchQuery, clientFilter, toast]);

  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, clientFilter]);

  // Search on change (debounced) – skip initial mount
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
    setPage(1);
  };

  const handleInputChange = (field, value) => {
    if (field === "client_id") {
      clientChangeUserControlledRef.current = true;
      const nextClientId = value || "";
      setFormData(prev => ({
        ...prev,
        client_id: nextClientId,
        procurement_person_id: "",
        procurement_email: "",
      }));
      return;
    }

    if (field === "procurement_person_id") {
      const selected = procurementPeopleOptions.find((p) => String(p.id) === String(value));
      setFormData(prev => ({
        ...prev,
        procurement_person_id: value || "",
        procurement_email: selected?.email && selected.email !== false ? String(selected.email) : "",
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      client_id: "",
      status: "active",
      imo: "",
      vessel_type: "",
      procurement_person_id: "",
      procurement_email: "",
      vessel_email: "",
      team: "",
      attachments: [],
      attachment_to_delete: [],
    });
    setEditingVessel(null);
    setPreviewFile(null);
    setProcurementPeopleOptions([]);
    clientChangeUserControlledRef.current = false;
    lastSavedSignatureRef.current = "";
    createdVesselIdRef.current = null;
    createInFlightRef.current = false;
  };


  const handleNewVessel = () => {
    resetForm();
    onModalOpen();
  };

  const handleEditVessel = async (vessel) => {
    try {
      setIsLoading(true);
      onModalOpen();
      const vesselData = await vesselsAPI.getVessel(vessel.id);
      const vesselInfo = vesselData.vessel || vesselData.result?.vessel || vesselData;

      setFormData({
        name: vesselInfo.name || "",
        client_id: vesselInfo.client_id && typeof vesselInfo.client_id === "object"
          ? vesselInfo.client_id.id
          : (vesselInfo.client_id || ""),
        status: vesselInfo.status || "active",
        imo: vesselInfo.imo || "",
        vessel_type: vesselInfo.vessel_type || "",
        procurement_person_id:
          vesselInfo.procurement_person && typeof vesselInfo.procurement_person === "object"
            ? String(vesselInfo.procurement_person.id || "")
            : String(vesselInfo.procurement_person_id || ""),
        procurement_email:
          vesselInfo.procurement_person && typeof vesselInfo.procurement_person === "object"
            ? (
              vesselInfo.procurement_person.email && vesselInfo.procurement_person.email !== false
                ? String(vesselInfo.procurement_person.email)
                : (
                  vesselInfo.procurement_email && vesselInfo.procurement_email !== false
                    ? String(vesselInfo.procurement_email)
                    : ""
                )
            )
            : (
              vesselInfo.procurement_email && vesselInfo.procurement_email !== false
                ? String(vesselInfo.procurement_email)
                : ""
            ),
        vessel_email: vesselInfo.vessel_email || "",
        team: vesselInfo.team || "",
        attachments: vesselInfo.attachments || [],
        attachment_to_delete: [],
      });
      const people = Array.isArray(vesselInfo.procurement_people) ? vesselInfo.procurement_people : [];
      const options = people
        .map((person) => ({
          id: person?.id,
          name: person?.name || `Person ${person?.id}`,
          email: person?.email && person.email !== false ? String(person.email) : "",
        }))
        .filter((person) => person.id);
      setProcurementPeopleOptions(options);
      setEditingVessel({ ...vessel, ...vesselInfo });
      clientChangeUserControlledRef.current = false;
      lastSavedSignatureRef.current = "";
      createdVesselIdRef.current = vesselInfo?.id || vessel?.id || null;
      createInFlightRef.current = false;

    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load vessel data: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSavePayload = useCallback(() => ({
    name: formData.name?.trim() || "",
    client_id: formData.client_id || "",
    status: formData.status || "active",
    imo: formData.imo || "",
    vessel_type: formData.vessel_type || "",
    procurement_person_id: formData.procurement_person_id || "",
    procurement_email: formData.procurement_email || "",
    vessel_email: formData.vessel_email || "",
    team: formData.team || "",
    attachments: formData.attachments || [],
    attachment_to_delete: formData.attachment_to_delete || [],
  }), [formData]);

  const fetchProcurementPeopleByClient = useCallback(async (clientId) => {
    if (!clientId) {
      setProcurementPeopleOptions([]);
      return;
    }
    try {
      const response = await vesselsAPI.getVessels({
        page: 1,
        page_size: 80,
        client_id: clientId,
      });
      const vesselsList = Array.isArray(response?.vessels) ? response.vessels : [];
      const peopleMap = new Map();
      vesselsList.forEach((vesselItem) => {
        const people = Array.isArray(vesselItem?.procurement_people) ? vesselItem.procurement_people : [];
        people.forEach((person) => {
          if (person?.id && !peopleMap.has(String(person.id))) {
            peopleMap.set(String(person.id), {
              id: person.id,
              name: person.name || `Person ${person.id}`,
              email: person.email || "",
            });
          }
        });
      });
      setProcurementPeopleOptions(Array.from(peopleMap.values()));
    } catch (_error) {
      setProcurementPeopleOptions([]);
    }
  }, []);

  const resolveCreatedVesselId = useCallback(async (savePayload, createResponse) => {
    const responseCandidates = [
      createResponse?.result?.vessel?.id,
      createResponse?.result?.data?.id,
      createResponse?.result?.result?.vessel?.id,
      createResponse?.result?.result?.data?.id,
      createResponse?.result?.id,
      createResponse?.result?.vessel_id,
      createResponse?.result?.result?.vessel_id,
      createResponse?.result?.data?.vessel_id,
      createResponse?.result?.result?.data?.vessel_id,
    ];
    const responseId = responseCandidates.find((candidate) => candidate != null && candidate !== "");
    if (responseId) return String(responseId);

    try {
      // Fallback: query list and find exact matching vessel.
      const lookup = await vesselsAPI.getVessels({
        page: 1,
        page_size: 80,
        search: savePayload.name,
        client_id: savePayload.client_id,
        sort_by: "id",
        sort_order: "desc",
      });
      const candidates = Array.isArray(lookup?.vessels) ? lookup.vessels : [];
      const normalizedName = (savePayload.name || "").trim().toLowerCase();
      const matched = candidates.find((item) => {
        const itemName = (item?.name || "").trim().toLowerCase();
        const itemClientId =
          item?.client_id && typeof item.client_id === "object"
            ? String(item.client_id.id || "")
            : String(item?.client_id || "");
        return itemName === normalizedName && itemClientId === String(savePayload.client_id);
      });
      return matched?.id ? String(matched.id) : "";
    } catch (_error) {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    if (!clientChangeUserControlledRef.current) return;
    fetchProcurementPeopleByClient(formData.client_id);
  }, [fetchProcurementPeopleByClient, formData.client_id, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    const savePayload = getSavePayload();
    // Create/update starts after the required create fields exist.
    if (!savePayload.name || !savePayload.client_id) return;
    const vesselId = editingVessel?.id || createdVesselIdRef.current || "";

    const signature = JSON.stringify({
      ...savePayload,
      attachments: (savePayload.attachments || []).map((a) => a.id || a.filename || a.name || ""),
      attachment_to_delete: savePayload.attachment_to_delete || [],
      vessel_id: vesselId,
    });
    if (signature === lastSavedSignatureRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        if (!vesselId && createInFlightRef.current) return;
        setIsAutoSaving(true);
        if (vesselId) {
          await vesselsAPI.updateVessel({
            vessel_id: vesselId,
            ...savePayload,
          });
        } else {
          createInFlightRef.current = true;
          const response = await vesselsAPI.createVessel(savePayload);
          const created =
            response?.result?.vessel ||
            response?.result?.data ||
            response?.result?.result?.vessel ||
            response?.result?.result?.data ||
            response?.result ||
            null;
          const createdId = await resolveCreatedVesselId(savePayload, response);
          if (createdId) {
            createdVesselIdRef.current = createdId;
            setEditingVessel((prev) => ({ ...(prev || {}), id: createdId, ...(created || {}) }));
          } else {
            // Prevent duplicate create spam if backend doesn't return id deterministically.
            lastSavedSignatureRef.current = signature;
          }
        }
        lastSavedSignatureRef.current = signature;
      } catch (error) {
        toast({
          title: "Autosave failed",
          description: error?.response?.data?.message || error?.message || "Could not save vessel changes",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        createInFlightRef.current = false;
        setIsAutoSaving(false);
      }
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editingVessel, formData, getSavePayload, isModalOpen, resolveCreatedVesselId, toast]);

  const handleSubmit = async () => {
    try {
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

      setIsLoading(true);
      let finalFormData = { ...formData, vessel_id: editingVessel?.id };

      if (editingVessel) {
        const response = await vesselsAPI.updateVessel(finalFormData, null, editingVessel);
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
        const response = await vesselsAPI.createVessel(finalFormData);
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
      refreshMasterData(MASTER_KEYS.VESSELS).catch(() => { });
    } catch (error) {
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

      toast({
        title: "Error",
        description: message,
        status: "error",
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
              <SearchableSelect
                value={clientFilter}
                onChange={(value) => setClientFilter(value || "")}
                options={clientOptions}
                placeholder="Filter by client..."
                displayKey="name"
                valueKey="id"
                formatOption={(c) => c.name || c.company_name || `Client ${c.id}`}
                sx={{
                  height: "38px"
                }}
              />
            </Box>
            {(searchQuery || clientFilter) && (
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
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase" {...tableHeaderCellProps}>
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
                    <Td colSpan={10} py="40px" textAlign="center">
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
                          {vessel.vessel_type || "-"}
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
                      <Td py="12px" px="16px" {...tableCellProps}>
                        <Text color={textColor} fontSize="sm" fontWeight="500" {...cellText}>
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
                              colorScheme="blue"
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
                              colorScheme="red"
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
                    <Td colSpan={10} py="40px" textAlign="center">
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
                  options={clientOptions}
                  placeholder={clientOptions.length === 0 ? "No company clients found" : "Select customer"}
                  displayKey="name"
                  valueKey="id"
                  formatOption={(customer) => `${customer.name || customer.company_name || `Customer ${customer.id}`} (ID: ${customer.id})`}
                  isRequired
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Procurement Person
                </FormLabel>
                <Select
                  size="md"
                  value={formData.procurement_person_id}
                  onChange={(e) => handleInputChange("procurement_person_id", e.target.value)}
                  borderRadius="md"
                  placeholder={formData.client_id ? "Select procurement person" : "Select client first"}
                  isDisabled={!formData.client_id}
                >
                  {procurementPeopleOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Procurement Email
                </FormLabel>
                <Input
                  size="md"
                  value={formData.procurement_email || "no email found"}
                  isReadOnly
                  placeholder="Auto-filled from procurement person"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Vessel Email
                </FormLabel>
                <Input
                  size="md"
                  value={formData.vessel_email}
                  onChange={(e) => handleInputChange("vessel_email", e.target.value)}
                  placeholder="Enter vessel email"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Team
                </FormLabel>
                <Input
                  size="md"
                  value={formData.team}
                  onChange={(e) => handleInputChange("team", e.target.value)}
                  placeholder="Enter team"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  IMO
                </FormLabel>
                <Input
                  size="md"
                  value={formData.imo}
                  onChange={(e) => handleInputChange("imo", e.target.value)}
                  placeholder="Enter IMO number"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Vessel Type
                </FormLabel>
                <Input
                  size="md"
                  value={formData.vessel_type}
                  onChange={(e) => handleInputChange("vessel_type", e.target.value)}
                  placeholder="Enter Vessel Type"
                  borderRadius="md"
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="tbn">TBN</option>
                  <option value="new_building">New Building</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Attachments
                </FormLabel>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const filePromises = files.map(file => new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const result = reader.result || '';
                        const base64data = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : '';
                        resolve({ filename: file.name, datas: base64data, mimetype: file.type });
                      };
                      reader.readAsDataURL(file);
                    }));
                    Promise.all(filePromises).then(attachments => {
                      setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...attachments] }));
                    });
                  }}
                  accept="application/pdf,image/*"
                  py={1}
                />
                {formData.attachments && formData.attachments.length > 0 && (
                  <Box mt={2}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Attached Files:
                    </Text>
                    <List spacing={1}>
                      {formData.attachments.map((file, index) => (
                        <ListItem
                          key={index}
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          p={2}
                        >
                          <Text fontSize="sm">{file.filename}</Text>

                          <Box>
                            <Button
                              size="xs"
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => handleView(file)}
                              mr={2}
                            >
                              View
                            </Button>
                            <IconButton
                              size="xs"
                              icon={<CloseIcon />}
                              aria-label="Remove attachment"
                              onClick={() => {
                                setFormData((prev) => {
                                  const attachmentToRemove = prev.attachments[index];
                                  const updatedAttachments = prev.attachments.filter((_, i) => i !== index);

                                  // If this attachment came from the backend and has an id,
                                  // track it so the API can delete it.
                                  const updatedAttachmentsToDelete = [
                                    ...(prev.attachment_to_delete || []),
                                  ];

                                  if (attachmentToRemove && attachmentToRemove.id) {
                                    updatedAttachmentsToDelete.push(attachmentToRemove.id);
                                  }

                                  return {
                                    ...prev,
                                    attachments: updatedAttachments,
                                    attachment_to_delete: updatedAttachmentsToDelete,
                                  };
                                });
                              }}
                            />
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </FormControl>

            </VStack>

          </ModalBody >
          <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
            <Button variant="outline" mr={3} onClick={onModalClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" isLoading={isAutoSaving} isDisabled>
              {isAutoSaving ? "Saving..." : "Auto Saved"}
            </Button>
          </ModalFooter>
        </ModalContent >
      </Modal >

      {/* File Preview Modal - 65% viewing mode, A4 only when printing */}
      <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} size="full">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent maxW="65vw" maxH="65vh" m="auto" bg="white">
          <ModalHeader bg="gray.100" borderBottom="1px" borderColor="gray.200">
            <Flex justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="600">
                {previewFile?.filename || "File Preview"}
              </Text>
              <Button
                size="sm"
                leftIcon={<Icon as={MdPrint} />}
                onClick={() => {
                  const printWindow = window.open();
                  if (printWindow && previewFile?.fileUrl) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>${previewFile.filename}</title>
                          <style>
                            @page {
                              size: A4;
                              margin: 0;
                            }
                            body {
                              margin: 0;
                              padding: 0;
                            }
                            img, iframe {
                              width: 100%;
                              height: 100vh;
                              object-fit: contain;
                            }
                          </style>
                        </head>
                        <body>
                          ${previewFile.fileType?.startsWith("image/")
                        ? `<img src="${previewFile.fileUrl}" alt="${previewFile.filename}" />`
                        : previewFile.fileType === "application/pdf"
                          ? `<iframe src="${previewFile.fileUrl}" style="width: 100%; height: 100vh; border: none;"></iframe>`
                          : `<p>Preview not available. <a href="${previewFile.fileUrl}" download>Download file</a></p>`
                      }
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 250);
                  }
                }}
              >
                Print
              </Button>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} bg="gray.50" display="flex" justifyContent="center" alignItems="center" minH="calc(100vh - 120px)">
            {previewFile && (
              previewFile.fileType?.startsWith("image/") ? (
                <Box
                  w="100%"
                  h="100%"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  p={4}
                >
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.filename}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "calc(100vh - 120px)",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              ) : previewFile.fileType === "application/pdf" ? (
                <Box
                  w="100%"
                  h="calc(100vh - 120px)"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  bg="gray.100"
                >
                  <iframe
                    src={previewFile.fileUrl}
                    title={previewFile.filename}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              ) : (
                <Box p={8} textAlign="center">
                  <Text mb={4}>File preview not available for this file type.</Text>
                  <Button
                    as="a"
                    href={previewFile.fileUrl}
                    download={previewFile.filename}
                    colorScheme="blue"
                  >
                    Download File
                  </Button>
                </Box>
              )
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

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
    </Box >
  );
};


