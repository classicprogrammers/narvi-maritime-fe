import React, { useCallback, useRef, useState } from "react";
import { Badge, Input, Text, useColorModeValue, useToast } from "@chakra-ui/react";
import RemoteSearchableSelect from "components/forms/RemoteSearchableSelect";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import LedgerCompactAuto from "components/ledger/LedgerCompactAuto";
import LedgerEntryTable from "components/ledger/LedgerEntryTable";
import { createLedgerInvoice } from "api/ledgerInvoice";
import { useLedgerDueDatePreview, useLedgerRoePreview } from "hooks/useLedgerPreviews";
import { describeDueRule } from "utils/ledgerAutoFields";
import { soDoneStatusColor, soDoneStatusLabel } from "utils/ledgerDisplay";
import { INVOICE_TABLE_ENTRY_COLUMNS } from "utils/ledgerColumns";
import {
  applyDueDateInput,
  applyRoeInput,
  buildCreatePayload,
  emptyInvoiceForm,
  extractApiMessage,
  fillFromShippingOrder,
  formatSoLabel,
  GST_OUTPUT_OPTIONS,
  validateInvoiceForm,
} from "./ledgerInvoiceUtils";

const FORM_PATH = "/admin/ledger/invoice/form";

const newRow = (key) => ({ key, values: emptyInvoiceForm(), status: "draft", message: "", savedId: null, soLabel: "" });

// ROE cell: shows the previewed automatic rate until the user types one
function RoeCell({ values, isDisabled, onPatch }) {
  const isManual = Boolean(values.roe_manual);
  const preview = useLedgerRoePreview({
    kind: "invoice",
    currencyId: values.currency_id,
    date: values.date_sales_invoice,
    enabled: !isManual && !isDisabled,
  });
  const inputBg = useColorModeValue("white", "gray.700");
  const autoRoe = preview.data ? preview.data.roe : null;
  const shown = isManual ? values.roe : autoRoe ?? values.roe;
  const noRate = !isManual && preview.data && preview.data.roe == null;
  return (
    <LedgerCompactAuto
      mode={values.currency_id ? (isManual ? "manual" : "auto") : null}
      isLoading={preview.isLoading}
      hint={!isManual && preview.data && !noRate ? "Automatic rate for the invoice date." : ""}
      warning={noRate ? "No exchange rate for this date. Enter the rate manually." : ""}
      error={preview.error ? "Could not look up the rate." : ""}
      onUseAutomatic={() => onPatch(applyRoeInput(""))}
    >
      <Input
        size="sm"
        type="number"
        step="any"
        bg={inputBg}
        aria-label="ROE"
        isDisabled={isDisabled}
        value={shown ?? ""}
        onChange={(e) => onPatch(applyRoeInput(e.target.value))}
      />
    </LedgerCompactAuto>
  );
}

// Due date cell: automatic from the client's payment terms until a date is typed
function DueCell({ values, isDisabled, onPatch }) {
  const isManual = Boolean(values.date_due_manual);
  const preview = useLedgerDueDatePreview({
    partnerId: values.client_id,
    date: values.date_sales_invoice,
    enabled: !isManual && !isDisabled,
  });
  const inputBg = useColorModeValue("white", "gray.700");
  const shown = isManual ? values.date_due : preview.data ? preview.data.due_date || "" : values.date_due;
  const unreadable = !isManual && preview.data && !preview.data.due_date;
  return (
    <LedgerCompactAuto
      mode={values.client_id && values.date_sales_invoice ? (isManual ? "manual" : "auto") : null}
      isLoading={preview.isLoading}
      hint={!isManual && preview.data ? describeDueRule(preview.data) : ""}
      warning={unreadable ? describeDueRule(preview.data) : ""}
      onUseAutomatic={() => onPatch(applyDueDateInput(""))}
    >
      <Input
        size="sm"
        type="date"
        bg={inputBg}
        aria-label="Due"
        isDisabled={isDisabled}
        value={shown || ""}
        onChange={(e) => onPatch(applyDueDateInput(e.target.value))}
      />
    </LedgerCompactAuto>
  );
}

