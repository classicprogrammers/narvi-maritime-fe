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
import LedgerCostFileCell from "components/ledger/LedgerCostFileCell";
import LedgerEditViewToggle from "components/ledger/LedgerEditViewToggle";
import {
  checkLedgerCostInvoices,
  deleteLedgerCostInvoiceFile,
  downloadLedgerCostInvoiceFile,
  getLedgerCostById,
  getLedgerCosts,
  updateLedgerCost,
  uploadLedgerCostInvoiceFile,
} from "api/ledgerCost";
import { useMasterData } from "hooks/useMasterData";
import useLedgerAgentOptions from "hooks/useLedgerAgentOptions";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import { COST_TABLE_EDIT_COLUMNS } from "utils/ledgerColumns";
import {
  agentOptionLabel,
  agentOptionSecondary,
  isLedgerCancelled,
  ledgerAgentLabel,
  soDoneStatusColor,
  soDoneStatusLabel,
} from "utils/ledgerDisplay";
import { formatDuplicateMessage, shouldPrecheckInvoices } from "utils/ledgerInvoiceNumbers";
import { saveDownloadedFile } from "utils/ledgerEconomy";
import { readCostInvoiceFile, validateCostInvoiceFile } from "utils/ledgerCostInvoiceFile";
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
  BIZ_CATEGORY_OPTIONS,
  applyComputedFromRecord,
  buildUpdatePayload,
  extractApiMessage,
  extractLedgerCostRecord,
  getMany2oneName,
  getWritableCostSignature,
  recordToForm,
  validateCostForm,
} from "./ledgerCostUtils";
import { DueCell, RoeCell } from "./CostEntryTableView";

const LIST_PATH = "/admin/ledger/cost";
const LOAD_CONCURRENCY = 5;
const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";
const SAVE_FALLBACK_MESSAGE = "Not saved. Fix and press Save changes again.";

const COST_ADAPTER = {
  recordToForm,
  buildUpdatePayload,
  getSignature: getWritableCostSignature,
  applyComputedFromRecord,
  validate: validateCostForm,
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
    const record = await getLedgerCostById(id);
    if (!record) throw new Error("Could not load this record.");
    return recordToEditRow(COST_ADAPTER, record, String(id));
  } catch (error) {
    return makeLoadErrorRow(id, error);
  }
};

const sameText = (a, b) => String(a ?? "") === String(b ?? "");

