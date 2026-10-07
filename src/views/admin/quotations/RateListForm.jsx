import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
  ButtonGroup,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdArrowDownward,
  MdArrowUpward,
  MdChevronLeft,
  MdDelete,
  MdSave,
  MdTableChart,
  MdUnfoldMore,
  MdViewList,
} from "react-icons/md";
import Card from "components/card/Card";
import { CellWithAssignMenu } from "components/forms/AssignToRowsBelowMenu";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { createRateListApi, deleteRateListApi, updateRateListApi } from "../../../api/rate";
import { useMasterData } from "../../../hooks/useMasterData";
import {
  CHARGE_CATEGORY_OPTIONS,
  buildRateCreatePayload,
  buildRateUpdateLine,
  chargeCategoryLabel,
  DEFAULT_RATE_FORM_ROW,
  mapRateItemToFormRow,
  toDateInputValue,
  validateRateFormRow,
} from "../../../utils/rateListForm";
import {
  removeRatesFromPersistedSelection,
  removeRatesFromSelection,
} from "../../../utils/rateListState";

const RATE_TYPE_OPTIONS = [
  { id: "general", name: "General" },
  { id: "client_specific", name: "Client Specific" },
];

const FIELD_MIN_W = "150px";
const FIELD_MAX_W = "400px";
const RATE_FORM_LAYOUT_STORAGE_KEY = "narvi_rate_form_layout";

function readStoredRateFormLayout() {
  try {
    return localStorage.getItem(RATE_FORM_LAYOUT_STORAGE_KEY) === "list" ? "list" : "table";
  } catch {
    return "table";
  }
}

