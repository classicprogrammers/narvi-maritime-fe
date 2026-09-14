import React, { useMemo } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import StockCellText from "components/stock-list/StockCellText";
import { formatStockStatusLabel, normalizeStockStatusKey } from "constants/stockStatus";
import { formatStockDestinationDisplay } from "utils/stockDestinationOptions";
import {
  getStockOriginDisplay,
  getStockViaHub1Display,
  getStockViaHub2Display,
} from "utils/stockLocationOptions";
import { formatStockValueDisplay } from "utils/stockValue";

const STATUS_COLOR_MAP = {
  pending: "orange",
  stock: "blue",
  available: "green",
  delivered: "green",
  released: "gray",
  shipped: "teal",
  in_transit: "purple",
  transit: "purple",
  on_shipping: "cyan",
  on_delivery: "pink",
  arrived: "green",
  irregular: "yellow",
  cancelled: "red",
  lost: "red",
  hold: "yellow",
};

const SUMMARY_COLUMNS = [
  { key: "stockItemId", label: "Stock ID" },
  { key: "stockStatus", label: "Status", isStatus: true },
  { key: "vessel", label: "Vessel" },
  { key: "dateOnStock", label: "Date on stock" },
  { key: "weight", label: "Weight" },
  { key: "origin", label: "Origin" },
  { key: "viaHub1", label: "Via hub 1" },
  { key: "destination", label: "Destination" },
];

const FULL_COLUMNS = [
  { key: "stockItemId", label: "Stock ID", isStockLink: true },
  { key: "client", label: "Client" },
  { key: "warehouseId", label: "Warehouse ID" },
  { key: "vessel", label: "Vessel" },
  { key: "supplier", label: "Supplier" },
  { key: "poNo", label: "PO#" },
  { key: "boxes", label: "Boxes" },
  { key: "weight", label: "Weight" },
  { key: "totalVolumeCbm", label: "Volume CBM" },
  { key: "origin", label: "Origin" },
  { key: "viaHub1", label: "Via hub 1" },
  { key: "viaHub2", label: "Via hub 2" },
  { key: "apDestination", label: "AP destination" },
  { key: "destination", label: "Destination" },
  { key: "stockStatus", label: "Status", isStatus: true },
  { key: "dateOnStock", label: "Date on stock" },
  { key: "currency", label: "Currency" },
  { key: "value", label: "Value" },
];

const toDisplay = (value) => {
  if (value == null || value === false || value === "") return "-";
  if (typeof value === "object") {
    const name = value.name || value.label || value.display_name;
    return name != null && name !== false && String(name).trim() !== ""
      ? String(name).trim()
      : "-";
  }
  const text = String(value).trim();
  return !text || text === "[object Object]" ? "-" : text;
};

export const mapShippingOrderStockRows = (stockList) =>
  (Array.isArray(stockList) ? stockList : []).map((item, idx) => {
    const stockStatusRaw = item?.stock_status;
    return {
      id: `${item?.id ?? item?.stock_item_id ?? "stock"}-${idx}`,
      rawItem: item,
      stockRecordId: item?.id,
      stockItemId: toDisplay(item?.stock_item_id ?? item?.stock_number ?? item?.stock_id),
      client: toDisplay(item?.client_id || item?.client?.name || item?.client),
      warehouseId: toDisplay(item?.warehouse_id || item?.stock_item_id),
      vessel: toDisplay(item?.vessel_id || item?.vessel?.name || item?.vessel),
      supplier: toDisplay(item?.supplier?.name || item?.supplier),
      poNo:
        Array.isArray(item?.po_number) && item.po_number.length
          ? item.po_number.map((x) => String(x)).join(", ")
          : toDisplay(item?.po_text),
      boxes: formatStockValueDisplay(item?.boxes ?? item?.box ?? item?.pieces ?? item?.pcs?.count),
      weight: formatStockValueDisplay(item?.weight_kg ?? item?.weight),
      totalVolumeCbm: formatStockValueDisplay(item?.total_volume_cbm),
      origin: toDisplay(item?.origin_text || getStockOriginDisplay(item)),
      viaHub1: toDisplay(getStockViaHub1Display(item)),
      viaHub2: toDisplay(getStockViaHub2Display(item)),
      apDestination: toDisplay(formatStockDestinationDisplay(item, "ap")),
      destination: toDisplay(
        item?.narvi_stock_destination?.name || formatStockDestinationDisplay(item, "destination")
      ),
      stockStatus: toDisplay(stockStatusRaw),
      stockStatusKey: normalizeStockStatusKey(stockStatusRaw),
      dateOnStock: toDisplay(item?.date_on_stock || item?.first_entry_date),
      currency: toDisplay(item?.currency),
      value: formatStockValueDisplay(item?.value),
    };
  });