// Table view: several draft invoices at once, "Save all" creates each one in turn.
export default function InvoiceTableView({
  currencies,
  soOptions,
  shippingOrders,
  isLoadingSo,
  onSoSearchChange,
}) {
  const toast = useToast();
  const rowCounter = useRef(1);
  const [rows, setRows] = useState(() => [newRow(1)]);
  const [isSaving, setIsSaving] = useState(false);
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  const patchRow = useCallback((key, patch, extra = {}) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const reopened = ["error", "missing", "duplicate"].includes(row.status);
        return {
          ...row,
          ...extra,
          values: { ...row.values, ...patch },
          status: reopened ? "draft" : row.status,
          message: reopened ? "" : row.message,
        };
      })
    );
  }, []);

  const handleAddRow = () => {
    rowCounter.current += 1;
    setRows((prev) => [...prev, newRow(rowCounter.current)]);
  };

  const handleRemoveRow = (key) => setRows((prev) => prev.filter((row) => row.key !== key));

  const handleClear = () => {
    rowCounter.current += 1;
    setRows([newRow(rowCounter.current)]);
  };

  const handleSoChange = (row, value) => {
    if (value == null || value === "") {
      patchRow(row.key, { sale_order_id: "", ...fillFromShippingOrder(null) }, { soLabel: "" });
      return;
    }
    const order = shippingOrders.find((item) => String(item.id) === String(value));
    patchRow(
      row.key,
      { sale_order_id: value, ...(order ? fillFromShippingOrder(order) : {}) },
      { soLabel: order ? formatSoLabel(order) : row.soLabel }
    );
  };

  const handleCurrencyChange = (row, value) => {
    const selected = currencies.find((item) => String(item.id) === String(value));
    patchRow(row.key, {
      currency_id: value || "",
      currency_code: selected?.name || selected?.symbol || "",
    });
  };

  const setStatus = (key, status, message = "", savedId = null) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, status, message, savedId } : row)));

  const handleSaveAll = async () => {
    if (isSaving) return;
    const pending = rows.filter((row) => row.status !== "saved");
    setIsSaving(true);
    let saved = 0;
    let failed = 0;
    for (const row of pending) {
      const problem = validateInvoiceForm(row.values);
      if (problem) {
        setStatus(row.key, "missing", problem);
        failed += 1;
        continue;
      }
      setStatus(row.key, "saving");
      try {
        const response = await createLedgerInvoice(buildCreatePayload(row.values));
        const created = response?.data || response?.result?.data || response?.result || response;
        setStatus(row.key, "saved", "", created?.id ?? null);
        saved += 1;
      } catch (error) {
        setStatus(row.key, "error", extractApiMessage(error, "Failed to create invoice."));
        failed += 1;
      }
    }
    setIsSaving(false);
    toast({
      title: failed ? "Some rows were not saved" : "Saved",
      description: `${saved} invoice${saved === 1 ? "" : "s"} saved${failed ? `, ${failed} need attention` : ""}.`,
      status: failed ? "warning" : "success",
      duration: 4000,
      isClosable: true,
    });
  };

  const renderCell = ({ column, row, isDisabled }) => {
    const { values } = row;
    if (column.type === "so") {
      return (
        <RemoteSearchableSelect
          size="sm"
          value={values.sale_order_id === "" ? "" : String(values.sale_order_id)}
          onChange={(v) => handleSoChange(row, v)}
          options={soOptions}
          placeholder="Select SO..."
          onSearchChange={onSoSearchChange}
          isLoading={isLoadingSo}
          fallbackDisplay={row.soLabel}
          isDisabled={isDisabled}
        />
      );
    }
    if (column.type === "currency") {
      return (
        <SimpleSearchableSelect
          size="sm"
          value={values.currency_id === "" ? "" : String(values.currency_id)}
          onChange={(v) => handleCurrencyChange(row, v)}
          options={currencies}
          placeholder="Currency..."
          fallbackDisplay={values.currency_code}
          isDisabled={isDisabled}
        />
      );
    }
    if (column.type === "roe") {
      return <RoeCell values={values} isDisabled={isDisabled} onPatch={(patch) => patchRow(row.key, patch)} />;
    }
    if (column.type === "due") {
      return <DueCell values={values} isDisabled={isDisabled} onPatch={(patch) => patchRow(row.key, patch)} />;
    }
    if (column.key === "so_done_status") {
      const label = soDoneStatusLabel(values);
      return label === "-" ? (
        <Text fontSize="sm" color={mutedColor}>-</Text>
      ) : (
        <Badge colorScheme={soDoneStatusColor(values.so_done_status)} fontSize="2xs" whiteSpace="nowrap">
          {label}
        </Badge>
      );
    }
    return undefined;
  };

  return (
    <LedgerEntryTable
      columns={INVOICE_TABLE_ENTRY_COLUMNS}
      rows={rows}
      onChangeCell={(key, column, value) => patchRow(key, { [column]: value })}
      onAddRow={handleAddRow}
      onRemoveRow={handleRemoveRow}
      onSaveAll={handleSaveAll}
      onClear={handleClear}
      renderCell={renderCell}
      selectOptions={{ gst_output_tax: GST_OUTPUT_OPTIONS }}
      getOpenHref={(row) => (row.savedId != null ? `${FORM_PATH}/${row.savedId}` : null)}
      isSaving={isSaving}
    />
  );
}
