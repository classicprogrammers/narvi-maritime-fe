import React, { useMemo } from "react";
import {
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
import {
  StockStatusBadge,
  getStockRowStatusStyle,
} from "components/stock-list/StockStatusBadge";
import { formatStockDestinationDisplay } from "utils/stockDestinationOptions";
import {
  getStockOriginDisplay,
  getStockViaHub1Display,
  getStockViaHub2Display,
} from "utils/stockLocationOptions";
import { formatStockValueDisplay } from "utils/stockValue";

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
  { key: "vessel", label: "Vessel" },
  { key: "supplier", label: "Supplier" },
  { key: "poNo", label: "PO#" },
  { key: "reqNo", label: "Req No" },
  { key: "boxes", label: "Boxes" },
  { key: "weight", label: "Weight" },
  { key: "totalVolumeCbm", label: "Total Volume CBM" },
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

const CLIENT_COLUMNS = [
  { key: "stockItemId", label: "Stock ID" },
  { key: "vessel", label: "Vessel" },
  { key: "supplier", label: "Supplier" },
  { key: "reqNo", label: "Req No" },
  { key: "poNo", label: "PO#" },
  { key: "stockStatus", label: "Status", isStatus: true },
  { key: "dateOnStock", label: "Date on stock" },
  { key: "boxes", label: "Boxes" },
  { key: "weight", label: "Weight" },
  { key: "totalVolumeCbm", label: "Total Volume CBM" },
  { key: "origin", label: "Origin" },
  { key: "viaHub1", label: "Via hub 1" },
  { key: "viaHub2", label: "Via hub 2" },
  { key: "apDestination", label: "AP destination" },
  { key: "destination", label: "Destination" },
  { key: "currency", label: "Currency" },
  { key: "value", label: "Value" },
  { key: "dgUnNumber", label: "DG/UN Number" },
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
      vessel: toDisplay(item?.vessel_id || item?.vessel?.name || item?.vessel),
      supplier: toDisplay(item?.supplier?.name || item?.supplier),
      poNo:
        Array.isArray(item?.po_number) && item.po_number.length
          ? item.po_number.map((x) => String(x)).join(", ")
          : toDisplay(item?.po_text),
      reqNo:
        Array.isArray(item?.req_no) && item.req_no.length
          ? item.req_no.map((x) => String(x)).join(", ")
          : toDisplay(item?.req_no).replace(/\n+/g, ", "),
      boxes: toDisplay(item?.boxes ?? item?.box ?? item?.pieces ?? item?.pcs?.count),
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
      stockStatusRaw,
      stockStatusKey: normalizeStockStatusKey(stockStatusRaw),
      dateOnStock: toDisplay(item?.date_on_stock || item?.first_entry_date),
      currency: toDisplay(item?.currency),
      value: formatStockValueDisplay(item?.value),
      dgUnNumber: toDisplay(item?.dg_un_number || item?.dg_un),
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

  const columns =
    variant === "summary" ? SUMMARY_COLUMNS : variant === "client" ? CLIENT_COLUMNS : FULL_COLUMNS;
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
            {isLoading ? "Loading…" : `${countLabel} item${countLabel === 1 ? "" : "s"}`}
          </Text>
        </Flex>
      )}
      <Box position="relative" overflowX="auto" border="1px solid" borderColor={borderColor} borderRadius="md">
        {isLoading ? (
          <Flex
            align="center"
            justify="center"
            direction="column"
            gap={3}
            minH="200px"
            py={8}
          >
            <Spinner size="md" color="blue.500" thickness="3px" />
            <Text fontSize="sm" color={muted}>
              Loading stock items...
            </Text>
          </Flex>
        ) : rows.length === 0 ? (
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
              {rows.map((row, index) => {
                const statusStyle = getStockRowStatusStyle(
                  row.stockStatusRaw || row.stockStatusKey || row.stockStatus
                );
                return (
                  <Tr key={row.id} bg={index % 2 === 0 ? undefined : rowEvenBg}>
                    {columns.map((col) => (
                      <Td key={col.key} py={2} px={3} whiteSpace="nowrap">
                        {col.isStatus ? (
                          <StockStatusBadge statusStyle={statusStyle}>
                            {formatStockStatusLabel(row.stockStatusRaw || row.stockStatus)}
                          </StockStatusBadge>
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
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
