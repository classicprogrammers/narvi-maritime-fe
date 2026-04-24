import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  MdFileDownload,
  MdFilterAlt,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import clientJobsApi from "api/clientJobs";
import clientVesselApi from "api/clientVessel";

function ClientOngoingJobs() {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    vessel: "",
    status: "In Transit",
    origin: "",
    destination: "",
    poNumber: "",
  });
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState("50");
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [clientName, setClientName] = useState("");
  const [vesselOptions, setVesselOptions] = useState([]);

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const softBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");

  const fetchVessels = useCallback(async () => {
    try {
      const res = await clientVesselApi.getClientVessels({});
      const options = (Array.isArray(res?.vessels) ? res.vessels : [])
        .map((v) => ({ id: v?.id, name: typeof v === "string" ? v : v?.name }))
        .filter((v) => v.name);
      setVesselOptions(options);
    } catch (_e) {
      setVesselOptions([]);
    }
  }, []);

  const fetchActiveJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const selectedVessel = vesselOptions.find((v) => String(v.name) === String(filters.vessel));
      const res = await clientJobsApi.getActiveJobs({
        search: search.trim() || undefined,
        status: filters.status === "In Transit" ? "in_transit" : "stock",
        vessel_id: selectedVessel?.id,
        date_from: filters.fromDate || undefined,
        date_to: filters.toDate || undefined,
        origin: filters.origin || undefined,
      });
      const mapped = (res?.stock_list || []).map((item, idx) => ({
        id: `${item.stock_item_id || "active"}-${idx}`,
        vessel: item.vessel?.name || "-",
        jobId: item.stock_item_id || "-",
        poText: item.po_text || (Array.isArray(item.po_number) ? item.po_number.join(", ") : "-"),
        mode: item.warehouse_id || "-",
        remarks: item.remarks || "-",
        status: item.stock_status || "-",
        etd: item.date_on_stock || "-",
        eta: "-",
        origin: item.origin || "-",
        destination: item.destination || "-",
        combined: item.so_number || "-",
        totalPackages: item.box ?? "-",
        totalWeight: item.weight ?? "-",
      }));
      setRows(mapped);
      setClientName(res?.client?.name || "");
    } catch (_e) {
      setRows([]);
      setClientName("");
    } finally {
      setIsLoading(false);
    }
  }, [filters.fromDate, filters.origin, filters.status, filters.toDate, filters.vessel, search, vesselOptions]);

  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActiveJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchActiveJobs]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filters.destination && !String(row.destination || "").toLowerCase().includes(filters.destination.toLowerCase())) {
        return false;
      }
      if (filters.poNumber && !String(row.poText || "").toLowerCase().includes(filters.poNumber.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [filters.destination, filters.poNumber, rows]);

  const pagedRows = useMemo(() => filteredRows.slice(0, Number(entries)), [entries, filteredRows]);

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      vessel: "",
      status: "In Transit",
      origin: "",
      destination: "",
      poNumber: "",
    });
    setSearch("");
    setEntries("50");
  };

  return (
    <Box>
      <Heading fontSize="24px" lineHeight="32px" color={headingColor} mb={4}>
        Ongoing Jobs{clientName ? ` - ${clientName}` : ""}
      </Heading>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={5} mb={5}>
        <Text fontSize="sm" fontWeight="700" color={headingColor} mb={4}>
          Filters
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={3}>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Date Range</Text>
            <Flex gap={2}>
              <Input size="sm" type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
              <Input size="sm" type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
            </Flex>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Vessel</Text>
            <Select
              size="sm"
              placeholder="All vessels"
              value={filters.vessel}
              onChange={(e) => setFilters((prev) => ({ ...prev, vessel: e.target.value }))}
            >
              {vesselOptions.map((v) => (
                <option key={`${v.id}-${v.name}`} value={v.name}>{v.name}</option>
              ))}
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Status</Text>
            <Select size="sm" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option>In Transit</option>
              <option>In Stock</option>
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Origin</Text>
            <Input size="sm" placeholder="Type 2 letters to search" value={filters.origin} onChange={(e) => setFilters((prev) => ({ ...prev, origin: e.target.value }))} />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Destination</Text>
            <Input size="sm" placeholder="Type 2 letters to search" value={filters.destination} onChange={(e) => setFilters((prev) => ({ ...prev, destination: e.target.value }))} />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>PO Number</Text>
            <Input size="sm" value={filters.poNumber} onChange={(e) => setFilters((prev) => ({ ...prev, poNumber: e.target.value }))} />
          </GridItem>
        </Grid>
        <Flex mt={4} gap={3}>
          <Button size="sm" variant="brand" leftIcon={<Icon as={MdFilterAlt} />}>
            Apply Filter
          </Button>
          <Button size="sm" variant="outline" borderColor={borderColor} leftIcon={<Icon as={MdRefresh} />} onClick={handleReset}>
            Reset
          </Button>
        </Flex>
      </Box>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={4} mb={3}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3}>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color={muted}>Show</Text>
            <Select size="xs" w="72px" value={entries} onChange={(e) => setEntries(e.target.value)}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </Select>
            <Text fontSize="sm" color={muted}>entries</Text>
          </Flex>
          <Flex align="center" gap={3}>
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                variant="outline"
                borderColor={borderColor}
                leftIcon={<Icon as={MdFileDownload} />}
              >
                Download
              </MenuButton>
              <MenuList>
                <MenuItem>Download Excel</MenuItem>
              </MenuList>
            </Menu>
            <InputGroup size="sm" maxW="220px">
              <InputLeftElement>
                <Icon as={MdSearch} color={muted} />
              </InputLeftElement>
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
          </Flex>
        </Flex>
      </Box>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead bg={softBg}>
            <Tr>
              <Th>Vessel Name</Th>
              <Th>Job ID</Th>
              <Th>Mode of Transport</Th>
              <Th>Remarks</Th>
              <Th>Status</Th>
              <Th>ETD</Th>
              <Th>ETA</Th>
              <Th>Origin</Th>
              <Th>Destination</Th>
              <Th>Combined</Th>
              <Th>Total No of Packages</Th>
              <Th>Total Weight (KGS)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagedRows.map((row) => (
              <Tr key={`${row.jobId}-${row.vessel}`}>
                <Td>{row.vessel}</Td>
                <Td>{row.jobId}</Td>
                <Td>{row.mode}</Td>
                <Td>{row.remarks}</Td>
                <Td>
                  <Badge colorScheme="orange" borderRadius="full" px={2.5} py={1}>
                    {row.status}
                  </Badge>
                </Td>
                <Td>{row.etd}</Td>
                <Td>{row.eta}</Td>
                <Td>{row.origin}</Td>
                <Td>{row.destination}</Td>
                <Td>{row.combined}</Td>
                <Td>{row.totalPackages}</Td>
                <Td>{row.totalWeight}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {!isLoading && pagedRows.length === 0 && (
          <Text px={4} py={3} fontSize="sm" color={muted}>
            No ongoing jobs found for the selected filters.
          </Text>
        )}
      </Box>
      {isLoading && (
        <Text mt={2} fontSize="xs" color={muted}>
          Loading ongoing jobs...
        </Text>
      )}
      <Text mt={2} fontSize="xs" color={muted}>
        Showing {pagedRows.length} of {filteredRows.length} entries
      </Text>
    </Box>
  );
}

export default ClientOngoingJobs;
