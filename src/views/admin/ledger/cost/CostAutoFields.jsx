import React from "react";
import { Box, FormLabel, Input } from "@chakra-ui/react";
import LedgerAutoTag from "components/ledger/LedgerAutoTag";
import { useLedgerDueDatePreview, useLedgerRoePreview } from "hooks/useLedgerPreviews";
import { describeDueRule } from "utils/ledgerAutoFields";
import { dueInputPatch, roeInputPatch } from "./ledgerCostUtils";

const prettyDate = (iso) => {
  const parts = String(iso || "").split("-");
  if (parts.length !== 3) return iso || "";
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Label (optional) + tag + input + notes. `values` is a form-shaped object, `onPatch(patch)` merges into it.
// Without `label` (table view cells) the tag sits above the input.
const FieldShell = ({ label, labelProps, tag, children, notes }) => (
  <Box>
    {label ? (
      <FormLabel {...labelProps}>
        {label}
        {tag}
      </FormLabel>
    ) : (
      <Box minH="18px">{tag}</Box>
    )}
    {children}
    {notes}
  </Box>
);

export function CostRoeField({
  values,
  onPatch,
  currencyLabel = "",
  label,
  labelProps,
  controlProps,
  isDisabled = false,
}) {
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
  const shownDate = preview.data?.roe_date || values.date_agent_invoice || "";

  let hint = "";
  if (manual) hint = "Clear the field to return to automatic.";
  else if (isDisabled) hint = "";
  else if (preview.isLoading) hint = "Looking up rate...";
  else if (mode === "auto" && rateDate) hint = `Rate of ${prettyDate(rateDate)}`;
  else if (!values.currency_id && display === "") hint = "Pick a currency to get the automatic rate.";

  return (
    <FieldShell
      label={label}
      labelProps={labelProps}
      tag={
        <LedgerAutoTag
          mode={mode}
          isLoading={!manual && preview.isLoading}
          compact={!label}
          onUseAutomatic={() => onPatch(roeInputPatch(""))}
        />
      }
      notes={
        <LedgerAutoTag.Notes
          hint={hint}
          error={!manual && preview.error ? "Could not look up the rate. You can enter it manually." : ""}
          warning={
            noRate
              ? `No exchange rate is available for ${currencyLabel || "this currency"} on ${
                  shownDate ? prettyDate(shownDate) : "this date"
                }. Enter the rate manually.`
              : ""
          }
        />
      }
    >
      <Input
        type="number"
        step="any"
        value={display}
        isDisabled={isDisabled}
        onChange={(e) => onPatch(roeInputPatch(e.target.value))}
        {...controlProps}
      />
    </FieldShell>
  );
}

export function CostDueField({
  values,
  onPatch,
  label,
  labelProps,
  controlProps,
  isDisabled = false,
}) {
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
  if (manual) hint = "Clear the field to return to automatic.";
  else if (preview.isLoading) hint = "Working out due date...";
  else if (preview.data && !unreadable) hint = describeDueRule(preview.data);
  else if (!preview.data && !display) hint = "Set invoice date and agent to get the due date.";

  return (
    <FieldShell
      label={label}
      labelProps={labelProps}
      tag={
        <LedgerAutoTag
          mode={mode}
          isLoading={!manual && preview.isLoading}
          compact={!label}
          onUseAutomatic={() => onPatch(dueInputPatch(""))}
        />
      }
      notes={
        <LedgerAutoTag.Notes
          hint={hint}
          error={!manual && preview.error ? "Could not work out the due date. You can enter it manually." : ""}
          warning={unreadable ? describeDueRule(preview.data) : ""}
        />
      }
    >
      <Input
        type="date"
        value={display}
        isDisabled={isDisabled}
        onChange={(e) => onPatch(dueInputPatch(e.target.value))}
        {...controlProps}
      />
    </FieldShell>
  );
}
