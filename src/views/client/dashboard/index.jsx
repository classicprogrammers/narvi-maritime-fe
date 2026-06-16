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
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import { MdRefresh } from "react-icons/md";
import LineChart from "components/charts/LineChart";
import clientDashboardApi from "api/clientDashboard";
import { formatDashboardCount, formatDashboardLabel } from "views/admin/default/dashboardUtils";
import {
  getDashboardCardRoute,
  getJobStatusRouteFromPieSlice,
} from "./clientDashboardNavigation";

const PIE_COLORS = ["#174693", "#01B574", "#FFB547", "#39B8FF", "#E53E3E", "#805AD5"];

function ClientDashboard() {
  const history = useHistory();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const chartLabel = useColorModeValue("#707EAE", "#A3AED0");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientDashboardApi.getClientDashboard();
      setDashboard(clientDashboardApi.normalizeClientDashboard(response));
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to load dashboard.";
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

  const cards = useMemo(() => {
    if (dashboard?.cards?.length) return dashboard.cards;
    return [
      { key: "active_movements", title: "Active Movements", value: 0, hint: "—" },
      { key: "open_jobs", title: "Open Jobs", value: 0, hint: "—" },
      { key: "stock_alerts", title: "Stock Alerts", value: 0, hint: "—" },
      { key: "pending_approvals", title: "Pending Approvals", value: 0, hint: "—" },
    ];
  }, [dashboard]);

  const primaryChart = dashboard?.charts?.primary;
  const primaryChartKey = useMemo(
    () => `primary-${(primaryChart?.labels ?? []).join("-")}`,
    [primaryChart]
  );

  const primaryTrendData = useMemo(() => {
    const series = Array.isArray(primaryChart?.series) ? primaryChart.series : [];
    return series.map((item) => ({
      name: item?.name ?? "Series",
      data: Array.isArray(item?.data) ? item.data.map((value) => Number(value) || 0) : [],
    }));
  }, [primaryChart]);

  const primaryTrendOptions = useMemo(() => {
    const seriesNames = primaryTrendData.map((item) => item.name);
    return {
      chart: { toolbar: { show: false } },
      colors: ["#174693", "#39B8FF"],
      stroke: { curve: "smooth", width: 3 },
      dataLabels: { enabled: false },
      legend: { position: "top", horizontalAlign: "right" },
      xaxis: {
        categories: Array.isArray(primaryChart?.labels) ? primaryChart.labels : [],
        labels: { style: { colors: chartLabel, fontSize: "12px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: seriesNames.map((name, index) => ({
        seriesName: name,
        opposite: index > 0,
        labels: {
          style: { colors: chartLabel, fontSize: "12px" },
          formatter: (value) => {
            const parsed = Number(value);
            if (Number.isNaN(parsed)) return String(value);
            return parsed >= 1000 ? parsed.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(Math.round(parsed));
          },
        },
        title: {
          text: name,
          style: { color: chartLabel, fontSize: "11px", fontWeight: 500 },
        },
      })),
      grid: { borderColor: "#E6ECFA" },
      tooltip: { theme: "light" },
    };
  }, [primaryChart, primaryTrendData, chartLabel]);

  const jobsByStatusChart = dashboard?.charts?.jobsByStatus;
  const jobsByStatusKey = useMemo(
    () => `jobs-status-${(jobsByStatusChart?.labels ?? []).join("-")}`,
    [jobsByStatusChart]
  );

  const statusBreakdownData = useMemo(() => {
    if (Array.isArray(jobsByStatusChart?.series) && jobsByStatusChart.series.length) {
      return jobsByStatusChart.series.map((value) => Number(value) || 0);
    }
    if (Array.isArray(jobsByStatusChart?.items) && jobsByStatusChart.items.length) {
      return jobsByStatusChart.items.map((item) => Number(item?.count) || 0);
    }
    return [0];
  }, [jobsByStatusChart]);

  const statusBreakdownOptions = useMemo(
    () => ({
      labels: Array.isArray(jobsByStatusChart?.labels)
        ? jobsByStatusChart.labels
        : (jobsByStatusChart?.items ?? []).map((item) => item?.label ?? formatDashboardLabel(item?.key)),
      colors: PIE_COLORS,
      chart: {
        toolbar: { show: false },
        events: {
          dataPointSelection: (_event, _chartContext, config) => {
            const index = config?.dataPointIndex;
            if (index == null || index < 0) return;
            const item = jobsByStatusChart?.items?.[index];
            const label = item?.label ?? jobsByStatusChart?.labels?.[index];
            const route = getJobStatusRouteFromPieSlice({ key: item?.key, label });
            if (route) history.push(route);
          },
        },
      },
      legend: { position: "bottom" },
      dataLabels: { enabled: false },
      stroke: { colors: ["#fff"] },
      tooltip: { theme: "light" },
      states: {
        active: { filter: { type: "none" } },
        hover: { filter: { type: "lighten" } },
      },
    }),
    [history, jobsByStatusChart]
  );

  const handleCardClick = useCallback(
    (cardKey) => {
      const route = getDashboardCardRoute(cardKey);
      if (route) history.push(route);
    },
    [history]
  );

  return (
    <Box>
      <Flex align={{ base: "stretch", md: "center" }} justify="space-between" gap={3} wrap="wrap" mb={5}>
        <Box>
          <Heading fontSize="24px" lineHeight="32px" color={headingColor}>
            Dashboard
          </Heading>
        </Box>
        <Button
          leftIcon={<Icon as={MdRefresh} />}
          size="sm"
          variant="outline"
          onClick={loadDashboard}
          isLoading={loading}
        >
          Refresh
        </Button>
      </Flex>

      {error ? (
        <Alert status="error" borderRadius="12px" mb={4}>
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading && !dashboard ? (
        <Flex align="center" justify="center" minH="240px">
          <Spinner size="lg" color="brand.500" />
        </Flex>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
            {cards.map((card) => {
              const isClickable = Boolean(getDashboardCardRoute(card.key));
              return (
              <Flex
                key={card.key ?? card.title}
                bg={cardBg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="16px"
                p={4}
                boxShadow="0 10px 24px rgba(112, 144, 176, 0.08)"
                cursor={isClickable ? "pointer" : "default"}
                transition="all 0.2s ease"
                _hover={
                  isClickable
                    ? {
                        transform: "translateY(-2px)",
                        boxShadow: "0 20px 36px rgba(112, 144, 176, 0.16)",
                        borderColor: "brand.500",
                      }
                    : undefined
                }
                onClick={() => handleCardClick(card.key)}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={
                  isClickable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleCardClick(card.key);
                        }
                      }
                    : undefined
                }
              >
                <Stat>
                  <StatLabel color={muted} fontSize="xs">
                    {card.title}
                  </StatLabel>
                  <StatNumber color={headingColor} fontSize="2xl">
                    {formatDashboardCount(card.value)}
                  </StatNumber>
                  <Text mt={1} fontSize="xs" color={muted} fontWeight="600">
                    {card.hint ?? "—"}
                  </Text>
                </Stat>
              </Flex>
            );
            })}
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4} mt={5}>
            <Box
              gridColumn={{ base: "auto", xl: "span 2" }}
              bg={cardBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="16px"
              p={4}
              boxShadow="0 10px 24px rgba(112, 144, 176, 0.08)"
              h="360px"
            >
              <Text fontWeight="700" color={headingColor} mb={2}>
                {primaryChart?.title ?? "Stock Value & Items Trend"}
              </Text>
              <Text fontSize="sm" color={muted} mb={3}>
                {primaryChart?.subtitle ?? "Monthly value and stock item movement."}
              </Text>
              <Box h="260px">
                <LineChart
                  key={primaryChartKey}
                  chartData={primaryTrendData}
                  chartOptions={primaryTrendOptions}
                />
              </Box>
            </Box>

            <Box
              bg={cardBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="16px"
              p={4}
              boxShadow="0 10px 24px rgba(112, 144, 176, 0.08)"
              h="420px"
            >
              <Text fontWeight="700" color={headingColor} mb={2}>
                {jobsByStatusChart?.title ?? "Jobs by Status"}
              </Text>
              <Text fontSize="sm" color={muted} mb={3}>
                {jobsByStatusChart?.subtitle ?? "Distribution of current stock/job statuses."}
              </Text>
              <Box h="320px" cursor="pointer">
                <ReactApexChart
                  key={jobsByStatusKey}
                  type="pie"
                  series={statusBreakdownData}
                  options={statusBreakdownOptions}
                  width="100%"
                  height="100%"
                />
              </Box>
            </Box>
          </SimpleGrid>
        </>
      )}
    </Box>
  );
}

export default ClientDashboard;
