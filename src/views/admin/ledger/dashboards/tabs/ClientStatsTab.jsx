import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
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
import { getDashboardClientStats } from "api/ledgerDashboard";
import LedgerSortableHeader from "components/ledger/LedgerSortableHeader";
import DashboardPanel from "components/ledger/dashboards/DashboardPanel";
import DashboardChart from "components/ledger/dashboards/DashboardChart";
import DashboardStatTiles from "components/ledger/dashboards/DashboardStatTiles";
import DashboardUndatedNote from "components/ledger/dashboards/DashboardUndatedNote";
import useLedgerDashboard from "hooks/useLedgerDashboard";
import { buildMoneyBarOptions, formatMarginPct, pivotByBucket, sortRows } from "utils/ledgerDashboardData";
import { formatDashboardMoney } from "views/admin/default/dashboardUtils";

const TOP_N = 10;

const METRICS = [
  { key: "sale_usd", label: "Turnover" },
  { key: "profit_usd", label: "Profit" },
  { key: "margin", label: "Margin" },
];

const compactMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "";
};

function TruncatedText({ value, maxW = "220px", fontWeight }) {
  const text = value == null || value === "" ? "" : String(value);
  const isLong = text.length >= 14;
  return (
    <Tooltip label={text} isDisabled={!isLong} openDelay={250} hasArrow placement="top">
      <Text fontSize="sm" fontWeight={fontWeight} maxW={maxW} noOfLines={1} cursor={isLong ? "help" : "default"}>
        {text || "—"}
      </Text>
    </Tooltip>
  );
}

