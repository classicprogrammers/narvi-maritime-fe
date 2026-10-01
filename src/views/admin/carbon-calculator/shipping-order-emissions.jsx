import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  DISTANCE_SOURCE_LABELS,
  extractCarbonErrorMessage,
  getShippingOrderEmissionDetailApi,
  getShippingOrderEmissionsApi,
  setStockManualDistanceApi,
  upsertLocationDistanceApi,
} from "api/carbon";
import { useMasterData } from "hooks/useMasterData";

const DONE_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
  { value: "pending_pod", label: "Pending POD" },
  { value: "ready_for_invoice", label: "Ready for Invoice" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archive", label: "Archive" },
];

const DONE_LABELS = Object.fromEntries(DONE_OPTIONS.filter((item) => item.value).map((item) => [item.value, item.label]));

function formatDone(done) {
  if (!done) return "—";
  return DONE_LABELS[done] || String(done);
}

function statusColor(done) {
  if (done === "active") return "green";
  if (done === "done") return "blue";
  if (done === "cancelled") return "red";
  if (done === "archive") return "gray";
  if (done === "ready_for_invoice") return "purple";
  if (done === "pending_pod") return "orange";
  return "gray";
}

function formatKg(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}

function namedOptions(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => ({
      id: item.id ?? item.value,
      name: item.name || item.client_name || item.vessel_name || item.label || "",
    }))
    .filter((item) => item.id != null && item.id !== "");
}

