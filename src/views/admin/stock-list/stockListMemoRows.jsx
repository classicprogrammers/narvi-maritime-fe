import React, { memo } from "react";
import {
    Badge,
    Checkbox,
    HStack,
    Icon,
    IconButton,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    VStack,
} from "@chakra-ui/react";
import { MdEdit, MdPrint, MdVisibility } from "react-icons/md";
import StockCellText from "../../../components/stock-list/StockCellText";
import StockListAttachmentsCell from "../../../components/stock-list/StockListAttachmentsCell";
import StockSoNumberLink from "../../../components/stock-list/StockSoNumberLink";
import {
    STATUS_CONFIG,
    STATUS_VARIATIONS,
    StockStatusBadge,
    getStockRowStatusStyle,
} from "../../../components/stock-list/StockStatusBadge";
import {
    formatStockDestinationDisplay,
} from "../../../utils/stockDestinationOptions";
import {
    getStockViaHub1Display,
    getStockViaHub2Display,
} from "../../../utils/stockLocationOptions";
import { formatStockValueDisplay } from "../../../utils/stockValue";
import { formatVolumeCbm } from "../../../utils/stockVolume";

export {
    STATUS_CONFIG,
    STATUS_VARIATIONS,
    StockStatusBadge,
    getStockRowStatusStyle,
};

const ROW_HOVER_BORDER = "#2B6CB0";

export const STOCK_CELL_TEXT_PROPS = {
    color: "inherit",
    fontSize: "sm",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
};

const STOCK_VIEW_CHECKBOX_SX = {
    "& .chakra-checkbox__control": {
        borderColor: "gray.600",
        _checked: {
            borderColor: "blue.500",
            bg: "blue.500",
        },
    },
};

export function getColoredStatusRowSx() {
    const rowTextColor = "#000000";
    return {
        color: rowTextColor,
        "& .chakra-text": { color: `${rowTextColor} !important` },
        _hover: {
            "& > td": {
                boxShadow: `inset 0 2px 0 0 ${ROW_HOVER_BORDER}, inset 0 -2px 0 0 ${ROW_HOVER_BORDER}`,
            },
            "& > td:first-of-type": {
                boxShadow: `inset 3px 0 0 0 ${ROW_HOVER_BORDER}, inset 0 2px 0 0 ${ROW_HOVER_BORDER}, inset 0 -2px 0 0 ${ROW_HOVER_BORDER}`,
            },
            "& > td:last-of-type": {
                boxShadow: `inset -3px 0 0 0 ${ROW_HOVER_BORDER}, inset 0 2px 0 0 ${ROW_HOVER_BORDER}, inset 0 -2px 0 0 ${ROW_HOVER_BORDER}`,
            },
        },
    };
}

const COLORED_STATUS_ROW_SX = getColoredStatusRowSx();

export function getDisplayName(val) {
    if (val == null || val === false || val === "") return "-";
    if (typeof val === "object" && val.name != null) return String(val.name);
    if (typeof val === "object" && val.id != null) return String(val.id);
    return String(val);
}

export function ensureSoPrefix(val) {
    if (val == null || val === "" || val === false) return "-";
    const str = String(val).replace(/^SO[- ]?/i, "").trim();
    return str ? `SO-${str}` : "-";
}

export function getSoNumberName(soId, shippingOrders = []) {
    if (!soId) return "-";
    if (typeof soId === "object" && soId?.so_id != null) return `SO-${soId.so_id}`;
    if (typeof soId === "object" && soId?.name != null) return ensureSoPrefix(soId.name);
    if (typeof soId === "object" && soId?.id != null) return ensureSoPrefix(soId.id);
    const so = shippingOrders.find((s) => String(s.id) === String(soId));
    return so
        ? so.so_id != null
            ? `SO-${so.so_id}`
            : ensureSoPrefix(so.so_number || so.name || so.id)
        : ensureSoPrefix(soId);
}

