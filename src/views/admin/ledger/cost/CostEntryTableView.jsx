import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Input, Text, useColorModeValue, useToast } from "@chakra-ui/react";
import LedgerCompactAuto from "components/ledger/LedgerCompactAuto";
import { useLedgerDueDatePreview, useLedgerRoePreview } from "hooks/useLedgerPreviews";
import { describeDueRule } from "utils/ledgerAutoFields";
import RemoteSearchableSelect from "components/forms/RemoteSearchableSelect";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import LedgerEntryTable from "components/ledger/LedgerEntryTable";
import { getShippingOrders } from "api/shippingOrders";
import { checkLedgerCostInvoices, createLedgerCost } from "api/ledgerCost";
import useLedgerAgentOptions from "hooks/useLedgerAgentOptions";
import { COST_TABLE_ENTRY_COLUMNS } from "utils/ledgerColumns";
import {
  agentOptionLabel,
  agentOptionSecondary,
  soDoneStatusColor,
  soDoneStatusLabel,
} from "utils/ledgerDisplay";
import { formatDuplicateMessage, shouldPrecheckInvoices } from "utils/ledgerInvoiceNumbers";
import {
  BIZ_CATEGORY_OPTIONS,
  buildCreatePayload,
  dueInputPatch,
  roeInputPatch,
  emptyCostForm,
  extractApiMessage,
  extractLedgerCostRecord,
  fillCostFromShippingOrder,
  formatSoLabel,
  isShippingStatusOrder,
  validateCostForm,
} from "./ledgerCostUtils";

const SO_PAGE_SIZE = 50;
const FORM_PATH = "/admin/ledger/cost/form";

let rowSeq = 0;
const newRow = () => ({
  key: `row-${++rowSeq}`,
  values: emptyCostForm(),
  status: "draft",
  message: "",
  savedId: null,
});

