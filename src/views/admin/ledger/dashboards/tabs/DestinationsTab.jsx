import React, { useMemo, useState } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import DashboardPanel from "components/ledger/dashboards/DashboardPanel";
import DashboardChart from "components/ledger/dashboards/DashboardChart";
import DashboardStatTiles from "components/ledger/dashboards/DashboardStatTiles";
import DashboardUndatedNote from "components/ledger/dashboards/DashboardUndatedNote";
import useLedgerDashboard from "hooks/useLedgerDashboard";
import { getDashboardDestinations } from "api/ledgerDashboard";
import { formatDashboardMoney } from "views/admin/default/dashboardUtils";
import { buildMoneyBarOptions, formatMarginPct, pivotByBucket, sortRows, topNWithOther } from "utils/ledgerDashboardData";

const TOP_N = 15;
const BAR_HEIGHT = 28;

const money = (value) => formatDashboardMoney(value, "—");

function TruncatedText({ value, maxW = "220px", fontWeight }) {
  const text = value == null || value === false || value === "" ? "" : String(value);
  const isEmpty = !text;
  const emptyColor = useColorModeValue("gray.400", "gray.500");
  return (
    <Tooltip label={text} isDisabled={isEmpty || text.length < 14} openDelay={250} hasArrow placement="top">
      <Text
        fontSize="sm"
        fontWeight={fontWeight}
        color={isEmpty ? emptyColor : undefined}
        maxW={maxW}
        noOfLines={1}
        cursor={!isEmpty && text.length >= 14 ? "help" : "default"}
      >
        {isEmpty ? "—" : text}
      </Text>
    </Tooltip>
  );
}