function cssQuotedContent(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const FORM_SORT_COLUMNS = [
  { label: "Rate ID", sortKey: "rate_id", type: "text", editOnly: true },
  { label: "Rate Type", sortKey: "rate_type", type: "rate_type" },
  { label: "Client", sortKey: "client_id", type: "client" },
  { label: "Currency", sortKey: "currency_id", type: "currency" },
  { label: "Location Text", sortKey: "location_text", type: "text" },
  { label: "Agent", sortKey: "agent_id", type: "agent" },
  { label: "Rate Name", sortKey: "rate_name", type: "text" },
  { label: "Charge Category", sortKey: "charge_category", type: "charge_category" },
  { label: "Rate Cost", sortKey: "rate_float", type: "number" },
  { label: "Rate Fixed", sortKey: "fixed_sales_rate", type: "number" },
  { label: "Rate Calculation", sortKey: "rate_calculation", type: "text" },
  { label: "Valid Until", sortKey: "valid_until", type: "date" },
  { label: "Last Update", sortKey: "last_update", type: "date" },
  { label: "Sort Order", sortKey: "sort_order", type: "number" },
  { label: "Group Name", sortKey: "import_group", type: "text" },
  { label: "In Tariff", sortKey: "incl_in_tariff", type: "boolean" },
  { label: "Active", sortKey: "active", type: "boolean" },
  { label: "Rate Text", sortKey: "rate_text", type: "text" },
  { label: "Remarks", sortKey: "remarks", type: "text" },
];

function lookupOptionName(id, pin, list, formatOption) {
  if (id === "" || id == null) return "";
  if (pin && String(pin.id) === String(id)) {
    return formatOption(pin) || "";
  }
  const match = (list || []).find((item) => String(item.id) === String(id));
  return match ? formatOption(match) : String(id);
}

function getRowSortValue(row, oldIndex, column, ctx) {
  const { type, sortKey } = column;
  if (type === "client") {
    return lookupOptionName(row.client_id, ctx.clientPins[oldIndex], ctx.clients, formatClientOption);
  }
  if (type === "currency") {
    return lookupOptionName(row.currency_id, ctx.currencyPins[oldIndex], ctx.currencies, formatCurrencyOption);
  }
  if (type === "agent") {
    return lookupOptionName(row.agent_id, ctx.agentPins[oldIndex], ctx.agents, formatAgentOption);
  }
  if (type === "rate_type") {
    return RATE_TYPE_OPTIONS.find((option) => option.id === row.rate_type)?.name || row.rate_type || "";
  }
  if (type === "charge_category") {
    return chargeCategoryLabel(row.charge_category);
  }
  if (type === "boolean") {
    return row[sortKey] ? 1 : 0;
  }
  if (type === "number") {
    const parsed = Number(String(row[sortKey] ?? "").replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : "";
  }
  if (type === "date") {
    const value = row[sortKey];
    if (value == null || String(value).trim() === "") return "";
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? "" : timestamp;
  }
  const text = row[sortKey];
  return text == null ? "" : String(text).trim();
}

function compareSortValues(left, right, sortOrder) {
  const leftEmpty = left === "" || left == null;
  const rightEmpty = right === "" || right == null;
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;
  if (typeof left === "number" && typeof right === "number") {
    return sortOrder === "asc" ? left - right : right - left;
  }
  const compared = String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return sortOrder === "asc" ? compared : -compared;
}

function remapPins(pins, oldIndexesInNewOrder) {
  const next = {};
  oldIndexesInNewOrder.forEach((oldIndex, newIndex) => {
    if (Object.prototype.hasOwnProperty.call(pins, oldIndex)) {
      next[newIndex] = pins[oldIndex];
    }
  });
  return next;
}

function FormSortableHeader({ column, sort, onSort, thStyle }) {
  const isActive = sort.sortKey === column.sortKey;
  const icon = !isActive ? MdUnfoldMore : sort.sortOrder === "asc" ? MdArrowUpward : MdArrowDownward;
  const direction = isActive ? (sort.sortOrder === "asc" ? "ascending" : "descending") : "none";

  return (
    <Th
      {...thStyle}
      cursor="pointer"
      userSelect="none"
      tabIndex={0}
      aria-sort={direction}
      title={`Sort by ${column.label}`}
      color={isActive ? "blue.100" : "white"}
      _hover={{ bg: "gray.500" }}
      onClick={() => onSort(column.sortKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSort(column.sortKey);
        }
      }}
    >
      <HStack spacing="1">
        <Text as="span">{column.label}</Text>
        <Icon as={icon} boxSize="13px" opacity={isActive ? 1 : 0.55} />
      </HStack>
    </Th>
  );
}

function formatClientOption(client) {
  return client?.name || `Client ${client?.id}`;
}

function formatCurrencyOption(currency) {
  return currency?.name || `Currency ${currency?.id}`;
}

function buildClientOptionFromItem(item) {
  const clientId = item.client_id?.id ?? item.client_id ?? "";
  const clientName = item.client_id?.name || item.client_name || item.client || "";
  if (!clientId) return null;
  return {
    id: clientId,
    name: clientName,
  };
}

function buildCurrencyOptionFromItem(item) {
  const currencyId = item.currency_id?.id ?? item.currency_id ?? "";
  const currencyName = item.currency_id?.name || item.currency_name || item.currency || "";
  if (!currencyId) return null;
  return {
    id: currencyId,
    name: currencyName,
  };
}

function getAutoHtmlSize(value, placeholder = "", opts = {}) {
  const { min = 18, max = 50, padding = 2 } = opts;
  const valueLen = String(value ?? "").length;
  const placeholderLen = String(placeholder ?? "").length;
  const desired = Math.max(valueLen, placeholderLen) + padding;
  return Math.min(max, Math.max(min, desired));
}

function getAutoCols(value, placeholder = "", opts = {}) {
  const { min = 18, max = 50, padding = 2 } = opts;
  const text = String(value ?? "");
  const maxLineLen = text.split(/\r?\n/).reduce((acc, line) => Math.max(acc, line.length), 0);
  const placeholderLen = String(placeholder ?? "").length;
  const desired = Math.max(maxLineLen, placeholderLen) + padding;
  return Math.min(max, Math.max(min, desired));
}

function formatAgentOption(agent) {
  if (!agent) return "";
  const code = agent.name || "";
  const company = agent.company_name || "";
  if (code && company) return `${code} — ${company}`;
  return code || company || `Agent ${agent.id}`;
}

function buildAgentOptionFromItem(item) {
  const agentId = item.agent_id?.id ?? item.agent_id ?? "";
  const agentName = item.agent_id?.name || item.agent_text || item.agent || "";
  if (!agentId) return null;
  return {
    id: agentId,
    name: agentName,
    company_name: agentName,
  };
}

let newRowKeySeed = 0;

function createEmptyRow() {
  newRowKeySeed += 1;
  return { ...DEFAULT_RATE_FORM_ROW, _key: `new-rate-${Date.now()}-${newRowKeySeed}` };
}

function removeIndexFromPins(pins, removedIndex) {
  const next = {};
  Object.entries(pins).forEach(([key, value]) => {
    const index = Number(key);
    if (index < removedIndex) next[index] = value;
    else if (index > removedIndex) next[index - 1] = value;
  });
  return next;
}

export default function RateListForm() {
  const history = useHistory();
  const location = useLocation();
  const toast = useToast();
  const { clients, agents, currencies } = useMasterData();

  const stateData = location.state || {};
  const selectedItemsFromState = stateData.selectedItems || [];
  const isEditFromList = selectedItemsFromState.length > 0;
  const isBulkEdit = isEditFromList && (stateData.isBulkEdit || selectedItemsFromState.length > 1);
  const isEditing = isEditFromList;

  const [formRows, setFormRows] = useState([createEmptyRow()]);
  const [originalRows, setOriginalRows] = useState([]);
  const [agentOptionPins, setAgentOptionPins] = useState({});
  const [clientOptionPins, setClientOptionPins] = useState({});
  const [currencyOptionPins, setCurrencyOptionPins] = useState({});
  const [sort, setSort] = useState({ sortKey: null, sortOrder: null });
  const [saving, setSaving] = useState(false);
  const [rateToDelete, setRateToDelete] = useState(null);
  const [isDeletingRate, setIsDeletingRate] = useState(false);
  const [formLayout, setFormLayout] = useState(readStoredRateFormLayout);
  const cancelDeleteRef = useRef(null);
  const deletedRateIdsRef = useRef(new Set());
  const initializedForKeyRef = useRef(null);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.900");
  const cardBg = useColorModeValue("white", "navy.800");
  const tableHeaderBg = useColorModeValue("gray.600", "gray.700");
  const tableHeaderBorderColor = useColorModeValue("gray.500", "gray.600");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const rowHoverBg = useColorModeValue("blue.50", "whiteAlpha.100");

  const searchableSelectProps = {
    size: "sm",
    bg: inputBg,
    borderColor,
    autoWidth: true,
    autoWidthMin: 18,
    autoWidthMax: 50,
    minW: FIELD_MIN_W,
    maxW: FIELD_MAX_W,
  };

  const cellInputProps = {
    size: "sm",
    bg: inputBg,
    borderColor,
    fontSize: "sm",
    minW: FIELD_MIN_W,
    maxW: FIELD_MAX_W,
    w: "auto",
    sx: {
      minWidth: FIELD_MIN_W,
      maxWidth: FIELD_MAX_W,
    },
  };

  const tdProps = {
    minW: FIELD_MIN_W,
    maxW: FIELD_MAX_W,
    whiteSpace: "nowrap",
    verticalAlign: "top",
    px: "8px",
    py: "8px",
    position: "relative",
    overflow: "visible",
  };

  const thStyle = {
    bg: tableHeaderBg,
    color: "white",
    borderRight: "1px",
    borderColor: tableHeaderBorderColor,
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    px: "8px",
    py: "12px",
    minW: FIELD_MIN_W,
    maxW: FIELD_MAX_W,
  };

  const handleFormLayoutChange = useCallback((layout) => {
    setFormLayout(layout);
    try {
      localStorage.setItem(RATE_FORM_LAYOUT_STORAGE_KEY, layout);
    } catch {
      // ignore storage errors
    }
  }, []);

  const rateFormListSx = useMemo(() => {
    const labels = [
      "",
      ...FORM_SORT_COLUMNS.filter((column) => !column.editOnly || isEditing).map((column) => column.label),
      "Actions",
    ];
    const labelRules = {};
    labels.forEach((label, index) => {
      labelRules[`tbody td:nth-of-type(${index + 1})::before`] = {
        content: cssQuotedContent(label),
        textTransform: "uppercase",
      };
    });
    return {
      display: "block !important",
      minW: "100% !important",
      width: "100%",
      tableLayout: "auto",
      thead: { display: "none !important" },
      tbody: {
        display: "flex !important",
        flexDirection: "column",
        gap: "16px",
        bg: "transparent",
      },
      "tbody tr": {
        display: "grid !important",
        gridTemplateColumns: {
          base: "1fr",
          md: "repeat(2, minmax(0, 1fr))",
          xl: "repeat(3, minmax(0, 1fr))",
        },
        gap: "12px 16px",
        p: "16px",
        bg: cardBg,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: tableBorderColor,
        borderRadius: "12px",
        boxShadow: "sm",
      },
      "tbody td": {
        display: "flex !important",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        minW: "0 !important",
        maxW: "none !important",
        w: "100%",
        border: "0 !important",
        px: "0 !important",
        py: "4px !important",
        whiteSpace: "normal",
        "&::before": {
          display: "block",
          mb: "6px",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.04em",
          color: "gray.500",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
        "& input, & textarea, & select, & .chakra-select__wrapper": {
          width: "100% !important",
          maxWidth: "100% !important",
        },
      },
      "tbody td:nth-of-type(1)": {
        gridColumn: "1 / -1 !important",
        order: -1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        pb: "10px !important",
        mb: "4px",
        borderBottomWidth: "1px !important",
        borderBottomStyle: "solid",
        borderBottomColor: tableBorderColor,
      },
      "tbody td:nth-of-type(1)::before": {
        display: "none !important",
      },
      "tbody td:nth-last-of-type(1)": {
        display: "none !important",
      },
      ...labelRules,
    };
  }, [cardBg, isEditing, tableBorderColor]);

  useEffect(() => {
    if (initializedForKeyRef.current === location.key) return;
    initializedForKeyRef.current = location.key;

    const items = location.state?.selectedItems;
    const hasItems = Array.isArray(items) && items.length > 0;

    if (hasItems) {
      const rows = items.map((item, index) => ({ ...mapRateItemToFormRow(item), _order: index }));
      const agentPins = {};
      const clientPins = {};
      const currencyPins = {};
      items.forEach((item, index) => {
        const agentOption = buildAgentOptionFromItem(item);
        if (agentOption) agentPins[index] = agentOption;
        const clientOption = buildClientOptionFromItem(item);
        if (clientOption) clientPins[index] = clientOption;
        const currencyOption = buildCurrencyOptionFromItem(item);
        if (currencyOption) currencyPins[index] = currencyOption;
      });

      setFormRows(rows);
      setOriginalRows(rows.map((row) => ({ ...row })));
      setAgentOptionPins(agentPins);
      setClientOptionPins(clientPins);
      setCurrencyOptionPins(currencyPins);
      setSort({ sortKey: null, sortOrder: null });
      return;
    }

    setFormRows([{ ...createEmptyRow(), _order: 0 }]);
    setSort({ sortKey: null, sortOrder: null });
    setOriginalRows([]);
    setAgentOptionPins({});
    setClientOptionPins({});
    setCurrencyOptionPins({});
  }, [location.key, location.state]);

  const getAgentOptionsForRow = useCallback(
    (index) => {
      const pin = agentOptionPins[index];
      if (!pin) return agents;
      const exists = agents.some((agent) => String(agent.id) === String(pin.id));
      return exists ? agents : [pin, ...agents];
    },
    [agentOptionPins, agents]
  );

  const getClientOptionsForRow = useCallback(
    (index) => {
      const pin = clientOptionPins[index];
      if (!pin) return clients;
      const exists = clients.some((client) => String(client.id) === String(pin.id));
      return exists ? clients : [pin, ...clients];
    },
    [clientOptionPins, clients]
  );

  const getCurrencyOptionsForRow = useCallback(
    (index) => {
      const pin = currencyOptionPins[index];
      if (!pin) return currencies;
      const exists = currencies.some((currency) => String(currency.id) === String(pin.id));
      return exists ? currencies : [pin, ...currencies];
    },
    [currencyOptionPins, currencies]
  );

  const updateRow = (index, field, value) => {
    setFormRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, [field]: value };
        if (field === "rate_type" && value === "general") {
          next.client_id = "";
        }
        return next;
      })
    );
  };

  const copyValueToRowsBelow = useCallback(
    (rowIndex, fields, copyToAll = false) => {
      const fieldList = Array.isArray(fields) ? fields : [fields];
      const totalRows = formRows.length;
      const targetIndices = [];

      if (copyToAll) {
        for (let i = rowIndex + 1; i < totalRows; i += 1) targetIndices.push(i);
      } else if (rowIndex + 1 < totalRows) {
        targetIndices.push(rowIndex + 1);
      }

      if (!targetIndices.length) return;

      setFormRows((prev) => {
        const newRows = [...prev];
        const sourceValues = {};
        fieldList.forEach((field) => {
          sourceValues[field] = newRows[rowIndex][field];
        });

        targetIndices.forEach((targetIndex) => {
          const next = { ...newRows[targetIndex], ...sourceValues };
          if (fieldList.includes("rate_type") && sourceValues.rate_type === "general") {
            next.client_id = "";
          }
          newRows[targetIndex] = next;
        });

        return newRows;
      });

      if (fieldList.includes("agent_id") && agentOptionPins[rowIndex]) {
        const pin = agentOptionPins[rowIndex];
        setAgentOptionPins((prev) => {
          const next = { ...prev };
          targetIndices.forEach((i) => {
            next[i] = pin;
          });
          return next;
        });
      }

      if (fieldList.includes("client_id") && clientOptionPins[rowIndex]) {
        const pin = clientOptionPins[rowIndex];
        setClientOptionPins((prev) => {
          const next = { ...prev };
          targetIndices.forEach((i) => {
            next[i] = pin;
          });
          return next;
        });
      }

      if (fieldList.includes("currency_id") && currencyOptionPins[rowIndex]) {
        const pin = currencyOptionPins[rowIndex];
        setCurrencyOptionPins((prev) => {
          const next = { ...prev };
          targetIndices.forEach((i) => {
            next[i] = pin;
          });
          return next;
        });
      }
    },
    [formRows.length, agentOptionPins, clientOptionPins, currencyOptionPins]
  );

  const assignCell = (rowIndex, fields, children, align = "center") => (
    <CellWithAssignMenu
      rowIndex={rowIndex}
      fields={fields}
      onCopy={copyValueToRowsBelow}
      totalRows={formRows.length}
      align={align}
    >
      {children}
    </CellWithAssignMenu>
  );

  const filterState = stateData.filterState || null;

  const navigateBackToRateList = () => {
    history.push({
      pathname: "/admin/quotations/rate-list",
      state: filterState
        ? {
            filterState: removeRatesFromSelection(filterState, Array.from(deletedRateIdsRef.current)),
            fromRateForm: true,
          }
        : undefined,
    });
  };

  const handleColumnSort = (sortKey) => {
    const column = FORM_SORT_COLUMNS.find((item) => item.sortKey === sortKey);
    if (!column) return;

    const nextSort =
      sort.sortKey !== sortKey
        ? { sortKey, sortOrder: "asc" }
        : sort.sortOrder === "asc"
          ? { sortKey, sortOrder: "desc" }
          : { sortKey: null, sortOrder: null };

    const ctx = {
      clientPins: clientOptionPins,
      currencyPins: currencyOptionPins,
      agentPins: agentOptionPins,
      clients,
      currencies,
      agents,
    };

    const indexed = formRows.map((row, oldIndex) => ({ row, oldIndex }));
    indexed.sort((left, right) => {
      if (!nextSort.sortKey) {
        return (Number(left.row._order) || 0) - (Number(right.row._order) || 0);
      }
      const compared = compareSortValues(
        getRowSortValue(left.row, left.oldIndex, column, ctx),
        getRowSortValue(right.row, right.oldIndex, column, ctx),
        nextSort.sortOrder
      );
      if (compared !== 0) return compared;
      return (Number(left.row._order) || 0) - (Number(right.row._order) || 0);
    });

    const oldIndexesInNewOrder = indexed.map((item) => item.oldIndex);
    setSort(nextSort);
    setFormRows(indexed.map((item) => item.row));
    setAgentOptionPins((pins) => remapPins(pins, oldIndexesInNewOrder));
    setClientOptionPins((pins) => remapPins(pins, oldIndexesInNewOrder));
    setCurrencyOptionPins((pins) => remapPins(pins, oldIndexesInNewOrder));
  };

  const handleAddRow = () => {
    setFormRows((prev) => {
      const maxOrder = prev.reduce((max, row) => Math.max(max, Number(row._order) || 0), -1);
      return [...prev, { ...createEmptyRow(), _order: maxOrder + 1 }];
    });
  };

  const confirmDeleteRate = async () => {
    if (!rateToDelete) return;
    setIsDeletingRate(true);
    try {
      const result = await deleteRateListApi(rateToDelete.id);
      if (result?.status === "error") {
        throw new Error(result.message || "Failed to delete rate.");
      }
      deletedRateIdsRef.current.add(String(rateToDelete.id));
      removeRatesFromPersistedSelection([rateToDelete.id]);
      const removedIndex = formRows.findIndex((row) => String(row.id) === String(rateToDelete.id));
      setFormRows((prev) => {
        const remaining = prev.filter((row) => String(row.id) !== String(rateToDelete.id));
        return remaining.length ? remaining : [createEmptyRow()];
      });
      setOriginalRows((prev) => prev.filter((row) => String(row.id) !== String(rateToDelete.id)));
      if (removedIndex !== -1) {
        setAgentOptionPins((prev) => removeIndexFromPins(prev, removedIndex));
        setClientOptionPins((prev) => removeIndexFromPins(prev, removedIndex));
        setCurrencyOptionPins((prev) => removeIndexFromPins(prev, removedIndex));
      }
      toast({
        title: "Rate deleted",
        description: result?.message || `${rateToDelete.label || "Rate"} was deleted.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setRateToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.result?.message ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete rate.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeletingRate(false);
    }
  };

  const handleRemoveNewRow = (index) => {
    if (formRows.length <= 1 || formRows[index]?.id) return;
    setFormRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    setAgentOptionPins((prev) => removeIndexFromPins(prev, index));
    setClientOptionPins((prev) => removeIndexFromPins(prev, index));
    setCurrencyOptionPins((prev) => removeIndexFromPins(prev, index));
  };

  const handleDiscard = () => {
    navigateBackToRateList();
  };

  const navigateBackFromEdit = () => {
    navigateBackToRateList();
  };

  const handleSave = async () => {
    if (!formRows.length) return;

    for (let index = 0; index < formRows.length; index += 1) {
      const validationError = validateRateFormRow(formRows[index]);
      if (validationError) {
        toast({
          title: "Validation Error",
          description: `Row ${index + 1}: ${validationError}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }

    const originalById = new Map(originalRows.map((row) => [String(row.id), row]));
    const changedLines = formRows
      .filter((row) => row.id)
      .map((row) => buildRateUpdateLine(row, originalById.get(String(row.id)) || {}))
      .filter(Boolean);
    const newRows = formRows.filter((row) => !row.id);

    if (!changedLines.length && !newRows.length) {
      toast({
        title: "No changes",
        description: "No fields have been modified.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      navigateBackToRateList();
      return;
    }

    setSaving(true);
    let updateDone = !changedLines.length;
    const createdKeys = [];
    try {
      if (changedLines.length) {
        const result = await updateRateListApi({ lines: changedLines });
        updateDone = true;
        const message =
          result.message ||
          result.result?.message ||
          `${result.updated_count ?? changedLines.length} rate(s) updated.`;

        const errorCount = result.error_count ?? (Array.isArray(result.errors) ? result.errors.length : 0);

        toast({
          title: errorCount > 0 ? "Partially saved" : "Rates updated",
          description: message,
          status: errorCount > 0 ? "warning" : "success",
          duration: 5000,
          isClosable: true,
        });

        if (Array.isArray(result.errors) && result.errors.length) {
          const detail = result.errors
            .map((err) => `Row ${(err.index ?? 0) + 1} (ID ${err.id ?? "?"}): ${err.message}`)
            .join("\n");
          toast({
            title: "Some rows failed",
            description: detail,
            status: "error",
            duration: 8000,
            isClosable: true,
          });
        }
      }

      for (const row of newRows) {
        // eslint-disable-next-line no-await-in-loop
        await createRateListApi(buildRateCreatePayload(row));
        createdKeys.push(row._key);
      }

      if (newRows.length) {
        toast({
          title: "Rate(s) created",
          description: `${newRows.length} new rate${newRows.length === 1 ? "" : "s"} created successfully.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      navigateBackToRateList();
    } catch (error) {
      if (updateDone) {
        setOriginalRows(formRows.filter((row) => row.id).map((row) => ({ ...row })));
      }
      if (createdKeys.length) {
        const keptIndices = formRows
          .map((row, index) => (createdKeys.includes(row._key) ? -1 : index))
          .filter((index) => index >= 0);
        const remapPins = (pins) =>
          keptIndices.reduce((acc, oldIndex, newIndex) => {
            if (pins[oldIndex]) acc[newIndex] = pins[oldIndex];
            return acc;
          }, {});
        setFormRows(keptIndices.length ? keptIndices.map((index) => formRows[index]) : [createEmptyRow()]);
        setAgentOptionPins(remapPins);
        setClientOptionPins(remapPins);
        setCurrencyOptionPins(remapPins);
        toast({
          title: "Some rates were saved",
          description: `${createdKeys.length} new rate(s) were created and removed from the table. Fix the remaining rows and save again.`,
          status: "warning",
          duration: 7000,
          isClosable: true,
        });
      }
      const backendMessage =
        error?.response?.data?.result?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "";
      toast({
        title: "Error",
        description: backendMessage || (isEditing ? "Failed to update rate(s)." : "Failed to create rate(s)."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const tableMinWidth = useMemo(() => {
    const columnCount = isEditing ? 21 : 20;
    return `${columnCount * 150}px`;
  }, [isEditing]);

  const newRowCount = formRows.filter((row) => !row.id).length;
  const existingRowCount = formRows.length - newRowCount;

  const pageTitle = isBulkEdit
    ? `Bulk Edit Rates (${existingRowCount}${newRowCount ? ` + ${newRowCount} new` : ""})`
    : isEditing
      ? `Edit Rate${existingRowCount > 1 ? `s (${existingRowCount})` : ""}${newRowCount ? ` + ${newRowCount} new` : ""}`
      : "Create New Rate";

  return (
    <Box
      pt={{ base: "130px", md: "80px", xl: "80px" }}
      overflow="hidden"
      position="relative"
      zIndex="122222"
    >
      <Flex
        bg={cardBg}
        px={{ base: "4", md: "6" }}
        py="3"
        align="center"
        borderBottom="1px"
        borderColor={borderColor}
        gap={3}
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr auto 1fr" }}
      >
        <HStack spacing="4">
          {isEditFromList && (
            <IconButton
              icon={<Icon as={MdChevronLeft} />}
              size="sm"
              variant="ghost"
              aria-label="Back"
              onClick={navigateBackFromEdit}
            />
          )}
          <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
            {pageTitle}
          </Text>
        </HStack>

        <ButtonGroup size="sm" isAttached variant="outline" justifySelf="center">
          <Button
            leftIcon={<Icon as={MdTableChart} />}
            onClick={() => handleFormLayoutChange("table")}
            colorScheme={formLayout === "table" ? "blue" : "gray"}
            variant={formLayout === "table" ? "solid" : "outline"}
            aria-pressed={formLayout === "table"}
          >
            Table view
          </Button>
          <Button
            leftIcon={<Icon as={MdViewList} />}
            onClick={() => handleFormLayoutChange("list")}
            colorScheme={formLayout === "list" ? "blue" : "gray"}
            variant={formLayout === "list" ? "solid" : "outline"}
            aria-pressed={formLayout === "list"}
          >
            Form view
          </Button>
        </ButtonGroup>

        <HStack spacing="3" flexWrap="wrap" justify="flex-end">
          <Button
            leftIcon={<Icon as={MdAdd} />}
            bg="blue.500"
            color="white"
            size="sm"
            px="6"
            py="3"
            borderRadius="md"
            _hover={{ bg: "blue.600" }}
            onClick={handleAddRow}
          >
            Add Row
          </Button>
          <Button
            variant="outline"
            size="sm"
            px="6"
            py="3"
            borderRadius="md"
            borderColor={borderColor}
            color={textColor}
            _hover={{ bg: inputBg }}
            onClick={handleDiscard}
          >
            Discard
          </Button>
          <Button
            leftIcon={<Icon as={MdSave} />}
            bg="green.500"
            color="white"
            size="sm"
            px="6"
            py="3"
            borderRadius="md"
            _hover={{ bg: "green.600" }}
            onClick={handleSave}
            isLoading={saving}
            loadingText="Saving..."
          >
            {isEditing
              ? newRowCount > 0
                ? `Update ${formRows.length - newRowCount} & Create ${newRowCount}`
                : `Update All (${formRows.length} items)`
              : `Save ${formRows.length} Item(s)`}
          </Button>
        </HStack>
      </Flex>

      <Box
        bg={formLayout === "list" ? "transparent" : cardBg}
        p={{ base: "4", md: "6" }}
        overflowX={formLayout === "table" ? "auto" : "hidden"}
      >
        <Card
          w="100%"
          p="0"
          overflow={formLayout === "table" ? "hidden" : "visible"}
          bg={formLayout === "list" ? "transparent" : undefined}
          boxShadow={formLayout === "list" ? "none" : undefined}
        >
          <Box
            maxH="70vh"
            overflowY="auto"
            overflowX={formLayout === "table" ? "auto" : "hidden"}
            px={formLayout === "list" ? { base: "1", md: "2" } : undefined}
            py={formLayout === "list" ? "1" : undefined}
          >
            <Table
              variant={formLayout === "table" ? "striped" : "simple"}
              size="sm"
              colorScheme="gray"
              minW={formLayout === "table" ? tableMinWidth : "100%"}
              sx={formLayout === "list" ? rateFormListSx : { tableLayout: "auto" }}
            >
              <Thead position="sticky" top={0} zIndex={1}>
                <Tr>
                  {FORM_SORT_COLUMNS.filter((column) => !column.editOnly || isEditing).map((column) => (
                    <FormSortableHeader
                      key={column.sortKey}
                      column={column}
                      sort={sort}
                      onSort={handleColumnSort}
                      thStyle={thStyle}
                    />
                  ))}
                  <Th {...thStyle} minW="90px" borderRight="none">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {formRows.map((row, index) => (
                  <Tr key={row.id ?? row._key ?? `new-${index}`} _hover={{ bg: rowHoverBg }}>
                    {formLayout === "list" && (
                      <Td>
                        <Flex
                          w="100%"
                          align="center"
                          justify="space-between"
                          gap="3"
                          flexWrap="wrap"
                        >
                          <Text fontSize="sm" fontWeight="700" color={textColor}>
                            {`Item ${index + 1}${formRows.length > 1 ? ` of ${formRows.length}` : ""}`}
                            {row.rate_id ? ` · ${row.rate_id}` : row.rate_name ? ` · ${row.rate_name}` : ""}
                          </Text>
                          <IconButton
                            icon={<Icon as={MdDelete} />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            aria-label={row.id ? "Delete rate" : "Delete row"}
                            title={row.id ? "Delete this rate permanently" : "Delete row"}
                            onClick={() =>
                              row.id
                                ? setRateToDelete({ id: row.id, label: row.rate_id || row.rate_name })
                                : handleRemoveNewRow(index)
                            }
                            isDisabled={formRows.length === 1 || saving}
                          />
                        </Flex>
                      </Td>
                    )}
                    {isEditing && (
                      <Td {...tdProps}>
                        <Input
                          value={row.id ? row.rate_id || "" : ""}
                          placeholder={row.id ? "Rate ID" : "ID will be assigned after save"}
                          isReadOnly
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(
                            row.rate_id,
                            row.id ? "Rate ID" : "ID will be assigned after save"
                          )}
                        />
                      </Td>
                    )}
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "rate_type",
                        <Box minW={FIELD_MIN_W} maxW={FIELD_MAX_W}>
                          <Select
                            value={row.rate_type}
                            onChange={(e) => updateRow(index, "rate_type", e.target.value)}
                            {...cellInputProps}
                            w="100%"
                          >
                            {RATE_TYPE_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </Select>
                        </Box>
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {row.rate_type === "client_specific"
                        ? assignCell(
                            index,
                            "client_id",
                            <SimpleSearchableSelect
                              value={row.client_id}
                              onChange={(value) => updateRow(index, "client_id", value || "")}
                              options={getClientOptionsForRow(index)}
                              placeholder="Select Client"
                              formatOption={formatClientOption}
                              {...searchableSelectProps}
                            />
                          )
                        : (
                          <Text fontSize="sm" color="gray.400" minW={FIELD_MIN_W}>
                            —
                          </Text>
                        )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "currency_id",
                        <SimpleSearchableSelect
                          value={row.currency_id}
                          onChange={(value) => updateRow(index, "currency_id", value || "")}
                          options={getCurrencyOptionsForRow(index)}
                          placeholder="Select Currency"
                          formatOption={formatCurrencyOption}
                          {...searchableSelectProps}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "location_text",
                        <Input
                          value={row.location_text}
                          onChange={(e) => updateRow(index, "location_text", e.target.value)}
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(row.location_text, "Location Text")}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "agent_id",
                        <SimpleSearchableSelect
                          value={row.agent_id}
                          onChange={(value) => updateRow(index, "agent_id", value || "")}
                          options={getAgentOptionsForRow(index)}
                          placeholder="Select Agent"
                          formatOption={formatAgentOption}
                          {...searchableSelectProps}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "rate_name",
                        <Input
                          value={row.rate_name}
                          onChange={(e) => updateRow(index, "rate_name", e.target.value)}
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(row.rate_name, "Rate Name")}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "charge_category",
                        <Box minW="160px">
                          <Select
                            value={row.charge_category || "standard"}
                            onChange={(e) => updateRow(index, "charge_category", e.target.value)}
                            {...cellInputProps}
                            w="100%"
                          >
                            {CHARGE_CATEGORY_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </Box>
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "rate_float",
                        <Input
                          value={row.rate_float}
                          onChange={(e) => updateRow(index, "rate_float", e.target.value)}
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(row.rate_float, "Rate Cost")}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "fixed_sales_rate",
                        <Input
                          value={row.fixed_sales_rate}
                          onChange={(e) => updateRow(index, "fixed_sales_rate", e.target.value)}
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(row.fixed_sales_rate, "Rate Fixed")}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "rate_calculation",
                        <Input
                          value={row.rate_calculation}
                          onChange={(e) => updateRow(index, "rate_calculation", e.target.value)}
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(row.rate_calculation, "Rate Calculation")}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "valid_until",
                        <Input
                          type="date"
                          value={toDateInputValue(row.valid_until)}
                          onChange={(e) => updateRow(index, "valid_until", e.target.value)}
                          {...cellInputProps}
                          htmlSize={12}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "last_update",
                        <Input
                          type="date"
                          value={toDateInputValue(row.last_update)}
                          onChange={(e) => updateRow(index, "last_update", e.target.value)}
                          {...cellInputProps}
                          htmlSize={12}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "sort_order",
                        <Input
                          value={row.sort_order}
                          onChange={(e) => updateRow(index, "sort_order", e.target.value)}
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(row.sort_order, "Sort Order")}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "import_group",
                        <Input
                          value={row.import_group}
                          onChange={(e) => updateRow(index, "import_group", e.target.value)}
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(row.import_group, "Group Name")}
                        />
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "incl_in_tariff",
                        <Box minW={FIELD_MIN_W} maxW={FIELD_MAX_W}>
                          <Select
                            value={String(row.incl_in_tariff)}
                            onChange={(e) =>
                              updateRow(index, "incl_in_tariff", e.target.value === "true")
                            }
                            {...cellInputProps}
                            w="100%"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </Select>
                        </Box>
                      )}
                    </Td>
                    <Td {...tdProps}>
                      {assignCell(
                        index,
                        "active",
                        <Box minW={FIELD_MIN_W} maxW={FIELD_MAX_W}>
                          <Select
                            value={String(row.active)}
                            onChange={(e) => updateRow(index, "active", e.target.value === "true")}
                            {...cellInputProps}
                            w="100%"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </Select>
                        </Box>
                      )}
                    </Td>
                    <Td {...tdProps} whiteSpace="normal">
                      {assignCell(
                        index,
                        "rate_text",
                        <Textarea
                          value={row.rate_text}
                          onChange={(e) => updateRow(index, "rate_text", e.target.value)}
                          rows={2}
                          {...cellInputProps}
                          minW={FIELD_MIN_W}
                          maxW={FIELD_MAX_W}
                          w="auto"
                          cols={getAutoCols(row.rate_text, "Rate Text")}
                        />,
                        "flex-start"
                      )}
                    </Td>
                    <Td {...tdProps} whiteSpace="normal">
                      {assignCell(
                        index,
                        "remarks",
                        <Textarea
                          value={row.remarks}
                          onChange={(e) => updateRow(index, "remarks", e.target.value)}
                          rows={2}
                          {...cellInputProps}
                          minW={FIELD_MIN_W}
                          maxW={FIELD_MAX_W}
                          w="auto"
                          cols={getAutoCols(row.remarks, "Remarks")}
                        />,
                        "flex-start"
                      )}
                    </Td>
                    <Td {...tdProps} minW="90px">
                      <IconButton
                        icon={<Icon as={MdDelete} />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        aria-label={row.id ? "Delete rate" : "Delete row"}
                        title={row.id ? "Delete this rate permanently" : "Delete row"}
                        onClick={() =>
                          row.id ? setRateToDelete({ id: row.id, label: row.rate_id || row.rate_name }) : handleRemoveNewRow(index)
                        }
                        isDisabled={formRows.length === 1 || saving}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Card>
      </Box>

      <AlertDialog
        isOpen={Boolean(rateToDelete)}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => !isDeletingRate && setRateToDelete(null)}
        isCentered
      >
        <AlertDialogOverlay zIndex={2099999}>
          <AlertDialogContent containerProps={{ zIndex: 2100000 }}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Rate
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete{" "}
              <Text as="span" fontWeight="semibold">{rateToDelete?.label || "this rate"}</Text>?
              This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={() => setRateToDelete(null)} isDisabled={isDeletingRate}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDeleteRate} ml={3} isLoading={isDeletingRate}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