const prettyDate = (iso) => {
  const parts = String(iso || "").split("-");
  if (parts.length !== 3) return iso || "";
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Compact ROE cell: input + small auto/manual tag, notes in the tag tooltip
function RoeCell({ values, onPatch, currencyLabel, controlProps, isDisabled }) {
  const manual = Boolean(values.roe_manual);
  const preview = useLedgerRoePreview({
    kind: "cost",
    currencyId: values.currency_id,
    date: values.date_agent_invoice,
    enabled: !manual,
  });
  const previewRoe = preview.data ? preview.data.roe : undefined;
  const display = manual
    ? values.roe_invoice_date
    : preview.data
      ? previewRoe == null
        ? ""
        : String(previewRoe)
      : values.roe_invoice_date;
  const rateDate = preview.data?.roe_date || values.roe_date;
  const mode = manual ? "manual" : display !== "" ? "auto" : null;
  const noRate = !manual && preview.data && previewRoe == null;
  let hint = "";
  if (manual) hint = "Manual rate. Clear the field to return to automatic.";
  else if (mode === "auto" && rateDate) hint = `Rate of ${prettyDate(rateDate)}`;
  else if (!values.currency_id && display === "") hint = "Pick a currency to get the automatic rate.";
  return (
    <LedgerCompactAuto
      mode={mode || (noRate ? "auto" : null)}
      isLoading={!manual && preview.isLoading}
      hint={hint}
      warning={noRate ? `No exchange rate for ${currencyLabel || "this currency"}. Enter the rate manually.` : ""}
      error={!manual && preview.error ? "Could not look up the rate. You can enter it manually." : ""}
      onUseAutomatic={() => onPatch(roeInputPatch(""))}
    >
      <Input
        type="number"
        step="any"
        aria-label="ROE"
        value={display ?? ""}
        isDisabled={isDisabled}
        onChange={(e) => onPatch(roeInputPatch(e.target.value))}
        {...controlProps}
      />
    </LedgerCompactAuto>
  );
}

// Compact due date cell
function DueCell({ values, onPatch, controlProps, isDisabled }) {
  const manual = Boolean(values.date_due_manual);
  const preview = useLedgerDueDatePreview({
    partnerId: values.agent_id,
    date: values.date_agent_invoice,
    enabled: !manual,
  });
  const display = manual
    ? values.date_due_agent
    : preview.data
      ? preview.data.due_date || ""
      : values.date_due_agent;
  const mode = manual ? "manual" : display ? "auto" : null;
  const unreadable = !manual && preview.data && !preview.data.due_date;
  let hint = "";
  if (manual) hint = "Manual date. Clear the field to return to automatic.";
  else if (preview.data && !unreadable) hint = describeDueRule(preview.data);
  else if (!preview.data && !display) hint = "Set invoice date and agent to get the due date.";
  return (
    <LedgerCompactAuto
      mode={mode || (unreadable ? "auto" : null)}
      isLoading={!manual && preview.isLoading}
      hint={hint}
      warning={unreadable ? describeDueRule(preview.data) : ""}
      error={!manual && preview.error ? "Could not work out the due date. You can enter it manually." : ""}
      onUseAutomatic={() => onPatch(dueInputPatch(""))}
    >
      <Input
        type="date"
        aria-label="Due"
        value={display || ""}
        isDisabled={isDisabled}
        onChange={(e) => onPatch(dueInputPatch(e.target.value))}
        {...controlProps}
      />
    </LedgerCompactAuto>
  );
}

// Table view: several draft rows created one by one with "Save all".
export default function CostEntryTableView({ currencies }) {
  const toast = useToast();
  const [rows, setRows] = useState(() => [newRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pickedOrders, setPickedOrders] = useState([]);
  const [isLoadingSo, setIsLoadingSo] = useState(false);
  const soGenRef = useRef(0);
  const soTimerRef = useRef(null);
  const agents = useLedgerAgentOptions();
  const inputBg = useColorModeValue("white", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");
  const labelColor = useColorModeValue("gray.700", "gray.200");

  const fetchOrders = useCallback(async (search = "") => {
    const gen = ++soGenRef.current;
    setIsLoadingSo(true);
    try {
      const response = await getShippingOrders({
        page: 1,
        page_size: SO_PAGE_SIZE,
        search: String(search || "").trim(),
      });
      if (gen !== soGenRef.current) return;
      setOrders((Array.isArray(response?.orders) ? response.orders : []).filter(isShippingStatusOrder));
    } catch (error) {
      if (gen !== soGenRef.current) return;
      setOrders([]);
    } finally {
      if (gen === soGenRef.current) setIsLoadingSo(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders("");
    return () => {
      if (soTimerRef.current) clearTimeout(soTimerRef.current);
    };
  }, [fetchOrders]);

  const handleSoSearch = useCallback(
    (query) => {
      if (soTimerRef.current) clearTimeout(soTimerRef.current);
      soTimerRef.current = setTimeout(() => fetchOrders(query), 300);
    },
    [fetchOrders]
  );

  const soOptions = useMemo(() => {
    const ids = new Set(orders.map((o) => String(o.id)));
    return [...orders, ...pickedOrders.filter((o) => !ids.has(String(o.id)))].map((order) => ({
      id: order.id,
      name: formatSoLabel(order),
    }));
  }, [orders, pickedOrders]);

  const patchRow = useCallback((key, patch) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        // Editing a row that failed returns it to draft
        const status = row.status === "saved" || row.status === "saving" ? row.status : "draft";
        return { ...row, status, message: status === "draft" ? "" : row.message, values: { ...row.values, ...patch } };
      })
    );
  }, []);

  const onChangeCell = useCallback(
    (rowKey, columnKey, value) => {
      if (columnKey === "currency_id") {
        patchRow(rowKey, { currency_id: value || "", currency_code: "" });
        return;
      }
      patchRow(rowKey, { [columnKey]: value });
    },
    [patchRow]
  );

  const handleSoPick = (rowKey, value) => {
    if (value == null || value === "") {
      patchRow(rowKey, { sale_order_id: "", ...fillCostFromShippingOrder(null) });
      return;
    }
    const order = [...orders, ...pickedOrders].find((o) => String(o.id) === String(value));
    if (order) setPickedOrders((prev) => [...prev.filter((o) => o.id !== order.id), order]);
    patchRow(rowKey, { sale_order_id: value, ...fillCostFromShippingOrder(order) });
  };

  const agentOptions = useMemo(
    () => agents.options.map((a) => ({ ...a, name: agentOptionLabel(a) })),
    [agents.options]
  );

  const agentLabelFor = (id) => {
    const match = agents.options.find((a) => String(a.id) === String(id));
    return match ? agentOptionLabel(match) : "";
  };

  const currencyLabelFor = (id) => {
    const match = (currencies || []).find((c) => String(c.id) === String(id));
    return match?.name || "";
  };

  const renderCell = ({ column, row, value, onChange, isDisabled }) => {
    const common = { size: "sm", bg: inputBg };
    switch (column.type) {
      case "so":
        return (
          <RemoteSearchableSelect
            value={value === "" || value == null ? "" : String(value)}
            onChange={(v) => handleSoPick(row.key, v)}
            options={soOptions}
            placeholder="Select SO..."
            onSearchChange={handleSoSearch}
            isLoading={isLoadingSo}
            fallbackDisplay={row.values.so_number ? `SO-${row.values.so_number}` : ""}
            isDisabled={isDisabled}
            {...common}
          />
        );
      case "agent":
        return (
          <SimpleSearchableSelect
            value={value === "" || value == null ? "" : String(value)}
            onChange={(v) => {
              const picked = agents.options.find((a) => String(a.id) === String(v));
              if (picked) agents.pin(picked);
              onChange(v || "");
            }}
            options={agentOptions}
            placeholder="Select agent..."
            serverSideSearch
            onSearchChange={agents.onSearchChange}
            isLoading={agents.isLoading}
            formatOption={agentOptionLabel}
            renderOption={(opt) => (
              <Box>
                <Text fontSize="sm" fontWeight="600" color={labelColor} noOfLines={1}>
                  {agentOptionLabel(opt)}
                </Text>
                {agentOptionSecondary(opt) ? (
                  <Text fontSize="xs" color={muted} noOfLines={1}>
                    {agentOptionSecondary(opt)}
                  </Text>
                ) : null}
              </Box>
            )}
            isDisabled={isDisabled}
            {...common}
          />
        );
      case "currency":
        return (
          <SimpleSearchableSelect
            value={value === "" || value == null ? "" : String(value)}
            onChange={(v) => onChange(v || "")}
            options={currencies || []}
            placeholder="Currency"
            isDisabled={isDisabled}
            {...common}
          />
        );
      case "roe":
        return (
          <RoeCell
            values={row.values}
            onPatch={(patch) => patchRow(row.key, patch)}
            currencyLabel={currencyLabelFor(row.values.currency_id)}
            controlProps={common}
            isDisabled={isDisabled}
          />
        );
      case "due":
        return (
          <DueCell
            values={row.values}
            onPatch={(patch) => patchRow(row.key, patch)}
            controlProps={common}
            isDisabled={isDisabled}
          />
        );
      default:
        if (column.key === "so_done_status") {
          const label = soDoneStatusLabel(row.values);
          return label === "-" ? null : (
            <Badge colorScheme={soDoneStatusColor(row.values.so_done_status)} fontSize="2xs" whiteSpace="nowrap">
              {label}
            </Badge>
          );
        }
        return null;
    }
  };

  const setRowState = (key, patch) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const handleSaveAll = async () => {
    const pending = rows.filter((row) => row.status !== "saved");
    if (pending.length === 0) return;
    setIsSaving(true);
    let saved = 0;
    let failed = 0;
    for (const row of pending) {
      const requiredError = validateCostForm(row.values);
      if (requiredError) {
        setRowState(row.key, { status: "missing", message: requiredError });
        failed += 1;
        continue;
      }
      setRowState(row.key, { status: "saving", message: "" });
      try {
        if (shouldPrecheckInvoices(row.values, null)) {
          let check = null;
          try {
            check = await checkLedgerCostInvoices({
              agent_id: row.values.agent_id,
              invoices: row.values.invoices,
            });
          } catch {
            // Server is the gate when the pre-check itself fails
          }
          if (check?.has_duplicates) {
            const agentLabel = agentLabelFor(row.values.agent_id);
            setRowState(row.key, {
              status: "duplicate",
              message: check.duplicates.map((d) => formatDuplicateMessage(d, agentLabel)).join(" "),
            });
            failed += 1;
            continue;
          }
        }
        const response = await createLedgerCost(buildCreatePayload(row.values));
        const created = extractLedgerCostRecord(response);
        setRowState(row.key, { status: "saved", message: "", savedId: created?.id ?? null });
        saved += 1;
      } catch (error) {
        setRowState(row.key, {
          status: "error",
          message: extractApiMessage(error, "Failed to create cost."),
        });
        failed += 1;
      }
    }
    setIsSaving(false);
    toast({
      title: failed ? "Saved with errors" : "Saved",
      description: `${saved} saved${failed ? `, ${failed} need attention` : ""}.`,
      status: failed ? (saved ? "warning" : "error") : "success",
      duration: 4000,
      isClosable: true,
    });
  };

  return (
    <LedgerEntryTable
      columns={COST_TABLE_ENTRY_COLUMNS}
      rows={rows}
      onChangeCell={onChangeCell}
      onAddRow={() => setRows((prev) => [...prev, newRow()])}
      onRemoveRow={(key) => setRows((prev) => prev.filter((row) => row.key !== key))}
      onSaveAll={handleSaveAll}
      onClear={() => setRows([newRow()])}
      renderCell={renderCell}
      selectOptions={{ biz_category: BIZ_CATEGORY_OPTIONS }}
      getOpenHref={(row) => (row.savedId != null ? `${FORM_PATH}/${row.savedId}` : null)}
      isSaving={isSaving}
    />
  );
}