export function getSoNumberNameFromNumber(soNumber, shippingOrders = []) {
    if (!soNumber) return "-";
    if (typeof soNumber === "object" && soNumber?.so_id != null) return `SO-${soNumber.so_id}`;
    if (typeof soNumber === "object" && soNumber?.name != null) return ensureSoPrefix(soNumber.name);
    if (typeof soNumber === "object" && soNumber?.id != null) return ensureSoPrefix(soNumber.id);
    const so = shippingOrders.find(
        (s) =>
            (s.so_id != null && String(s.so_id) === String(soNumber)) ||
            String(s.so_number || s.name || "") === String(soNumber) ||
            String(s.id) === String(soNumber)
    );
    return so
        ? so.so_id != null
            ? `SO-${so.so_id}`
            : ensureSoPrefix(so.so_number || so.name || so.id)
        : ensureSoPrefix(soNumber);
}

export function formatDate(dateString) {
    if (!dateString) return "-";
    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? dateString : parsed.toLocaleDateString();
}

export function renderText(value) {
    if (value === null || value === undefined || value === "" || value === false) {
        return "-";
    }
    return value;
}

function splitLines(val) {
    return (val || "")
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean);
}

function renderMultiLineLabels(value) {
    const lines = splitLines(value);
    if (!lines.length) {
        return <StockCellText {...STOCK_CELL_TEXT_PROPS}>-</StockCellText>;
    }
    return (
        <VStack align="start" spacing={1}>
            {lines.map((line, idx) => (
                <Badge key={idx} colorScheme="blue" variant="subtle" title={line}>
                    {line}
                </Badge>
            ))}
        </VStack>
    );
}

function resolveSoLabel(item, shippingOrders) {
    if (item.so_id) return getSoNumberName(item.so_id, shippingOrders);
    if (item.stock_so_number) return getSoNumberNameFromNumber(item.stock_so_number, shippingOrders);
    return ensureSoPrefix(item.so_number);
}

function getClientViewFieldValues(item, shippingOrders) {
    const currency = getDisplayName(item.currency_id || item.currency) || "-";
    const value = formatStockValueDisplay(item.value);
    const soNumber = resolveSoLabel(item, shippingOrders) || "-";

    return {
        client: getDisplayName(item.client_id || item.client) || "-",
        vessel: getDisplayName(item.vessel_id || item.vessel) || "-",
        supplier: getDisplayName(item.supplier_id || item.supplier) || "-",
        po: item.po_text || "-",
        req_no: item.req_no || "-",
        stock_status: getStockRowStatusStyle(item.stock_status).label || "-",
        boxes: item.item ?? item.items ?? item.item_id ?? item.stock_items_quantity ?? "-",
        kg: item.weight_kg ?? item.weight_kgs ?? "-",
        lwh_text: item.lwh_text || "-",
        narvi_stock_via_hub1: getStockViaHub1Display(item),
        narvi_stock_via_hub2: getStockViaHub2Display(item),
        destination: formatStockDestinationDisplay(item, "destination"),
        dg_un: item.dg_un || "-",
        so_number: soNumber,
        warehouse_id:
            getDisplayName(item.warehouse_new) ||
            item.warehouse_new ||
            item.stock_warehouse ||
            item.warehouse ||
            "-",
        shipping_docs: item.shipping_doc || "-",
        export_doc_1: item.export_doc || "-",
        export_doc_2: item.export_doc_2 || "-",
        cur: currency,
        value,
        date_on_stock:
            formatDate(item.date_on_stock) ||
            item.date_on_stock ||
            item.stock_date ||
            item.create_date ||
            "-",
        origin: item.origin_text || "-",
        narvi_stock_ap_destination: formatStockDestinationDisplay(item, "ap"),
    };
}

function renderClientViewTableCell(item, column, statusStyle, shippingOrders) {
    if (column.type === "status") {
        return (
            <StockStatusBadge statusStyle={statusStyle}>
                {getStockRowStatusStyle(item.stock_status).label}
            </StockStatusBadge>
        );
    }
    if (column.type === "po") {
        return renderMultiLineLabels(item.po_text);
    }
    if (column.type === "req_no") {
        return renderMultiLineLabels(item.req_no);
    }
    if (column.type === "multiline") {
        const fieldValue = getClientViewFieldValues(item, shippingOrders)[column.key];
        const display = renderText(fieldValue);
        return (
            <Text
                color="inherit"
                fontSize="sm"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
                title={display && display !== "-" ? String(display) : undefined}
            >
                {display}
            </Text>
        );
    }
    return (
        <StockCellText {...STOCK_CELL_TEXT_PROPS}>
            {renderText(getClientViewFieldValues(item, shippingOrders)[column.key])}
        </StockCellText>
    );
}

