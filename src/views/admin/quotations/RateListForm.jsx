import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
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
} from "@chakra-ui/react";
import { MdAdd, MdChevronLeft, MdSave } from "react-icons/md";
import Card from "components/card/Card";
import { CellWithAssignMenu } from "components/forms/AssignToRowsBelowMenu";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { createRateListApi, updateRateListApi } from "../../../api/rate";
import { useMasterData } from "../../../hooks/useMasterData";
import {
  buildRateCreatePayload,
  buildRateUpdateLine,
  DEFAULT_RATE_FORM_ROW,
  mapRateItemToFormRow,
  toDateInputValue,
  validateRateFormRow,
} from "../../../utils/rateListForm";

const RATE_TYPE_OPTIONS = [
  { id: "general", name: "General" },
  { id: "client_specific", name: "Client Specific" },
];

const FIELD_MIN_W = "150px";
const FIELD_MAX_W = "400px";

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

function createEmptyRow() {
  return { ...DEFAULT_RATE_FORM_ROW };
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
  const [saving, setSaving] = useState(false);
  const initializedForKeyRef = useRef(null);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.900");
  const cardBg = useColorModeValue("white", "navy.800");
  const tableHeaderBg = useColorModeValue("gray.600", "gray.700");
  const tableHeaderBorderColor = useColorModeValue("gray.500", "gray.600");
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

  useEffect(() => {
    if (initializedForKeyRef.current === location.key) return;
    initializedForKeyRef.current = location.key;

    const items = location.state?.selectedItems;
    const hasItems = Array.isArray(items) && items.length > 0;

    if (hasItems) {
      const rows = items.map(mapRateItemToFormRow);
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
      return;
    }

    setFormRows([createEmptyRow()]);
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
            filterState,
            fromRateForm: true,
          }
        : undefined,
    });
  };

  const handleAddRow = () => {
    setFormRows((prev) => [...prev, createEmptyRow()]);
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

    setSaving(true);
    try {
      if (isEditing) {
        const changedLines = [];
        for (let index = 0; index < formRows.length; index += 1) {
          const line = buildRateUpdateLine(formRows[index], originalRows[index] || {});
          if (line) changedLines.push(line);
        }

        if (!changedLines.length) {
          toast({
            title: "No changes",
            description: "No fields have been modified.",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        const result = await updateRateListApi({ lines: changedLines });
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

        navigateBackFromEdit();
        return;
      }

      for (let index = 0; index < formRows.length; index += 1) {
        await createRateListApi(buildRateCreatePayload(formRows[index]));
      }

      toast({
        title: "Rate(s) created",
        description: `${formRows.length} rate${formRows.length === 1 ? "" : "s"} created successfully.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      navigateBackToRateList();
    } catch (error) {
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
    const columnCount = isEditing ? 19 : 18;
    return `${columnCount * 150}px`;
  }, [isEditing]);

  const pageTitle = isBulkEdit
    ? `Bulk Edit Rates (${formRows.length})`
    : isEditing
      ? `Edit Rate${formRows.length > 1 ? `s (${formRows.length})` : ""}`
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
        justify="space-between"
        align="center"
        borderBottom="1px"
        borderColor={borderColor}
        flexWrap="wrap"
        gap={3}
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

        <HStack spacing="3">
          {!isEditing && (
            <>
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
            </>
          )}
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
            {isBulkEdit || isEditFromList
              ? `Update All (${formRows.length} items)`
              : isEditing
                ? "Update Rate"
                : `Save ${formRows.length} Item(s)`}
          </Button>
        </HStack>
      </Flex>

      <Box bg={cardBg} p={{ base: "4", md: "6" }} overflowX="auto">
        <Card w="100%" p="0" overflow="hidden">
          <Box maxH="60vh" overflowY="auto">
            <Table variant="striped" size="sm" colorScheme="gray" minW={tableMinWidth} sx={{ tableLayout: "auto" }}>
              <Thead position="sticky" top={0} zIndex={1}>
                <Tr>
                  {isEditing && <Th {...thStyle}>Rate ID</Th>}
                  <Th {...thStyle}>Rate Type</Th>
                  <Th {...thStyle}>Client</Th>
                  <Th {...thStyle}>Currency</Th>
                  <Th {...thStyle}>Location Text</Th>
                  <Th {...thStyle}>Agent</Th>
                  <Th {...thStyle}>Rate Name</Th>
                  <Th {...thStyle}>Rate Cost</Th>
                  <Th {...thStyle}>Rate Fixed</Th>
                  <Th {...thStyle}>Rate Calculation</Th>
                  <Th {...thStyle}>Valid Until</Th>
                  <Th {...thStyle}>Last Update</Th>
                  <Th {...thStyle}>Sort Order</Th>
                  <Th {...thStyle}>Group Name</Th>
                  <Th {...thStyle}>In Tariff</Th>
                  <Th {...thStyle}>Active</Th>
                  <Th {...thStyle}>Rate Text</Th>
                  <Th {...thStyle}>Remarks</Th>
                </Tr>
              </Thead>
              <Tbody>
                {formRows.map((row, index) => (
                  <Tr key={row.id ?? `new-${index}`} _hover={{ bg: rowHoverBg }}>
                    {isEditing && (
                      <Td {...tdProps}>
                        <Input
                          value={row.rate_id || ""}
                          isReadOnly
                          {...cellInputProps}
                          htmlSize={getAutoHtmlSize(row.rate_id, "Rate ID")}
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
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
