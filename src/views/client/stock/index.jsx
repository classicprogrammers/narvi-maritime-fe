import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  GridItem,
  Heading,
  Icon,
  IconButton,
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
  MdChevronRight,
  MdFilterAlt,
  MdRefresh,
  MdFileDownload,
  MdSearch,
  MdPictureAsPdf,
  MdTableChart,
} from "react-icons/md";

const stockRows = [
  {
    date: "09/04/2026",
    days: 0,
    vessel: "NORA",
    status: "In Stock",
    mode: "Ship",
    transitId: "SFX-SF166477",
    supplier: "HONGHAI MING ENGINEERING CO., LTD",
    poNo: "HM-SS SFH20031",
    cargoValue: "USD 294.30",
    entries: "6 Pcs",
    weight: "89.00",
    location: "PVG",
    stockId: "PV976667",
    remarks: "-",
    approval: "Approved",
    t1: "All",
    dg: "All",
    size: "21x19x11",
    whLocation: "-",
    deleteMark: "-",
  },
  {
    date: "09/04/2026",
    days: 0,
    vessel: "ADRE",
    status: "In Stock",
    mode: "Truck",
    transitId: "SFX-SF165666",
    supplier: "SHANGHAI MINGYU MARINE SERVICE CO., LTD",
    poNo: "AABB-PO-S01-26017",
    cargoValue: "USD 198.00",
    entries: "1 Pcs",
    weight: "2.00",
    location: "PVG",
    stockId: "PV976837",
    remarks: "-",
    approval: "Approved",
    t1: "All",
    dg: "All",
    size: "21x19x11",
    whLocation: "-",
    deleteMark: "-",
  },
  {
    date: "08/04/2026",
    days: 1,
    vessel: "ACHI",
    status: "In Stock",
    mode: "Ship",
    transitId: "SFX-SF165127",
    supplier: "DECKMARINE PTE LTD",
    poNo: "AC-250-REN-260010",
    cargoValue: "USD 1240.00",
    entries: "3 Pcs",
    weight: "225.00",
    location: "PVG",
    stockId: "PV977685",
    remarks: "M/T",
    approval: "Approved",
    t1: "All",
    dg: "All",
    size: "37x30x24",
    whLocation: "-",
    deleteMark: "-",
  },
  {
    date: "07/04/2026",
    days: 2,
    vessel: "CORAL",
    status: "Low Stock",
    mode: "Ship",
    transitId: "SFX-SF165940",
    supplier: "SUNDA TRADING",
    poNo: "CVD/PO-S01-260034",
    cargoValue: "USD 152.00",
    entries: "1 Pcs",
    weight: "2.00",
    location: "PVG",
    stockId: "PV976887",
    remarks: "M/T",
    approval: "Approved",
    t1: "All",
    dg: "All",
    size: "20x12x9",
    whLocation: "-",
    deleteMark: "-",
  },
];

