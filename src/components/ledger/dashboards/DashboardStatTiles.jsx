import React from "react";
import { SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber, useColorModeValue } from "@chakra-ui/react";
import Card from "components/card/Card";
import { formatDashboardMoney } from "views/admin/default/dashboardUtils";

// Margin is a ratio (0.125 = 12.5%); null means the backend had no value (sale = 0)
const formatPercent = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
};

const formatTile = ({ type = "usd", value }) => {
  if (type === "percent") return formatPercent(value);
  if (value == null) return "—";
  if (type === "count") return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return `$${formatDashboardMoney(value)}`;
};

// tiles: [{ key, label, value, type: "usd" | "percent" | "count", hint?, negativeRed? }]
// Negative values show red (theme red.500 / red.300) unless negativeRed is false.
export default function DashboardStatTiles({ tiles = [], columns = { base: 1, sm: 2, xl: 4 } }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const negativeColor = useColorModeValue("red.500", "red.300");

  return (
    <SimpleGrid columns={columns} spacing={{ base: 3, md: 4 }} mb={5}>
      {tiles.map((tile) => {
        const isNegative = tile.negativeRed !== false && tile.value != null && Number(tile.value) < 0;
        return (
          <Card key={tile.key ?? tile.label} p={{ base: "14px", md: "16px 20px" }}>
            <Stat>
              <StatLabel lineHeight="short" color={muted} fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.04em">
                {tile.label}
              </StatLabel>
              <StatNumber
                color={isNegative ? negativeColor : textColor}
                fontSize="2xl"
                fontWeight="700"
                mt={1}
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatTile(tile)}
              </StatNumber>
              {tile.hint ? (
                <StatHelpText mb={0} mt={1} color={muted} fontSize="xs">
                  {tile.hint}
                </StatHelpText>
              ) : null}
            </Stat>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