export default function ClientStatsTab({ period, interval }) {
  const [metric, setMetric] = useState("sale_usd");
  const [byPeriod, setByPeriod] = useState(false);
  const [sort, setSort] = useState({ key: "sale_usd", order: "desc" });

  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headBg = useColorModeValue("gray.50", "navy.900");
  const stickyBg = useColorModeValue("white", "navy.800");
  const totalsBg = useColorModeValue("gray.50", "navy.900");
  const negativeColor = useColorModeValue("red.500", "red.300");
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  const params = useMemo(
    () => ({ date_from: period?.date_from, date_to: period?.date_to, interval }),
    [period?.date_from, period?.date_to, interval]
  );
  const { data, isLoading, error, reload } = useLedgerDashboard(getDashboardClientStats, params);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const buckets = useMemo(() => data?.buckets ?? [], [data]);
  const totals = data?.totals;
  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? "";

  const tiles = [
    { key: "sale", label: "Turnover", value: totals?.sale_usd, type: "usd", negativeRed: false },
    { key: "cost", label: "Cost", value: totals?.cost_usd, type: "usd", negativeRed: false },
    { key: "profit", label: "Profit", value: totals?.profit_usd, type: "usd" },
    { key: "margin", label: "Margin", value: totals?.margin, type: "percent" },
  ];

  const sortedRows = useMemo(() => sortRows(rows, sort.key, sort.order), [rows, sort]);

  // Pivot: clients x buckets for the chosen metric. Sorted by client name or the row's metric total.
  const pivotRows = useMemo(() => {
    const keys = buckets.map((bucket) => bucket.key);
    const pivoted = pivotByBucket(rows, keys, metric);
    return sortRows(pivoted, sort.key === "client_name" ? "client_name" : metric, sort.order);
  }, [rows, buckets, metric, sort]);

  const topRows = useMemo(() => sortRows(rows, "sale_usd", "desc").slice(0, TOP_N), [rows]);
  const chartSeries = useMemo(
    () => [{ name: "Turnover", data: topRows.map((row) => row.sale_usd) }],
    [topRows]
  );
  const chartOptions = useMemo(
    () => (palette) => {
      const base = buildMoneyBarOptions(
        topRows.map((row) => row.client_name || "—"),
        { colors: [palette.series[0]], labelColor: palette.label, gridColor: palette.grid }
      );
      // Horizontal bars: categories sit on the y-axis, money on the x-axis
      return {
        ...base,
        plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: "65%" } },
        legend: { show: false },
        xaxis: {
          ...base.xaxis,
          labels: { style: { colors: palette.label, fontSize: "11px" }, formatter: compactMoney },
        },
        yaxis: { labels: { style: { colors: palette.label, fontSize: "11px" }, maxWidth: 220 } },
      };
    },
    [topRows]
  );

  const handleSort = (key) =>
    setSort((prev) =>
      prev.key === key ? { key, order: prev.order === "desc" ? "asc" : "desc" } : { key, order: key === "client_name" ? "asc" : "desc" }
    );

  const money = (value) => formatDashboardMoney(value, "—");
  const colorFor = (value) => (value != null && Number(value) < 0 ? negativeColor : undefined);

  // Plain render helper (not a component) so the header cells are not remounted on every render.
  const renderSortTh = (field, label, { isNumeric = true, sticky = false } = {}) => (
    <LedgerSortableHeader
      label={label}
      sortKey={field}
      sortBy={sort.key}
      sortOrder={sort.order}
      onSort={handleSort}
      isNumeric={isNumeric}
      whiteSpace="nowrap"
      bg={headBg}
      {...(sticky ? { position: "sticky", left: 0, zIndex: 2 } : {})}
    />
  );

  const stickyProps = { position: "sticky", left: 0, zIndex: 1 };

  const renderMetricCell = (key, value) =>
    key === "margin" ? formatMarginPct(value) : money(value);

  const renderFlat = () => (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          {renderSortTh("client_name", "Client", { isNumeric: false, sticky: true })}
          {renderSortTh("sale_usd", "Turnover USD")}
          {renderSortTh("cost_usd", "Cost USD")}
          {renderSortTh("profit_usd", "Profit USD")}
          {renderSortTh("margin", "Margin")}
        </Tr>
      </Thead>
      <Tbody>
        {sortedRows.map((row) => (
          <Tr key={row.client_id ?? row.client_name}>
            <Td {...stickyProps} bg={stickyBg}>
              <TruncatedText value={row.client_name} />
            </Td>
            <Td isNumeric>{money(row.sale_usd)}</Td>
            <Td isNumeric>{money(row.cost_usd)}</Td>
            <Td isNumeric color={colorFor(row.profit_usd)}>
              {money(row.profit_usd)}
            </Td>
            <Td isNumeric color={colorFor(row.margin)}>
              {formatMarginPct(row.margin)}
            </Td>
          </Tr>
        ))}
        <Tr bg={totalsBg} fontWeight="700">
          <Td {...stickyProps} bg={totalsBg}>
            Total
          </Td>
          <Td isNumeric>{money(totals?.sale_usd)}</Td>
          <Td isNumeric>{money(totals?.cost_usd)}</Td>
          <Td isNumeric color={colorFor(totals?.profit_usd)}>
            {money(totals?.profit_usd)}
          </Td>
          <Td isNumeric color={colorFor(totals?.margin)}>
            {formatMarginPct(totals?.margin)}
          </Td>
        </Tr>
      </Tbody>
    </Table>
  );

  const renderPivot = () => (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          {renderSortTh("client_name", "Client", { isNumeric: false, sticky: true })}
          {buckets.map((bucket) => (
            <Th key={bucket.key} isNumeric whiteSpace="nowrap" bg={headBg}>
              {bucket.label}
            </Th>
          ))}
          {renderSortTh(metric, metric === "margin" ? "Total margin" : "Total USD")}
        </Tr>
      </Thead>
      <Tbody>
        {pivotRows.map((row) => (
          <Tr key={row.client_id ?? row.client_name}>
            <Td {...stickyProps} bg={stickyBg}>
              <TruncatedText value={row.client_name} />
            </Td>
            {row.values.map((value, i) => (
              <Td key={buckets[i]?.key ?? i} isNumeric color={colorFor(value)}>
                {renderMetricCell(metric, value)}
              </Td>
            ))}
            <Td isNumeric fontWeight="600" color={colorFor(row[metric])}>
              {renderMetricCell(metric, row[metric])}
            </Td>
          </Tr>
        ))}
        <Tr bg={totalsBg} fontWeight="700">
          <Td {...stickyProps} bg={totalsBg}>
            Total
          </Td>
          {buckets.map((bucket) => (
            <Td key={bucket.key} isNumeric>
              {/* The backend sends totals for the whole period only, so bucket totals are left blank. */}
              —
            </Td>
          ))}
          <Td isNumeric color={colorFor(totals?.[metric])}>
            {renderMetricCell(metric, totals?.[metric])}
          </Td>
        </Tr>
      </Tbody>
    </Table>
  );

  return (
    <Box>
      <DashboardStatTiles tiles={tiles} />
      <DashboardUndatedNote undated={data?.undated} mt={0} mb={4} />

      <DashboardPanel
        title="Top 10 clients by turnover"
        mb={4}
        isLoading={isLoading}
        error={error}
        hasData={Boolean(data)}
        isEmpty={rows.length === 0}
        onRetry={reload}
      >
        <DashboardChart
          type="bar"
          height={Math.max(220, topRows.length * 36 + 60)}
          series={chartSeries}
          options={chartOptions}
          resetKey={topRows.map((row) => row.client_id ?? row.client_name).join("|")}
        />
      </DashboardPanel>

      <DashboardPanel
        title="Clients"
        isLoading={isLoading}
        error={error}
        hasData={Boolean(data)}
        isEmpty={rows.length === 0}
        onRetry={reload}
        actions={
          <Flex gap={3} align="center" wrap="wrap">
            <ButtonGroup size="sm" isAttached variant="outline" aria-label="Metric">
              {METRICS.map((item) => (
                <Button
                  key={item.key}
                  colorScheme={metric === item.key ? "blue" : undefined}
                  variant={metric === item.key ? "solid" : "outline"}
                  isDisabled={!byPeriod}
                  onClick={() => setMetric(item.key)}
                  aria-pressed={metric === item.key}
                >
                  {item.label}
                </Button>
              ))}
            </ButtonGroup>
            <Button
              size="sm"
              colorScheme="blue"
              variant={byPeriod ? "solid" : "outline"}
              onClick={() => setByPeriod((prev) => !prev)}
              aria-pressed={byPeriod}
            >
              By period
            </Button>
          </Flex>
        }
      >
        {byPeriod ? (
          <Text fontSize="xs" color={mutedColor} mb={2}>
            {metricLabel} per client and {interval === "quarter" ? "quarter" : interval === "total" ? "period" : "month"}
          </Text>
        ) : null}
        <TableContainer border="1px" borderColor={borderColor} borderRadius="md" overflowX="auto">
          {byPeriod ? renderPivot() : renderFlat()}
        </TableContainer>
      </DashboardPanel>
    </Box>
  );
}
