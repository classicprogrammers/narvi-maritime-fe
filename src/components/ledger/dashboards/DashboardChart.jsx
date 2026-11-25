import React, { useMemo } from "react";
import { Flex, Text, useColorMode, useColorModeValue, useToken } from "@chakra-ui/react";
import ReactApexChart from "react-apexcharts";

function EmptyChartState({ label = "No chart data available.", height = 280 }) {
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  return (
    <Flex align="center" justify="center" h={`${height}px`}>
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

const SERIES_TOKENS = [
  "blue.500",
  "green.500",
  "orange.400",
  "purple.500",
  "teal.400",
  "red.400",
  "cyan.500",
  "pink.400",
  "yellow.500",
  "gray.500",
];

// Theme palette for chart option builders: { series: string[], label, grid, positive, negative }
export function useChartPalette() {
  const { colorMode } = useColorMode();
  const dark = colorMode === "dark";
  const series = useToken("colors", SERIES_TOKENS);
  const [label, grid, positive, negative] = useToken("colors", [
    dark ? "secondaryGray.400" : "secondaryGray.600",
    dark ? "whiteAlpha.200" : "secondaryGray.300",
    dark ? "green.300" : "green.500",
    dark ? "red.300" : "red.500",
  ]);
  return useMemo(
    () => ({ series, label, grid, positive, negative }),
    [series, label, grid, positive, negative]
  );
}

// type: ApexCharts type ("bar", "line", ...)
// options: object, or (palette) => object so option builders can take theme colours
// isEmpty (or no series) shows the empty state instead of the chart.
export default function DashboardChart({
  type = "bar",
  series = [],
  options,
  height = 300,
  isEmpty = false,
  emptyLabel = "No chart data available.",
  resetKey = "",
}) {
  const palette = useChartPalette();
  const resolvedOptions = useMemo(
    () => (typeof options === "function" ? options(palette) : options) || {},
    [options, palette]
  );
  const chartKey = `${type}-${resetKey}-${palette.label}`;

  if (isEmpty || !series.length) {
    return <EmptyChartState label={emptyLabel} height={height} />;
  }

  return (
    <ChartErrorBoundary
      resetKey={chartKey}
      fallback={<EmptyChartState label="Unable to render chart." height={height} />}
    >
      <ReactApexChart
        key={chartKey}
        type={type}
        series={series}
        options={resolvedOptions}
        height={height}
      />
    </ChartErrorBoundary>
  );
}
