import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import {
  buildManualAddStockLines,
  buildManualFreeTextLine,
  buildManualLineDelete,
  buildManualLineEdit,
  formatManualValue,
  manualLinesTotals,
  manualLineValue,
  parseManualLinesFromApi,
  readManualTotals,
  validateManualLine,
} from "utils/ciPlManual";
import CiPlManualStockPicker from "./CiPlManualStockPicker";

const EDIT_PROPS = ["description", "hsCode", "quantity", "unitPrice", "box", "weight"];

const isDirty = (row, baseline) =>
  !!baseline && EDIT_PROPS.some((prop) => String(row[prop] ?? "") !== String(baseline[prop] ?? ""));

const blankRow = (key) => ({
  key,
  id: null,
  stockListId: null,
  stockItemId: "",
  isStockLine: false,
  description: "",
  hsCode: "",
  quantity: "",
  unitPrice: "",
  box: "",
  weight: "",
  valueUsd: "",
});

const cellProps = {
  borderRight: "1px",
  borderColor: "gray.300",
  py: 1,
  px: 2,
  fontSize: "xs",
  verticalAlign: "top",
};

const headProps = {
  borderRight: "1px",
  borderColor: "gray.300",
  py: 2,
  px: 2,
  fontSize: "xs",
  fontWeight: "bold",
};

const errorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Could not save the line";

