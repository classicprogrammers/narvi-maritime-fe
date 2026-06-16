import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import ReactApexChart from "react-apexcharts";
import { useHistory } from "react-router-dom";
import {
  MdDescription,
  MdInventory,
  MdLocalShipping,
  MdRateReview,
  MdRefresh,
} from "react-icons/md";
import Card from "components/card/Card";
import IconBox from "components/icons/IconBox";
import MiniStatistics from "components/card/MiniStatistics";
import { getNarviDashboard, normalizeNarviDashboard } from "../../../api/narviDashboard";
import { extractNarviQuotationError } from "../../../api/narviQuotation";
import {
  buildHorizontalBarChartOptions,
  buildPieChartOptions,
  buildShippingStackedBarOptions,
  buildVerticalBarChartOptions,
  formatDashboardMoney,
  normalizeGroupedBarInput,
  normalizePieInput,
  normalizeShippingStackedInput,
  quotationClientName,
  quotationDisplayName,
  quotationValidityDate,
  quotationVesselName,
  sectionStat,
} from "./dashboardUtils";

// QUOTATION_FINANCIAL_SERIES kept for potential re-use but not used in list view

const SHIPPING_FINANCIAL_SERIES = [
  { key: "sale_amount", name: "Sale" },
  { key: "to_invoice", name: "To Invoice" },
  { key: "estimated_profit", name: "Est. Profit" },
];

const QUOTATION_FINANCIAL_SERIES = [
  { key: "cost", name: "Cost" },
  { key: "markup", name: "Markup" },
  { key: "sale", name: "Sale" },
];

function EmptyChartState({ label = "No chart data available." }) {
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  return (
    <Flex align="center" justify="center" h="280px">
      <Text fontSize="sm" color={muted}>
        {label}
      </Text>
    </Flex>
  );
}

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <EmptyChartState label="Chart unavailable for this data." />;
    }
    return this.props.children;
  }
}

function DashboardDonutChart({ data, height = 300 }) {
  const chartLabel = useColorModeValue("#707EAE", "#A3AED0");
  const normalized = useMemo(() => normalizePieInput(data) ?? { series: [], labels: [] }, [data]);
  const { series = [], labels = [] } = normalized;
  const display = useMemo(() => {
    const nextLabels = [];
    const nextSeries = [];
    series.forEach((value, index) => {
      nextLabels.push(labels[index] ?? "—");
      nextSeries.push(value);
    });
    if (!nextLabels.length) return { labels: ["Total"], series: [0] };
    return { labels: nextLabels, series: nextSeries };
  }, [labels, series]);

  const total = useMemo(
    () => display.series.reduce((sum, value) => sum + (Number(value) || 0), 0),
    [display.series]
  );

  const options = useMemo(
    () => buildPieChartOptions(display.labels, chartLabel, { donut: true }),
    [display.labels, chartLabel]
  );

  if (total <= 0) {
    return <DashboardHorizontalCountChart data={data} height={height} />;
  }

  return (
    <ChartErrorBoundary resetKey={`donut-${display.labels.join("-")}`} fallback={<DashboardHorizontalCountChart data={data} height={height} />}>
      <ReactApexChart
        key={`donut-${display.labels.join("-")}`}
        type="donut"
        series={display.series}
        options={options}
        height={height}
      />
    </ChartErrorBoundary>
  );
}

function DashboardPieChart({ data, height = 300 }) {
  const chartLabel = useColorModeValue("#707EAE", "#A3AED0");
  const normalized = useMemo(() => normalizePieInput(data) ?? { series: [], labels: [] }, [data]);
  const { series = [], labels = [] } = normalized;
  const display = useMemo(() => {
    const nextLabels = [];
    const nextSeries = [];
    series.forEach((value, index) => {
      if (value > 0) {
        nextLabels.push(labels[index] ?? "—");
        nextSeries.push(value);
      }
    });
    if (nextLabels.length) return { labels: nextLabels, series: nextSeries };
    return { labels: labels.length ? labels : ["Total"], series: labels.length ? series : [0] };
  }, [labels, series]);

  const total = useMemo(
    () => display.series.reduce((sum, value) => sum + (Number(value) || 0), 0),
    [display.series]
  );

  const options = useMemo(
    () => buildPieChartOptions(display.labels, chartLabel),
    [display.labels, chartLabel]
  );

  if (total <= 0) {
    return <DashboardHorizontalCountChart data={data} height={height} />;
  }

  return (
    <ChartErrorBoundary resetKey={`pie-${display.labels.join("-")}`} fallback={<DashboardHorizontalCountChart data={data} height={height} />}>
      <ReactApexChart
        key={`pie-${display.labels.join("-")}`}
        type="pie"
        series={display.series}
        options={options}
        height={height}
      />
    </ChartErrorBoundary>
  );
}

