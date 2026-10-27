import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
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
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { MdAdd, MdChevronRight, MdExpandMore, MdLinkOff, MdSearch, MdVisibility } from "react-icons/md";
import { useHistory } from "react-router-dom";
import { getShippingOrders, updateShippingOrder } from "../../../api/shippingOrders";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";
import {
  buildMsoLinkPayload,
  filterLinkableOrders,
  getMsoApiError,
  getShippingOrderNumber,
} from "../../../utils/shippingOrderMso";
import {
  formatShippingOrderDestinationDisplay,
  formatShippingOrderStatusColor,
  formatShippingOrderStatusLabel,
} from "./shippingOrderUtils";

const PAGE_SIZE = 30;

const clientLabel = (order) =>
  order.client_code != null && order.client_code !== false && order.client_code !== ""
    ? String(order.client_code)
    : order.client || "—";

const StatusBadge = ({ done }) => (
  <Badge
    colorScheme={formatShippingOrderStatusColor(done)}
    variant="subtle"
    borderRadius="full"
    px={2.5}
    py={0.5}
    fontSize="xs"
    textTransform="none"
  >
    {formatShippingOrderStatusLabel(done)}
  </Badge>
);

/** Vessel SOs linked to one MSO (GET /api/shipping/orders?mso_id=). */
const VesselSoRows = ({ mso, reloadKey, onOpen, onUnlink, unlinkingId, subtleBg, mutedText }) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    getShippingOrders({ mso_id: mso.id, page_size: 200 })
      .then((res) => {
        if (!cancelled) setOrders(res.orders || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load vessel SOs");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mso.id, reloadKey]);

  return (
    <Tr>
      <Td colSpan={8} bg={subtleBg} px={6} py={3}>
        {isLoading ? (
          <Flex align="center" gap={2}>
            <Spinner size="sm" />
            <Text fontSize="sm" color={mutedText}>Loading vessel SOs...</Text>
          </Flex>
        ) : error ? (
          <Text fontSize="sm" color="red.500">{error}</Text>
        ) : orders.length === 0 ? (
          <Text fontSize="sm" color={mutedText}>
            No vessel SOs in this MSO yet. Use "Add vessel SO" to link one.
          </Text>
        ) : (
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Vessel SO</Th>
                <Th>Status</Th>
                <Th>Vessel</Th>
                <Th>Client</Th>
                <Th>Destination</Th>
                <Th textAlign="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {orders.map((order) => (
                <Tr key={order.id}>
                  <Td>
                    <Button size="sm" variant="link" colorScheme="blue" onClick={() => onOpen(order)}>
                      {getShippingOrderNumber(order)}
                    </Button>
                  </Td>
                  <Td><StatusBadge done={order.done} /></Td>
                  <Td>{order.vessel_name || "—"}</Td>
                  <Td>{clientLabel(order)}</Td>
                  <Td>{formatShippingOrderDestinationDisplay(order) || "—"}</Td>
                  <Td textAlign="right">
                    <Tooltip label="Remove from this MSO">
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        aria-label="Remove from MSO"
                        icon={<Icon as={MdLinkOff} />}
                        isLoading={unlinkingId === order.id}
                        onClick={() => onUnlink(order)}
                      />
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Td>
    </Tr>
  );
};

export default function MsoTab() {
  const history = useHistory();
  const toast = useToast();
  const linkDisclosure = useDisclosure();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.300");
  const subtleBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.800", "gray.100");

  const [msos, setMsos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [reloadKeys, setReloadKeys] = useState({});
  const [unlinkingId, setUnlinkingId] = useState(null);

  const [linkTarget, setLinkTarget] = useState(null);
  const [linkOptions, setLinkOptions] = useState([]);
  const [isSearchingLink, setIsSearchingLink] = useState(false);
  const [selectedSoId, setSelectedSoId] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const loadMsos = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await getShippingOrders({ is_mso: true, page, page_size: PAGE_SIZE, search: appliedSearch });
      setMsos(res.orders || []);
      setTotalPages(Math.max(1, res.total_pages || 1));
      setTotalCount(res.total_count || 0);
    } catch (err) {
      setLoadError(err?.message || "Failed to load MSOs");
    } finally {
      setIsLoading(false);
    }
  }, [page, appliedSearch]);

  useEffect(() => {
    loadMsos();
  }, [loadMsos]);

  const reloadChildren = (msoId) => {
    setReloadKeys((prev) => ({ ...prev, [msoId]: (prev[msoId] || 0) + 1 }));
  };

  const toggleExpanded = (msoId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msoId)) next.delete(msoId);
      else next.add(msoId);
      return next;
    });
  };

  const openOrder = (order) => history.push(`/admin/shipping-orders/${order.id}`);

  const applySearch = () => {
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const showError = (title, message) =>
    toast({ title, description: message, status: "error", duration: 5000, isClosable: true });

  const handleUnlink = async (mso, order) => {
    setUnlinkingId(order.id);
    try {
      const res = await updateShippingOrder(order.id, buildMsoLinkPayload(null));
      const apiError = getMsoApiError(res);
      if (apiError) throw new Error(apiError);
      toast({ title: `${getShippingOrderNumber(order)} removed from MSO`, status: "success", duration: 3000 });
      reloadChildren(mso.id);
    } catch (err) {
      showError("Could not remove SO", err?.message);
    } finally {
      setUnlinkingId(null);
    }
  };

  const searchLinkableOrders = useCallback(
    async (term) => {
      if (!linkTarget) return;
      setIsSearchingLink(true);
      try {
        const res = await getShippingOrders({ is_mso: false, search: term || "", page_size: 20 });
        setLinkOptions(filterLinkableOrders(res.orders || [], linkTarget.id));
      } catch {
        setLinkOptions([]);
      } finally {
        setIsSearchingLink(false);
      }
    },
    [linkTarget]
  );

  const openLinkModal = (mso) => {
    setLinkTarget(mso);
    setSelectedSoId("");
    setLinkOptions([]);
    linkDisclosure.onOpen();
  };

  useEffect(() => {
    if (linkTarget && linkDisclosure.isOpen) searchLinkableOrders("");
  }, [linkTarget, linkDisclosure.isOpen, searchLinkableOrders]);

  const handleLink = async () => {
    if (!linkTarget || !selectedSoId) return;
    setIsLinking(true);
    try {
      const res = await updateShippingOrder(selectedSoId, buildMsoLinkPayload(linkTarget.id));
      const apiError = getMsoApiError(res);
      if (apiError) throw new Error(apiError);
      toast({ title: `SO added to ${getShippingOrderNumber(linkTarget)}`, status: "success", duration: 3000 });
      setExpandedIds((prev) => new Set(prev).add(linkTarget.id));
      reloadChildren(linkTarget.id);
      linkDisclosure.onClose();
    } catch (err) {
      showError("Could not add SO", err?.message);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} p={4}>
      <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap={3} mb={4} direction={{ base: "column", md: "row" }}>
        <Box flex="1" minW={0}>
          <Text fontSize="lg" fontWeight="bold">Master Shipping Orders</Text>
          <Text fontSize="sm" color={mutedText}>
            Consolidate several vessel SOs moving hub to hub. Hub costs go on the MSO, delivery costs and invoices on each vessel SO.
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap" align="center" flexShrink={0} justify={{ base: "flex-start", md: "flex-end" }}>
          <InputGroup size="sm" w={{ base: "100%", sm: "240px" }}>
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color={mutedText} />
            </InputLeftElement>
            <Input
              placeholder="Search MSO"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              bg={inputBg}
            />
          </InputGroup>
          <Button size="sm" variant="outline" flexShrink={0} onClick={applySearch}>Search</Button>
          <Button
            size="sm"
            colorScheme="blue"
            flexShrink={0}
            px={4}
            leftIcon={<Icon as={MdAdd} />}
            onClick={() => history.push("/admin/shipping-orders/create?is_mso=1")}
          >
            New MSO
          </Button>
        </Flex>
      </Flex>

      {isLoading ? (
        <Flex justify="center" py={10}><Spinner size="lg" color="blue.500" /></Flex>
      ) : loadError ? (
        <Flex direction="column" align="center" py={10} gap={3}>
          <Text color="red.500">{loadError}</Text>
          <Button size="sm" onClick={loadMsos}>Retry</Button>
        </Flex>
      ) : msos.length === 0 ? (
        <Text textAlign="center" py={10} color={mutedText}>
          {appliedSearch ? "No MSOs match your search." : "No MSOs yet. Click \"New MSO\" to create one."}
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th w="40px" />
                <Th>MSO Number</Th>
                <Th>Status</Th>
                <Th>Vessel</Th>
                <Th>Client</Th>
                <Th>Destination</Th>
                <Th>Date Created</Th>
                <Th textAlign="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {msos.map((mso) => {
                const isExpanded = expandedIds.has(mso.id);
                return (
                  <React.Fragment key={mso.id}>
                    <Tr>
                      <Td>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          aria-label={isExpanded ? "Hide vessel SOs" : "Show vessel SOs"}
                          icon={<Icon as={isExpanded ? MdExpandMore : MdChevronRight} boxSize={5} />}
                          onClick={() => toggleExpanded(mso.id)}
                        />
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button size="sm" variant="link" colorScheme="blue" fontWeight="800" onClick={() => openOrder(mso)}>
                            {getShippingOrderNumber(mso)}
                          </Button>
                          <Badge colorScheme="teal" variant="subtle" borderRadius="full" fontSize="2xs">MSO</Badge>
                        </HStack>
                      </Td>
                      <Td><StatusBadge done={mso.done} /></Td>
                      <Td>{mso.vessel_name || "—"}</Td>
                      <Td>{clientLabel(mso)}</Td>
                      <Td>{formatShippingOrderDestinationDisplay(mso) || "—"}</Td>
                      <Td whiteSpace="nowrap">{mso.date_order ? new Date(mso.date_order).toLocaleDateString() : "—"}</Td>
                      <Td textAlign="right">
                        <HStack spacing={1} justify="flex-end">
                          <Button size="xs" variant="outline" leftIcon={<Icon as={MdAdd} />} onClick={() => openLinkModal(mso)}>
                            Add vessel SO
                          </Button>
                          <Tooltip label="Open MSO">
                            <IconButton
                              size="xs"
                              variant="ghost"
                              aria-label="Open MSO"
                              icon={<Icon as={MdVisibility} />}
                              onClick={() => openOrder(mso)}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                    {isExpanded && (
                      <VesselSoRows
                        mso={mso}
                        reloadKey={reloadKeys[mso.id] || 0}
                        onOpen={openOrder}
                        onUnlink={(order) => handleUnlink(mso, order)}
                        unlinkingId={unlinkingId}
                        subtleBg={subtleBg}
                        mutedText={mutedText}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}

      {!isLoading && !loadError && totalCount > 0 && (
        <Flex justify="space-between" align="center" mt={4}>
          <Text fontSize="sm" color={mutedText}>{totalCount} MSO{totalCount === 1 ? "" : "s"}</Text>
          <HStack>
            <Button size="sm" variant="outline" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Text fontSize="sm">Page {page} of {totalPages}</Text>
            <Button size="sm" variant="outline" isDisabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </HStack>
        </Flex>
      )}

      <Modal isOpen={linkDisclosure.isOpen} onClose={linkDisclosure.onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add vessel SO to {linkTarget ? getShippingOrderNumber(linkTarget) : "MSO"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel fontSize="sm">Shipping order</FormLabel>
              <SimpleSearchableSelect
                value={selectedSoId}
                onChange={setSelectedSoId}
                options={linkOptions}
                placeholder="Search SO number"
                serverSideSearch
                onSearchChange={searchLinkableOrders}
                isLoading={isSearchingLink}
                valueKey="id"
                formatOption={(opt) =>
                  [getShippingOrderNumber(opt), opt.vessel_name].filter(Boolean).join(" — ")
                }
                bg={inputBg}
                color={inputText}
                borderColor={borderColor}
              />
            </FormControl>
            <Text fontSize="xs" color={mutedText} mt={2}>
              An SO already in another MSO will be moved to this one.
            </Text>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="outline" onClick={linkDisclosure.onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleLink} isLoading={isLinking} isDisabled={!selectedSoId}>
              Add to MSO
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}
