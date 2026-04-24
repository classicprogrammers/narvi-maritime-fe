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
import { useLocation } from "react-router-dom";
import {
  MdFilterAlt,
  MdRefresh,
  MdFileDownload,
  MdSearch,
  MdPictureAsPdf,
  MdTableChart,
} from "react-icons/md";
import clientStockApi from "api/clientStock";
import clientHubApi from "api/clientHub";
import clientVesselApi from "api/clientVessel";

function ClientStock() {
  const location = useLocation();
  const [stockRows, setStockRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    vessel: "",
    status: "",
    location: "",
    t1: "",
    dg: "",
  });
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState("50");
  const [vesselFilterOptions, setVesselFilterOptions] = useState([]);
  const [hubFilterOptions, setHubFilterOptions] = useState([]);

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const tableBorderColor = useColorModeValue(
    "rgba(226, 232, 240, 0.85)",
    "rgba(255, 255, 255, 0.14)"
  );
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const headingColor = useColorModeValue("navy.700", "white");
  const tableHeaderBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const tableRowHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const tableRowEvenBg = useColorModeValue("blackAlpha.50", "whiteAlpha.50");
  const statusColorMap = {
    pending: "orange",
    stock: "blue",
    available: "green",
    delivered: "green",
    in_transit: "purple",
    transit: "purple",
    cancelled: "red",
    lost: "red",
    hold: "yellow",
  };

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await clientStockApi.getClientStock({
        search: search.trim() || undefined,
        stock_status: filters.status || undefined,
      });
      const normalizedRows = (res?.stock_list || []).map((item, idx) => ({
        id: `${item.stock_item_id || "stock"}-${idx}`,
        client: item.client?.name || res?.client?.name || "-",
        dateOnStock: item.date_on_stock || "-",
        vessel: item.vessel?.name || item.vessel || "-",
        warehouseId:
          item.warehouse_id != null && item.warehouse_id !== false && item.warehouse_id !== ""
            ? String(item.warehouse_id)
            : "-",
        supplier: item.supplier?.name || item.supplier || "-",
        poNo: Array.isArray(item.po_number) ? item.po_number.join(", ") : (item.po_text || "-"),
        dgUnNumber:
          item.dg_un_number != null && item.dg_un_number !== false && item.dg_un_number !== ""
            ? String(item.dg_un_number)
            : "-",
        boxes: item.boxes != null ? String(item.boxes) : item.box != null ? String(item.box) : "-",
        weight: item.weight != null ? String(item.weight) : "-",
        totalVolumeCbm: item.total_volume_cbm != null ? String(item.total_volume_cbm) : "-",
        origin: item.origin || "-",
        viaHub1: item.via_hub_1 || "-",
        viaHub2: item.via_hub_2 || "-",
        apDestination:
          item.ap_destination != null && item.ap_destination !== false && item.ap_destination !== ""
            ? String(item.ap_destination)
            : "-",
        destination: item.destination || "-",
        stockStatus: item.stock_status || "-",
        soNumber:
          item.so_number != null && item.so_number !== false && item.so_number !== ""
            ? String(item.so_number)
            : "-",
        currency:
          item.currency != null && item.currency !== false && item.currency !== ""
            ? String(item.currency)
            : "-",
        value: item.value != null ? String(item.value) : "-",
        t1: "All",
        dg: "All",
      }));
      setStockRows(normalizedRows);
      setClientName(res?.client?.name || "");
    } catch (_e) {
      setStockRows([]);
      setClientName("");
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, search]);

  const fetchVesselFilterOptions = useCallback(async () => {
    try {
      const res = await clientVesselApi.getClientVessels({});
      const options = (Array.isArray(res?.vessels) ? res.vessels : [])
        .map((v) => (typeof v === "string" ? v : v?.name))
        .filter((v) => typeof v === "string" && v.trim() !== "");
      setVesselFilterOptions(Array.from(new Set(options)));
    } catch (_error) {
      setVesselFilterOptions([]);
    }
  }, []);

  const fetchHubFilterOptions = useCallback(async () => {
    try {
      const res = await clientHubApi.getClientHubs({});
      const options = (Array.isArray(res?.hubs) ? res.hubs : [])
        .map((h) => h?.hub)
        .filter((h) => typeof h === "string" && h.trim() !== "");
      setHubFilterOptions(Array.from(new Set(options)));
    } catch (_error) {
      setHubFilterOptions([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStock();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStock]);

  useEffect(() => {
    fetchVesselFilterOptions();
    fetchHubFilterOptions();
  }, [fetchHubFilterOptions, fetchVesselFilterOptions]);

  const filteredRows = useMemo(() => {
    return stockRows
      .filter((row) => {
        if (filters.vessel && row.vessel !== filters.vessel) return false;
        if (filters.location && row.location !== filters.location) return false;
        if (filters.t1 && row.t1 !== filters.t1) return false;
        if (filters.dg && row.dg !== filters.dg) return false;
        if (filters.fromDate && row.date !== "-" && row.date < filters.fromDate) return false;
        if (filters.toDate && row.date !== "-" && row.date > filters.toDate) return false;
        return true;
      })
      .slice(0, Number(entries));
  }, [entries, filters, stockRows]);

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const selectedVessel = location?.state?.selectedVessel;
    if (selectedVessel) {
      setFilters((prev) => ({ ...prev, vessel: selectedVessel }));
      // Clear route state after applying, so refresh/back won't re-apply unexpectedly
      if (window.history?.replaceState) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location]);

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      vessel: "",
      status: "",
      location: "",
      t1: "",
      dg: "",
    });
    setSearch("");
    setEntries("50");
  };
  const formatStatus = (status) => {
    const value = String(status || "").trim();
    if (!value) return "-";
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  };

  const vesselOptions = useMemo(
    () =>
      vesselFilterOptions.length
        ? vesselFilterOptions
        : Array.from(new Set(stockRows.map((r) => r.vessel).filter(Boolean).filter((v) => v !== "-"))),
    [stockRows, vesselFilterOptions]
  );
  const locationOptions = useMemo(
    () =>
      hubFilterOptions.length
        ? hubFilterOptions
        : Array.from(new Set(stockRows.map((r) => r.location).filter(Boolean).filter((v) => v !== "-"))),
    [stockRows, hubFilterOptions]
  );

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={4}>
        <Box>
          <Heading fontSize="24px" lineHeight="32px" color={headingColor}>
            Stock Report
          </Heading>
          <Text mt={1} fontSize="sm" color={muted}>
            {clientName ? `Showing stock for ${clientName}.` : "Track inventory movement by vessel, location, and date range."}
          </Text>
        </Box>
      </Flex>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={5} mb={5}>
        <Text fontSize="sm" fontWeight="700" color={headingColor} mb={4}>
          Filters
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={3}>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>From Date</Text>
            <Input size="sm" type="date" value={filters.fromDate} onChange={(e) => handleFilterChange("fromDate", e.target.value)} />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>To Date</Text>
            <Input size="sm" type="date" value={filters.toDate} onChange={(e) => handleFilterChange("toDate", e.target.value)} />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Vessel</Text>
            <Select size="sm" placeholder="All vessels" value={filters.vessel} onChange={(e) => handleFilterChange("vessel", e.target.value)}>
              {vesselOptions.map((vessel) => (
                <option key={vessel} value={vessel}>{vessel}</option>
              ))}
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Status</Text>
            <Select size="sm" placeholder="All statuses" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
              <option value="stock">Stock</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
              <option value="lost">Lost</option>
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Location</Text>
            <Select size="sm" placeholder="All locations" value={filters.location} onChange={(e) => handleFilterChange("location", e.target.value)}>
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>T1</Text>
            <Select size="sm" placeholder="All" value={filters.t1} onChange={(e) => handleFilterChange("t1", e.target.value)}>
              <option>All</option>
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>DG</Text>
            <Select size="sm" placeholder="All" value={filters.dg} onChange={(e) => handleFilterChange("dg", e.target.value)}>
              <option>All</option>
            </Select>
          </GridItem>
        </Grid>

        <Flex mt={4} gap={3}>
          <Button size="sm" variant="brand" leftIcon={<Icon as={MdFilterAlt} />}>
            Apply Filters
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
          <InputGroup maxW="340px">
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search stock id, remarks, origin, vessel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="sm"
            />
          </InputGroup>
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
              <MenuItem icon={<Icon as={MdPictureAsPdf} color="red.500" />}>
                Download PDF
              </MenuItem>
              <MenuItem icon={<Icon as={MdTableChart} color="green.500" />}>
                Download Excel
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" overflowX="auto">
        {isLoading && (
          <Text px={4} py={3} fontSize="sm" color={muted}>
            Loading stock report...
          </Text>
        )}
        <Table
          size="sm"
          variant="simple"
          sx={{
            tableLayout: "auto",
            th: {
              borderColor: `${tableBorderColor} !important`,
              borderRight: `1px solid ${tableBorderColor} !important`,
              borderBottom: `1px solid ${tableBorderColor} !important`,
              fontSize: "11px",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              py: 3,
              bg: tableHeaderBg,
            },
            td: {
              borderColor: `${tableBorderColor} !important`,
              borderRight: `1px solid ${tableBorderColor} !important`,
              borderBottom: `1px solid ${tableBorderColor} !important`,
              fontSize: "12px",
              py: 2.5,
              verticalAlign: "middle",
            },
            "th:last-child, td:last-child": {
              borderRight: "none",
            },
          }}
        >
          <Thead>
            <Tr>
              <Th>CLIENT</Th>
              <Th>Vessel</Th>
              <Th>WAREHOUSE ID</Th>
              <Th>SUPPLIER</Th>
              <Th>PO#</Th>
              <Th>DG/UN NUMBER</Th>
              <Th>BOXES</Th>
              <Th>WEIGHT</Th>
              <Th>TOTAL VOLUME CBM</Th>
              <Th>ORIGIN</Th>
              <Th>VIA HUB 1</Th>
              <Th>VIA HUB 2</Th>
              <Th>AP DESTINATION</Th>
              <Th>DESTINATION</Th>
              <Th>STOCK STATUS</Th>
              <Th>DATE ON STOCK</Th>
              <Th>SO NUMBER</Th>
              <Th>CURRENCY</Th>
              <Th>VALUE</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredRows.map((row) => {
              return (
                <Tr
                  key={row.id}
                  _hover={{ bg: tableRowHoverBg }}
                  _even={{ bg: tableRowEvenBg }}
                >
                    <Td>{row.client}</Td>
                    <Td>{row.vessel}</Td>
                    <Td>{row.warehouseId}</Td>
                    <Td>{row.supplier}</Td>
                    <Td>{row.poNo}</Td>
                    <Td>{row.dgUnNumber}</Td>
                    <Td>{row.boxes}</Td>
                    <Td>{row.weight}</Td>
                    <Td>{row.totalVolumeCbm}</Td>
                    <Td>{row.origin}</Td>
                    <Td>{row.viaHub1}</Td>
                    <Td>{row.viaHub2}</Td>
                    <Td>{row.apDestination}</Td>
                    <Td>{row.destination}</Td>
                    <Td>
                      <Badge
                        borderRadius="full"
                        px={2.5}
                        py={1}
                        colorScheme={statusColorMap[String(row.stockStatus || "").toLowerCase()] || "gray"}
                      >
                        {formatStatus(row.stockStatus)}
                      </Badge>
                    </Td>
                    <Td>{row.dateOnStock}</Td>
                    <Td>{row.soNumber}</Td>
                    <Td>{row.currency}</Td>
                    <Td>{row.value}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

export default ClientStock;
