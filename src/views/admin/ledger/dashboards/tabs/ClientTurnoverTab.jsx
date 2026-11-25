import React, { useMemo } from "react";
import { Table, TableContainer, Tbody, Td, Text, Th, Thead, Tooltip, Tr, useColorModeValue } from "@chakra-ui/react";
import DashboardPanel from "components/ledger/dashboards/DashboardPanel";
import DashboardChart from "components/ledger/dashboards/DashboardChart";
import DashboardStatTiles from "components/ledger/dashboards/DashboardStatTiles";
import DashboardUndatedNote from "components/ledger/dashboards/DashboardUndatedNote";
import useLedgerDashboard from "hooks/useLedgerDashboard";
import { getDashboardClientTurnover } from "api/ledgerDashboard";
import { fillBuckets, formatMarginPct, hasMatchingBucket, buildMoneyBarOptions, topNWithOther } from "utils/ledgerDashboardData";
import { formatDashboardMoney } from "views/admin/default/dashboardUtils";

const TOP_VESSELS = 8;
const OTHER_LABEL = "Other vessels";
const NO_VESSEL_LABEL = "No vessel";

function TruncatedText({ value, maxW = "220px", fontWeight }) {
  const text = value == null || value === "" ? "" : String(value);
  return (
    <Tooltip label={text} isDisabled={!text || text.length < 14} openDelay={250} hasArrow placement="top">
      <Text fontSize="sm" fontWeight={fontWeight} maxW={maxW} noOfLines={1}>
        {text || "—"}
      </Text>
    </Tooltip>
  );
}

// Props from the page: { period: { date_from, date_to, label }, interval, clientId, clientLabel, regionFys }
export default function ClientTurnoverTab({ period, interval, clientId, clientLabel }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const mutedColor = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const borderColor = useColorModeValue("secondaryGray.300", "whiteAlpha.200");
  const negativeColor = useColorModeValue("red.500", "red.300");

  const hasClient = Boolean(clientId);
  const params = useMemo(
    () => ({
      date_from: period?.date_from,
      date_to: period?.date_to,
      interval,
      client_id: clientId,
    }),
    [period?.date_from, period?.date_to, interval, clientId]
  );
  const { data, isLoading, error, reload } = useLedgerDashboard(getDashboardClientTurnover, params, {
    enabled: hasClient,
  });

  const view = useMemo(() => {
    if (!data) return null;
    const keys = data.buckets.map((b) => b.key);
    const categories = data.buckets.map((b) => b.label || b.key);
    const vessels = data.vessels.map((v) => ({ ...v, label: v.vessel_name || NO_VESSEL_LABEL }));
    // "No vessel" stays its own series; the remaining vessels are ranked and the tail grouped
    const noVessel = vessels.filter((v) => v.vessel_id == null);
    const named = vessels.filter((v) => v.vessel_id != null);
    const chartRows = [...topNWithOther(named, TOP_VESSELS, "sale_usd", OTHER_LABEL), ...noVessel];
    // A row whose bucket keys do not match the response buckets (e.g. "No vessel" with only { key: "total" } on a
    // quarter interval) cannot be placed on the period axis: it is left out of the chart, not the table or totals.
    const series = chartRows
      .filter((row) => !keys.length || hasMatchingBucket(keys, row.by_bucket))
      .map((row) => ({
        name: row.label,
        data: fillBuckets(keys, row.by_bucket, "sale_usd"),
      }));
    return { categories, series, vessels: [...named].sort((a, b) => b.sale_usd - a.sale_usd).concat(noVessel) };
  }, [data]);

  const optionsFor = useMemo(
    () => (palette) =>
      buildMoneyBarOptions(view?.categories, {
        colors: palette.series,
        labelColor: palette.label,
        gridColor: palette.grid,
        stacked: true,
      }),
    [view?.categories]
  );

  if (!hasClient) {
    return (
      <DashboardPanel>
        <Text fontSize="sm" color={mutedColor} textAlign="center" py={6}>
          Select a client to see turnover
        </Text>
      </DashboardPanel>
    );
  }

  const totals = data?.totals;
  const tiles = totals
    ? [
        { key: "sale", label: "Turnover", value: totals.sale_usd, type: "usd", negativeRed: false },
        { key: "cost", label: "Cost", value: totals.cost_usd, type: "usd", negativeRed: false },
        { key: "profit", label: "Profit", value: totals.profit_usd, type: "usd" },
        { key: "margin", label: "Margin", value: totals.margin, type: "percent" },
      ]
    : [];
  // Ignore a previous client's response while the newly picked client loads.
  const dataClientName = String(data?.client?.id) === String(clientId) ? data?.client?.name : "";
  const clientName = clientLabel || dataClientName;
  const moneyColor = (value) => (value != null && Number(value) < 0 ? negativeColor : textColor);

  return (
    <DashboardPanel
      title={clientName ? `Turnover: ${clientName}` : "Client turnover"}
      isLoading={isLoading}
      error={error}
      hasData={Boolean(data)}
      isEmpty={Boolean(data) && data.vessels.length === 0}
      onRetry={reload}
    >
      {view ? (
        <>
          <DashboardStatTiles tiles={tiles} />
          <DashboardChart
            type="bar"
            height={320}
            series={view.series}
            options={optionsFor}
            resetKey={`${clientId}-${interval}-${period?.date_from}-${period?.date_to}`}
          />
          <TableContainer mt={4} borderTop="1px solid" borderColor={borderColor}>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Vessel</Th>
                  <Th isNumeric>Turnover</Th>
                  <Th isNumeric>Cost</Th>
                  <Th isNumeric>Profit</Th>
                  <Th isNumeric>Margin</Th>
                </Tr>
              </Thead>
              <Tbody>
                {view.vessels.map((v) => (
                  <Tr key={v.vessel_id ?? "no-vessel"}>
                    <Td>
                      <TruncatedText value={v.vessel_name || NO_VESSEL_LABEL} />
                    </Td>
                    <Td isNumeric>{formatDashboardMoney(v.sale_usd, "—")}</Td>
                    <Td isNumeric>{formatDashboardMoney(v.cost_usd, "—")}</Td>
                    <Td isNumeric color={moneyColor(v.profit_usd)}>
                      {formatDashboardMoney(v.profit_usd, "—")}
                    </Td>
                    <Td isNumeric color={moneyColor(v.margin)}>
                      {formatMarginPct(v.margin)}
                    </Td>
                  </Tr>
                ))}
                <Tr fontWeight="bold">
                  <Td>Total</Td>
                  <Td isNumeric>{formatDashboardMoney(totals.sale_usd, "—")}</Td>
                  <Td isNumeric>{formatDashboardMoney(totals.cost_usd, "—")}</Td>
                  <Td isNumeric color={moneyColor(totals.profit_usd)}>
                    {formatDashboardMoney(totals.profit_usd, "—")}
                  </Td>
                  <Td isNumeric color={moneyColor(totals.margin)}>
                    {formatMarginPct(totals.margin)}
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
          <DashboardUndatedNote undated={data?.undated} />
        </>
      ) : null}
    </DashboardPanel>
  );
}
