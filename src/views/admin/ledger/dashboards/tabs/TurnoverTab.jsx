import React, { useMemo } from "react";
import {
  Box,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import DashboardPanel from "components/ledger/dashboards/DashboardPanel";
import DashboardChart from "components/ledger/dashboards/DashboardChart";
import DashboardStatTiles from "components/ledger/dashboards/DashboardStatTiles";
import DashboardUndatedNote from "components/ledger/dashboards/DashboardUndatedNote";
import useLedgerDashboard from "hooks/useLedgerDashboard";
import { getDashboardTurnover } from "api/ledgerDashboard";
import { bucketLabel } from "utils/ledgerDashboardPeriod";
import { buildMoneyBarOptions, fillBuckets, formatMarginPct, marginPct } from "utils/ledgerDashboardData";
import { formatDashboardMoney } from "views/admin/default/dashboardUtils";

// Turnover dashboard (D4): Actual Sale / Cost / Profit per bucket.
// Props from the page: { period: { date_from, date_to, label }, interval, clientId, clientLabel, regionFys }
export default function TurnoverTab({ period, interval }) {
  const dateFrom = period?.date_from;
  const dateTo = period?.date_to;
  const params = useMemo(
    () => ({ date_from: dateFrom, date_to: dateTo, interval }),
    [dateFrom, dateTo, interval]
  );
  const { data, isLoading, error, reload } = useLedgerDashboard(getDashboardTurnover, params);

  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headBg = useColorModeValue("gray.50", "gray.700");
  const negativeColor = useColorModeValue("red.500", "red.300");

  // Buckets as returned by the backend; fall back to the series keys when it sends none.
  const buckets = useMemo(() => {
    if (!data) return [];
    if (data.buckets.length) return data.buckets;
    return data.series.map((row) => ({ key: row.key, label: bucketLabel(row.key, interval) }));
  }, [data, interval]);

  const keys = useMemo(() => buckets.map((bucket) => bucket.key), [buckets]);
  const labels = useMemo(() => buckets.map((bucket) => bucket.label), [buckets]);

  const values = useMemo(() => {
    const series = data?.series || [];
    return {
      sale: fillBuckets(keys, series, "sale_usd"),
      cost: fillBuckets(keys, series, "cost_usd"),
      profit: fillBuckets(keys, series, "profit_usd"),
    };
  }, [data, keys]);

  const rows = useMemo(() => {
    const byKey = new Map((data?.series || []).map((row) => [row.key, row]));
    return buckets.map((bucket, index) => {
      const sale = values.sale[index];
      const profit = values.profit[index];
      const row = byKey.get(bucket.key);
      return {
        key: bucket.key,
        label: bucket.label,
        sale,
        cost: values.cost[index],
        profit,
        // Backend margin; fall back to profit / sale only when the bucket has none
        margin: row ? row.margin ?? marginPct(profit, sale) : null,
      };
    });
  }, [data, buckets, values]);

  const chartSeries = useMemo(
    () => [
      { name: "Actual Sale", data: values.sale },
      { name: "Actual Cost", data: values.cost },
      { name: "Actual Profit", data: values.profit },
    ],
    [values]
  );

  const chartOptions = useMemo(
    () => (palette) =>
      buildMoneyBarOptions(labels, {
        colors: [palette.series[0], palette.series[5], palette.positive],
        labelColor: palette.label,
        gridColor: palette.grid,
      }),
    [labels]
  );

  const totals = data?.totals;
  const tiles = totals
    ? [
        { key: "sale", label: "Actual Sale", value: totals.sale_usd, type: "usd", negativeRed: false },
        { key: "cost", label: "Actual Cost", value: totals.cost_usd, type: "usd", negativeRed: false },
        { key: "profit", label: "Actual Profit", value: totals.profit_usd, type: "usd" },
        { key: "margin", label: "Margin", value: totals.margin, type: "percent" },
      ]
    : [];

  const isEmpty = !!data && (!rows.length || rows.every((row) => !row.sale && !row.cost && !row.profit));

  const moneyCell = (value, { negativeRed = false } = {}) => (
    <Td isNumeric color={negativeRed && value < 0 ? negativeColor : undefined}>
      {formatDashboardMoney(value, "—")}
    </Td>
  );

  return (
    <DashboardPanel
      title="Turnover"
      isLoading={isLoading}
      error={error}
      hasData={!!data}
      isEmpty={isEmpty}
      onRetry={reload}
    >
      <DashboardStatTiles tiles={tiles} />
      <DashboardChart
        type="bar"
        series={chartSeries}
        options={chartOptions}
        height={320}
        resetKey={`${keys.join("|")}`}
      />
      <Box mt={4}>
        <TableContainer border="1px" borderColor={borderColor} borderRadius="md" overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead bg={headBg}>
              <Tr>
                <Th>Period</Th>
                <Th isNumeric>Actual Sale USD</Th>
                <Th isNumeric>Actual Cost USD</Th>
                <Th isNumeric>Actual Profit USD</Th>
                <Th isNumeric>Margin</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row) => (
                <Tr key={row.key}>
                  <Td whiteSpace="nowrap">{row.label}</Td>
                  {moneyCell(row.sale)}
                  {moneyCell(row.cost)}
                  {moneyCell(row.profit, { negativeRed: true })}
                  <Td isNumeric color={row.margin != null && row.margin < 0 ? negativeColor : undefined}>
                    {formatMarginPct(row.margin)}
                  </Td>
                </Tr>
              ))}
              {totals ? (
                <Tr fontWeight="700" bg={headBg}>
                  <Td>Total</Td>
                  {moneyCell(totals.sale_usd)}
                  {moneyCell(totals.cost_usd)}
                  {moneyCell(totals.profit_usd, { negativeRed: true })}
                  <Td isNumeric color={totals.margin != null && totals.margin < 0 ? negativeColor : undefined}>
                    {formatMarginPct(totals.margin)}
                  </Td>
                </Tr>
              ) : null}
            </Tbody>
          </Table>
        </TableContainer>
        {period?.label ? (
          <Text fontSize="xs" mt={2} color="gray.500">
            {period.label}
          </Text>
        ) : null}
        <DashboardUndatedNote undated={data?.undated} />
      </Box>
    </DashboardPanel>
  );
}
