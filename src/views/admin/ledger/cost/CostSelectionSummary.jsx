import React, { useEffect, useState } from "react";
import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { getLedgerCostSummary } from "api/ledgerCost";
import { formatCostNumber } from "./ledgerCostUtils";

// Totals of the ticked Cost DB rows: one line per currency (local amount for the agent SOA check)
// plus the overall USD total. Reloads whenever the selection changes.
export default function CostSelectionSummary({ ids, borderColor }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const key = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) {
      setSummary(null);
      setError("");
      return undefined;
    }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    const timer = setTimeout(() => {
      getLedgerCostSummary(ids)
        .then((result) => !cancelled && setSummary(result))
        .catch((err) => {
          if (cancelled) return;
          setSummary(null);
          setError(err?.message || "Failed to load the selection totals");
        })
        .finally(() => !cancelled && setIsLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (ids.length === 0) return null;

  return (
    <Box px={4} py={3} borderBottom="1px" borderColor={borderColor} fontSize="sm">
      <Flex align="center" gap={2} mb={1}>
        <Text fontWeight="600">Selected totals</Text>
        {isLoading && <Spinner size="xs" />}
      </Flex>
      {error ? (
        <Text color="red.500">{error}</Text>
      ) : summary ? (
        <>
          {summary.by_currency.map((line) => (
            <Flex key={line.currency} gap={4} wrap="wrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
              <Text fontWeight="600" minW="48px">
                {line.currency}
              </Text>
              <Text>{line.count} row(s)</Text>
              <Text>Amount: {formatCostNumber(line.currency_amount, 2)}</Text>
              <Text>USD: {formatCostNumber(line.usd_cost, 2)}</Text>
              <Text>GST in: {formatCostNumber(line.gst_in_amount, 2)}</Text>
            </Flex>
          ))}
          <Text mt={1} fontWeight="600" sx={{ fontVariantNumeric: "tabular-nums" }}>
            Total USD cost: {formatCostNumber(summary.total_usd_cost, 2)}
            {summary.mixed_currencies ? " (mixed currencies)" : ""}
          </Text>
        </>
      ) : null}
    </Box>
  );
}