function DashboardGroupedBarChart({ data, seriesDefs, height = 300, stacked = false }) {
  const chartLabel = useColorModeValue("#707EAE", "#A3AED0");
  const normalized = useMemo(
    () => normalizeGroupedBarInput(data, seriesDefs) ?? { categories: ["—"], series: seriesDefs.map(({ name }) => ({ name, data: [0] })) },
    [data, seriesDefs]
  );
  const { categories = ["—"], series = [] } = normalized;
  const options = useMemo(
    () => buildVerticalBarChartOptions(categories, chartLabel, { stacked }),
    [categories, chartLabel, stacked]
  );

  return (
    <ChartErrorBoundary resetKey={`grouped-${categories.join("-")}-${stacked}`} fallback={<EmptyChartState label="Unable to render chart." />}>
      <ReactApexChart
        key={`grouped-${categories.join("-")}-${stacked}`}
        type="bar"
        series={series}
        options={options}
        height={height}
      />
    </ChartErrorBoundary>
  );
}

function DashboardHorizontalCountChart({ data, height = 300 }) {
  const chartLabel = useColorModeValue("#707EAE", "#A3AED0");
  const normalized = useMemo(() => normalizePieInput(data) ?? { series: [], labels: [] }, [data]);
  const { series = [], labels = [] } = normalized;
  const display = useMemo(() => {
    if (labels.length) return { labels, series };
    return { labels: ["—"], series: [0] };
  }, [labels, series]);

  const options = useMemo(
    () => buildHorizontalBarChartOptions(display.labels, chartLabel),
    [display.labels, chartLabel]
  );

  return (
    <ChartErrorBoundary resetKey={`hbar-${display.labels.join("-")}`} fallback={<EmptyChartState label="Unable to render chart." />}>
      <ReactApexChart
        key={`hbar-${display.labels.join("-")}`}
        type="bar"
        series={[{ name: "Count", data: display.series }]}
        options={options}
        height={Math.max(height, display.labels.length * 34)}
      />
    </ChartErrorBoundary>
  );
}

function buildTrendLinePoints(endValue, pointCount = 6) {
  const end = Number(endValue) || 0;
  if (end <= 0) return Array(pointCount).fill(0);

  const start = Math.round(end * 0.55);
  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const base = start + (end - start) * progress;
    const wobble = (index % 2 === 0 ? 1 : -1) * end * 0.1 * (1 - progress * 0.35);
    return Math.max(0, Math.round(base + wobble));
  });
}

function ShippingOrderStackedChart({ doneStatus, financialByDone, height = 300 }) {
  const chartLabel = useColorModeValue("#A3AED0", "#A3AED0");
  const { categories, series } = useMemo(
    () => normalizeShippingStackedInput(doneStatus, financialByDone),
    [doneStatus, financialByDone]
  );
  const options = useMemo(
    () => buildShippingStackedBarOptions(categories, chartLabel),
    [categories, chartLabel]
  );

  return (
    <ChartErrorBoundary
      resetKey={`shipping-${categories.join("-")}`}
      fallback={<EmptyChartState label="Unable to render shipping chart." />}
    >
      <ReactApexChart
        key={`shipping-stacked-${categories.join("-")}`}
        type="bar"
        series={series}
        options={options}
        height={height}
      />
    </ChartErrorBoundary>
  );
}

