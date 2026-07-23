import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
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
  VStack,
} from "@chakra-ui/react";
import { MdChevronLeft, MdSave } from "react-icons/md";
import Card from "components/card/Card";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { updateRateListApi } from "../../../api/rate";
import { useMasterData } from "../../../hooks/useMasterData";
import {
  buildRateUpdateLine,
  mapRateItemToFormRow,
  validateRateFormRow,
} from "../../../utils/rateListForm";

function formatAgentOption(agent) {
  if (!agent) return "";
  const code = agent.name || "";
  const company = agent.company_name || "";
  if (code && company) return `${code} — ${company}`;
  return code || company || `Agent ${agent.id}`;
}

export default function RateListEdit() {
  const history = useHistory();
  const location = useLocation();
  const toast = useToast();
  const { clients, agents, currencies } = useMasterData();

  const stateData = location.state || {};
  const selectedItems = stateData.selectedItems || [];
  const isBulkEdit = selectedItems.length > 1;

  const [formRows, setFormRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.900");
  const tableHeaderBg = useColorModeValue("gray.600", "gray.700");
  const rowHoverBg = useColorModeValue("blue.50", "whiteAlpha.100");

  const searchableSelectProps = {
    size: "sm",
    bg: inputBg,
    borderColor,
  };

  const cellInputProps = {
    size: "sm",
    bg: inputBg,
    borderColor,
    fontSize: "sm",
  };

  useEffect(() => {
    const items = location.state?.selectedItems;
    if (!Array.isArray(items) || items.length === 0) {
      toast({
        title: "No rates selected",
        description: "Select one or more rates from the list to edit.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      history.replace("/admin/quotations/rate-list");
      return;
    }

    const rows = items.map(mapRateItemToFormRow);
    setFormRows(rows);
    setOriginalRows(rows.map((row) => ({ ...row })));
  }, [location.state, history, toast]);

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

  const handleBack = () => {
    history.push("/admin/quotations/rate-list");
  };

  const handleSave = async () => {
    if (!formRows.length) return;

    const changedLines = [];
    for (let index = 0; index < formRows.length; index += 1) {
      const line = buildRateUpdateLine(formRows[index], originalRows[index] || {});
      if (!line) continue;

      const validationError = validateRateFormRow(formRows[index]);
      if (validationError) {
        toast({
          title: "Validation Error",
          description: `Row ${index + 1} (${formRows[index].rate_name || formRows[index].rate_id || formRows[index].id}): ${validationError}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      changedLines.push(line);
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

    setSaving(true);
    try {
      const result = await updateRateListApi({ lines: changedLines });
      const message =
        result.message ||
        result.result?.message ||
        `${result.updated_count ?? changedLines.length} rate(s) updated.`;

      const errorCount = result.error_count ?? (Array.isArray(result.errors) ? result.errors.length : 0);
      const status = errorCount > 0 ? "warning" : "success";

      toast({
        title: errorCount > 0 ? "Partially saved" : "Rates updated",
        description: message,
        status,
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

      handleBack();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update rates.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const tableMinWidth = useMemo(() => (isBulkEdit ? "3200px" : "2800px"), [isBulkEdit]);

  if (!formRows.length) {
    return null;
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Card px="0px" py="20px">
        <Flex px="25px" mb="20px" justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={MdChevronLeft} />}
              variant="ghost"
              size="sm"
              onClick={handleBack}
            >
              Back
            </Button>
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="600" color={textColor}>
                {isBulkEdit ? `Edit Rates (${formRows.length} items)` : "Edit Rate"}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Edit fields below and save all changes in one batch.
              </Text>
            </VStack>
          </HStack>
          <Button
            leftIcon={<Icon as={MdSave} />}
            colorScheme="green"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            loadingText="Saving..."
          >
            {isBulkEdit ? `Update All (${formRows.length})` : "Update Rate"}
          </Button>
        </Flex>

        <Box px="25px" overflowX="auto">
          <Table variant="simple" size="sm" minW={tableMinWidth}>
            <Thead>
              <Tr>
                {[
                  "Rate ID",
                  "Rate Type",
                  "Client",
                  "Currency",
                  "Location",
                  "Agent",
                  "Rate Name",
                  "Rate Cost",
                  "Rate Fixed",
                  "Rate Calculation",
                  "Valid Until",
                  "Last Update",
                  "Sort Order",
                  "Group Name",
                  "In Tariff",
                  "Active",
                  "Rate Text",
                  "Remarks",
                ].map((label) => (
                  <Th
                    key={label}
                    bg={tableHeaderBg}
                    color="white"
                    fontSize="11px"
                    textTransform="uppercase"
                    whiteSpace="nowrap"
                  >
                    {label}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {formRows.map((row, index) => (
                <Tr key={row.id} _hover={{ bg: rowHoverBg }}>
                  <Td>
                    <Input value={row.rate_id || ""} isReadOnly {...cellInputProps} />
                  </Td>
                  <Td minW="130px">
                    <Select
                      value={row.rate_type}
                      onChange={(e) => updateRow(index, "rate_type", e.target.value)}
                      {...cellInputProps}
                    >
                      <option value="general">General</option>
                      <option value="client_specific">Client Specific</option>
                    </Select>
                  </Td>
                  <Td minW="160px">
                    {row.rate_type === "client_specific" ? (
                      <Select
                        value={row.client_id}
                        onChange={(e) => updateRow(index, "client_id", e.target.value)}
                        {...cellInputProps}
                      >
                        <option value="">Select Client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Text fontSize="sm" color="gray.400">
                        —
                      </Text>
                    )}
                  </Td>
                  <Td minW="130px">
                    <Select
                      value={row.currency_id}
                      onChange={(e) => updateRow(index, "currency_id", e.target.value)}
                      {...cellInputProps}
                    >
                      <option value="">Currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.name}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td minW="120px">
                    <Input
                      value={row.location_text}
                      onChange={(e) => updateRow(index, "location_text", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="180px">
                    <SimpleSearchableSelect
                      value={row.agent_id}
                      onChange={(value) => updateRow(index, "agent_id", value || "")}
                      options={agents}
                      placeholder="Agent"
                      formatOption={formatAgentOption}
                      {...searchableSelectProps}
                    />
                  </Td>
                  <Td minW="180px">
                    <Input
                      value={row.rate_name}
                      onChange={(e) => updateRow(index, "rate_name", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="100px">
                    <Input
                      value={row.rate_float}
                      onChange={(e) => updateRow(index, "rate_float", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="100px">
                    <Input
                      value={row.fixed_sales_rate}
                      onChange={(e) => updateRow(index, "fixed_sales_rate", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="130px">
                    <Input
                      value={row.rate_calculation}
                      onChange={(e) => updateRow(index, "rate_calculation", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="120px">
                    <Input
                      value={row.valid_until}
                      onChange={(e) => updateRow(index, "valid_until", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="120px">
                    <Input
                      value={row.last_update}
                      onChange={(e) => updateRow(index, "last_update", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="90px">
                    <Input
                      value={row.sort_order}
                      onChange={(e) => updateRow(index, "sort_order", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="120px">
                    <Input
                      value={row.import_group}
                      onChange={(e) => updateRow(index, "import_group", e.target.value)}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="100px">
                    <Select
                      value={String(row.incl_in_tariff)}
                      onChange={(e) =>
                        updateRow(index, "incl_in_tariff", e.target.value === "true")
                      }
                      {...cellInputProps}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </Td>
                  <Td minW="90px">
                    <Select
                      value={String(row.active)}
                      onChange={(e) => updateRow(index, "active", e.target.value === "true")}
                      {...cellInputProps}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </Td>
                  <Td minW="220px">
                    <Textarea
                      value={row.rate_text}
                      onChange={(e) => updateRow(index, "rate_text", e.target.value)}
                      rows={2}
                      {...cellInputProps}
                    />
                  </Td>
                  <Td minW="220px">
                    <Textarea
                      value={row.remarks}
                      onChange={(e) => updateRow(index, "remarks", e.target.value)}
                      rows={2}
                      {...cellInputProps}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
