import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { getStockListApi } from "api/stock";

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 50;

const textOf = (val) => {
  if (val == null || val === false || val === "") return "-";
  if (typeof val === "object") return String(val.name ?? val.id ?? "-");
  return String(val);
};

// Stock list rows: `id` = stock list record id (selection), `stock_item_id` = code shown.
const qtyOf = (row) => {
  const val = row.item ?? row.items ?? row.item_id ?? row.stock_items_quantity;
  return val == null || val === false || val === "" ? "-" : String(val);
};

const CiPlManualStockPicker = ({
  isOpen,
  onClose,
  onAdd,
  existingStockListIds = [],
  isBusy = false,
  vesselId = null,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [onlyVessel, setOnlyVessel] = useState(true);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const requestRef = useRef(0);

  const existing = useMemo(
    () => new Set((existingStockListIds || []).map((id) => Number(id))),
    [existingStockListIds]
  );
  const hasVessel = vesselId != null && vesselId !== "" && vesselId !== false;
  const useVesselFilter = hasVessel && onlyVessel;

  // Reset state each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setSearchInput("");
    setSearch("");
    setOnlyVessel(true);
    setPage(1);
    setSelected(new Set());
  }, [isOpen]);

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch((prev) => {
        const next = searchInput.trim();
        if (prev !== next) setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError("");
    try {
      const params = { search, page, page_size: PAGE_SIZE };
      if (useVesselFilter) params.vessel_id = vesselId;
      const res = await getStockListApi(params);
      if (requestId !== requestRef.current) return;
      setRows(Array.isArray(res?.stock_list) ? res.stock_list : []);
      setTotalPages(Number(res?.total_pages) || 0);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setRows([]);
      setTotalPages(0);
      setError(err?.message || "Failed to load stock items");
    } finally {
      if (requestId === requestRef.current) setIsLoading(false);
    }
  }, [search, page, useVesselFilter, vesselId]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    onAdd(Array.from(selected));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add stock items</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex gap={4} mb={4} align="flex-end" wrap="wrap">
            <FormControl maxW="360px">
              <FormLabel fontSize="sm">Search</FormLabel>
              <Input
                size="sm"
                placeholder="Stock item, PO, description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </FormControl>
            {hasVessel && (
              <FormControl display="flex" alignItems="center" w="auto">
                <FormLabel htmlFor="ci-pl-picker-vessel" mb={0} fontSize="sm">
                  Only this vessel
                </FormLabel>
                <Switch
                  id="ci-pl-picker-vessel"
                  isChecked={onlyVessel}
                  onChange={(e) => {
                    setOnlyVessel(e.target.checked);
                    setPage(1);
                  }}
                />
              </FormControl>
            )}
          </Flex>

          {error && (
            <Alert status="error" mb={3} borderRadius="md">
              <AlertIcon />
              <Text flex="1">{error}</Text>
              <Button size="sm" onClick={load}>
                Retry
              </Button>
            </Alert>
          )}

          {isLoading ? (
            <Flex justify="center" py={10}>
              <Spinner />
            </Flex>
          ) : rows.length === 0 ? (
            <Box py={10} textAlign="center">
              <Text color="secondaryGray.600">
                {error ? "Could not load stock items." : "No stock items found."}
              </Text>
            </Box>
          ) : (
            <TableContainer>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th w="40px" />
                    <Th>Stock item</Th>
                    <Th>Description</Th>
                    <Th>PO</Th>
                    <Th>Vessel</Th>
                    <Th isNumeric>Qty</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((row) => {
                    const id = Number(row.id);
                    const isAdded = existing.has(id);
                    const isChecked = selected.has(id);
                    return (
                      <Tr key={row.id} opacity={isAdded ? 0.6 : 1}>
                        <Td>
                          <Checkbox
                            isChecked={isAdded || isChecked}
                            isDisabled={isAdded || isBusy}
                            onChange={() => toggle(id)}
                            aria-label={`Select ${textOf(row.stock_item_id)}`}
                          />
                        </Td>
                        <Td>
                          {textOf(row.stock_item_id)}
                          {isAdded && (
                            <Badge ml={2} colorScheme="green">
                              Added
                            </Badge>
                          )}
                        </Td>
                        <Td whiteSpace="normal">{textOf(row.item_desc)}</Td>
                        <Td whiteSpace="normal">{textOf(row.po_text)}</Td>
                        <Td>{textOf(row.vessel_id ?? row.vessel)}</Td>
                        <Td isNumeric>{qtyOf(row)}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          )}

          {totalPages > 1 && (
            <Flex justify="center" align="center" gap={3} mt={3}>
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                isDisabled={page <= 1 || isLoading}
              >
                Previous
              </Button>
              <Text fontSize="sm">
                Page {page} of {totalPages}
              </Text>
              <Button
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                isDisabled={page >= totalPages || isLoading}
              >
                Next
              </Button>
            </Flex>
          )}
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleAdd}
            isDisabled={selected.size === 0 || isBusy}
            isLoading={isBusy}
          >
            Add selected ({selected.size})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CiPlManualStockPicker;