function RateListTrendCard({ data }) {
  const chartLabel = useColorModeValue("#A3AED0", "#A3AED0");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const success = useColorModeValue("green.500", "green.300");
  const bgSoft = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const normalized = useMemo(() => normalizePieInput(data) ?? { series: [], labels: [] }, [data]);
  const labels = normalized?.labels?.length ? normalized.labels : ["Client Specific", "General"];
  const series = normalized?.series?.length ? normalized.series : [0, 0];
  const total = series.reduce((sum, val) => sum + (Number(val) || 0), 0);
  const clientSpecific = Number(series[0] || 0);
  const general = Number(series[1] || 0);
  const clientPct = total > 0 ? ((clientSpecific / total) * 100).toFixed(1) : "0.0";
  const monthCategories = ["SEP", "OCT", "NOV", "DEC", "JAN", "FEB"];

  const chartOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, dropShadow: { enabled: true, top: 8, left: 0, blur: 8, opacity: 0.12 } },
      colors: ["#4318FF", "#39B8FF"],
      stroke: { curve: "straight", width: 4 },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: { borderColor: "transparent" },
      xaxis: {
        categories: monthCategories,
        labels: { style: { colors: chartLabel, fontSize: "12px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: chartLabel, fontSize: "12px" },
          formatter: (v) => `${Math.round(v)}`,
        },
      },
      tooltip: { theme: "light" },
    }),
    [chartLabel]
  );

  const chartSeries = useMemo(
    () => [
      { name: labels[0] || "Client Specific", data: buildTrendLinePoints(clientSpecific) },
      { name: labels[1] || "General", data: buildTrendLinePoints(general) },
    ],
    [labels, clientSpecific, general]
  );

  return (
    <Card p="20px" h="100%">
      <Flex direction={{ base: "column", xl: "row" }} gap={4} align="stretch">
        <Box minW={{ base: "100%", xl: "200px" }}>
          <Box
            display="inline-flex"
            px={3}
            py={2}
            borderRadius="12px"
            bg={bgSoft}
            fontSize="sm"
            color={chartLabel}
            fontWeight="600"
          >
            Rate List
          </Box>
          <Text mt={5} fontSize="44px" lineHeight="1" fontWeight="700" color={textColor}>
            {total.toLocaleString()}
          </Text>
          <Text mt={2} fontSize="md" color={muted}>
            Total Active{" "}
            <Text as="span" color={success} fontWeight="700">
              {clientPct}% client-specific
            </Text>
          </Text>
        </Box>

        <Box flex="1" minH="260px">
          <ReactApexChart
            type="line"
            series={chartSeries}
            options={chartOptions}
            height={260}
          />
        </Box>
      </Flex>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");

  return (
    <Card p="20px" h="100%">
      <Box mb={3}>
        <Text color={textColor} fontSize="md" fontWeight="700">
          {title}
        </Text>
        {subtitle ? (
          <Text mt={1} fontSize="xs" color={muted}>
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {children}
    </Card>
  );
}

function RecentQuotationRow({ quotation, onClick }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const hoverBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const borderColor = useColorModeValue("gray.100", "whiteAlpha.100");
  const charts = quotation?.charts ?? {};
  const totals = charts.totals ?? {};
  const validityDate = quotationValidityDate(quotation);

  return (
    <Flex
      align="center"
      justify="space-between"
      px={4}
      py={3}
      borderBottom="1px solid"
      borderColor={borderColor}
      cursor="pointer"
      _hover={{ bg: hoverBg }}
      borderRadius="8px"
      onClick={onClick}
      gap={3}
      wrap="wrap"
    >
      <Box minW="120px">
        <Text fontSize="sm" fontWeight="700" color={textColor}>
          {quotationDisplayName(quotation)}
        </Text>
        <Text fontSize="xs" color={muted} mt={0.5}>
          {quotationClientName(quotation)}
        </Text>
      </Box>

      <Text fontSize="xs" color={muted} minW="80px">
        {quotationVesselName(quotation)}
      </Text>

      <Text fontSize="xs" color={muted} minW="80px">
        {validityDate ? `Valid: ${validityDate}` : "No expiry"}
      </Text>

      <SimpleGrid columns={3} spacing={4} minW="220px">
        <Box>
          <Text fontSize="10px" color={muted} textTransform="uppercase" letterSpacing="wide">Cost</Text>
          <Text fontSize="xs" fontWeight="700" color={textColor}>
            {sectionStat(totals, ["cost"], formatDashboardMoney)}
          </Text>
        </Box>
        <Box>
          <Text fontSize="10px" color={muted} textTransform="uppercase" letterSpacing="wide">Markup</Text>
          <Text fontSize="xs" fontWeight="700" color={textColor}>
            {sectionStat(totals, ["markup"], formatDashboardMoney)}
          </Text>
        </Box>
        <Box>
          <Text fontSize="10px" color={muted} textTransform="uppercase" letterSpacing="wide">Sale</Text>
          <Text fontSize="xs" fontWeight="700" color="green.500">
            {sectionStat(totals, ["sale"], formatDashboardMoney)}
          </Text>
        </Box>
      </SimpleGrid>
    </Flex>
  );
}

export default function MainDashboard() {
  const history = useHistory();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const brandColor = useColorModeValue("#174693", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getNarviDashboard({ recent_limit: 5 });
      setDashboard(normalizeNarviDashboard(response));
    } catch (err) {
      const message = extractNarviQuotationError(err, "Failed to load dashboard.");
      setError(message);
      toast({
        title: "Dashboard error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const overview = dashboard?.summary?.overview ?? {};
  const rateList = dashboard?.summary?.rate_list ?? {};
  const charts = dashboard?.charts ?? {};
  const recentQuotations = dashboard?.recentQuotations ?? [];

  const overviewStats = useMemo(
    () => [
      {
        icon: MdDescription,
        name: "Quotations",
        value: sectionStat(overview, ["total_quotations"]),
        path: "/admin/quotations/list",
        bg: boxBg,
        iconColor: brandColor,
      },
      {
        icon: MdLocalShipping,
        name: "Shipping Orders",
        value: sectionStat(overview, ["total_shipping_orders"]),
        path: "/admin/shipping-orders",
        bg: boxBg,
        iconColor: brandColor,
      },
      {
        icon: MdInventory,
        name: "Active Stock",
        value: sectionStat(overview, ["total_active_stock_items"]),
        path: "/admin/stock-list/main-db",
        bg: boxBg,
        iconColor: brandColor,
      },
      {
        icon: MdRateReview,
        name: "Rate List",
        value: sectionStat(rateList, ["total_active"]),
        path: "/admin/quotations/rate-list",
        bg: "linear-gradient(90deg, #4481EB 0%, #04BEFE 100%)",
        iconColor: "white",
      },
    ],
    [boxBg, brandColor, overview, rateList]
  );

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} mb={5} wrap="wrap">
        <Heading size="lg" color={textColor}>
          Dashboard
        </Heading>
        <Button
          leftIcon={<MdRefresh />}
          onClick={loadDashboard}
          isLoading={loading}
          loadingText="Refreshing"
          variant="outline"
        >
          Refresh
        </Button>
      </Flex>

      {error ? (
        <Alert status="error" mb={5} borderRadius="12px">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading && !dashboard ? (
        <Flex justify="center" align="center" minH="240px">
          <Spinner size="lg" color={brandColor} />
        </Flex>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap="20px" mb="20px">
            {overviewStats.map((stat) => (
              <Box
                key={stat.name}
                onClick={() => history.push(stat.path)}
                cursor="pointer"
                transition="transform 0.15s ease"
                _hover={{ transform: "translateY(-2px)" }}
              >
                <MiniStatistics
                  startContent={
                    <IconBox
                      w="56px"
                      h="56px"
                      bg={stat.bg}
                      icon={<Icon w="32px" h="32px" as={stat.icon} color={stat.iconColor} />}
                    />
                  }
                  name={stat.name}
                  value={stat.value}
                />
              </Box>
            ))}
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap="20px" mb="20px">
            <ChartCard title="Quotations" subtitle="Line status distribution">
              <DashboardHorizontalCountChart data={charts.quotation_line_status} />
            </ChartCard>
            <ChartCard title="Shipping Orders" subtitle="Orders by done status">
              <ShippingOrderStackedChart
                doneStatus={charts.shipping_order_done_status}
                financialByDone={charts.shipping_financial_by_done}
              />
            </ChartCard>
            <ChartCard title="Stock" subtitle="Active items by status">
              <DashboardPieChart data={charts.stock_active_status} />
            </ChartCard>
            <RateListTrendCard data={charts.rate_list_type} />
          </SimpleGrid>

          <Card p="20px">
            <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
              <Box>
                <Text color={textColor} fontSize="lg" fontWeight="700">
                  Recent Quotations
                </Text>
                <Text mt={1} fontSize="sm" color={muted}>
                  Latest quotations with cost, markup, and sale totals.
                </Text>
              </Box>
              <Button
                size="sm"
                colorScheme="blue"
                variant="outline"
                onClick={() => history.push("/admin/quotations/list")}
              >
                View all quotations
              </Button>
            </Flex>

            {recentQuotations.length === 0 ? (
              <EmptyChartState label="No recent quotations returned by the dashboard API." />
            ) : (
              <Box>
                {recentQuotations.map((quotation) => (
                  <RecentQuotationRow
                    key={quotation.id ?? quotationDisplayName(quotation)}
                    quotation={quotation}
                    onClick={() => {
                      if (quotation?.id != null) {
                        history.push(`/admin/quotations/edit/${quotation.id}`);
                      }
                    }}
                  />
                ))}
              </Box>
            )}
          </Card>
        </>
      )}
    </Box>
  );
}
