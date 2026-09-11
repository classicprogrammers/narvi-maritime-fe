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
import { useLocation } from "react-router-dom";
import {
  MdFileDownload,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import clientJobsApi from "api/clientJobs";
import clientVesselApi from "api/clientVessel";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  getStockApDestinationDisplay,
  getStockDestinationDisplay,
  getStockOriginDisplay,
} from "utils/stockLocationOptions";
import { clearClientNavigationState } from "views/client/dashboard/clientDashboardNavigation";
import ClientPortalTableShell, {
  getClientPortalTableSx,
  useClientPortalTableColors,
} from "views/client/ClientPortalTableShell";
import * as XLSX from "xlsx";

function ClientCompletedJobs() {
  const location = useLocation();
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    vessel: "",
    status: "delivered",
    origin: "",
    destination: "",
    poNumber: "",
  });
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState("50");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [clientName, setClientName] = useState("");
  const [vesselOptions, setVesselOptions] = useState([]);

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const tableColors = useClientPortalTableColors();
  const { tableRowHoverBg, tableRowEvenBg } = tableColors;

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

  const fetchCompletedJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const selectedVessel = vesselOptions.find((v) => String(v.name) === String(filters.vessel));
      const res = await clientJobsApi.getCompletedJobs({
        search: search.trim() || undefined,
        status: filters.status,
        vessel_id: selectedVessel?.id,
        date_from: filters.fromDate || undefined,
        date_to: filters.toDate || undefined,
        origin: filters.origin || undefined,
        origin_text: filters.origin || undefined,
      });
      const mapped = (res?.stock_list || []).map((item, idx) => ({
        id: `${item.stock_item_id || "completed"}-${idx}`,
        vessel: item.vessel?.name || "-",
        jobId: item.stock_item_id || "-",
        poText: item.po_text || (Array.isArray(item.po_number) ? item.po_number.join(", ") : "-"),
        mode: item.warehouse_id || "-",
        transitInfo: item.so_number || "-",
        status: item.stock_status || "-",
        etd: item.date_on_stock || "-",
        eta: "-",
        origin: getStockOriginDisplay(item),
        destination: getStockDestinationDisplay(item),
        combined: getStockApDestinationDisplay(item),
        totalWeight: item.weight ?? "-",
        documents: item.po_text || "-",
        incharge: item.supplier?.name || "-",
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
    const jobStatus = location?.state?.dashboardFilter?.jobStatus;
    if (jobStatus) {
      setFilters((prev) => ({ ...prev, status: jobStatus }));
      clearClientNavigationState();
    }
  }, [location]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompletedJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCompletedJobs]);

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

  const pagedRows = useMemo(() => {
    const pageSize = Number(entries);
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, entries, filteredRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / Number(entries)));
  const pageStart = filteredRows.length ? (currentPage - 1) * Number(entries) + 1 : 0;
  const pageEnd = Math.min(currentPage * Number(entries), filteredRows.length);
  const destinationOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.destination).filter((v) => v && v !== "-"))).map((v) => ({ id: v, name: v })),
    [rows]
  );
  const poOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.poText).filter((v) => v && v !== "-"))).map((v) => ({ id: v, name: v })),
    [rows]
  );
  const originOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.origin).filter((v) => v && v !== "-"))).map((v) => ({ id: v, name: v })),
    [rows]
  );
  const vesselFilterOptions = useMemo(
    () => vesselOptions.map((v) => ({ id: v.name, name: v.name })),
    [vesselOptions]
  );

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      vessel: "",
      status: "delivered",
      origin: "",
      destination: "",
      poNumber: "",
    });
    setSearch("");
    setEntries("50");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [entries, filters, search]);

  const handleDownloadExcel = () => {
    const headers = [
      "Job ID",
      "Vessel Name",
      "PO Number",
      "Mode of Transport",
      "Transit Info",
      "Status",
      "ETD",
      "ETA",
      "Origin",
      "Destination",
      "Combined",
      "Total Weight (KGS)",
      "Documents",
      "Incharge",
    ];

    const rowsForExport = filteredRows.map((row) => [
      row.jobId || "-",
      row.vessel || "-",
      row.poText || "-",
      row.mode || "-",
      row.transitInfo || "-",
      row.status || "-",
      row.etd || "-",
      row.eta || "-",
      row.origin || "-",
      row.destination || "-",
      row.combined || "-",
      row.totalWeight || "-",
      row.documents || "-",
      row.incharge || "-",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rowsForExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Completed Jobs");
    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `completed-jobs-${dateTag}.xlsx`);
  };

  return (
    <Box>
      <Heading fontSize="24px" lineHeight="32px" color={headingColor} mb={4}>
        Completed Jobs{clientName ? ` - ${clientName}` : ""}
      </Heading>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={5} mb={5}>
        <Text fontSize="sm" fontWeight="700" color={headingColor} mb={4}>
          Filters
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={3}>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Date Range</Text>
            <Flex gap={2}>
              <Input size="sm" type="date" p="20px 12px" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
              <Input size="sm" type="date" p="20px 12px" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
            </Flex>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Vessel</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.vessel}
              onChange={(value) => setFilters((prev) => ({ ...prev, vessel: value || "" }))}
              options={vesselFilterOptions}
              placeholder="All vessels"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Status</Text>
            <Select
              size="sm"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="delivered">Delivered</option>
              <option value="shipped">Shipped</option>
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Origin</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.origin}
              onChange={(value) => setFilters((prev) => ({ ...prev, origin: value || "" }))}
              options={originOptions}
              placeholder="All origins"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Destination</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.destination}
              onChange={(value) => setFilters((prev) => ({ ...prev, destination: value || "" }))}
              options={destinationOptions}
              placeholder="All destinations"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>PO Number</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.poNumber}
              onChange={(value) => setFilters((prev) => ({ ...prev, poNumber: value || "" }))}
              options={poOptions}
              placeholder="All PO numbers"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
        </Grid>
        <Flex mt={4} gap={3}>
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
              <option value="50">50</option>
              <option value="25">25</option>
              <option value="10">10</option>
            </Select>
            <Text fontSize="sm" color={muted}>entries</Text>
          </Flex>
          <Flex align="center" gap={3}>
            <Button
              size="sm"
              style={{padding: "8px 25px"}}
              variant="outline"
              borderColor={borderColor}
              leftIcon={<Icon as={MdFileDownload} color="green.500" />}
              onClick={handleDownloadExcel}
            >
              Download Excel
            </Button>
            <InputGroup size="sm" maxW="220px">
              <InputLeftElement>
                <Icon as={MdSearch} color={muted} />
              </InputLeftElement>
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
          </Flex>
        </Flex>
      </Box>

      <ClientPortalTableShell
        isLoading={isLoading}
        hasRows={pagedRows.length > 0}
        loadingLabel="Loading completed jobs..."
        emptyLabel="No completed jobs found for the selected filters."
        pageStart={pageStart}
        pageEnd={pageEnd}
        totalCount={filteredRows.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onChangePage={setCurrentPage}
      >
        <Table size="sm" variant="simple" sx={getClientPortalTableSx(tableColors)}>
          <Thead>
            <Tr>
              <Th>Job ID</Th>
              <Th>Mode of Transport</Th>
              <Th>Transit Info</Th>
              <Th>Status</Th>
              <Th>ETD</Th>
              <Th>ETA</Th>
              <Th>Origin</Th>
              <Th>Destination</Th>
              <Th>Combined</Th>
              <Th>Total Weight (KGS)</Th>
              <Th>Documents</Th>
              <Th>Incharge</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagedRows.map((row) => (
              <Tr
                key={`${row.jobId}-${row.vessel}`}
                _hover={{ bg: tableRowHoverBg }}
                _even={{ bg: tableRowEvenBg }}
              >
                <Td>{row.jobId}</Td>
                <Td>{row.mode}</Td>
                <Td>{row.transitInfo}</Td>
                <Td>
                  <Badge colorScheme="green" borderRadius="full" px={2.5} py={1}>
                    {String(row.status || "").replace(/_/g, " ")}
                  </Badge>
                </Td>
                <Td>{row.etd}</Td>
                <Td>{row.eta}</Td>
                <Td>{row.origin}</Td>
                <Td>{row.destination}</Td>
                <Td>{row.combined}</Td>
                <Td>{row.totalWeight}</Td>
                <Td>{row.documents}</Td>
                <Td>{row.incharge}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ClientPortalTableShell>
    </Box>
  );
}

export default ClientCompletedJobs;