function StockViewTableRowInner({
    item,
    isSelected,
    showCancelReason,
    cellProps,
    sticky,
    tableBorderColor,
    tableRowBg,
    tableTextColor,
    shippingOrders,
    onSelect,
    onEdit,
    onOpenDimensions,
    onPreviewAll,
    onDownloadFile,
    onOpenPreviousReports,
}) {
    const statusStyle = getStockRowStatusStyle(item.stock_status, tableRowBg, tableTextColor);
    const rowBg = statusStyle.bgColor || statusStyle.lightBg || tableRowBg;

    return (
        <Tr
            bg={rowBg}
            sx={{
                ...COLORED_STATUS_ROW_SX,
                "& td": { bg: "inherit" },
            }}
        >
            <Td
                borderRight="1px"
                borderColor={tableBorderColor}
                py="12px"
                px="8px"
                {...sticky[0]}
            >
                <Checkbox
                    isChecked={isSelected}
                    onChange={(e) => onSelect(item.id, e.target.checked)}
                    size="sm"
                    borderColor="gray.600"
                    sx={STOCK_VIEW_CHECKBOX_SX}
                />
            </Td>
            <Td {...cellProps} {...sticky[1]}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {getDisplayName(item.vessel_id || item.vessel)}
                </StockCellText>
            </Td>
            <Td {...cellProps} {...sticky[2]}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {getDisplayName(item.supplier_id || item.supplier)}
                </StockCellText>
            </Td>
            <Td {...cellProps}>{renderMultiLineLabels(item.req_no)}</Td>
            <Td {...cellProps}>{renderMultiLineLabels(item.po_text)}</Td>
            <Td {...cellProps}>
                <StockSoNumberLink
                    item={item}
                    label={resolveSoLabel(item, shippingOrders)}
                    textProps={STOCK_CELL_TEXT_PROPS}
                />
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(item.si_number) || "-"}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(item.si_combined) || "-"}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(item.di_no) || "-"}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockStatusBadge statusStyle={statusStyle}>
                    {statusStyle.label || "-"}
                </StockStatusBadge>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {item.warehouse_new || item.warehouse_id || item.stock_warehouse || "-"}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{item.origin_text || "-"}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(getStockViaHub1Display(item))}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(getStockViaHub2Display(item))}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(formatStockDestinationDisplay(item, "ap"))}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(formatStockDestinationDisplay(item, "destination"))}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{renderText(item.shipping_doc)}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{renderText(item.export_doc)}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{renderText(item.export_doc_2)}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {formatDate(item.exp_ready_in_stock)}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{formatDate(item.date_on_stock)}</StockCellText>
            </Td>
            <Td {...cellProps} textAlign="center">
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{renderText(item.days_on_stock)}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{formatDate(item.shipped_date)}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{formatDate(item.delivered_date)}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{renderText(item.dg_un)}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{renderText(item.remarks)}</StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(item.item || item.items || item.item_id || item.stock_items_quantity)}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(item.weight_kg ?? item.weight_kgs)}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>{renderText(item.lwh_text)}</StockCellText>
            </Td>
            <Td {...cellProps} cursor="pointer" onClick={() => onOpenDimensions(item)}>
                <HStack spacing={2} align="center" justify="flex-start">
                    <StockCellText
                        {...STOCK_CELL_TEXT_PROPS}
                        color="blue.500"
                        _hover={{ textDecoration: "underline" }}
                    >
                        {formatVolumeCbm(item.total_volume_cbm)}
                    </StockCellText>
                    <Tooltip label="View dimensions" hasArrow>
                        <Icon as={MdVisibility} color="blue.500" boxSize={4} cursor="pointer" />
                    </Tooltip>
                </HStack>
            </Td>
            <Td {...cellProps} cursor="pointer" onClick={() => onOpenDimensions(item)}>
                <HStack spacing={2} align="center" justify="flex-start">
                    <StockCellText
                        {...STOCK_CELL_TEXT_PROPS}
                        color="blue.500"
                        _hover={{ textDecoration: "underline" }}
                    >
                        {renderText(item.total_cw_air_freight)}
                    </StockCellText>
                    <Tooltip label="View dimensions" hasArrow>
                        <Icon as={MdVisibility} color="blue.500" boxSize={4} cursor="pointer" />
                    </Tooltip>
                </HStack>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {getDisplayName(item.currency_id || item.currency)}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {formatStockValueDisplay(item.value)}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {getDisplayName(item.client_id || item.client)}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(item.internal_remark || "")}
                </StockCellText>
            </Td>
            <Td {...cellProps}>
                <StockListAttachmentsCell
                    attachments={item.attachments}
                    stockItemId={item.id || item.stock_item_id}
                    onPreviewAll={onPreviewAll}
                    onDownloadFile={onDownloadFile}
                    onOpenPreviousReports={onOpenPreviousReports}
                />
            </Td>
            <Td {...cellProps}>
                <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                    {renderText(item.stock_item_id)}
                </StockCellText>
            </Td>
            {showCancelReason && (
                <Td {...cellProps}>
                    <StockCellText {...STOCK_CELL_TEXT_PROPS}>
                        {item.cancel_text && item.cancel_text !== false
                            ? String(item.cancel_text)
                            : "-"}
                    </StockCellText>
                </Td>
            )}
            <Td {...cellProps}>
                <IconButton
                    icon={<Icon as={MdEdit} />}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={() => onEdit(item)}
                    aria-label="Edit"
                />
            </Td>
        </Tr>
    );
}

