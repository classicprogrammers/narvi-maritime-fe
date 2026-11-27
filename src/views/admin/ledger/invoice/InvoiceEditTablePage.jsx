import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  IconButton,
  Spinner,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdArrowBack, MdClose, MdOpenInNew } from "react-icons/md";
import { Prompt, useHistory, useLocation } from "react-router-dom";
import SearchableSelect from "components/forms/SearchableSelect";
import LedgerEntryTable from "components/ledger/LedgerEntryTable";
import LedgerEditViewToggle from "components/ledger/LedgerEditViewToggle";
import { getLedgerInvoiceById, getLedgerInvoices, updateLedgerInvoice } from "api/ledgerInvoice";
import { useMasterData } from "hooks/useMasterData";
import useLedgerIssuerOptions from "hooks/useLedgerIssuerOptions";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import { INVOICE_TABLE_EDIT_COLUMNS } from "utils/ledgerColumns";
import { isLedgerCancelled, soDoneStatusColor, soDoneStatusLabel } from "utils/ledgerDisplay";
import {
  buildLedgerEditPath,
  parseEditIds,
  writeLedgerEditView,
  LEDGER_EDIT_MAX_ROWS,
} from "utils/ledgerEditNav";
import {
  EDIT_ROW_STATUS,
  applySavedRecord,
  buildRowUpdate,
  patchEditRow,
  pickRecordsByIds,
  recordToEditRow,
  rowsToSave,
  saveSummary,
  shouldPreviewAuto,
} from "utils/ledgerEditRows";
import { mapWithConcurrency } from "utils/mapWithConcurrency";
import {
  GST_OUTPUT_OPTIONS,
  applyComputedFromRecord,
  buildUpdatePayload,
  extractApiMessage,
  extractLedgerInvoiceRecord,
  getWritableInvoiceSignature,
  paymentStatusDisplay,
  recordToForm,
  validateInvoiceForm,
} from "./ledgerInvoiceUtils";
import { DueCell, RoeCell } from "./InvoiceTableView";

const LIST_PATH = "/admin/ledger/invoice";
const LOAD_CONCURRENCY = 5;
const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";
const SAVE_FALLBACK_MESSAGE = "Not saved. Fix and press Save changes again.";

const INVOICE_ADAPTER = {
  recordToForm,
  buildUpdatePayload,
  getSignature: getWritableInvoiceSignature,
  applyComputedFromRecord,
  validate: validateInvoiceForm,
  isCancelled: isLedgerCancelled,
};

const makeLoadErrorRow = (id, error) => {
  const baseline = recordToForm(null);
  return {
    key: String(id),
    id,
    record: null,
    baseline,
    values: { ...baseline },
    status: EDIT_ROW_STATUS.LOAD_ERROR,
    message: extractApiMessage(error, "Could not load this record."),
    acceptedOtherAgentKey: "",
  };
};

const loadRow = async (id) => {
  try {
    const record = await getLedgerInvoiceById(id);
    if (!record) throw new Error("Could not load this record.");
    return recordToEditRow(INVOICE_ADAPTER, record, String(id));
  } catch (error) {
    return makeLoadErrorRow(id, error);
  }
};

const sameText = (a, b) => String(a ?? "") === String(b ?? "");

