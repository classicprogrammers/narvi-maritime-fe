import React, { useEffect, useMemo, useState } from "react";
import { Badge, Box, Heading, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { getLedgerInvoices } from "../../api/ledgerInvoice";
import { INVOICE_COLUMNS } from "../../utils/ledgerColumns";
import { ledgerViewValue } from "../../utils/ledgerDisplay";
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

// Invoices raised for one Shipping Order, read from the Master Ledger invoice list
export default function ShippingOrderLedgerInvoices({ soId }) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (soId == null || soId === "") return undefined;
    setIsLoading(true);
    setError("");
    getLedgerInvoices({ sale_order_id: soId, state: "active", page_size: "all" })
      .then((res) => {
        if (!cancelled) setRecords(filterSoInvoices(res.data, soId));
      })
      .catch((err) => {
        if (cancelled) return;
        setRecords([]);
        setError(err?.response?.data?.message || err?.message || "Unable to load invoices.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [soId]);

  const totals = useMemo(() => summarizeSoInvoices(records), [records]);

  return (
    <Box>
      <Heading size="sm" mb={4}>
        Invoices (Master Ledger)
      </Heading>
      {isLoading ? (
        <Spinner size="sm" color="blue.500" />
      ) : error ? (
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      ) : records.length === 0 ? (
        <Text color="gray.400" fontSize="sm">
          No invoices for this shipping order.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                {columns.map((c) => (
                  <Th key={c.key} isNumeric={NUMERIC_TYPES.includes(c.type)}>
                    {c.label}
                  </Th>
                ))}
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
                </Tr>
              ))}
              <Tr fontWeight="700">
                <Td colSpan={4}>Total ({totals.count})</Td>
                <Td isNumeric>{money(totals.usdAmount)}</Td>
                <Td colSpan={2} />
                <Td isNumeric>{money(totals.balanceUsd)}</Td>
                <Td />
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