function ClientViewTableRowInner({
    item,
    isSelected,
    columns,
    cellProps,
    tableRowBg,
    tableTextColor,
    shippingOrders,
    onToggle,
    onPrint,
}) {
    const statusStyle = getStockRowStatusStyle(item.stock_status, tableRowBg, tableTextColor);
    const rowBg = statusStyle.bgColor || statusStyle.lightBg || tableRowBg;
    const itemId = item.id || item.stock_item_id;

    return (
        <Tr bg={rowBg} sx={COLORED_STATUS_ROW_SX}>
            <Td {...cellProps} bg={rowBg} w="40px">
                <Checkbox
                    isChecked={isSelected}
                    onChange={() => onToggle(itemId)}
                    colorScheme="blue"
                />
            </Td>
            {columns.map((column) => {
                const extra =
                    column.key === "lwh_text"
                        ? {
                              minW: "200px",
                              w: "200px",
                              maxW: "300px",
                              whiteSpace: "normal",
                              overflow: "visible",
                              textOverflow: "unset",
                          }
                        : {};
                return (
                    <Td key={column.key} {...cellProps} bg={rowBg} {...extra}>
                        {renderClientViewTableCell(item, column, statusStyle, shippingOrders)}
                    </Td>
                );
            })}
            <Td {...cellProps} bg={rowBg}>
                <IconButton
                    aria-label="Print row"
                    icon={<MdPrint />}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={() => onPrint(item)}
                />
            </Td>
        </Tr>
    );
}

export const StockViewTableRow = memo(StockViewTableRowInner, (prev, next) => (
    prev.item === next.item &&
    prev.isSelected === next.isSelected &&
    prev.showCancelReason === next.showCancelReason &&
    prev.cellProps === next.cellProps &&
    prev.sticky === next.sticky &&
    prev.tableBorderColor === next.tableBorderColor &&
    prev.tableRowBg === next.tableRowBg &&
    prev.tableTextColor === next.tableTextColor &&
    prev.shippingOrders === next.shippingOrders &&
    prev.onSelect === next.onSelect &&
    prev.onEdit === next.onEdit &&
    prev.onOpenDimensions === next.onOpenDimensions &&
    prev.onPreviewAll === next.onPreviewAll &&
    prev.onDownloadFile === next.onDownloadFile &&
    prev.onOpenPreviousReports === next.onOpenPreviousReports
));

export const ClientViewTableRow = memo(ClientViewTableRowInner, (prev, next) => (
    prev.item === next.item &&
    prev.isSelected === next.isSelected &&
    prev.columns === next.columns &&
    prev.cellProps === next.cellProps &&
    prev.tableRowBg === next.tableRowBg &&
    prev.tableTextColor === next.tableTextColor &&
    prev.shippingOrders === next.shippingOrders &&
    prev.onToggle === next.onToggle &&
    prev.onPrint === next.onPrint
));

