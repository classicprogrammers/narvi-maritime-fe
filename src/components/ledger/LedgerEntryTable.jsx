import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  IconButton,
  Input,
  Link,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdAdd, MdCheck, MdDelete } from "react-icons/md";
import { Link as RouterLink } from "react-router-dom";

const STATUS_BADGES = {
  draft: { label: "Draft", colorScheme: "gray" },
  saving: { label: "Saving", colorScheme: "blue" },
  saved: { label: "Saved", colorScheme: "green" },
  error: { label: "Error", colorScheme: "red" },
  missing: { label: "Missing required", colorScheme: "orange" },
  duplicate: { label: "Duplicate invoice", colorScheme: "red" },
};

// Minimum column widths (px) so inputs and pickers are never truncated, whatever the column config says
const MIN_WIDTH_BY_TYPE = {
  so: 240,
  agent: 240,
  currency: 150,
  number: 140,
  roe: 190,
  due: 220,
  date: 170,
  select: 160,
  gst: 160,
  textarea: 220,
  bool: 100,
  text: 180,
};
const DEFAULT_MIN_WIDTH = 160;

const NUM_W = 48;
const STATUS_W = 140;
const ACTIONS_W = 90;
const ROW_H = "52px";

const columnWidth = (column) => {
  const configured = parseInt(column.minW, 10) || 0;
  const byType = MIN_WIDTH_BY_TYPE[column.type] || (column.derived ? 160 : DEFAULT_MIN_WIDTH);
  return Math.max(configured, byType);
};