export default function ShippingOrderEmissions() {
  const toast = useToast();
  const { clients, vessels } = useMasterData();
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [vesselId, setVesselId] = useState("");
  const [soId, setSoId] = useState("");
  const [done, setDone] = useState("");
  const [withStockOnly, setWithStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [openStockId, setOpenStockId] = useState(null);
  const [manualDraft, setManualDraft] = useState({});
  const [savingStockId, setSavingStockId] = useState(null);
  const [legEdit, setLegEdit] = useState(null);
  const [savingDistance, setSavingDistance] = useState(false);

  const clearFilters = () => {
    setSearch("");
    setClientId("");
    setVesselId("");
    setSoId("");
    setDone("");
    setWithStockOnly(false);
    setPage(1);
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getShippingOrderEmissionsApi({
        page,
        page_size: pageSize,
        search,
        client_id: clientId,
        vessel_id: vesselId,
        so_id: soId,
        done,
        with_stock_only: withStockOnly,
      });
      setItems(result.items);
      setTotalCount(result.total_count);
      setTotalPages(result.total_pages || 1);
    } catch (error) {
      setItems([]);
      toast({
        title: "Could not load shipping order emissions",
        description: extractCarbonErrorMessage(error, "The list request did not complete."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, clientId, vesselId, soId, done, withStockOnly, toast]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openOrder = async (order) => {
    if (expandedId === order.saleOrderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(order.saleOrderId);
    if (details[order.saleOrderId]) return;
    setDetailLoadingId(order.saleOrderId);
    try {
      const detail = await getShippingOrderEmissionDetailApi(order.saleOrderId);
      setDetails((prev) => ({ ...prev, [order.saleOrderId]: detail }));
    } catch (error) {
      toast({
        title: "Could not load this shipping order",
        description: extractCarbonErrorMessage(error, "The detail request did not complete."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setDetailLoadingId(null);
    }
  };

  const refreshDetail = async (saleOrderId) => {
    const detail = await getShippingOrderEmissionDetailApi(saleOrderId);
    setDetails((prev) => ({ ...prev, [saleOrderId]: detail }));
    return detail;
  };

  const saveManualDistance = async (saleOrderId, stock) => {
    const draft = manualDraft[stock.stockRecordId] || {
      enabled: stock.carbonUseManualDistance,
      km: stock.carbonManualDistanceKm,
    };
    setSavingStockId(stock.stockRecordId);
    try {
      await setStockManualDistanceApi({
        stock_id: stock.stockRecordId,
        carbon_use_manual_distance: draft.enabled,
        carbon_manual_distance_km: draft.km,
      });
      await refreshDetail(saleOrderId);
      toast({ title: "Stock distance saved", status: "success", duration: 2500, isClosable: true });
    } catch (error) {
      toast({
        title: "Could not save stock distance",
        description: extractCarbonErrorMessage(error, "Update failed."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSavingStockId(null);
    }
  };

  const saveLegDistance = async () => {
    if (!legEdit) return;
    setSavingDistance(true);
    try {
      await upsertLocationDistanceApi({
        origin_location_id: legEdit.fromLocationId,
        destination_location_id: legEdit.toLocationId,
        distance_km: legEdit.distanceKm,
        prevent_auto_calculation: legEdit.preventAutoCalculation,
      });
      await refreshDetail(legEdit.saleOrderId);
      setLegEdit(null);
      toast({ title: "Route distance saved", status: "success", duration: 2500, isClosable: true });
    } catch (error) {
      toast({
        title: "Could not save route distance",
        description: extractCarbonErrorMessage(error, "Update failed."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSavingDistance(false);
    }
  };

  return (
    <Box bg="white" borderRadius="24px" borderWidth="1px" borderColor="#e2e8f0" boxShadow="0 20px 40px rgba(148, 163, 184, 0.18)" p={{ base: 6, sm: 8 }} mb="8">
      <Text fontSize="xl" fontWeight="700" color="#0f172a">
        Shipping order emissions
      </Text>
      <Text fontSize="sm" color="#64748b" mt="1" mb="5">
        Each shipping order’s CO₂ is the sum of its linked stock lines.
      </Text>

      <Grid templateColumns={{ base: "1fr", md: "1.2fr 1fr 1fr 1fr" }} gap="3" mb="3">
        <Input
          placeholder="Search"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          h="40px"
          borderRadius="10px"
        />
        <Input
          placeholder="SO id"
          value={soId}
          onChange={(event) => {
            setPage(1);
            setSoId(event.target.value);
          }}
          h="40px"
          borderRadius="10px"
        />
        <SimpleSearchableSelect
          value={clientId}
          onChange={(value) => {
            setPage(1);
            setClientId(value || "");
          }}
          options={namedOptions(clients)}
          placeholder="Client"
          size="md"
        />
        <SimpleSearchableSelect
          value={vesselId}
          onChange={(value) => {
            setPage(1);
            setVesselId(value || "");
          }}
          options={namedOptions(vessels)}
          placeholder="Vessel"
          size="md"
        />
      </Grid>
      <Flex gap="4" align="center" wrap="wrap" mb="5">
        <Select
          value={done}
          onChange={(event) => {
            setPage(1);
            setDone(event.target.value);
          }}
          maxW="220px"
          h="40px"
          borderRadius="10px"
        >
          {DONE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Checkbox
          isChecked={withStockOnly}
          onChange={(event) => {
            setPage(1);
            setWithStockOnly(event.target.checked);
          }}
        >
          With stock only
        </Checkbox>
        <Button size="sm" variant="outline" onClick={clearFilters}>
          Clear
        </Button>
        <Button size="sm" variant="outline" onClick={loadList} isLoading={loading}>
          Refresh
        </Button>
      </Flex>

      {loading && !items.length ? (
        <Flex justify="center" py="8">
          <Spinner color="#1d4ed8" />
        </Flex>
      ) : (
        <Box overflowX="auto">
          <Box as="table" w="100%" fontSize="sm" sx={{ borderCollapse: "collapse" }}>
            <Box as="thead">
              <Box as="tr" borderBottomWidth="1px" borderColor="#e2e8f0" color="#94a3b8" fontSize="10px" fontWeight="700" textTransform="uppercase">
                {["", "SO", "Client", "Vessel", "Status", "Destination", "Stock count", "Total CO₂"].map((heading, index) => (
                  <Box as="th" key={heading || `col-${index}`} textAlign="left" py="3" px="3">
                    {heading}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box as="tbody">
              {items.map((order) => {
                const open = expandedId === order.saleOrderId;
                const detail = details[order.saleOrderId];
                return (
                  <React.Fragment key={order.saleOrderId}>
                    <Box
                      as="tr"
                      borderBottomWidth="1px"
                      borderColor="#f1f5f9"
                      cursor="pointer"
                      _hover={{ bg: "#f8fafc" }}
                      onClick={() => openOrder(order)}
                    >
                      <Box as="td" py="3" px="3">
                        {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
                      </Box>
                      <Box as="td" py="3" px="3">
                        <Text fontWeight="700" color="#0f172a">{order.soId || order.saleOrderId}</Text>
                        {order.primaryModeLabel ? (
                          <Text fontSize="xs" color="#64748b">{order.primaryModeLabel}</Text>
                        ) : null}
                      </Box>
                      <Box as="td" py="3" px="3">{order.clientName}</Box>
                      <Box as="td" py="3" px="3">{order.vesselName}</Box>
                      <Box as="td" py="3" px="3">
                        {order.done ? (
                          <Badge colorScheme={statusColor(order.done)} fontSize="10px">
                            {formatDone(order.done)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </Box>
                      <Box as="td" py="3" px="3">{order.destination || "—"}</Box>
                      <Box as="td" py="3" px="3">{order.stockItemCount}</Box>
                      <Box as="td" py="3" px="3" fontWeight="700">
                        {formatKg(order.totalCo2eKg)}
                        {order.isEstimate ? (
                          <Badge ml="2" colorScheme="orange" fontSize="10px">
                            Estimate
                          </Badge>
                        ) : null}
                      </Box>
                    </Box>
                    {open ? (
                      <Box as="tr">
                        <Box as="td" colSpan={8} bg="#f8fafc" px="4" py="4">
                          {detailLoadingId === order.saleOrderId ? (
                            <Spinner size="sm" color="#1d4ed8" />
                          ) : (
                            <>
                            {detail ? (
                              <Flex gap="4" wrap="wrap" mb="3" fontSize="xs" color="#475569">
                                {detail.name ? <Text>{detail.name}</Text> : null}
                                <Text>{formatDone(detail.done)}</Text>
                                {detail.destination ? <Text>{detail.destination}</Text> : null}
                                <Text>{formatKg(detail.totalWeightKg)} weight</Text>
                                <Text>{Number(detail.totalDistanceKm).toLocaleString()} km</Text>
                              </Flex>
                            ) : null}
                            <StockLines
                              order={detail}
                              openStockId={openStockId}
                              setOpenStockId={setOpenStockId}
                              manualDraft={manualDraft}
                              setManualDraft={setManualDraft}
                              savingStockId={savingStockId}
                              onSaveManual={(stock) => saveManualDistance(order.saleOrderId, stock)}
                              onEditLeg={(leg) => setLegEdit({ ...leg, saleOrderId: order.saleOrderId })}
                            />
                            </>
                          )}
                        </Box>
                      </Box>
                    ) : null}
                  </React.Fragment>
                );
              })}
              {!items.length ? (
                <Box as="tr">
                  <Box as="td" colSpan={8} py="8" textAlign="center" color="#64748b">
                    No shipping orders were returned.
                  </Box>
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>
      )}

      <Flex justify="space-between" align="center" mt="4" fontSize="sm" color="#64748b">
        <Text>{totalCount} shipping orders</Text>
        <Flex gap="2" align="center">
          <Button size="sm" variant="outline" isDisabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <Text>
            {page} / {totalPages}
          </Text>
          <Button size="sm" variant="outline" isDisabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </Flex>
      </Flex>

      <Modal isOpen={Boolean(legEdit)} onClose={() => setLegEdit(null)} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader fontSize="md">Set route distance</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="#64748b" mb="3">
              {legEdit?.from} → {legEdit?.to}
            </Text>
            <Text fontSize="xs" fontWeight="700" mb="1">Distance (km)</Text>
            <Input
              type="number"
              min="0"
              value={legEdit?.distanceKm ?? ""}
              onChange={(event) => setLegEdit((prev) => ({ ...prev, distanceKm: event.target.value }))}
              mb="3"
            />
            <Checkbox
              isChecked={Boolean(legEdit?.preventAutoCalculation)}
              onChange={(event) => setLegEdit((prev) => ({ ...prev, preventAutoCalculation: event.target.checked }))}
            >
              Do not use the 2500 km estimate
            </Checkbox>
          </ModalBody>
          <ModalFooter gap="2">
            <Button variant="ghost" onClick={() => setLegEdit(null)}>Cancel</Button>
            <Button bg="#1d4ed8" color="white" _hover={{ bg: "#1e40af" }} onClick={saveLegDistance} isLoading={savingDistance}>
              Save distance
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function StockLines({ order, openStockId, setOpenStockId, manualDraft, setManualDraft, savingStockId, onSaveManual, onEditLeg }) {
  const stocks = order?.stockItems || [];
  if (!stocks.length) {
    return <Text fontSize="sm" color="#64748b">This shipping order has no stock lines.</Text>;
  }
  return (
    <Box>
      {stocks.map((stock) => {
        const open = openStockId === stock.stockRecordId;
        const draft = manualDraft[stock.stockRecordId] || {
          enabled: stock.carbonUseManualDistance,
          km: stock.carbonManualDistanceKm,
        };
        return (
          <Box key={stock.stockRecordId || stock.stockId} mb="3" bg="white" borderRadius="12px" borderWidth="1px" borderColor="#e2e8f0" p="3">
            <Flex justify="space-between" align="center" cursor="pointer" onClick={() => setOpenStockId(open ? null : stock.stockRecordId)}>
              <Box>
                <Text fontWeight="700" fontSize="sm">{stock.stockId || stock.stockRecordId}</Text>
                <Text fontSize="xs" color="#64748b">{stock.routeLabel}</Text>
              </Box>
              <Flex align="center" gap="2">
                <Text fontSize="sm" fontWeight="700">{formatKg(stock.totalCo2eKg)}</Text>
                {stock.isEstimate ? <Badge colorScheme="orange">Estimate</Badge> : null}
                {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Flex>
            </Flex>
            {open ? (
              <Box mt="3">
                {(stock.legs || []).map((leg, index) => (
                  <Flex key={`${leg.from}-${leg.to}-${index}`} justify="space-between" align="center" py="2" borderTopWidth="1px" borderColor="#f1f5f9" fontSize="xs" gap="3" wrap="wrap">
                    <Text>{leg.from} → {leg.to}</Text>
                    <Text>{leg.modeLabel || leg.mode}</Text>
                    <Text>{leg.distanceKm} km</Text>
                    <Text color={leg.distanceSource === "default_estimate" ? "orange.500" : "#64748b"}>
                      {DISTANCE_SOURCE_LABELS[leg.distanceSource] || leg.distanceSource || "—"}
                    </Text>
                    <Text fontWeight="700">{formatKg(leg.co2eKg)}</Text>
                    {leg.fromLocationId && leg.toLocationId ? (
                      <Button size="xs" variant="outline" onClick={() => onEditLeg(leg)}>
                        Set distance
                      </Button>
                    ) : null}
                  </Flex>
                ))}
                <Flex mt="3" gap="3" align="center" wrap="wrap">
                  <Checkbox
                    isChecked={Boolean(draft.enabled)}
                    onChange={(event) =>
                      setManualDraft((prev) => ({
                        ...prev,
                        [stock.stockRecordId]: { ...draft, enabled: event.target.checked },
                      }))
                    }
                  >
                    Use manual carbon distance
                  </Checkbox>
                  <Input
                    type="number"
                    min="0"
                    w="140px"
                    size="sm"
                    value={draft.km}
                    onChange={(event) =>
                      setManualDraft((prev) => ({
                        ...prev,
                        [stock.stockRecordId]: { ...draft, km: event.target.value },
                      }))
                    }
                  />
                  <Button size="sm" bg="#1d4ed8" color="white" _hover={{ bg: "#1e40af" }} isLoading={savingStockId === stock.stockRecordId} onClick={() => onSaveManual(stock)}>
                    Save distance
                  </Button>
                </Flex>
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