const STOCK_VIEW_HEADER_COLUMNS = [
    { label: "VESSEL", stickyIndex: 1 },
    { label: "SUPPLIER", stickyIndex: 2 },
    { label: "REQ NO" },
    { label: "PO NUMBER" },
    { label: "SO NUMBER" },
    { label: "SI NUMBER" },
    { label: "SI COMBINED" },
    { label: "DI NUMBER" },
    { label: "STOCK STATUS" },
    { label: "WAREHOUSE ID" },
    { label: "ORIGIN" },
    { label: "VIA HUB 1" },
    { label: "VIA HUB 2" },
    { label: "AP DESTINATION" },
    { label: "DESTINATION" },
    { label: "SHIPPING DOCS" },
    { label: "EXPORT DOC 1" },
    { label: "EXPORT DOC 2" },
    { label: "EXP READY FROM SUPPLIER" },
    { label: "DATE ON STOCK" },
    { label: "DAYS ON STOCK", textAlign: "center" },
    { label: "SHIPPED DATE" },
    { label: "DELIVERED DATE" },
    { label: "DG/UN NUMBER" },
    { label: "REMARKS" },
    { label: "BOXES" },
    { label: "WEIGHT KGS" },
    { label: "LWH TEXT" },
    { label: "TOTAL VOLUME CBM" },
    { label: "TOTAL CW AIR FREIGHT" },
    { label: "CURRENCY" },
    { label: "VALUE" },
    { label: "CLIENT" },
    { label: "INTERNAL REMARKS" },
    { label: "FILES" },
    { label: "STOCKITEMID" },
];

function StockViewDataTableInner({
    displayedItems,
    selectedRows,
    showCancelReason,
    cellProps,
    headerProps,
    stickyBody,
    stickyHeader,
    tableHeaderBg,
    tableBorderColor,
    tableRowBg,
    tableTextColor,
    shippingOrders,
    onSelectAll,
    onSelect,
    onEdit,
    onOpenDimensions,
    onPreviewAll,
    onDownloadFile,
    onOpenPreviousReports,
}) {
    const allItemsSelected =
        displayedItems.length > 0 && displayedItems.every((item) => selectedRows.has(item.id));
    const someItemsSelected = displayedItems.some((item) => selectedRows.has(item.id));

    return (
        <Table size="sm" minW="6000px">
            <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={3}>
                <Tr>
                    <Th
                        borderRight="1px"
                        borderColor={tableBorderColor}
                        py="12px"
                        px="8px"
                        fontSize="12px"
                        fontWeight="600"
                        textTransform="uppercase"
                        color="#000000"
                        {...stickyHeader[0]}
                    >
                        <Checkbox
                            isChecked={allItemsSelected}
                            isIndeterminate={someItemsSelected && !allItemsSelected}
                            onChange={(e) => onSelectAll(e.target.checked)}
                            size="sm"
                            borderColor="gray.600"
                            colorScheme="blue"
                            sx={STOCK_VIEW_CHECKBOX_SX}
                        />
                    </Th>
                    {STOCK_VIEW_HEADER_COLUMNS.map((column) => (
                        <Th
                            key={column.label}
                            {...headerProps}
                            {...(column.stickyIndex != null ? stickyHeader[column.stickyIndex] : {})}
                            {...(column.textAlign ? { textAlign: column.textAlign } : {})}
                        >
                            {column.label}
                        </Th>
                    ))}
                    {showCancelReason && (
                        <Th {...headerProps}>CANCEL REASON</Th>
                    )}
                    <Th {...headerProps}>ACTIONS</Th>
                </Tr>
            </Thead>
            <Tbody>
                {displayedItems.map((item) => (
                    <StockViewTableRow
                        key={item.id}
                        item={item}
                        isSelected={selectedRows.has(item.id)}
                        showCancelReason={showCancelReason}
                        cellProps={cellProps}
                        sticky={stickyBody}
                        tableBorderColor={tableBorderColor}
                        tableRowBg={tableRowBg}
                        tableTextColor={tableTextColor}
                        shippingOrders={shippingOrders}
                        onSelect={onSelect}
                        onEdit={onEdit}
                        onOpenDimensions={onOpenDimensions}
                        onPreviewAll={onPreviewAll}
                        onDownloadFile={onDownloadFile}
                        onOpenPreviousReports={onOpenPreviousReports}
                    />
                ))}
            </Tbody>
        </Table>
    );
}