// Props from the page: { period: { date_from, date_to, label }, interval, clientId, clientLabel, regionFys }
export default function DestinationsTab({ period, interval }) {
  const [byPeriod, setByPeriod] = useState(false);
  const headBg = useColorModeValue("gray.50", "gray.700");
  const cellBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const negativeColor = useColorModeValue("red.500", "red.300");

  const params = useMemo(
    () => ({ date_from: period?.date_from, date_to: period?.date_to, interval }),
    [period?.date_from, period?.date_to, interval]
  );
  const { data, isLoading, error, reload } = useLedgerDashboard(getDashboardDestinations, params);

  const rows = useMemo(() => sortRows(data?.rows, "cost_usd", "desc"), [data]);
  const buckets = useMemo(() => data?.buckets ?? [], [data]);
  const bucketKeys = useMemo(() => buckets.map((bucket) => bucket.key), [buckets]);
  const pivotRows = useMemo(() => pivotByBucket(rows, bucketKeys, "cost_usd"), [rows, bucketKeys]);

  const chartRows = useMemo(() => topNWithOther(rows, TOP_N, "cost_usd").filter((row) => !row.isOther), [rows]);
  const chartSeries = useMemo(
    () => [{ name: "Cost USD", data: chartRows.map((row) => row.cost_usd) }],
    [chartRows]
  );
  const chartOptions = useMemo(
    () => (palette) => {
      const base = buildMoneyBarOptions(
        chartRows.map((row) => row.destination || "—"),
        { colors: [palette.series[0]], labelColor: palette.label, gridColor: palette.grid }
      );
      const compact = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
      return {
        ...base,
        plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: "70%" } },
        xaxis: { ...base.xaxis, labels: { ...base.xaxis.labels, rotate: 0, formatter: compact } },
        yaxis: { labels: { style: { colors: palette.label, fontSize: "11px" }, maxWidth: 160 } },
        legend: { show: false },
      };
    },
    [chartRows]
  );

  const totals = data?.totals;
  const tiles = [
    { key: "sale", label: "Sale USD", value: totals?.sale_usd, type: "usd", negativeRed: false },
    { key: "cost", label: "Cost USD", value: totals?.cost_usd, type: "usd", negativeRed: false },
    { key: "profit", label: "Profit USD", value: totals?.profit_usd, type: "usd" },
    { key: "margin", label: "Margin", value: totals?.margin, type: "percent" },
    { key: "invoices", label: "Invoices", value: totals?.invoice_count, type: "count" },
    { key: "agents", label: "Agents", value: totals?.agent_count, type: "count" },
  ];

  const thProps = { bg: headBg, borderColor, whiteSpace: "nowrap" };
  const negativeIf = (value) => (value != null && Number(value) < 0 ? negativeColor : undefined);
  const stickyProps = { position: "sticky", left: 0, zIndex: 1, bg: cellBg };

  const toggle = (
    <FormControl display="flex" alignItems="center" w="auto">
      <FormLabel htmlFor="destinations-by-period" mb={0} fontSize="sm">
        By period
      </FormLabel>
      <Switch id="destinations-by-period" isChecked={byPeriod} onChange={(e) => setByPeriod(e.target.checked)} />
    </FormControl>
  );

  return (
    <DashboardPanel
      title="Destinations"
      actions={toggle}
      isLoading={isLoading}
      error={error}
      hasData={Boolean(data)}
      isEmpty={Boolean(data) && rows.length === 0}
      onRetry={reload}
    >
      <DashboardStatTiles tiles={tiles} columns={{ base: 1, sm: 2, xl: 3 }} />
      <DashboardUndatedNote undated={data?.undated} mt={0} mb={4} />

      <Box mb={6}>
        <Text fontWeight="600" fontSize="sm" mb={2}>
          Top {TOP_N} destinations by cost (USD)
        </Text>
        <DashboardChart
          type="bar"
          series={chartSeries}
          options={chartOptions}
          height={Math.max(160, chartRows.length * BAR_HEIGHT + 60)}
          resetKey={`${period?.date_from}-${period?.date_to}-${interval}-${chartRows.length}`}
        />
      </Box>

      <TableContainer overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead>
            {byPeriod ? (
              <Tr>
                <Th {...thProps} {...stickyProps} bg={headBg}>
                  Destination
                </Th>
                {buckets.map((bucket) => (
                  <Th key={bucket.key} {...thProps} isNumeric>
                    {bucket.label}
                  </Th>
                ))}
                <Th {...thProps} isNumeric>
                  Total
                </Th>
              </Tr>
            ) : (
              <Tr>
                <Th {...thProps}>Destination</Th>
                <Th {...thProps}>Country</Th>
                <Th {...thProps} isNumeric>
                  Agents
                </Th>
                <Th {...thProps} isNumeric>
                  Invoices
                </Th>
                <Th {...thProps} isNumeric>
                  Sale USD
                </Th>
                <Th {...thProps} isNumeric>
                  Cost USD
                </Th>
                <Th {...thProps} isNumeric>
                  Profit USD
                </Th>
                <Th {...thProps} isNumeric>
                  Margin
                </Th>
              </Tr>
            )}
          </Thead>
          <Tbody>
            {byPeriod
              ? pivotRows.map((row, index) => (
                  <Tr key={`${row.destination}-${index}`}>
                    <Td {...stickyProps} borderColor={borderColor}>
                      <TruncatedText value={row.destination} fontWeight="600" />
                    </Td>
                    {row.values.map((value, i) => (
                      <Td key={bucketKeys[i]} isNumeric borderColor={borderColor}>
                        {money(value)}
                      </Td>
                    ))}
                    <Td isNumeric fontWeight="600" borderColor={borderColor}>
                      {money(row.cost_usd)}
                    </Td>
                  </Tr>
                ))
              : rows.map((row, index) => (
                  <Tr key={`${row.destination}-${index}`}>
                    <Td borderColor={borderColor}>
                      <TruncatedText value={row.destination} fontWeight="600" />
                    </Td>
                    <Td borderColor={borderColor}>
                      <TruncatedText value={row.destination_country} maxW="160px" />
                    </Td>
                    <Td isNumeric borderColor={borderColor}>
                      {row.agent_count}
                    </Td>
                    <Td isNumeric borderColor={borderColor}>
                      {row.invoice_count}
                    </Td>
                    <Td isNumeric borderColor={borderColor}>
                      {money(row.sale_usd)}
                    </Td>
                    <Td isNumeric borderColor={borderColor}>
                      {money(row.cost_usd)}
                    </Td>
                    <Td isNumeric borderColor={borderColor} color={negativeIf(row.profit_usd)}>
                      {money(row.profit_usd)}
                    </Td>
                    <Td isNumeric borderColor={borderColor} color={negativeIf(row.margin)}>
                      {formatMarginPct(row.margin)}
                    </Td>
                  </Tr>
                ))}
            {!byPeriod && totals ? (
              <Tr fontWeight="700">
                <Td borderColor={borderColor}>Total</Td>
                <Td borderColor={borderColor} />
                <Td isNumeric borderColor={borderColor}>
                  {totals.agent_count}
                </Td>
                <Td isNumeric borderColor={borderColor}>
                  {totals.invoice_count}
                </Td>
                <Td isNumeric borderColor={borderColor}>
                  {money(totals.sale_usd)}
                </Td>
                <Td isNumeric borderColor={borderColor}>
                  {money(totals.cost_usd)}
                </Td>
                <Td isNumeric borderColor={borderColor} color={negativeIf(totals.profit_usd)}>
                  {money(totals.profit_usd)}
                </Td>
                <Td isNumeric borderColor={borderColor} color={negativeIf(totals.margin)}>
                  {formatMarginPct(totals.margin)}
                </Td>
              </Tr>
            ) : null}
          </Tbody>
        </Table>
      </TableContainer>
    </DashboardPanel>
  );
}