const CiPlManualLines = ({
  stockList,
  form,
  vesselId = null,
  currencyLabel = "",
  isReadOnly = false,
  isBusy = false,
  onSaveLines,
  onPendingChange,
  renderFooter,
}) => {
  const picker = useDisclosure();
  const [rows, setRows] = useState(() => parseManualLinesFromApi(stockList));
  const [newRows, setNewRows] = useState([]);
  const [rowState, setRowState] = useState({}); // key -> { saving, error }
  const [toolbarBusy, setToolbarBusy] = useState(false);
  const [toolbarError, setToolbarError] = useState("");
  const baselineRef = useRef(new Map()); // id -> last server row
  const rowsRef = useRef(rows);
  const newRowsRef = useRef(newRows);
  const newCounterRef = useRef(0);
  const lastPendingRef = useRef(null);
  rowsRef.current = rows;
  newRowsRef.current = newRows;

  // Replace rows from the server; rows with unsaved edits are kept unless listed in savedKeys.
  const applyServer = useCallback((list, savedKeys = []) => {
    const parsed = parseManualLinesFromApi(list);
    const oldBase = baselineRef.current;
    baselineRef.current = new Map(parsed.filter((r) => r.id != null).map((r) => [r.id, r]));
    setRows((prev) =>
      parsed.map((row) => {
        if (row.id == null || savedKeys.includes(row.key)) return row;
        const local = prev.find((r) => r.id === row.id);
        return local && isDirty(local, oldBase.get(row.id)) ? local : row;
      })
    );
  }, []);

  useEffect(() => {
    applyServer(stockList);
  }, [stockList, applyServer]);

  const hasPending = useMemo(
    () => newRows.length > 0 || rows.some((row) => isDirty(row, baselineRef.current.get(row.id))),
    [rows, newRows]
  );

  useEffect(() => {
    if (lastPendingRef.current === hasPending) return;
    lastPendingRef.current = hasPending;
    if (onPendingChange) onPendingChange(hasPending);
  }, [hasPending, onPendingChange]);

  // Tell the parent nothing is pending when this component goes away.
  useEffect(
    () => () => {
      if (onPendingChange) onPendingChange(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const setState = (key, patch) =>
    setRowState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const locked = isBusy || isReadOnly;

  const changeRow = (key, prop, value) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [prop]: value } : r)));
  };

  const changeNewRow = (key, prop, value) => {
    setNewRows((prev) => prev.map((r) => (r.key === key ? { ...r, [prop]: value } : r)));
  };

  const saveRow = async (key) => {
    const row = rowsRef.current.find((r) => r.key === key);
    if (!row || row.id == null || locked || rowState[key]?.saving) return;
    const baseline = baselineRef.current.get(row.id);
    if (!isDirty(row, baseline)) return;
    const invalid = validateManualLine(row);
    if (invalid) {
      setState(key, { error: invalid });
      return;
    }
    const payload = buildManualLineEdit(row, baseline);
    if (!payload) return;
    setState(key, { saving: true, error: "" });
    try {
      const saved = await onSaveLines([payload]);
      if (saved) applyServer(saved.stock_list, [key]);
      setState(key, { saving: false, error: "" });
    } catch (err) {
      setState(key, { saving: false, error: errorMessage(err) });
    }
  };

  // An edit committed while a line save was running is not lost: when the lock lifts, save the
  // next dirty row (rows that already show an error are left for the user to fix).
  useEffect(() => {
    if (locked) return;
    const next = rowsRef.current.find(
      (r) =>
        r.id != null &&
        !rowState[r.key]?.saving &&
        !rowState[r.key]?.error &&
        isDirty(r, baselineRef.current.get(r.id))
    );
    if (next) saveRow(next.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const removeRow = async (row) => {
    const payload = buildManualLineDelete(row);
    if (!payload || locked) return;
    if (!window.confirm("Remove this line?")) return;
    setState(row.key, { saving: true, error: "" });
    try {
      const saved = await onSaveLines([payload]);
      if (saved) applyServer(saved.stock_list, [row.key]);
      setState(row.key, { saving: false, error: "" });
    } catch (err) {
      setState(row.key, { saving: false, error: errorMessage(err) });
    }
  };

  const addBlankRow = () => {
    newCounterRef.current += 1;
    setNewRows((prev) => [...prev, blankRow(`n-${newCounterRef.current}`)]);
  };

  const discardNewRow = (key) => {
    setNewRows((prev) => prev.filter((r) => r.key !== key));
  };

  const saveNewRow = async (key) => {
    const row = newRowsRef.current.find((r) => r.key === key);
    if (!row || locked) return;
    const invalid = validateManualLine(row);
    if (invalid) {
      setState(key, { error: invalid });
      return;
    }
    setState(key, { saving: true, error: "" });
    try {
      const saved = await onSaveLines([buildManualFreeTextLine(row)]);
      if (saved) {
        applyServer(saved.stock_list);
        discardNewRow(key);
      } else {
        setState(key, { saving: false });
      }
    } catch (err) {
      setState(key, { saving: false, error: errorMessage(err) });
    }
  };

  const addStock = async (ids) => {
    const payload = buildManualAddStockLines(ids, rowsRef.current);
    if (payload.length === 0) return;
    setToolbarBusy(true);
    setToolbarError("");
    try {
      const saved = await onSaveLines(payload);
      if (saved) applyServer(saved.stock_list);
    } catch (err) {
      setToolbarError(errorMessage(err));
    } finally {
      setToolbarBusy(false);
    }
  };

  const existingStockListIds = useMemo(
    () => rows.map((r) => r.stockListId).filter((id) => id != null),
    [rows]
  );

  const totals = readManualTotals(form);
  const quantityTotal = manualLinesTotals(rows).quantity;

  const renderInput = (row, prop, onChange, onCommit, { isDisabled, textarea } = {}) => {
    const Field = textarea ? Textarea : Input;
    return (
      <Field
        size="xs"
        value={row[prop]}
        isDisabled={locked || isDisabled}
        onChange={(e) => onChange(row.key, prop, e.target.value)}
        onBlur={onCommit ? () => onCommit(row.key) : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        {...(textarea ? { rows: 1, resize: "vertical", minH: "28px" } : {})}
      />
    );
  };

  const renderValue = (row) => {
    const preview = manualLineValue(row);
    return formatManualValue(preview !== null ? preview : row.valueUsd);
  };

  const columnCount = 10;

  const renderErrorRow = (key) => {
    const message = rowState[key]?.error;
    if (!message) return null;
    return (
      <Tr key={`${key}-err`}>
        <Td colSpan={columnCount} py={1} px={2} fontSize="xs" color="red.500">
          {message}
        </Td>
      </Tr>
    );
  };

  return (
    <Box>
      <Flex gap={2} mb={2} align="center" wrap="wrap">
        <Button
          size="sm"
          colorScheme="orange"
          onClick={picker.onOpen}
          isDisabled={locked || toolbarBusy}
          isLoading={toolbarBusy}
        >
          Add stock items
        </Button>
        <Button size="sm" variant="outline" onClick={addBlankRow} isDisabled={locked}>
          Add line
        </Button>
        {toolbarError && (
          <Text fontSize="xs" color="red.500">
            {toolbarError}
          </Text>
        )}
      </Flex>

      <Box overflowX="auto">
        <Table variant="simple" size="sm" border="1px" borderColor="gray.300" w="100%" minW="1000px">
          <Thead bg="gray.100">
            <Tr>
              <Th {...headProps} w="40px" textAlign="center">#</Th>
              <Th {...headProps} w="110px" bg="orange.200">STOCKITEM ID</Th>
              <Th {...headProps}>DESCRIPTION</Th>
              <Th {...headProps} w="100px">HS CODE</Th>
              <Th {...headProps} w="80px" textAlign="center">QTY</Th>
              <Th {...headProps} w="100px" textAlign="center">UNIT PRICE</Th>
              <Th {...headProps} w="80px" textAlign="center">BOX</Th>
              <Th {...headProps} w="90px" textAlign="center">WEIGHT</Th>
              <Th {...headProps} w="120px" textAlign="center">
                VALUE{currencyLabel ? ` IN ${currencyLabel}` : ""}
              </Th>
              <Th {...headProps} w="48px" />
            </Tr>
          </Thead>
          <Tbody>
            {rows.length === 0 && newRows.length === 0 && (
              <Tr>
                <Td colSpan={columnCount} py={4} textAlign="center" fontSize="xs" color="gray.500">
                  No lines yet. Use "Add stock items" or "Add line".
                </Td>
              </Tr>
            )}
            {rows.map((row, index) => {
              const state = rowState[row.key] || {};
              const readOnlyRow = row.id == null;
              const onChange = changeRow;
              const onCommit = saveRow;
              const disabled = readOnlyRow || state.saving;
              return (
                <React.Fragment key={row.key}>
                  <Tr>
                    <Td {...cellProps} textAlign="center">{index + 1}</Td>
                    <Td {...cellProps} bg="orange.50">
                      {row.isStockLine ? (
                        row.stockItemId
                      ) : (
                        <Badge colorScheme="orange">Manual</Badge>
                      )}
                    </Td>
                    <Td {...cellProps}>
                      {renderInput(row, "description", onChange, onCommit, { isDisabled: disabled, textarea: true })}
                    </Td>
                    <Td {...cellProps}>{renderInput(row, "hsCode", onChange, onCommit, { isDisabled: disabled })}</Td>
                    <Td {...cellProps}>{renderInput(row, "quantity", onChange, onCommit, { isDisabled: disabled })}</Td>
                    <Td {...cellProps}>{renderInput(row, "unitPrice", onChange, onCommit, { isDisabled: disabled })}</Td>
                    <Td {...cellProps}>{renderInput(row, "box", onChange, onCommit, { isDisabled: disabled })}</Td>
                    <Td {...cellProps}>{renderInput(row, "weight", onChange, onCommit, { isDisabled: disabled })}</Td>
                    <Td {...cellProps} textAlign="center">{renderValue(row)}</Td>
                    <Td {...cellProps} textAlign="center">
                      {state.saving ? (
                        <Spinner size="xs" />
                      ) : (
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Remove line"
                          icon={<CloseIcon boxSize={2} />}
                          onClick={() => removeRow(row)}
                          isDisabled={locked || readOnlyRow}
                        />
                      )}
                    </Td>
                  </Tr>
                  {renderErrorRow(row.key)}
                </React.Fragment>
              );
            })}
            {newRows.map((row, index) => {
              const state = rowState[row.key] || {};
              const disabled = state.saving;
              return (
                <React.Fragment key={row.key}>
                  <Tr bg="orange.50">
                    <Td {...cellProps} textAlign="center">{rows.length + index + 1}</Td>
                    <Td {...cellProps}>
                      <Badge colorScheme="orange">New</Badge>
                    </Td>
                    <Td {...cellProps}>
                      {renderInput(row, "description", changeNewRow, null, { isDisabled: disabled, textarea: true })}
                    </Td>
                    <Td {...cellProps}>{renderInput(row, "hsCode", changeNewRow, null, { isDisabled: disabled })}</Td>
                    <Td {...cellProps}>{renderInput(row, "quantity", changeNewRow, null, { isDisabled: disabled })}</Td>
                    <Td {...cellProps}>{renderInput(row, "unitPrice", changeNewRow, null, { isDisabled: disabled })}</Td>
                    <Td {...cellProps}>{renderInput(row, "box", changeNewRow, null, { isDisabled: disabled })}</Td>
                    <Td {...cellProps}>{renderInput(row, "weight", changeNewRow, null, { isDisabled: disabled })}</Td>
                    <Td {...cellProps} textAlign="center">{renderValue(row)}</Td>
                    <Td {...cellProps}>
                      <Flex gap={1} justify="center">
                        <Button
                          size="xs"
                          colorScheme="orange"
                          onClick={() => saveNewRow(row.key)}
                          isLoading={state.saving}
                          isDisabled={locked}
                        >
                          Save
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => discardNewRow(row.key)} isDisabled={state.saving}>
                          Discard
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                  {renderErrorRow(row.key)}
                </React.Fragment>
              );
            })}
            <Tr bg="gray.100" fontWeight="bold">
              <Td {...cellProps} colSpan={4}>TOTAL</Td>
              <Td {...cellProps} textAlign="center">{quantityTotal || ""}</Td>
              <Td {...cellProps} />
              <Td {...cellProps} textAlign="center">{formatManualValue(totals.box)}</Td>
              <Td {...cellProps} textAlign="center">{formatManualValue(totals.weight)}</Td>
              <Td {...cellProps} textAlign="center">{formatManualValue(totals.value)}</Td>
              <Td {...cellProps} />
            </Tr>
            {renderFooter ? renderFooter() : null}
          </Tbody>
        </Table>
      </Box>

      <CiPlManualStockPicker
        isOpen={picker.isOpen}
        onClose={picker.onClose}
        onAdd={addStock}
        existingStockListIds={existingStockListIds}
        isBusy={isBusy || toolbarBusy}
        vesselId={vesselId}
      />
    </Box>
  );
};

export default CiPlManualLines;
