import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdFileDownload, MdPictureAsPdf, MdSearch } from "react-icons/md";
import { getLedgerInvoices } from "api/ledgerInvoice";
import SearchableSelect from "components/forms/SearchableSelect";
import { useMasterData } from "hooks/useMasterData";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import { formatDateDMY } from "utils/dateFormat";
import {
  buildSoaRows,
  formatSoaMoney,
  isIsoDate,
  listSoaCurrencies,
  SOA_COLUMNS,
  soaGrandTotal,
} from "utils/soaReport";
import { downloadSoaExcel, downloadSoaPdf } from "./soaExport";

const PAGE_SIZE = 80;

const todayIso = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// The list endpoint is paged, so walk every page of the filtered set.
async function fetchAllInvoices(params) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    // eslint-disable-next-line no-await-in-loop
    const res = await getLedgerInvoices({ ...params, page, page_size: PAGE_SIZE });
    all.push(...(Array.isArray(res.data) ? res.data : []));
    totalPages = res.total_pages || 1;
    page += 1;
  } while (page <= totalPages);
  return all;
}

export default function LedgerSoa() {
  const toast = useToast();
  const { refreshClients } = useMasterData();
  const [clients, setClients] = useState(() => getCached(MASTER_KEYS.CLIENTS) ?? []);
  const [asOfDate, setAsOfDate] = useState(todayIso);
  const [clientId, setClientId] = useState("");
  const [invoices, setInvoices] = useState(null);
  const [loadedFor, setLoadedFor] = useState({ asOfDate: "", clientId: "" });
  const [currency, setCurrency] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headBg = useColorModeValue("gray.50", "gray.700");

  useEffect(() => {
    let cancelled = false;
    refreshClients()
      .then((list) => {
        if (!cancelled) setClients(Array.isArray(list) ? list : getCached(MASTER_KEYS.CLIENTS) ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshClients]);

  const clientOptions = useMemo(
    () =>
      (Array.isArray(clients) ? clients : []).map((client) => ({
        ...client,
        name: client.name || client.client_code || `Client ${client.id}`,
      })),
    [clients]
  );
  const clientName = clientOptions.find((c) => String(c.id) === String(clientId))?.name || "";

  const currencies = useMemo(() => listSoaCurrencies(invoices || []), [invoices]);
  const rows = useMemo(
    () => (invoices && currency ? buildSoaRows(invoices, { currency, asOfDate: loadedFor.asOfDate }) : []),
    [invoices, currency, loadedFor.asOfDate]
  );
  const total = useMemo(() => soaGrandTotal(rows), [rows]);

  // The shown report belongs to the loaded date/client; editing the filters marks it stale until reloaded.
  const isStale = invoices !== null && (loadedFor.asOfDate !== asOfDate || loadedFor.clientId !== clientId);
  const canLoad = isIsoDate(asOfDate) && !isLoading;

  const handleLoad = async () => {
    if (!canLoad) return;
    setIsLoading(true);
    try {
      const list = await fetchAllInvoices({
        state: "active",
        client_id: clientId,
        date_sales_invoice_to: asOfDate,
      });
      const codes = listSoaCurrencies(list);
      setInvoices(list);
      setLoadedFor({ asOfDate, clientId });
      // One currency per SOA: pick it automatically when there is only one, keep a still-valid choice.
      setCurrency((prev) => (codes.includes(prev) ? prev : codes.length === 1 ? codes[0] : ""));
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load invoices.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (kind) => {
    const payload = { rows, currency, asOfDate: loadedFor.asOfDate, clientName: loadedFor.clientId ? clientName : "" };
    setIsExporting(true);
    try {
      if (kind === "pdf") await downloadSoaPdf(payload);
      else downloadSoaExcel(payload);
    } catch (error) {
      toast({
        title: "Export failed",
        description: error?.message || "Could not create the file.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = rows.length > 0 && !isStale && !isExporting;

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Box px="25px" pb={8}>
        <Box mb={6}>
          <Heading size="lg" mb={1}>
            Statement of Account
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Outstanding invoices from the Invoice DB, one report per currency
          </Text>
        </Box>

        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" p={{ base: 4, md: 5 }} mb={6}>
          <Flex gap={4} align="flex-end" wrap="wrap">
            <FormControl w={{ base: "100%", sm: "180px" }} isRequired>
              <FormLabel fontSize="sm" fontWeight="600">
                SOA date
              </FormLabel>
              <Input type="date" h="40px" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            </FormControl>
            <FormControl flex="1" minW={{ base: "100%", md: "260px" }}>
              <FormLabel fontSize="sm" fontWeight="600">
                Client
              </FormLabel>
              <SearchableSelect
                value={clientId}
                onChange={(value) => setClientId(value || "")}
                options={clientOptions}
                placeholder="All clients"
                size="md"
                h="40px"
              />
            </FormControl>
            <Button
              h="40px"
              colorScheme="blue"
              leftIcon={<Icon as={MdSearch} />}
              onClick={handleLoad}
              isLoading={isLoading}
              isDisabled={!canLoad}
            >
              Load invoices
            </Button>
          </Flex>

          {invoices !== null && (
            <Flex gap={4} align="flex-end" wrap="wrap" mt={5} pt={5} borderTop="1px" borderColor={borderColor}>
              <FormControl w={{ base: "100%", sm: "200px" }} isRequired>
                <FormLabel fontSize="sm" fontWeight="600">
                  Currency
                </FormLabel>
                <Select
                  h="40px"
                  value={currency}
                  placeholder={currencies.length ? "Select currency" : "No invoices"}
                  onChange={(e) => setCurrency(e.target.value)}
                  isDisabled={!currencies.length}
                >
                  {currencies.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <HStack spacing={3} ml="auto">
                <Button
                  h="40px"
                  variant="outline"
                  leftIcon={<Icon as={MdPictureAsPdf} />}
                  onClick={() => handleExport("pdf")}
                  isDisabled={!canExport}
                >
                  PDF
                </Button>
                <Button
                  h="40px"
                  variant="outline"
                  leftIcon={<Icon as={MdFileDownload} />}
                  onClick={() => handleExport("excel")}
                  isDisabled={!canExport}
                >
                  Excel
                </Button>
              </HStack>
            </Flex>
          )}
        </Box>

        {isStale && (
          <Alert status="warning" borderRadius="md" mb={4}>
            <AlertIcon />
            The date or client changed. Load the invoices again to refresh the report.
          </Alert>
        )}

        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
          {isLoading ? (
            <Flex justify="center" py={16}>
              <Spinner />
            </Flex>
          ) : invoices === null ? (
            <Text py={16} textAlign="center" color="gray.500" fontSize="sm">
              Choose a SOA date (and optionally a client), then load the invoices.
            </Text>
          ) : !currency ? (
            <Text py={16} textAlign="center" color="gray.500" fontSize="sm">
              {currencies.length
                ? "Select a currency. A SOA report can only hold one currency."
                : "No invoices found for this date and client."}
            </Text>
          ) : rows.length === 0 ? (
            <Text py={16} textAlign="center" color="gray.500" fontSize="sm">
              No outstanding {currency} invoices up to {formatDateDMY(loadedFor.asOfDate)}.
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table size="sm" variant="simple" minW="1100px">
                <Thead>
                  <Tr>
                    {SOA_COLUMNS.map((column) => (
                      <Th key={column.key} bg={headBg} isNumeric={column.type === "number"} whiteSpace="nowrap">
                        {column.label}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((row) => (
                    <Tr key={row.id}>
                      {SOA_COLUMNS.map((column) => {
                        const value = row[column.key];
                        let text = value || "—";
                        if (column.type === "number") text = formatSoaMoney(value);
                        else if (column.type === "date") text = value ? formatDateDMY(value) : "—";
                        return (
                          <Td key={column.key} isNumeric={column.type === "number"} whiteSpace="nowrap">
                            {text}
                          </Td>
                        );
                      })}
                    </Tr>
                  ))}
                </Tbody>
                <Tfoot>
                  <Tr>
                    {SOA_COLUMNS.map((column) => (
                      <Th key={column.key} bg={headBg} isNumeric={column.type === "number"}>
                        {column.key === "client"
                          ? "Grand Total"
                          : column.key === "amount" || column.key === "balance"
                            ? formatSoaMoney(total[column.key])
                            : ""}
                      </Th>
                    ))}
                  </Tr>
                </Tfoot>
              </Table>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