function ClientStock() {
  const location = useLocation();
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
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

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const tableBorderColor = useColorModeValue(
    "rgba(226, 232, 240, 0.85)",
    "rgba(255, 255, 255, 0.14)"
  );
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const headingColor = useColorModeValue("navy.700", "white");

  const filteredRows = useMemo(() => {
    return stockRows
      .filter((row) => {
        if (filters.vessel && row.vessel !== filters.vessel) return false;
        if (filters.status && row.status !== filters.status) return false;
        if (filters.location && row.location !== filters.location) return false;
        if (filters.t1 && row.t1 !== filters.t1) return false;
        if (filters.dg && row.dg !== filters.dg) return false;
        if (filters.fromDate && row.date < filters.fromDate.split("-").reverse().join("/")) return false;
        if (filters.toDate && row.date > filters.toDate.split("-").reverse().join("/")) return false;
        if (!search) return true;
        const haystack = `${row.vessel} ${row.transitId} ${row.supplier} ${row.poNo} ${row.stockId} ${row.remarks}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .slice(0, Number(entries));
  }, [entries, filters, search]);

  useEffect(() => {
    if (!filteredRows.length) {
      setExpandedRows(new Set());
      return;
    }
    const firstRowId = `${filteredRows[0].transitId}-${filteredRows[0].stockId}`;
    setExpandedRows(new Set([firstRowId]));
  }, [filteredRows]);

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

  const toggleRowSelection = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRowExpanded = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={4}>
        <Box>
          <Heading fontSize="24px" lineHeight="32px" color={headingColor}>
            Stock Report
          </Heading>
          <Text mt={1} fontSize="sm" color={muted}>
            Track inventory movement by vessel, location, and date range.
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
              <option>NORA</option>
              <option>ADRE</option>
              <option>ACHI</option>
              <option>CORAL</option>
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Status</Text>
            <Select size="sm" placeholder="All statuses" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
              <option>In Stock</option>
              <option>Low Stock</option>
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Location</Text>
            <Select size="sm" placeholder="All locations" value={filters.location} onChange={(e) => handleFilterChange("location", e.target.value)}>
              <option>PVG</option>
              <option>SIN</option>
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
        <Table
          size="sm"
          variant="simple"
          sx={{
            th: {
              borderColor: `${tableBorderColor} !important`,
              borderRight: `1px solid ${tableBorderColor} !important`,
              borderBottom: `1px solid ${tableBorderColor} !important`,
            },
            td: {
              borderColor: `${tableBorderColor} !important`,
              borderRight: `1px solid ${tableBorderColor} !important`,
              borderBottom: `1px solid ${tableBorderColor} !important`,
            },
            "th:last-child, td:last-child": {
              borderRight: "none",
            },
          }}
        >
          <Thead bg="secondaryGray.300">
            <Tr>
              <Th w="40px" />
              <Th w="40px" />
              <Th>Date</Th>
              <Th>Days</Th>
              <Th>Vessel</Th>
              <Th>Status</Th>
              <Th>Mode of Arrival</Th>
              <Th>Transit ID</Th>
              <Th>Supplier Name</Th>
              <Th>PO No</Th>
              <Th>Cargo Value</Th>
              <Th w="30px" />
              <Th>Cargo Entries</Th>
              <Th>Weight (KGS)</Th>
              <Th>Location</Th>
              <Th>Stock ID</Th>
              <Th>Cust. Remarks</Th>
              <Th>Approval</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredRows.map((row, index) => {
              const rowId = `${row.transitId}-${row.stockId}`;
              const isSelected = selectedRows.has(rowId);
              const isExpanded = expandedRows.has(rowId);
              return (
                <React.Fragment key={rowId}>
                  <Tr bg={index === 0 ? "#f7f8e2" : "transparent"}>
                    <Td>
                      <Checkbox
                        isChecked={isSelected}
                        onChange={() => toggleRowSelection(rowId)}
                        colorScheme="brandScheme"
                      />
                    </Td>
                    <Td>
                      <IconButton
                        aria-label="Expand row"
                        icon={
                          <Icon
                            as={MdChevronRight}
                            transform={isExpanded ? "rotate(90deg)" : "rotate(0deg)"}
                          />
                        }
                        size="xs"
                        variant="ghost"
                        onClick={() => toggleRowExpanded(rowId)}
                      />
                    </Td>
                    <Td>{row.date}</Td>
                    <Td>{row.days}</Td>
                    <Td>{row.vessel}</Td>
                    <Td>
                      <Badge
                        colorScheme={row.status === "In Stock" ? "green" : "orange"}
                        borderRadius="full"
                        px={2.5}
                        py={1}
                      >
                        {row.status}
                      </Badge>
                    </Td>
                    <Td>{row.mode}</Td>
                    <Td>{row.transitId}</Td>
                    <Td minW="220px">{row.supplier}</Td>
                    <Td>{row.poNo}</Td>
                    <Td>{row.cargoValue}</Td>
                    <Td>
                      <Text color="red.500" fontWeight="700">#</Text>
                    </Td>
                    <Td>{row.entries}</Td>
                    <Td>{row.weight}</Td>
                    <Td>{row.location}</Td>
                    <Td>{row.stockId}</Td>
                    <Td>{row.remarks}</Td>
                    <Td>{row.approval}</Td>
                  </Tr>
                  {isExpanded ? (
                    <Tr bg="secondaryGray.300">
                      <Td colSpan={2} />
                      <Td colSpan={4}>
                        <Text fontSize="10px" color={muted} fontWeight="700">SUPPLIER NAME</Text>
                        <Text fontSize="11px">{row.supplier}</Text>
                      </Td>
                      <Td colSpan={2}>
                        <Text fontSize="10px" color={muted} fontWeight="700">SIZE</Text>
                        <Text fontSize="11px">{row.size}</Text>
                      </Td>
                      <Td colSpan={3}>
                        <Text fontSize="10px" color={muted} fontWeight="700">TRANSIT ID</Text>
                        <Text fontSize="11px">{row.transitId}</Text>
                      </Td>
                      <Td colSpan={2}>
                        <Text fontSize="10px" color={muted} fontWeight="700">WH LOCATION</Text>
                        <Text fontSize="11px">{row.whLocation}</Text>
                      </Td>
                      <Td colSpan={2}>
                        <Text fontSize="10px" color={muted} fontWeight="700">DELETE</Text>
                        <Text fontSize="11px">{row.deleteMark}</Text>
                      </Td>
                    </Tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

export default ClientStock;
