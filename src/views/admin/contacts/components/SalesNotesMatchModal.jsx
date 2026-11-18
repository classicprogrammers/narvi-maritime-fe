import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  HStack,
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
} from "@chakra-ui/react";
import { getClientSales } from "api/clientSales";
import { buildSalesListParams, formatIsoToDdMmYy } from "utils/salesNotes";

const EMPTY_PAGINATION = {
  page: 1,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
};

const display = (value) => (value == null || value === "" ? "-" : value);
const nameOf = (value) => (value && typeof value === "object" ? value.name : value);

// Read-only list of sales notes matching the active date params (entry/follow-up date from/to)
const SalesNotesMatchModal = ({ isOpen, onClose, dateParams }) => {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const modalBg = useColorModeValue("white", "gray.800");
  const modalHeaderBg = useColorModeValue("gray.50", "gray.700");
  const modalBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const mutedText = useColorModeValue("gray.500", "gray.400");

  const dateKey = JSON.stringify(dateParams || {});

  useEffect(() => {
    if (isOpen) setPage(1);
  }, [isOpen, dateKey]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = buildSalesListParams({ page, dateRanges: dateParams });
        const res = await getClientSales(params);
        if (cancelled) return;
        setRows(res.data || []);
        setPagination({
          page: res.page || page,
          page_size: res.page_size,
          total_count: res.total_count,
          total_pages: res.total_pages,
          has_next: res.has_next,
          has_previous: res.has_previous,
        });
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setPagination(EMPTY_PAGINATION);
        setError(err?.message || "Failed to fetch sales notes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // dateKey stands in for dateParams so a new object with the same values does not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, page, dateKey]);

  const colSpan = 6;

  const renderBody = () => {
    if (loading) {
      return (
        <Tr>
          <Td colSpan={colSpan} textAlign="center" py={8}>
            <Flex justify="center" align="center" gap={3}>
              <Spinner size="sm" />
              <Text color={mutedText}>Loading sales notes...</Text>
            </Flex>
          </Td>
        </Tr>
      );
    }
    if (error) {
      return (
        <Tr>
          <Td colSpan={colSpan} py={6}>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          </Td>
        </Tr>
      );
    }
    if (rows.length === 0) {
      return (
        <Tr>
          <Td colSpan={colSpan} textAlign="center" py={8} color={mutedText}>
            No sales notes match these dates.
          </Td>
        </Tr>
      );
    }
    return rows.map((row, index) => (
      <Tr key={row.id ?? index}>
        <Td color={tableTextColor} whiteSpace="nowrap">
          {display(formatIsoToDdMmYy(row.entry_date))}
        </Td>
        <Td color={tableTextColor}>{display(nameOf(row.client_id) ?? row.client_name)}</Td>
        <Td color={tableTextColor}>
          {display(row.client_code ?? row.client_id?.client_code ?? row.client_id?.code)}
        </Td>
        <Td color={tableTextColor} maxW="280px">
          <Tooltip
            label={<Text whiteSpace="pre-wrap">{row.remarks}</Text>}
            isDisabled={!row.remarks}
            hasArrow
          >
            <Text noOfLines={2}>{display(row.remarks)}</Text>
          </Tooltip>
        </Td>
        <Td color={tableTextColor} whiteSpace="nowrap">
          {display(formatIsoToDdMmYy(row.follow_up_date))}
        </Td>
        <Td color={tableTextColor}>{display(nameOf(row.created_by))}</Td>
      </Tr>
    ));
  };

  const total = pagination.total_count || 0;
  const pageSize = pagination.page_size || 50;
  const from = total === 0 ? 0 : (pagination.page - 1) * pageSize + 1;
  const to = Math.min(pagination.page * pageSize, total);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
      <ModalContent bg={modalBg} border="1px" borderColor={modalBorder} maxH="90vh">
        <ModalHeader bg={modalHeaderBg} borderBottom="1px" borderColor={modalBorder}>
          Matching Sales Notes
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={4}>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg={tableHeaderBg}>
                <Tr>
                  <Th>Entry date</Th>
                  <Th>Client</Th>
                  <Th>Client code</Th>
                  <Th>Remarks</Th>
                  <Th>Follow-up date</Th>
                  <Th>Created by</Th>
                </Tr>
              </Thead>
              <Tbody>{renderBody()}</Tbody>
            </Table>
          </Box>
        </ModalBody>
        <ModalFooter justifyContent="space-between" flexWrap="wrap" gap={3}>
          <Text fontSize="sm" color={mutedText}>
            Showing {from} to {to} of {total} results
          </Text>
          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(1)}
              isDisabled={loading || !pagination.has_previous}
              aria-label="First page"
            >
              ««
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              isDisabled={loading || !pagination.has_previous}
              aria-label="Previous page"
            >
              «
            </Button>
            <Text fontSize="sm" color={mutedText}>
              Page {pagination.page} of {pagination.total_pages}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              isDisabled={loading || !pagination.has_next}
              aria-label="Next page"
            >
              »
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(pagination.total_pages)}
              isDisabled={loading || !pagination.has_next}
              aria-label="Last page"
            >
              »»
            </Button>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SalesNotesMatchModal;