// Table-view draft rows driven by a column config (COST_/INVOICE_TABLE_ENTRY_COLUMNS).
// rows: [{ key, values, status: "draft"|"saving"|"saved"|"error"|"missing"|"duplicate", message?, savedId? }]
// renderCell({ column, row, value, onChange, isDisabled }) may return a node for any column (pickers,
// ROE / due auto cells); return undefined/null to use the default input for the column type.
// selectOptions: { [columnKey]: [{ value, label }] } for type "select" / "gst".
// Header, #, status and SO columns are sticky; the table scrolls horizontally and vertically.
const LedgerEntryTable = ({
  columns,
  rows,
  onChangeCell,
  onAddRow,
  onRemoveRow,
  onSaveAll,
  onClear,
  renderCell,
  selectOptions = {},
  getOpenHref,
  isSaving = false,
  isLoading = false,
}) => {
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const headerBg = useColorModeValue("gray.100", "gray.700");
  const headerColor = useColorModeValue("gray.600", "gray.200");
  const inputBg = useColorModeValue("white", "gray.700");
  const rowBg = useColorModeValue("white", "gray.800");
  const stripeBg = useColorModeValue("gray.50", "gray.900");
  const hoverBg = useColorModeValue("blue.50", "gray.700");
  const toolbarBg = useColorModeValue("gray.50", "gray.800");
  const muted = useColorModeValue("gray.500", "gray.400");
  const savedColor = useColorModeValue("gray.600", "gray.300");
  const stickyShadow = useColorModeValue("2px 0 4px -2px rgba(0,0,0,0.15)", "2px 0 4px -2px rgba(0,0,0,0.5)");

  const pendingRows = rows.filter((r) => r.status !== "saved");
  const colSpan = columns.length + 3;
  const soIndex = columns.findIndex((c) => c.type === "so");
  const statusLeft = NUM_W;
  const soLeft = NUM_W + STATUS_W;

  const stickyProps = (left, isLastSticky) => ({
    position: "sticky",
    left: `${left}px`,
    boxShadow: isLastSticky ? stickyShadow : undefined,
  });

  const renderDefaultCell = (column, row, value, isDisabled) => {
    const onChange = (v) => onChangeCell(row.key, column.key, v);
    const common = { size: "sm", bg: inputBg, borderColor, isDisabled, "aria-label": column.label };
    if (column.derived) {
      return (
        <Text fontSize="sm" color={muted} noOfLines={1} title={String(value || "")}>
          {value || "-"}
        </Text>
      );
    }
    switch (column.type) {
      case "number":
        return <Input {...common} type="number" step="any" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      case "date":
        return <Input {...common} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      case "select":
      case "gst":
        return (
          <Select {...common} placeholder="Select..." value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            {(selectOptions[column.key] || []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        );
      case "bool":
        return (
          <Checkbox
            isChecked={Boolean(value)}
            isDisabled={isDisabled}
            aria-label={column.label}
            onChange={(e) => onChange(e.target.checked)}
          />
        );
      case "textarea":
        return (
          <Textarea
            {...common}
            rows={1}
            minH="32px"
            h="32px"
            py="1"
            resize="vertical"
            value={value ?? ""}
            _focus={{ minH: "5rem" }}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return <Input {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  const thProps = {
    bg: headerBg,
    color: headerColor,
    position: "sticky",
    top: 0,
    zIndex: 3,
    whiteSpace: "nowrap",
    fontSize: "xs",
    borderColor,
  };

  return (
    <Box>
      <Flex
        wrap="wrap"
        gap="2"
        mb="3"
        align="center"
        p="3"
        bg={toolbarBg}
        border="1px"
        borderColor={borderColor}
        borderRadius="md"
      >
        <Button size="sm" colorScheme="blue" leftIcon={<MdAdd />} onClick={onAddRow} isDisabled={isSaving}>
          Add Row
        </Button>
        <Button
          size="sm"
          colorScheme="green"
          leftIcon={<MdCheck />}
          onClick={onSaveAll}
          isLoading={isSaving}
          loadingText="Saving..."
          isDisabled={pendingRows.length === 0}
          title={pendingRows.length === 0 ? "Add at least one filled row" : undefined}
        >
          Save all ({pendingRows.length})
        </Button>
        {onClear ? (
          <Button size="sm" variant="outline" onClick={onClear} isDisabled={isSaving}>
            Clear
          </Button>
        ) : null}
        <Text ml="auto" fontSize="sm" color={muted}>
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </Text>
      </Flex>

      <Box
        border="1px"
        borderColor={borderColor}
        borderRadius="md"
        overflow="auto"
        maxH="calc(100vh - 280px)"
        minH="200px"
        bg={rowBg}
        aria-busy={isSaving}
      >
        <Table size="sm" variant="simple" w="max-content" minW="100%" sx={{ borderCollapse: "separate", borderSpacing: 0, "& input, & select, & textarea": { width: "100%" } }}>
          <Thead>
            <Tr>
              <Th {...thProps} left={0} zIndex={5} w={`${NUM_W}px`} minW={`${NUM_W}px`}>#</Th>
              <Th {...thProps} left={`${statusLeft}px`} zIndex={5} w={`${STATUS_W}px`} minW={`${STATUS_W}px`}>Status</Th>
              {columns.map((c, i) => {
                const isSo = i === soIndex;
                return (
                  <Th
                    key={c.key}
                    {...thProps}
                    {...(isSo ? { left: `${soLeft}px`, zIndex: 5, boxShadow: stickyShadow } : {})}
                    w={`${columnWidth(c)}px`} minW={`${columnWidth(c)}px`}
                  >
                    {c.label}
                    {c.required ? <Text as="span" color="red.500"> *</Text> : null}
                  </Th>
                );
              })}
              <Th {...thProps} right={0} zIndex={5} textAlign="center" minW={`${ACTIONS_W}px`}>
                Actions
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <Tr>
                <Td colSpan={colSpan} textAlign="center" py="10"><Spinner size="sm" /></Td>
              </Tr>
            ) : rows.length === 0 ? (
              <Tr>
                <Td colSpan={colSpan} textAlign="center" py="10">
                  <Text color={muted} mb="3">No rows. Add a row to start.</Text>
                  <Button size="sm" colorScheme="blue" leftIcon={<MdAdd />} onClick={onAddRow}>Add Row</Button>
                </Td>
              </Tr>
            ) : (
              rows.flatMap((row, index) => {
                const isSaved = row.status === "saved";
                const isRowSaving = row.status === "saving";
                const isDisabled = isSaved || isRowSaving || isSaving;
                const badge = STATUS_BADGES[row.status] || STATUS_BADGES.draft;
                const hasError = ["error", "missing", "duplicate"].includes(row.status) && row.message;
                const bg = index % 2 === 1 ? stripeBg : rowBg;
                const cellProps = {
                  bg,
                  h: ROW_H,
                  py: "2",
                  px: "3",
                  verticalAlign: "middle",
                  borderColor,
                  _groupHover: { bg: hoverBg },
                };
                const cells = [
                  <Tr key={row.key} role="group" color={isSaved ? savedColor : undefined}>
                    <Td {...cellProps} {...stickyProps(0)} zIndex={2} w={`${NUM_W}px`} minW={`${NUM_W}px`} fontWeight="600" color={muted}>
                      {index + 1}
                    </Td>
                    <Td {...cellProps} {...stickyProps(statusLeft)} zIndex={2} w={`${STATUS_W}px`} minW={`${STATUS_W}px`}>
                      <Tooltip label={row.message || ""} isDisabled={!row.message} hasArrow>
                        <Badge
                          colorScheme={badge.colorScheme}
                          variant={isSaved || row.status === "draft" ? "subtle" : "solid"}
                          fontSize="2xs"
                          borderRadius="md"
                          px="2"
                          py="0.5"
                          whiteSpace="nowrap"
                        >
                          {isRowSaving ? <Spinner boxSize="10px" mr="1" /> : null}
                          {badge.label}
                        </Badge>
                      </Tooltip>
                    </Td>
                    {columns.map((column, i) => {
                      const value = row.values?.[column.key];
                      const onChange = (v) => onChangeCell(row.key, column.key, v);
                      const custom = renderCell?.({ column, row, value, onChange, isDisabled });
                      const isSo = i === soIndex;
                      return (
                        <Td
                          key={column.key}
                          {...cellProps}
                          {...(isSo ? { ...stickyProps(soLeft, true), zIndex: 2 } : {})}
                          minW={`${columnWidth(column)}px`}
                          w={`${columnWidth(column)}px`}
                        >
                          {custom ?? renderDefaultCell(column, row, value, isDisabled)}
                        </Td>
                      );
                    })}
                    <Td {...cellProps} position="sticky" right={0} zIndex={2} textAlign="center" minW={`${ACTIONS_W}px`}>
                      {isSaved && getOpenHref?.(row) ? (
                        <Link as={RouterLink} to={getOpenHref(row)} color="blue.500" fontSize="sm" fontWeight="600">
                          Open
                        </Link>
                      ) : (
                        <IconButton
                          aria-label="Remove row"
                          icon={<MdDelete />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          isDisabled={isDisabled}
                          onClick={() => onRemoveRow(row.key)}
                        />
                      )}
                    </Td>
                  </Tr>,
                ];
                if (hasError) {
                  cells.push(
                    <Tr key={`${row.key}-msg`}>
                      <Td colSpan={colSpan} py="1" px="3" borderColor={borderColor}>
                        <Alert status={row.status === "error" || row.status === "duplicate" ? "error" : "warning"} variant="subtle" py="1" fontSize="xs" borderRadius="md">
                          <AlertIcon boxSize="3" />
                          <Text wordBreak="break-word">{row.message}</Text>
                        </Alert>
                      </Td>
                    </Tr>
                  );
                }
                return cells;
              })
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default LedgerEntryTable;
