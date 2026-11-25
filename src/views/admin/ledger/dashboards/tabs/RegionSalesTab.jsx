import React, { useMemo } from "react";
import { Box, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue } from "@chakra-ui/react";
import DashboardPanel from "components/ledger/dashboards/DashboardPanel";
import DashboardChart from "components/ledger/dashboards/DashboardChart";
import useLedgerDashboard from "hooks/useLedgerDashboard";
import { getDashboardRegionSales } from "api/ledgerDashboard";
import { formatDashboardMoney } from "views/admin/default/dashboardUtils";
import { fyLabel, fyMonthKeys } from "utils/ledgerDashboardPeriod";
import { buildRegionLineOptions, fillBuckets } from "utils/ledgerDashboardData";

const MONTH_LABELS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
const REGION_ORDER = ["singapore", "greece"];
const REGION_TITLES = { singapore: "To Singapore", greece: "To Greece" };

const sumKnown = (values) => {
  const known = values.filter((v) => v !== null && v !== undefined);
  return known.length ? known.reduce((acc, v) => acc + v, 0) : null;
};

// One region -> { fys: [{ fy, label, values[12], total }], monthTotals[12], grandTotal }
const buildRegionView = (region, fys) => {
  const years = Array.isArray(region?.years) ? region.years : [];
  const columns = fys.map((fy) => {
    const year = years.find((item) => Number(item.fy) === Number(fy));
    const values = fillBuckets(fyMonthKeys(fy), year ? year.months : [], "sale_usd", { futureAsNull: true });
    const total = year ? year.total_usd : sumKnown(values) ?? 0;
    return { fy, label: (year && year.label) || fyLabel(fy), values, total };
  });
  const monthTotals = MONTH_LABELS.map((_, i) => sumKnown(columns.map((col) => col.values[i])));
  const grandTotal = columns.reduce((acc, col) => acc + col.total, 0);
  return { columns, monthTotals, grandTotal };
};

function RegionBlock({ title, view }) {
  const border = useColorModeValue("gray.200", "gray.700");
  const headBg = useColorModeValue("gray.50", "gray.700");
  const totalBg = useColorModeValue("gray.50", "gray.700");
  const stickyBg = useColorModeValue("white", "gray.800");

  const { series, buildOptions } = useMemo(() => {
    const built = buildRegionLineOptions(view.columns);
    return {
      series: built.series,
      buildOptions: (palette) =>
        buildRegionLineOptions(view.columns, {
          colors: palette.series,
          labelColor: palette.label,
          gridColor: palette.grid,
        }).options,
    };
  }, [view]);

  return (
    <DashboardPanel title={title} mb={6}>
      <DashboardChart
        type="line"
        series={series}
        options={buildOptions}
        height={320}
        resetKey={view.columns.map((col) => col.fy).join("-")}
      />
      <TableContainer mt={4} overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th bg={headBg} position="sticky" left={0} zIndex={1} borderColor={border}>
                Month
              </Th>
              {view.columns.map((col) => (
                <Th key={col.fy} isNumeric bg={headBg} borderColor={border}>
                  FY {col.label}
                </Th>
              ))}
              <Th isNumeric bg={headBg} borderColor={border}>
                Total
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {MONTH_LABELS.map((month, i) => (
              <Tr key={month}>
                <Td bg={stickyBg} position="sticky" left={0} borderColor={border}>
                  {month}
                </Td>
                {view.columns.map((col) => (
                  <Td key={col.fy} isNumeric borderColor={border}>
                    {formatDashboardMoney(col.values[i], "—")}
                  </Td>
                ))}
                <Td isNumeric fontWeight="600" borderColor={border}>
                  {formatDashboardMoney(view.monthTotals[i], "—")}
                </Td>
              </Tr>
            ))}
            <Tr>
              <Td bg={totalBg} position="sticky" left={0} fontWeight="700" borderColor={border}>
                Total
              </Td>
              {view.columns.map((col) => (
                <Td key={col.fy} isNumeric bg={totalBg} fontWeight="700" borderColor={border}>
                  {formatDashboardMoney(col.total, "—")}
                </Td>
              ))}
              <Td isNumeric bg={totalBg} fontWeight="700" borderColor={border}>
                {formatDashboardMoney(view.grandTotal, "—")}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </TableContainer>
    </DashboardPanel>
  );
}

// Props from the page: { period, interval, clientId, clientLabel, regionFys }. Only regionFys is used.
export default function RegionSalesTab({ regionFys = [] }) {
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const fys = useMemo(() => [...new Set((regionFys || []).map(Number))].sort((a, b) => a - b), [regionFys]);
  const params = useMemo(() => ({ fys }), [fys]);
  const { data, isLoading, error, reload } = useLedgerDashboard(getDashboardRegionSales, params, {
    enabled: fys.length > 0,
  });

  const views = useMemo(() => {
    const regions = Array.isArray(data?.regions) ? data.regions : [];
    return REGION_ORDER.map((key) => {
      const region = regions.find((item) => item.key === key);
      return { key, view: buildRegionView(region, fys) };
    });
  }, [data, fys]);

  if (!fys.length) {
    return (
      <Text fontSize="sm" color={muted}>
        Select at least one financial year.
      </Text>
    );
  }

  const unassigned = data?.unassigned?.total_usd || 0;
  const hasRegions = Array.isArray(data?.regions) && data.regions.length > 0;

  // Error / loading / empty states come from one panel; the two region blocks render as its content.
  if (error || (isLoading && !data) || (data && !hasRegions)) {
    return (
      <DashboardPanel
        isLoading={isLoading}
        error={error}
        hasData={Boolean(data)}
        isEmpty={Boolean(data) && !hasRegions}
        onRetry={reload}
      />
    );
  }

  return (
    <Box opacity={isLoading ? 0.6 : 1} transition="opacity 0.15s" aria-busy={isLoading || undefined}>
      {views.map(({ key, view }) => (
        <RegionBlock key={key} title={REGION_TITLES[key]} view={view} />
      ))}
      {unassigned > 0 ? (
        <Text fontSize="sm" color={muted}>
          {`USD ${formatDashboardMoney(unassigned, "—")} not assigned to Singapore or Greece`}
        </Text>
      ) : null}
    </Box>
  );
}