export const StockViewDataTable = memo(StockViewDataTableInner, (prev, next) => (
    prev.displayedItems === next.displayedItems &&
    prev.selectedRows === next.selectedRows &&
    prev.showCancelReason === next.showCancelReason &&
    prev.cellProps === next.cellProps &&
    prev.headerProps === next.headerProps &&
    prev.stickyBody === next.stickyBody &&
    prev.stickyHeader === next.stickyHeader &&
    prev.tableHeaderBg === next.tableHeaderBg &&
    prev.tableBorderColor === next.tableBorderColor &&
    prev.tableRowBg === next.tableRowBg &&
    prev.tableTextColor === next.tableTextColor &&
    prev.shippingOrders === next.shippingOrders &&
    prev.onSelectAll === next.onSelectAll &&
    prev.onSelect === next.onSelect &&
    prev.onEdit === next.onEdit &&
    prev.onOpenDimensions === next.onOpenDimensions &&
    prev.onPreviewAll === next.onPreviewAll &&
    prev.onDownloadFile === next.onDownloadFile &&
    prev.onOpenPreviousReports === next.onOpenPreviousReports
));

function ClientViewDataTableInner({
    displayedItems,
    selectedRows,
    columns,
    cellProps,
    headerProps,
    tableHeaderBg,
    tableRowBg,
    tableTextColor,
    shippingOrders,
    onSelectAll,
    onToggle,
    onPrint,
}) {
    const allItemsSelected =
        displayedItems.length > 0 &&
        displayedItems.every((item) => selectedRows.has(item.id || item.stock_item_id));
    const someItemsSelected = displayedItems.some((item) =>
        selectedRows.has(item.id || item.stock_item_id)
    );

    return (
        <Table variant="unstyled" size="sm" layout="auto">
            <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={1}>
                <Tr>
                    <Th {...headerProps} w="40px">
                        <Checkbox
                            isChecked={allItemsSelected}
                            isIndeterminate={someItemsSelected && !allItemsSelected}
                            onChange={onSelectAll}
                            colorScheme="blue"
                        />
                    </Th>
                    {columns.map((column) => (
                        <Th
                            key={column.key}
                            {...headerProps}
                            {...(column.key === "lwh_text"
                                ? {
                                    minW: "200px",
                                    w: "200px",
                                    maxW: "300px",
                                    whiteSpace: "normal",
                                    overflow: "visible",
                                    textOverflow: "unset",
                                }
                                : {})}
                        >
                            {column.label}
                        </Th>
                    ))}
                    <Th {...headerProps}>ACTION</Th>
                </Tr>
            </Thead>
            <Tbody>
                {displayedItems.map((item) => {
                    const itemId = item.id || item.stock_item_id;
                    return (
                        <ClientViewTableRow
                            key={itemId}
                            item={item}
                            isSelected={selectedRows.has(itemId)}
                            columns={columns}
                            cellProps={cellProps}
                            tableRowBg={tableRowBg}
                            tableTextColor={tableTextColor}
                            shippingOrders={shippingOrders}
                            onToggle={onToggle}
                            onPrint={onPrint}
                        />
                    );
                })}
            </Tbody>
        </Table>
    );
}

export const ClientViewDataTable = memo(ClientViewDataTableInner, (prev, next) => (
    prev.displayedItems === next.displayedItems &&
    prev.selectedRows === next.selectedRows &&
    prev.columns === next.columns &&
    prev.cellProps === next.cellProps &&
    prev.headerProps === next.headerProps &&
    prev.tableHeaderBg === next.tableHeaderBg &&
    prev.tableRowBg === next.tableRowBg &&
    prev.tableTextColor === next.tableTextColor &&
    prev.shippingOrders === next.shippingOrders &&
    prev.onSelectAll === next.onSelectAll &&
    prev.onToggle === next.onToggle &&
    prev.onPrint === next.onPrint
));