/**
 * Read-only stock table for a shipping order.
 * `stock_list` uses the same field names as GET /api/stock/list.
 */
export default function ShippingOrderStockList({
  stockList = [],
  isLoading = false,
  emptyLabel = "No stock items linked to this shipping order.",
  variant = "full",
  title,
  stockItemCount,
  allowOpenInStockList = false,
}) {
  const headingColor = useColorModeValue("gray.700", "white");
  const muted = useColorModeValue("gray.500", "gray.400");
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const rowEvenBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const overlayBg = useColorModeValue("whiteAlpha.800", "blackAlpha.500");

  const columns = variant === "summary" ? SUMMARY_COLUMNS : FULL_COLUMNS;
  const rows = useMemo(() => mapShippingOrderStockRows(stockList), [stockList]);
  const countLabel =
    stockItemCount != null && Number.isFinite(Number(stockItemCount))
      ? Number(stockItemCount)
      : rows.length;

  const stockListHref = (item) => {
    const stockItemId = item?.stock_item_id || item?.stock_id;
    if (!stockItemId) return null;
    return `/admin/stock-list/stocks?stock_item_id=${encodeURIComponent(String(stockItemId).trim())}`;
  };

  return (
    <Box>
      {(title || countLabel > 0) && (
        <Flex align="baseline" gap={2} mb={3}>
          {title ? (
            <Text fontSize="md" fontWeight="700" color={headingColor}>
              {title}
            </Text>
          ) : null}
          <Text fontSize="sm" color={muted}>
            {countLabel} item{countLabel === 1 ? "" : "s"}
          </Text>
        </Flex>
      )}
      <Box position="relative" overflowX="auto" border="1px solid" borderColor={borderColor} borderRadius="md">
        {isLoading ? (
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            bg={overlayBg}
            zIndex={1}
            minH="120px"
          >
            <Spinner size="md" color="blue.500" />
          </Flex>
        ) : null}
        {rows.length === 0 && !isLoading ? (
          <Text fontSize="sm" color={muted} px={4} py={4}>
            {emptyLabel}
          </Text>
        ) : (
          <Table size="sm" variant="simple" minW={variant === "summary" ? "980px" : "1680px"}>
            <Thead bg={headerBg}>
              <Tr>
                {columns.map((col) => (
                  <Th key={col.key} whiteSpace="nowrap" fontSize="11px" letterSpacing="0.04em">
                    {col.label}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, index) => (
                <Tr key={row.id} bg={index % 2 === 0 ? undefined : rowEvenBg}>
                  {columns.map((col) => (
                    <Td key={col.key} py={2} px={3} whiteSpace="nowrap">
                      {col.isStatus ? (
                        <Badge
                          borderRadius="full"
                          px={2.5}
                          py={0.5}
                          fontSize="xs"
                          textTransform="none"
                          colorScheme={STATUS_COLOR_MAP[row.stockStatusKey] || "gray"}
                        >
                          {formatStockStatusLabel(row.stockStatus)}
                        </Badge>
                      ) : col.isStockLink && allowOpenInStockList && stockListHref(row.rawItem) ? (
                        <Button
                          as="a"
                          href={stockListHref(row.rawItem)}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="link"
                          size="sm"
                          colorScheme="blue"
                        >
                          {row[col.key]}
                        </Button>
                      ) : (
                        <StockCellText fontSize="sm" isTruncated maxW="240px">
                          {row[col.key]}
                        </StockCellText>
                      )}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