// Table view: edit existing Invoice DB records (one row per record), saved per row with the update endpoint.
export default function InvoiceEditTablePage() {
  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const { refreshCurrencies } = useMasterData();
  const [{ ids, truncated }] = useState(() => parseEditIds(location.search));
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(ids.length > 0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [retryingKeys, setRetryingKeys] = useState([]);
  const [currencies, setCurrencies] = useState(() => getCached(MASTER_KEYS.CURRENCIES) ?? []);
  const issuers = useLedgerIssuerOptions();
  const { pin: pinIssuer } = issuers;
  const rowsRef = useRef(rows);
  const bypassGuardRef = useRef(false);
  rowsRef.current = rows;

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const inputBg = useColorModeValue("white", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");

  const dirtyCount = useMemo(() => rowsToSave(INVOICE_ADAPTER, rows).length, [rows]);
  const guardActive = isSaving || dirtyCount > 0;
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const allLoadFailed = rows.length > 0 && rows.every((row) => row.status === EDIT_ROW_STATUS.LOAD_ERROR);

  // Empty ids: back to the list with an info toast
  useEffect(() => {
    if (ids.length > 0) return;
    toast({ title: "No records selected.", status: "info", duration: 4000, isClosable: true });
    history.replace(LIST_PATH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One request for all selected ids. If it fails, load per row (at most LOAD_CONCURRENCY in flight).
  const loadAll = useCallback(async (targetIds) => {
    setIsLoading(true);
    setLoadedCount(0);
    try {
      const batch = await getLedgerInvoices({ ids: targetIds, page_size: targetIds.length });
      const rows = pickRecordsByIds(targetIds, batch.data).map((record, index) => {
        const id = targetIds[index];
        if (!record) return makeLoadErrorRow(id, new Error("Record not found"));
        try {
          return recordToEditRow(INVOICE_ADAPTER, record, String(id));
        } catch (error) {
          return makeLoadErrorRow(id, error);
        }
      });
      setLoadedCount(targetIds.length);
      return rows;
    } catch {
      // fall through to per-row loading
    }
    const results = await mapWithConcurrency(targetIds, LOAD_CONCURRENCY, async (id) => {
      const row = await loadRow(id);
      setLoadedCount((n) => n + 1);
      return row;
    });
    return results.map((result, index) => (result.ok ? result.value : makeLoadErrorRow(targetIds[index], result.error)));
  }, []);

  useEffect(() => {
    if (ids.length === 0) return undefined;
    let cancelled = false;
    loadAll(ids).then((loaded) => {
      if (cancelled) return;
      setRows(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin each loaded row's current issuer so its label shows even if a search does not return it
  useEffect(() => {
    rows.forEach((row) => {
      const { issued_by_id: id, issued_by: name } = row.baseline || {};
      if (id !== "" && id != null) pinIssuer({ id, name: name || String(id) });
    });
  }, [rows, pinIssuer]);

  useEffect(() => {
    if (truncated) {
      toast({
        title: `Only the first ${LEDGER_EDIT_MAX_ROWS} records were loaded.`,
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshCurrencies()
      .then((currencyList) => {
        if (cancelled) return;
        setCurrencies(Array.isArray(currencyList) ? currencyList : getCached(MASTER_KEYS.CURRENCIES) ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshCurrencies]);

  // Browser close / reload guard
  useEffect(() => {
    if (!guardActive) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [guardActive]);

  const updateRow = useCallback((key, fn) => {
    setRows((prev) => prev.map((row) => (row.key === key ? fn(row) : row)));
  }, []);

  const onChangeCell = useCallback(
    (rowKey, columnKey, value) => {
      const patch = columnKey === "currency_id" ? { currency_id: value || "", currency_code: "" } : { [columnKey]: value };
      updateRow(rowKey, (row) => patchRowValues(row, patch));
    },
    [updateRow]
  );

  const patchRow = useCallback(
    (rowKey, patch) => updateRow(rowKey, (row) => patchRowValues(row, patch)),
    [updateRow]
  );

  const renderCell = ({ column, row, value, onChange, isDisabled }) => {
    const common = { size: "sm", bg: inputBg };
    const { values, baseline } = row;
    switch (column.type) {
      case "so":
        return (
          <Text fontSize="sm" color={muted} noOfLines={1} title={values.so_number ? `SO-${values.so_number}` : ""}>
            {values.so_number ? `SO-${values.so_number}` : "-"}
          </Text>
        );
      case "currency":
        return (
          <SearchableSelect
            value={value === "" || value == null ? "" : String(value)}
            onChange={(v) => onChange(v || "")}
            options={currencies || []}
            placeholder="Currency"
            isDisabled={isDisabled}
            {...common}
          />
        );
      case "issuer":
        return (
          <SearchableSelect
            value={value === "" || value == null ? "" : String(value)}
            onChange={(v) => {
              const picked = issuers.options.find((o) => String(o.id) === String(v));
              if (picked) pinIssuer(picked);
              patchRow(row.key, { issued_by_id: v || "", issued_by: v ? picked?.name || "" : "" });
            }}
            options={issuers.options}
            placeholder="Select issuer..."
            serverSideSearch
            onSearchChange={issuers.onSearchChange}
            isLoading={issuers.isLoading}
            fallbackDisplay={values.issued_by || baseline.issued_by || ""}
            isDisabled={isDisabled}
            {...common}
          />
        );
      case "roe":
        return (
          <RoeCell
            values={values}
            onPatch={(patch) => patchRow(row.key, patch)}
            isDisabled={isDisabled}
            previewEnabled={shouldPreviewAuto({
              manual: values.roe_manual,
              value: values.roe,
              inputsChanged:
                !sameText(values.currency_id, baseline.currency_id) ||
                !sameText(values.date_sales_invoice, baseline.date_sales_invoice),
            })}
          />
        );
      case "due":
        return (
          <DueCell
            values={values}
            onPatch={(patch) => patchRow(row.key, patch)}
            isDisabled={isDisabled}
            previewEnabled={shouldPreviewAuto({
              manual: values.date_due_manual,
              value: values.date_due,
              inputsChanged:
                !sameText(values.client_id, baseline.client_id) ||
                !sameText(values.date_sales_invoice, baseline.date_sales_invoice),
            })}
          />
        );
      default:
        if (column.key === "so_done_status") {
          const label = soDoneStatusLabel(values);
          return label === "-" ? null : (
            <Badge colorScheme={soDoneStatusColor(values.so_done_status)} fontSize="2xs" whiteSpace="nowrap">
              {label}
            </Badge>
          );
        }
        if (column.key === "payment_status") {
          const status = String(values.payment_status || "").toLowerCase();
          return status ? (
            <Badge
              colorScheme={status === "paid" ? "green" : "orange"}
              variant="subtle"
              borderRadius="full"
              px={2.5}
              py={0.5}
              fontSize="xs"
              textTransform="none"
            >
              {paymentStatusDisplay(values.payment_status, values.payment_status_label)}
            </Badge>
          ) : null;
        }
        return null;
    }
  };

  const retryRows = async (keys) => {
    setRetryingKeys((prev) => [...prev, ...keys]);
    const results = await mapWithConcurrency(keys, LOAD_CONCURRENCY, (key) => loadRow(Number(key)));
    setRows((prev) =>
      prev.map((row) => {
        const index = keys.indexOf(row.key);
        if (index < 0) return row;
        return results[index]?.ok ? results[index].value : row;
      })
    );
    setRetryingKeys((prev) => prev.filter((key) => !keys.includes(key)));
  };

  const confirmDiscardRow = (row) => {
    const dirty = rowsToSave(INVOICE_ADAPTER, [row]).length > 0;
    return !dirty || window.confirm(LEAVE_MESSAGE);
  };

  const openInForm = (row) => {
    history.push(buildLedgerEditPath({ base: LIST_PATH, view: "form", ids: rowIds, id: row.id }));
  };

  const renderActions = (row) => {
    const busy = isSaving || row.status === EDIT_ROW_STATUS.SAVING;
    return (
      <Flex gap="1" justify="center" align="center">
        {row.status === EDIT_ROW_STATUS.LOAD_ERROR ? (
          <Button
            size="xs"
            variant="outline"
            isLoading={retryingKeys.includes(row.key)}
            isDisabled={isSaving}
            onClick={() => retryRows([row.key])}
          >
            Retry
          </Button>
        ) : (
          <Tooltip label="Open in form view" hasArrow>
            <IconButton
              aria-label="Open in form view"
              icon={<Icon as={MdOpenInNew} />}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              isDisabled={busy}
              onClick={() => openInForm(row)}
            />
          </Tooltip>
        )}
        <Tooltip label="Remove from this screen. No data is deleted." hasArrow>
          <IconButton
            aria-label="Remove from table"
            icon={<Icon as={MdClose} />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            isDisabled={busy}
            onClick={() => {
              if (!confirmDiscardRow(row)) return;
              setRows((prev) => prev.filter((r) => r.key !== row.key));
            }}
          />
        </Tooltip>
      </Flex>
    );
  };

  const handleSave = async () => {
    const targets = rowsToSave(INVOICE_ADAPTER, rowsRef.current);
    if (targets.length === 0) return;
    setIsSaving(true);
    const results = [];
    const finish = (row, patch) => {
      results.push({ ...row, ...patch });
      updateRow(row.key, (current) => ({ ...current, ...patch }));
    };

    for (const row of targets) {
      const requiredError = INVOICE_ADAPTER.validate(row.values, row.baseline);
      if (requiredError) {
        finish(row, { status: EDIT_ROW_STATUS.MISSING, message: requiredError });
        continue;
      }
      updateRow(row.key, (current) => ({ ...current, status: EDIT_ROW_STATUS.SAVING, message: "" }));
      try {
        const update = buildRowUpdate(INVOICE_ADAPTER, row);
        if (update.skip) {
          finish(row, { baseline: { ...row.values }, status: EDIT_ROW_STATUS.NO_CHANGES, message: "" });
          continue;
        }
        const response = await updateLedgerInvoice(update.payload);
        let record = null;
        try {
          record = await getLedgerInvoiceById(row.id);
        } catch {
          // fall back to the update response
        }
        if (!record) record = extractLedgerInvoiceRecord(response);
        if (record) {
          const saved = applySavedRecord(INVOICE_ADAPTER, row, record);
          finish(row, saved);
        } else {
          finish(row, { baseline: { ...row.values }, status: EDIT_ROW_STATUS.SAVED, message: "" });
        }
      } catch (error) {
        finish(row, {
          status: EDIT_ROW_STATUS.ERROR,
          message: extractApiMessage(error, SAVE_FALLBACK_MESSAGE),
        });
      }
    }

    setIsSaving(false);
    const summary = saveSummary(results);
    toast({
      title: summary.text,
      description: summary.attention ? SAVE_FALLBACK_MESSAGE : undefined,
      status: summary.attention ? "warning" : "success",
      duration: 5000,
      isClosable: true,
    });
  };

  const handleViewChange = (view) => {
    if (view === "table") {
      writeLedgerEditView("invoice", "table");
      return;
    }
    if (dirtyCount > 0 && !window.confirm(LEAVE_MESSAGE)) return;
    writeLedgerEditView("invoice", "form");
    bypassGuardRef.current = true;
    history.push(buildLedgerEditPath({ base: LIST_PATH, view: "form", ids: rowIds }));
  };

  if (ids.length === 0) return null;

  const backButton = (
    <Button variant="outline" size="sm" onClick={() => history.push(LIST_PATH)} isDisabled={isSaving}>
      Back to list
    </Button>
  );

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Prompt when={guardActive} message={() => (bypassGuardRef.current ? true : LEAVE_MESSAGE)} />
      <Box px="25px" pb={8}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3} mb={4}>
          <Flex align="center" gap={3}>
            <IconButton
              aria-label="Back to list"
              icon={<Icon as={MdArrowBack} />}
              variant="ghost"
              isDisabled={isSaving}
              onClick={() => history.push(LIST_PATH)}
            />
            <Heading size="lg">Edit Invoice Entries ({rows.length})</Heading>
          </Flex>
          <LedgerEditViewToggle
            view="table"
            onChange={handleViewChange}
            isDisabled={isSaving || isLoading || rows.length === 0}
          />
          <Flex align="center" gap={3} wrap="wrap">
            <Text fontSize="sm" color={muted}>
              {rows.length} row{rows.length === 1 ? "" : "s"}, {dirtyCount} edited
            </Text>
            {backButton}
          </Flex>
        </Flex>

        {truncated ? (
          <Alert status="warning" borderRadius="md" mb={4}>
            <AlertIcon />
            Only the first {LEDGER_EDIT_MAX_ROWS} records were loaded.
          </Alert>
        ) : null}

        {isLoading ? (
          <Flex direction="column" align="center" justify="center" py={16} gap={3}>
            <Spinner />
            <Text color={muted}>
              Loading {loadedCount} of {ids.length} records...
            </Text>
          </Flex>
        ) : rows.length === 0 ? (
          <Flex direction="column" align="center" py={16} gap={3}>
            <Text color={muted}>No rows left.</Text>
            {backButton}
          </Flex>
        ) : (
          <>
            {allLoadFailed ? (
              <Alert status="error" borderRadius="md" mb={4}>
                <AlertIcon />
                <Text flex="1">Could not load the selected records.</Text>
                <Button
                  size="sm"
                  variant="outline"
                  ml={3}
                  isLoading={retryingKeys.length > 0}
                  onClick={() => retryRows(rows.map((row) => row.key))}
                >
                  Retry all
                </Button>
              </Alert>
            ) : null}
            {issuers.error ? (
              <Flex mb={2} align="center" gap={2}>
                <Text fontSize="xs" color="red.500">
                  Could not load issuers.
                </Text>
                <Button size="xs" variant="link" colorScheme="blue" onClick={issuers.retry}>
                  Retry
                </Button>
              </Flex>
            ) : null}
            <LedgerEntryTable
              mode="edit"
              columns={INVOICE_TABLE_EDIT_COLUMNS}
              rows={rows}
              onChangeCell={onChangeCell}
              onSaveAll={handleSave}
              renderCell={renderCell}
              selectOptions={{ gst_output_tax: GST_OUTPUT_OPTIONS }}
              isSaving={isSaving}
              pendingCount={dirtyCount}
              renderActions={renderActions}
              isRowDisabled={(row) =>
                [EDIT_ROW_STATUS.CANCELLED, EDIT_ROW_STATUS.LOAD_ERROR].includes(row.status)
              }
            />
          </>
        )}
      </Box>
    </Box>
  );
}

// Merge a cell edit into a row. Locked rows (cancelled / load error / saving) are untouched.
function patchRowValues(row, patch) {
  return patchEditRow(INVOICE_ADAPTER, row, patch);
}