// Table view: edit existing Cost DB records (one row per record), saved per row with the update endpoint.
export default function CostEditTablePage() {
  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const { refreshCurrencies } = useMasterData();
  const agents = useLedgerAgentOptions();
  const [{ ids, truncated }] = useState(() => parseEditIds(location.search));
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(ids.length > 0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [retryingKeys, setRetryingKeys] = useState([]);
  const [currencies, setCurrencies] = useState(() => getCached(MASTER_KEYS.CURRENCIES) ?? []);
  const rowsRef = useRef(rows);
  const bypassGuardRef = useRef(false);
  rowsRef.current = rows;

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const inputBg = useColorModeValue("white", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");
  const labelColor = useColorModeValue("gray.700", "gray.200");

  const dirtyCount = useMemo(() => rowsToSave(COST_ADAPTER, rows).length, [rows]);
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
      const batch = await getLedgerCosts({ ids: targetIds, page_size: targetIds.length });
      const rows = pickRecordsByIds(targetIds, batch.data).map((record, index) => {
        const id = targetIds[index];
        if (!record) return makeLoadErrorRow(id, new Error("Record not found"));
        try {
          return recordToEditRow(COST_ADAPTER, record, String(id));
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

  const agentOptions = useMemo(
    () => agents.options.map((a) => ({ ...a, name: agentOptionLabel(a) })),
    [agents.options]
  );

  const agentLabelFor = (row) => {
    const match = agents.options.find((a) => String(a.id) === String(row.values.agent_id));
    return match ? agentOptionLabel(match) : ledgerAgentLabel(row.record) || getMany2oneName(row.record?.agent_id);
  };

  const currencyLabelFor = (id) => {
    const match = (currencies || []).find((c) => String(c.id) === String(id));
    return match?.name || "";
  };

  // File actions apply immediately; only that row's invoice_file is refreshed, unsaved edits are kept
  const showFileError = (error, fallback) =>
    toast({
      title: "Error",
      description: extractApiMessage(error, fallback),
      status: "error",
      duration: 5000,
      isClosable: true,
    });

  const refreshRowFile = async (id) => {
    const fresh = await getLedgerCostById(id);
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, record: { ...row.record, invoice_file: fresh?.invoice_file ?? null } } : row
      )
    );
  };

  const handleFileUpload = async (row, file) => {
    const problem = validateCostInvoiceFile(file);
    if (problem) {
      showFileError(new Error(problem), problem);
      return;
    }
    try {
      await uploadLedgerCostInvoiceFile(row.id, file);
      await refreshRowFile(row.id);
    } catch (error) {
      showFileError(error, "Failed to upload the invoice file.");
    }
  };

  const handleFileDelete = async (row) => {
    try {
      await deleteLedgerCostInvoiceFile(row.id);
      await refreshRowFile(row.id);
    } catch (error) {
      showFileError(error, "Failed to remove the invoice file.");
    }
  };

  const handleFileDownload = async (row, file) => {
    try {
      saveDownloadedFile(await downloadLedgerCostInvoiceFile(file, row.id), file);
    } catch (error) {
      showFileError(error, "Failed to download the invoice file.");
    }
  };

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
      case "agent":
        return (
          <SearchableSelect
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
            fallbackDisplay={agentLabelFor(row)}
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
          <SearchableSelect
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
            values={values}
            onPatch={(patch) => patchRow(row.key, patch)}
            currencyLabel={currencyLabelFor(values.currency_id)}
            controlProps={common}
            isDisabled={isDisabled}
            previewEnabled={shouldPreviewAuto({
              manual: values.roe_manual,
              value: values.roe_invoice_date,
              inputsChanged:
                !sameText(values.currency_id, baseline.currency_id) ||
                !sameText(values.date_agent_invoice, baseline.date_agent_invoice),
            })}
          />
        );
      case "due":
        return (
          <DueCell
            values={values}
            onPatch={(patch) => patchRow(row.key, patch)}
            controlProps={common}
            isDisabled={isDisabled}
            previewEnabled={shouldPreviewAuto({
              manual: values.date_due_manual,
              value: values.date_due_agent,
              inputsChanged:
                !sameText(values.agent_id, baseline.agent_id) ||
                !sameText(values.date_agent_invoice, baseline.date_agent_invoice),
            })}
          />
        );
      case "file": {
        const isRowSaving = row.status === EDIT_ROW_STATUS.SAVING;
        const canEdit = ![EDIT_ROW_STATUS.CANCELLED, EDIT_ROW_STATUS.LOAD_ERROR].includes(row.status);
        return (
          <Box pointerEvents={isRowSaving ? "none" : undefined} opacity={isRowSaving ? 0.5 : 1}>
            <LedgerCostFileCell
              file={readCostInvoiceFile(row.record)}
              inputId={`cost-file-${row.id}`}
              canEdit={canEdit}
              onUpload={(picked) => handleFileUpload(row, picked)}
              onDelete={() => handleFileDelete(row)}
              onDownload={(f) => handleFileDownload(row, f)}
            />
          </Box>
        );
      }
      default:
        if (column.key === "so_done_status") {
          const label = soDoneStatusLabel(values);
          return label === "-" ? null : (
            <Badge colorScheme={soDoneStatusColor(values.so_done_status)} fontSize="2xs" whiteSpace="nowrap">
              {label}
            </Badge>
          );
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
    const dirty = rowsToSave(COST_ADAPTER, [row]).length > 0;
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
    const targets = rowsToSave(COST_ADAPTER, rowsRef.current);
    if (targets.length === 0) return;
    setIsSaving(true);
    const results = [];
    const finish = (row, patch) => {
      results.push({ ...row, ...patch });
      updateRow(row.key, (current) => ({ ...current, ...patch }));
    };

    for (const row of targets) {
      const requiredError = COST_ADAPTER.validate(row.values);
      if (requiredError) {
        finish(row, { status: EDIT_ROW_STATUS.MISSING, message: requiredError });
        continue;
      }
      updateRow(row.key, (current) => ({ ...current, status: EDIT_ROW_STATUS.SAVING, message: "" }));
      try {
        // Same-agent duplicate pre-check when the agent changed; the server is the gate if the call fails
        if (shouldPrecheckInvoices(row.values, row.baseline)) {
          let check = null;
          try {
            check = await checkLedgerCostInvoices({
              agent_id: Number(row.values.agent_id),
              invoices: row.values.invoices,
              exclude_id: row.id,
            });
          } catch {
            // proceed
          }
          if (check?.has_duplicates) {
            const agentLabel = agentLabelFor(row);
            finish(row, {
              status: EDIT_ROW_STATUS.DUPLICATE,
              message: check.duplicates.map((d) => formatDuplicateMessage(d, agentLabel)).join(" "),
            });
            continue;
          }
        }
        const update = buildRowUpdate(COST_ADAPTER, row);
        if (update.skip) {
          finish(row, { baseline: { ...row.values }, status: EDIT_ROW_STATUS.NO_CHANGES, message: "" });
          continue;
        }
        const response = await updateLedgerCost(update.payload);
        let record = null;
        try {
          record = await getLedgerCostById(row.id);
        } catch {
          // fall back to the update response
        }
        if (!record) record = extractLedgerCostRecord(response);
        if (record && !("invoice_file" in record)) {
          record = { ...record, invoice_file: row.record?.invoice_file ?? null };
        }
        if (record) {
          const saved = applySavedRecord(COST_ADAPTER, row, record);
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
      writeLedgerEditView("cost", "table");
      return;
    }
    if (dirtyCount > 0 && !window.confirm(LEAVE_MESSAGE)) return;
    writeLedgerEditView("cost", "form");
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
            <Heading size="lg">Edit Cost Entries ({rows.length})</Heading>
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
            <LedgerEntryTable
              mode="edit"
              columns={COST_TABLE_EDIT_COLUMNS}
              rows={rows}
              onChangeCell={onChangeCell}
              onSaveAll={handleSave}
              renderCell={renderCell}
              selectOptions={{ biz_category: BIZ_CATEGORY_OPTIONS }}
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
  return patchEditRow(COST_ADAPTER, row, patch);
}
