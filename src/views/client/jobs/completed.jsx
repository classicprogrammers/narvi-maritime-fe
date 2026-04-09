import React, { useMemo, useState } from "react";
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

const completedJobsData = [
  {
    vessel: "ROYAL AWARD",
    jobId: "BOR0326206",
    mode: "Ship",
    transitInfo: "N/A",
    etd: "11/03/2026",
    eta: "14/03/2026",
    origin: "PVG",
    destination: "IXN",
    combined: "Combined",
    totalWeight: 2,
    documents: 17,
    incharge: 17,
  },
  {
    vessel: "JIRAI",
    jobId: "BOR0326573",
    mode: "Air",
    transitInfo: "N/A",
    etd: "30/03/2026",
    eta: "03/04/2026",
    origin: "PVG",
    destination: "RIX",
    combined: "Combined",
    totalWeight: 8,
    documents: 85,
    incharge: 85,
  },
  {
    vessel: "JAY",
    jobId: "BOR0326552",
    mode: "Truck",
    transitInfo: "N/A",
    etd: "22/03/2026",
    eta: "30/03/2026",
    origin: "PVG",
    destination: "FUK",
    combined: "Combined",
    totalWeight: 3,
    documents: 7,
    incharge: 7,
  },
];

function ClientCompletedJobs() {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    vessel: "",
    origin: "",
    destination: "",
    poNumber: "",
  });
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState("50");

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const softBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");

  const rows = useMemo(() => {
    return completedJobsData
      .filter((row) => {
        if (filters.vessel && !row.vessel.toLowerCase().includes(filters.vessel.toLowerCase())) return false;
        if (filters.origin && !row.origin.toLowerCase().includes(filters.origin.toLowerCase())) return false;
        if (filters.destination && !row.destination.toLowerCase().includes(filters.destination.toLowerCase())) return false;
        if (filters.poNumber && !row.jobId.toLowerCase().includes(filters.poNumber.toLowerCase())) return false;
        if (!search) return true;
        return `${row.vessel} ${row.jobId} ${row.origin} ${row.destination}`.toLowerCase().includes(search.toLowerCase());
      })
      .slice(0, Number(entries));
  }, [entries, filters, search]);

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      vessel: "",
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
        Completed Jobs
      </Heading>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={5} mb={5}>
        <Text fontSize="sm" fontWeight="700" color={headingColor} mb={4}>
          Filters
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(5, 1fr)" }} gap={3}>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Date Range</Text>
            <Flex gap={2}>
              <Input size="sm" type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
              <Input size="sm" type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
            </Flex>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Vessel</Text>
            <Input size="sm" value={filters.vessel} onChange={(e) => setFilters((prev) => ({ ...prev, vessel: e.target.value }))} />
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
                Download Excel
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
            {rows.map((row) => (
              <Tr key={`${row.jobId}-${row.vessel}`}>
                <Td>{row.jobId}</Td>
                <Td>{row.mode}</Td>
                <Td>{row.transitInfo}</Td>
                <Td>
                  <Badge colorScheme="green" borderRadius="full" px={2.5} py={1}>
                    Delivered
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
      </Box>
      <Text mt={2} fontSize="xs" color={muted}>
        Showing {rows.length} of {completedJobsData.length} entries
      </Text>
    </Box>
  );
}

export default ClientCompletedJobs;
