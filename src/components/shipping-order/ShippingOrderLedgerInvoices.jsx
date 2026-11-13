import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Heading,
  Icon,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { MdDownload } from "react-icons/md";
import { getLedgerInvoices } from "../../api/ledgerInvoice";
import { INVOICE_COLUMNS } from "../../utils/ledgerColumns";
import { ledgerViewValue } from "../../utils/ledgerDisplay";
import { invoiceFilesOf, saveDownloadedFile } from "../../utils/ledgerEconomy";
import { filterSoInvoices, summarizeSoInvoices } from "../../utils/ledgerSoInvoices";

const COLUMN_KEYS = [
  "invoice_number",
  "date_sales_invoice",
  "currency_code",
  "currency_amount",
  "usd_amount",
  "date_due",
  "client_amount_paid",
  "invoice_balance_usd",
  "payment_status",
];

const columns = COLUMN_KEYS.map((key) => INVOICE_COLUMNS.find((c) => c.key === key)).filter(Boolean);
const NUMERIC_TYPES = ["number"];

const money = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Invoices raised for one Shipping Order, with their files.
// economy: the SO detail's economy ({ invoices, soInvoiceFiles }). Without it (older backend) the invoices
// are read from the Master Ledger invoice list by soId, and no files are shown.
// onDownloadFile(file, invoice) resolves to { data: Blob, filename } (staff and client portal use different routes).
export default function ShippingOrderLedgerInvoices({
  soId,
  economy,
  onDownloadFile,
  title = "Invoices (Master Ledger)",
}) {
  const toast = useToast();
  const [fetched, setFetched] = useState([]);
  const [isLoading, setIsLoading] = useState(!economy && soId != null);
  const [error, setError] = useState("");
  const [busyFileId, setBusyFileId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (economy || soId == null || soId === "") return undefined;
    setIsLoading(true);
    setError("");
    getLedgerInvoices({ sale_order_id: soId, state: "active", page_size: "all" })
      .then((res) => {
        if (!cancelled) setFetched(filterSoInvoices(res.data, soId));
      })
      .catch((err) => {
        if (cancelled) return;
        setFetched([]);
        setError(err?.response?.data?.message || err?.message || "Unable to load invoices.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [soId, economy]);

  const records = economy ? economy.invoices : fetched;
  const soFiles = economy ? economy.soInvoiceFiles : [];
  const totals = useMemo(() => summarizeSoInvoices(records), [records]);

  // The client portal shows nothing when the backend has no economy data for it
  if (!economy && (soId == null || soId === "")) return null;

  const handleDownload = async (file, invoice) => {
    if (!onDownloadFile) return;
    setBusyFileId(file.id);
    try {
      saveDownloadedFile(await onDownloadFile(file, invoice), file);
    } catch (err) {
      toast({
        title: "Download failed",
        description: err?.message || "Unable to download file.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setBusyFileId(null);
    }
  };

  const renderFile = (file, invoice) => (
    <Button
      key={file.id}
      size="xs"
      variant="link"
      colorScheme="blue"
      justifyContent="flex-start"
      leftIcon={<Icon as={MdDownload} />}
      isLoading={busyFileId === file.id}
      onClick={() => handleDownload(file, invoice)}
      title={file.filename}
      maxW="220px"
    >
      <Text as="span" isTruncated>
        {file.filename || `File ${file.id}`}
      </Text>
    </Button>
  );

  return (
    <Box>
      <Heading size="sm" mb={4}>
        {title}
      </Heading>
      {isLoading ? (
        <Spinner size="sm" color="blue.500" />
      ) : error ? (
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      ) : records.length === 0 && soFiles.length === 0 ? (
        <Text color="gray.400" fontSize="sm">
          No invoices for this shipping order.
        </Text>
      ) : (
        <>
          {records.length > 0 && (
            <Box overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    {columns.map((c) => (
                      <Th key={c.key} isNumeric={NUMERIC_TYPES.includes(c.type)}>
                        {c.label}
                      </Th>
                    ))}
                    {economy && <Th>Files</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {records.map((r) => (
                    <Tr key={r.id}>
                      {columns.map((c) => (
                        <Td key={c.key} isNumeric={NUMERIC_TYPES.includes(c.type)}>
                          {c.type === "badge" ? (
                            <Badge borderRadius="full" px={2} textTransform="none">
                              {ledgerViewValue(c, r) || "-"}
                            </Badge>
                          ) : (
                            ledgerViewValue(c, r) || "-"
                          )}
                        </Td>
                      ))}
                      {economy && (
                        <Td>
                          {invoiceFilesOf(r).length ? (
                            <VStack align="flex-start" spacing={1}>
                              {invoiceFilesOf(r).map((file) => renderFile(file, r))}
                            </VStack>
                          ) : (
                            "-"
                          )}
                        </Td>
                      )}
                    </Tr>
                  ))}
                  <Tr fontWeight="700">
                    <Td colSpan={4}>Total ({totals.count})</Td>
                    <Td isNumeric>{money(totals.usdAmount)}</Td>
                    <Td colSpan={2} />
                    <Td isNumeric>{money(totals.balanceUsd)}</Td>
                    <Td colSpan={economy ? 2 : 1} />
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          )}
          {soFiles.length > 0 && (
            <Box mt={records.length > 0 ? 4 : 0}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" mb={1}>
                Invoice files uploaded on the shipping order
              </Text>
              <VStack align="flex-start" spacing={1}>
                {soFiles.filter((f) => f && f.id != null).map((file) => renderFile(file, null))}
              </VStack>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
