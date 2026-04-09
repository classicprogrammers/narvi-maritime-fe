import React from "react";
import {
  Box,
  Flex,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import LineChart from "components/charts/LineChart";
import BarChart from "components/charts/BarChart";
import PieChart from "components/charts/PieChart";

const cards = [
  { label: "Active Vessels", value: "12", delta: "+2 this week" },
  { label: "Open Jobs", value: "28", delta: "+6 today" },
  { label: "Stock Alerts", value: "4", delta: "-1 vs yesterday" },
  { label: "Pending Approvals", value: "7", delta: "+3 this week" },
];

function ClientDashboard() {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const chartLabel = useColorModeValue("#707EAE", "#A3AED0");

  const vesselTrendData = [
    { name: "Jobs", data: [16, 21, 18, 24, 20, 28] },
    { name: "Deliveries", data: [12, 15, 14, 17, 19, 22] },
  ];
  const vesselTrendOptions = {
    chart: { toolbar: { show: false } },
    colors: ["#174693", "#39B8FF"],
    stroke: { curve: "smooth", width: 3 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "right" },
    xaxis: {
      categories: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
      labels: { style: { colors: chartLabel, fontSize: "12px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: chartLabel, fontSize: "12px" } },
    },
    grid: { borderColor: "#E6ECFA" },
    tooltip: { theme: "light" },
  };

  const jobsByModeData = [{ name: "Jobs", data: [14, 10, 7, 5] }];
  const jobsByModeOptions = {
    chart: { toolbar: { show: false } },
    colors: ["#174693"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Ship", "Air", "Truck", "Courier"],
      labels: { style: { colors: chartLabel, fontSize: "12px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: chartLabel, fontSize: "12px" } },
    },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "40%" } },
    grid: { borderColor: "#E6ECFA" },
    tooltip: { theme: "light" },
  };

  const statusBreakdownData = [18, 7, 3];
  const statusBreakdownOptions = {
    labels: ["In Transit", "Delivered", "Pending"],
    colors: ["#174693", "#01B574", "#FFB547"],
    chart: { toolbar: { show: false } },
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
    stroke: { colors: ["#fff"] },
    tooltip: { theme: "light" },
  };

  return (
    <Box>
      <Heading fontSize="24px" lineHeight="32px" color={headingColor}>
        Dashboard
      </Heading>
      <Text mt={1} mb={5} fontSize="sm" color={muted}>
        Quick overview of your operational activity.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {cards.map((card) => (
          <Flex
            key={card.label}
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="16px"
            p={4}
            boxShadow="0 10px 24px rgba(112, 144, 176, 0.08)"
          >
            <Stat>
              <StatLabel color={muted} fontSize="xs">{card.label}</StatLabel>
              <StatNumber color={headingColor} fontSize="2xl">{card.value}</StatNumber>
              <Text mt={1} fontSize="xs" color={muted} fontWeight="600">
                {card.delta}
              </Text>
            </Stat>
          </Flex>
        ))}
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
            Jobs & Delivery Trend
          </Text>
          <Text fontSize="sm" color={muted} mb={3}>
            Monthly movement overview across active client operations.
          </Text>
          <Box h="260px">
            <LineChart chartData={vesselTrendData} chartOptions={vesselTrendOptions} />
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
            Jobs by Status
          </Text>
          <Text fontSize="sm" color={muted} mb={3}>
            Distribution of open pipeline statuses.
          </Text>
          <Box h="320px">
            <PieChart chartData={statusBreakdownData} chartOptions={statusBreakdownOptions} />
          </Box>
        </Box>
      </SimpleGrid>

      <Box
        mt={4}
        bg={cardBg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="16px"
        p={4}
        boxShadow="0 10px 24px rgba(112, 144, 176, 0.08)"
        h="340px"
      >
        <Text fontWeight="700" color={headingColor} mb={2}>
          Transport Mode Split
        </Text>
        <Text fontSize="sm" color={muted} mb={3}>
          Job count by transport mode for quick planning.
        </Text>
        <Box h="240px">
          <BarChart chartData={jobsByModeData} chartOptions={jobsByModeOptions} />
        </Box>
      </Box>
    </Box>
  );
}

export default ClientDashboard;
