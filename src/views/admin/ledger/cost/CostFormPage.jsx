import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Link,
  ScaleFade,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import {
  MdArrowBack,
  MdCheckCircle,
  MdCloudQueue,
  MdInfoOutline,
  MdTableChart,
  MdViewList,
} from "react-icons/md";
import { useHistory, useParams } from "react-router-dom";
import RemoteSearchableSelect from "components/forms/RemoteSearchableSelect";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import LedgerDuplicateInvoiceModal from "components/ledger/LedgerDuplicateInvoiceModal";
import { getShippingOrders } from "api/shippingOrders";
import {
  checkLedgerCostInvoices,
  createLedgerCost,
  getLedgerCostById,
  updateLedgerCost,
} from "api/ledgerCost";
import { useMasterData } from "hooks/useMasterData";
import useLedgerAgentOptions from "hooks/useLedgerAgentOptions";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import {
  agentOptionLabel,
  agentOptionSecondary,
  destinationParts,
  soDoneStatusColor,
  soDoneStatusLabel,
} from "utils/ledgerDisplay";
import { shouldPrecheckInvoices, splitInvoiceNumbers } from "utils/ledgerInvoiceNumbers";
import CostEntryTableView from "./CostEntryTableView";
import { CostDueField, CostRoeField } from "./CostAutoFields";
import {
  applyComputedFromRecord,
  BIZ_CATEGORY_OPTIONS,
  buildCreatePayload,
  buildUpdatePayload,
  emptyCostForm,
  extractApiMessage,
  extractLedgerCostRecord,
  fillCostFromShippingOrder,
  formatCostNumber,
  formatSoLabel,
  getMany2oneName,
  getWritableCostSignature,
  isProbablyUrl,
  isShippingStatusOrder,
  recordToForm,
  validateCostForm,
} from "./ledgerCostUtils";

const SO_PAGE_SIZE = 50;
const LIST_PATH = "/admin/ledger/cost";
const FORM_PATH = "/admin/ledger/cost/form";
const AUTOSAVE_DELAY_MS = 700;
const LAYOUT_STORAGE_KEY = "narvi_cost_form_layout";

const readLayout = () => {
  try {
    return localStorage.getItem(LAYOUT_STORAGE_KEY) === "table" ? "table" : "form";
  } catch {
    return "form";
  }
};

// Agent + normalised invoice numbers: a duplicate block lasts until either changes
const invoiceCheckKey = (form) =>
  `${form.agent_id}|${splitInvoiceNumbers(form.invoices)
    .map((n) => n.toLowerCase())
    .sort()
    .join("|")}`;

function CostAutosaveBadge({ mode, savedCaption, pulse, blockedCaption }) {
  const palettes = {
    saved: {
      bg: useColorModeValue("green.50", "green.900"),
      color: useColorModeValue("green.700", "green.200"),
      border: useColorModeValue("green.200", "green.700"),
    },
    saving: {
      bg: useColorModeValue("blue.50", "blue.900"),
      color: useColorModeValue("blue.700", "blue.200"),
      border: useColorModeValue("blue.200", "blue.700"),
    },
    pending: {
      bg: useColorModeValue("orange.50", "orange.900"),
      color: useColorModeValue("orange.700", "orange.200"),
      border: useColorModeValue("orange.200", "orange.700"),
    },
    blocked: {
      bg: useColorModeValue("red.50", "red.900"),
      color: useColorModeValue("red.700", "red.200"),
      border: useColorModeValue("red.200", "red.700"),
    },
    idle: {
      bg: useColorModeValue("gray.100", "gray.700"),
      color: useColorModeValue("gray.600", "gray.300"),
      border: useColorModeValue("gray.200", "gray.600"),
    },
  };
  const palette = palettes[mode] || palettes.idle;
  const label =
    mode === "saved"
      ? savedCaption
      : mode === "saving"
        ? "Saving…"
        : mode === "pending"
          ? "Saving soon…"
          : mode === "blocked"
            ? blockedCaption || "Required fields missing"
            : "Fill required fields to save";

  return (
    <HStack
      spacing={2}
      px={3}
      py={1.5}
      borderRadius="full"
      border="1px solid"
      bg={palette.bg}
      color={palette.color}
      borderColor={palette.border}
      fontSize="sm"
      fontWeight="600"
      minH="32px"
      flexShrink={0}
    >
      {mode === "saved" ? (
        <ScaleFade key={pulse} in initialScale={0.6}>
          <Icon as={MdCheckCircle} boxSize={5} />
        </ScaleFade>
      ) : mode === "saving" ? (
        <Spinner size="xs" thickness="2px" />
      ) : mode === "pending" ? (
        <Icon as={MdCloudQueue} boxSize={5} />
      ) : (
        <Icon as={MdInfoOutline} boxSize={5} />
      )}
      <Text>{label}</Text>
    </HStack>
  );
}

export default function CostFormPage() {
  const { id } = useParams();
  const history = useHistory();
  const toast = useToast();
  const isEditRoute = Boolean(id);

  const { refreshCurrencies } = useMasterData();
  const agents = useLedgerAgentOptions();
  const { pin: pinAgent } = agents;
  const [layout, setLayout] = useState(readLayout);
  const [duplicateKey, setDuplicateKey] = useState("");
  const [duplicates, setDuplicates] = useState([]);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [precheckFailed, setPrecheckFailed] = useState(false);
  const invoicesRef = useRef(null);
  const checkedOkKeyRef = useRef("");
  const [currencies, setCurrencies] = useState(() => getCached(MASTER_KEYS.CURRENCIES) ?? []);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(isEditRoute);
  const [isSaving, setIsSaving] = useState(false);
  const [savePulse, setSavePulse] = useState(0);
  const [savedCaption, setSavedCaption] = useState("All changes saved");

  const [form, setForm] = useState(emptyCostForm());
  const [originalForm, setOriginalForm] = useState(emptyCostForm());
  const [shippingOrders, setShippingOrders] = useState([]);
  const [isLoadingSo, setIsLoadingSo] = useState(false);
  const pinnedSoRef = useRef(null);
  const soRequestGenRef = useRef(0);
  const soSearchTimerRef = useRef(null);
  const recordIdRef = useRef(null);
  const originalFormRef = useRef(originalForm);
  const lastSavedSignatureRef = useRef("");
  const skipAutosaveRef = useRef(true);
  const createInFlightRef = useRef(false);
  const lastValidationErrorRef = useRef(null);
  const firstSaveToastShownRef = useRef(false);

  const hasSavedRecord = Boolean(id || editingRecord?.id);
  // Table view is for new records only; the toggle is hidden on the edit route
  const isTableView = layout === "table" && !hasSavedRecord;
  const handleLayoutChange = (next) => {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures.
    }
  };

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const inputBg = useColorModeValue("white", "gray.700");
  const readonlyBg = useColorModeValue("gray.50", "gray.700");
  const labelColor = useColorModeValue("gray.700", "gray.200");

  originalFormRef.current = originalForm;

  const markSaved = useCallback(() => {
    setSavePulse((n) => n + 1);
    setSavedCaption("Saved just now");
    if (!firstSaveToastShownRef.current) {
      firstSaveToastShownRef.current = true;
      toast({
        id: "cost-autosave",
        title: "Saved",
        description: "Your changes are stored. We'll keep saving automatically.",
        status: "success",
        duration: 2500,
        isClosable: true,
        position: "bottom-right",
        variant: "subtle",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!savePulse) return undefined;
    const timer = setTimeout(() => setSavedCaption("All changes saved"), 2800);
    return () => clearTimeout(timer);
  }, [savePulse]);

  const goBackToList = useCallback(() => {
    history.push(LIST_PATH);
  }, [history]);

  const setField = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "sale_order_id") {
        Object.assign(next, fillCostFromShippingOrder(null));
      }
      if (field === "currency_id") {
        next.currency_code = "";
      }
      if (field === "currency_amount") {
        next.usd_cost = "";
      }
      if (field === "currency_amount" || field === "gst_input_tax") {
        next.gst_in_amount = "";
      }
      return next;
    });
  }, []);

  const fetchShippingOrders = useCallback(async (search = "") => {
    const gen = ++soRequestGenRef.current;
    setIsLoadingSo(true);
    try {
      const response = await getShippingOrders({
        page: 1,
        page_size: SO_PAGE_SIZE,
        search: String(search || "").trim(),
      });
      if (gen !== soRequestGenRef.current) return;
      const list = (Array.isArray(response?.orders) ? response.orders : []).filter(
        isShippingStatusOrder
      );
      const pinned = pinnedSoRef.current;
      const merged =
        pinned && !list.some((order) => String(order.id) === String(pinned.id))
          ? [pinned, ...list]
          : list;
      setShippingOrders(merged);
    } catch (error) {
      if (gen !== soRequestGenRef.current) return;
      console.error("Failed to load shipping orders for Cost DB:", error);
      setShippingOrders(pinnedSoRef.current ? [pinnedSoRef.current] : []);
    } finally {
      if (gen === soRequestGenRef.current) {
        setIsLoadingSo(false);
      }
    }
  }, []);

  const hydrateForm = useCallback(
    (record) => {
      const nextForm = recordToForm(record);
      setForm(nextForm);
      setOriginalForm(nextForm);
      originalFormRef.current = nextForm;
      lastSavedSignatureRef.current = getWritableCostSignature(nextForm);
      const soId = nextForm.sale_order_id;
      if (soId && record) {
        pinnedSoRef.current = {
          id: soId,
          so_id: record.so_number,
          so_number: record.so_number,
          name: getMany2oneName(record.sale_order_id),
        };
      } else {
        pinnedSoRef.current = null;
      }
      if (record && nextForm.agent_id !== "") {
        const detail = record.agent_detail || {};
        pinAgent({
          id: nextForm.agent_id,
          name: record.agent || detail.name || getMany2oneName(record.agent_id),
          agent_code: detail.agent_code,
          company: detail.company,
        });
      }
      fetchShippingOrders("");
    },
    [fetchShippingOrders, pinAgent]
  );

  useEffect(() => {
    let cancelled = false;
    refreshCurrencies()
      .then((currencyList) => {
        if (cancelled) return;
        setCurrencies(
          Array.isArray(currencyList) ? currencyList : getCached(MASTER_KEYS.CURRENCIES) ?? []
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshCurrencies]);

  useEffect(() => {
    skipAutosaveRef.current = true;
    if (!id) {
      recordIdRef.current = null;
      setEditingRecord(null);
      hydrateForm(null);
      setIsLoadingRecord(false);
      skipAutosaveRef.current = false;
      return;
    }

    if (id && String(recordIdRef.current) === String(id)) {
      skipAutosaveRef.current = false;
      setIsLoadingRecord(false);
      return;
    }

    let cancelled = false;
    setIsLoadingRecord(true);
    getLedgerCostById(id)
      .then((record) => {
        if (cancelled) return;
        recordIdRef.current = record.id;
        setEditingRecord(record);
        hydrateForm(record);
        skipAutosaveRef.current = false;
      })
      .catch((error) => {
        if (cancelled) return;
        toast({
          title: "Error",
          description: extractApiMessage(error, "Failed to load cost record."),
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        history.replace(LIST_PATH);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecord(false);
      });

    return () => {
      cancelled = true;
    };
    // Load once per route id; skip when autosave just created this record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    return () => {
      if (soSearchTimerRef.current) clearTimeout(soSearchTimerRef.current);
    };
  }, []);

  const handleSoSearchChange = useCallback(
    (query) => {
      if (soSearchTimerRef.current) clearTimeout(soSearchTimerRef.current);
      soSearchTimerRef.current = setTimeout(() => {
        fetchShippingOrders(query);
      }, 300);
    },
    [fetchShippingOrders]
  );

  const handleSoChange = useCallback(
    (value) => {
      if (value == null || value === "") {
        pinnedSoRef.current = null;
        setField("sale_order_id", "");
        return;
      }
      const order = shippingOrders.find((item) => String(item.id) === String(value));
      if (order) {
        pinnedSoRef.current = order;
      }
      setField("sale_order_id", value);
      // Show the SO-derived read-only fields right away (the server refreshes them after save)
      if (order) setForm((prev) => ({ ...prev, ...fillCostFromShippingOrder(order) }));
    },
    [setField, shippingOrders]
  );

  const handleCurrencyChange = useCallback((value) => {
    setField("currency_id", value || "");
  }, [setField]);

  const patchForm = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleAgentChange = useCallback(
    (value) => {
      const picked = agents.options.find((a) => String(a.id) === String(value));
      if (picked) pinAgent(picked);
      setField("agent_id", value || "");
    },
    [agents.options, pinAgent, setField]
  );

  // Duplicate invoice pre-check. Returns true when saving must be blocked.
  const runInvoicePrecheck = useCallback(
    async (snapshot) => {
      const recordId = recordIdRef.current;
      if (!shouldPrecheckInvoices(snapshot, recordId ? originalFormRef.current : null)) return false;
      const key = invoiceCheckKey(snapshot);
      if (checkedOkKeyRef.current === key) return false;
      setIsChecking(true);
      setPrecheckFailed(false);
      try {
        const result = await checkLedgerCostInvoices({
          agent_id: Number(snapshot.agent_id),
          invoices: snapshot.invoices,
          exclude_id: recordId || undefined,
        });
        if (result.has_duplicates) {
          setDuplicates(result.duplicates);
          setDuplicateKey(key);
          setIsDuplicateOpen(true);
          return true;
        }
        checkedOkKeyRef.current = key;
        return false;
      } catch (error) {
        // The server is the gate when the pre-check itself fails
        setPrecheckFailed(true);
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  const closeDuplicateModal = useCallback(() => {
    setIsDuplicateOpen(false);
    setTimeout(() => invoicesRef.current?.focus(), 0);
  }, []);

  const soOptions = useMemo(
    () =>
      shippingOrders.map((order) => ({
        id: order.id,
        name: formatSoLabel(order),
      })),
    [shippingOrders]
  );

  const agentOptions = useMemo(
    () => agents.options.map((agent) => ({ ...agent, name: agentOptionLabel(agent) })),
    [agents.options]
  );

  const selectedSoFallback = editingRecord
    ? getMany2oneName(editingRecord.sale_order_id) ||
      (editingRecord.so_number ? `SO-${editingRecord.so_number}` : "")
    : "";
  const selectedAgentFallback = editingRecord
    ? editingRecord.agent ||
      editingRecord.agent_detail?.name ||
      getMany2oneName(editingRecord.agent_id) ||
      ""
    : "";
  const selectedCurrencyFallback = editingRecord
    ? getMany2oneName(editingRecord.currency_id) || editingRecord.currency_code || ""
    : "";

  const showError = useCallback(
    (description) => {
      if (!description) return;
      toast({
        title: "Error",
        description,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
    [toast]
  );

  useEffect(() => {
    if (isLoadingRecord || skipAutosaveRef.current || isTableView) return;
    // Blocked by a duplicate invoice number until invoices or agent change
    if (duplicateKey && duplicateKey === invoiceCheckKey(form)) return;

    const signature = getWritableCostSignature(form);
    if (signature === lastSavedSignatureRef.current) return;

    const requiredError = validateCostForm(form);
    const recordId = recordIdRef.current;

    if (!recordId && requiredError) {
      lastValidationErrorRef.current = null;
      return;
    }

    if (recordId && requiredError) {
      if (lastValidationErrorRef.current !== requiredError) {
        lastValidationErrorRef.current = requiredError;
        showError(requiredError);
      }
      return;
    }
    lastValidationErrorRef.current = null;

    const timer = setTimeout(async () => {
      const snapshot = form;
      let ownsCreate = false;
      let started = false;
      try {
        if (await runInvoicePrecheck(snapshot)) return;
        if (!recordIdRef.current) {
          if (createInFlightRef.current) return;
          createInFlightRef.current = true;
          ownsCreate = true;
          started = true;
          setIsSaving(true);
          const response = await createLedgerCost(buildCreatePayload(snapshot));
          const created = extractLedgerCostRecord(response);
          const newId = created?.id;
          if (newId == null) {
            showError("Cost was created but no record id was returned.");
            return;
          }
          recordIdRef.current = newId;
          lastSavedSignatureRef.current = getWritableCostSignature(snapshot);
          let record = created;
          try {
            record = await getLedgerCostById(newId);
          } catch {
            record = created;
          }
          setEditingRecord(record);
          setForm((prev) => applyComputedFromRecord(prev, record));
          const savedBaseline = applyComputedFromRecord(snapshot, record);
          setOriginalForm(savedBaseline);
          originalFormRef.current = savedBaseline;
          markSaved();
          history.replace(`${FORM_PATH}/${newId}`);
          return;
        }

        const payload = buildUpdatePayload(snapshot, originalFormRef.current, recordIdRef.current);
        if (Object.keys(payload).length <= 1) {
          lastSavedSignatureRef.current = getWritableCostSignature(snapshot);
          return;
        }
        started = true;
        setIsSaving(true);
        const response = await updateLedgerCost(payload);
        let record = extractLedgerCostRecord(response);
        try {
          record = await getLedgerCostById(recordIdRef.current);
        } catch {
          // Keep update response if refetch fails.
        }
        lastSavedSignatureRef.current = getWritableCostSignature(snapshot);
        if (record) setEditingRecord(record);
        setForm((prev) => (record ? applyComputedFromRecord(prev, record) : prev));
        const savedBaseline = record ? applyComputedFromRecord(snapshot, record) : snapshot;
        setOriginalForm(savedBaseline);
        originalFormRef.current = savedBaseline;
        markSaved();
      } catch (error) {
        showError(
          extractApiMessage(error, recordIdRef.current ? "Failed to update cost." : "Failed to create cost.")
        );
      } finally {
        if (ownsCreate) createInFlightRef.current = false;
        if (started) setIsSaving(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [form, isLoadingRecord, isTableView, duplicateKey, history, showError, markSaved, runInvoicePrecheck]);

  const requiredError = validateCostForm(form);
  const isDirty = getWritableCostSignature(form) !== lastSavedSignatureRef.current;
  const isDuplicateBlocked = Boolean(duplicateKey) && duplicateKey === invoiceCheckKey(form);
  const saveMode = isSaving
    ? "saving"
    : isDuplicateBlocked
      ? "blocked"
      : !hasSavedRecord && requiredError
      ? "idle"
      : isDirty && requiredError
        ? "blocked"
        : isDirty
          ? "pending"
          : hasSavedRecord
            ? "saved"
            : "idle";

  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const destinationInfo = destinationParts(form);
  const soStatusText = soDoneStatusLabel(form);
  const selectedCurrencyLabel =
    (currencies || []).find((c) => String(c.id) === String(form.currency_id))?.name ||
    form.currency_code ||
    "";
  const selectedAgentLabel = (() => {
    const match = agents.options.find((a) => String(a.id) === String(form.agent_id));
    return match ? agentOptionLabel(match) : selectedAgentFallback;
  })();

  const fieldLabelProps = {
    fontSize: "sm",
    fontWeight: "600",
    color: labelColor,
    mb: 1,
    lineHeight: "1.25",
  };
  const controlProps = {
    size: "md",
    h: "40px",
    bg: inputBg,
  };
  const selectControlProps = {
    ...controlProps,
    bg: inputBg,
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Box px="25px" pb={8}>
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} mb={6} gap={4} wrap="wrap">
          <Flex align="center" gap={3}>
            <Button leftIcon={<Icon as={MdArrowBack} />} variant="ghost" onClick={goBackToList}>
              Back
            </Button>
            <Box>
              <Heading size="lg" mb={1}>
                {hasSavedRecord ? "Edit Cost" : "New Cost"}
              </Heading>
              <Text fontSize="sm" color="gray.500">
                {isTableView
                  ? "Fill the rows, then Save all to create each cost"
                  : "Changes save automatically after required fields are filled"}
              </Text>
            </Box>
          </Flex>
          {!hasSavedRecord && (
            <HStack spacing="2" w={{ base: "100%", md: "auto" }}>
              <Button
                size="sm"
                leftIcon={<Icon as={MdTableChart} />}
                colorScheme={layout === "table" ? "blue" : "gray"}
                variant={layout === "table" ? "solid" : "outline"}
                aria-pressed={layout === "table"}
                onClick={() => handleLayoutChange("table")}
              >
                Table view
              </Button>
              <Button
                size="sm"
                leftIcon={<Icon as={MdViewList} />}
                colorScheme={layout === "form" ? "blue" : "gray"}
                variant={layout === "form" ? "solid" : "outline"}
                aria-pressed={layout === "form"}
                onClick={() => handleLayoutChange("form")}
              >
                Form view
              </Button>
            </HStack>
          )}
          {!isLoadingRecord && !isTableView && (
            <CostAutosaveBadge
              mode={saveMode}
              savedCaption={savedCaption}
              pulse={savePulse}
              blockedCaption={isDuplicateBlocked ? "Duplicate invoice number" : undefined}
            />
          )}
        </Flex>

        {isTableView ? (
          <CostEntryTableView currencies={currencies} />
        ) : (
        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" p={{ base: 4, md: 6 }}>
          {isLoadingRecord ? (
            <Flex justify="center" align="center" py={16}>
              <Spinner />
            </Flex>
          ) : (
            <>
              <SimpleGrid
                columns={{ base: 1, md: 2 }}
                columnGap={{ base: 0, md: 5 }}
                rowGap={3}
                alignItems="start"
              >
                <FormControl isRequired>
                  <FormLabel {...fieldLabelProps}>SO Number</FormLabel>
                  <RemoteSearchableSelect
                    value={form.sale_order_id === "" ? "" : String(form.sale_order_id)}
                    onChange={handleSoChange}
                    options={soOptions}
                    placeholder="Select shipping order..."
                    onSearchChange={handleSoSearchChange}
                    isLoading={isLoadingSo}
                    fallbackDisplay={selectedSoFallback}
                    {...selectControlProps}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel {...fieldLabelProps}>Agent</FormLabel>
                  <SimpleSearchableSelect
                    value={form.agent_id === "" ? "" : String(form.agent_id)}
                    onChange={handleAgentChange}
                    options={agentOptions}
                    placeholder="Select agent..."
                    serverSideSearch
                    onSearchChange={agents.onSearchChange}
                    isLoading={agents.isLoading}
                    formatOption={agentOptionLabel}
                    renderOption={(option) => (
                      <Box>
                        <Text fontSize="sm" fontWeight="600" color={labelColor} noOfLines={1}>
                          {agentOptionLabel(option)}
                        </Text>
                        {agentOptionSecondary(option) ? (
                          <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                            {agentOptionSecondary(option)}
                          </Text>
                        ) : null}
                      </Box>
                    )}
                    fallbackDisplay={selectedAgentFallback}
                    {...selectControlProps}
                  />
                  <Text fontSize="xs" color={mutedColor} mt={1}>
                    Search by Agent ID, agent code or company.
                  </Text>
                  {agents.error ? (
                    <Text fontSize="xs" color="red.500" mt={1}>
                      Could not load agents.{" "}
                      <Button variant="link" size="xs" colorScheme="blue" onClick={agents.retry}>
                        Retry
                      </Button>
                    </Text>
                  ) : null}
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Currency</FormLabel>
                  <SimpleSearchableSelect
                    value={form.currency_id === "" ? "" : String(form.currency_id)}
                    onChange={handleCurrencyChange}
                    options={currencies}
                    placeholder="Select currency..."
                    fallbackDisplay={selectedCurrencyFallback}
                    {...selectControlProps}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel {...fieldLabelProps}>Currency Amount</FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={form.currency_amount}
                    onChange={(e) => setField("currency_amount", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <CostRoeField
                    values={form}
                    onPatch={patchForm}
                    currencyLabel={selectedCurrencyLabel}
                    label="Rate of Exchange on Invoice Date"
                    labelProps={fieldLabelProps}
                    controlProps={controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>USD Cost</FormLabel>
                  <Input
                    isReadOnly
                    value={form.usd_cost === "" ? "" : formatCostNumber(form.usd_cost, 4)}
                    placeholder="Filled by server"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Client</FormLabel>
                  <Input
                    isReadOnly
                    value={form.client}
                    placeholder="Filled by server"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Vessel</FormLabel>
                  <Input
                    isReadOnly
                    value={form.vessel_name}
                    placeholder="Filled by server"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Destination Type</FormLabel>
                  <Input
                    isReadOnly
                    value={destinationInfo.type}
                    placeholder="-"
                    title={destinationInfo.type}
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Destination</FormLabel>
                  <Input
                    isReadOnly
                    value={destinationInfo.name || form.destination}
                    placeholder="Filled by server"
                    title={destinationInfo.name || form.destination}
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Country</FormLabel>
                  <Input
                    isReadOnly
                    value={destinationInfo.country}
                    placeholder="-"
                    title={destinationInfo.country}
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>SO Create Date</FormLabel>
                  <Input
                    isReadOnly
                    value={form.so_create_date}
                    placeholder="Filled by server"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>SO Status</FormLabel>
                  <Flex align="center" h="40px">
                    {soStatusText === "-" ? (
                      <Text color={mutedColor}>-</Text>
                    ) : (
                      <Badge colorScheme={soDoneStatusColor(form.so_done_status)} whiteSpace="nowrap">
                        {soStatusText}
                      </Badge>
                    )}
                  </Flex>
                </FormControl>

                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel {...fieldLabelProps}>Client Case / Invoice Ref</FormLabel>
                  <Input
                    isReadOnly
                    value={form.client_case_invoice_ref}
                    placeholder="Filled by server"
                    title={form.client_case_invoice_ref}
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Currency Code</FormLabel>
                  <Input
                    isReadOnly
                    value={form.currency_code}
                    placeholder="Filled by server"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel {...fieldLabelProps}>Invoices</FormLabel>
                  <Textarea
                    ref={invoicesRef}
                    value={form.invoices}
                    onChange={(e) => setField("invoices", e.target.value)}
                    onBlur={() => runInvoicePrecheck(form)}
                    bg={inputBg}
                    minH="80px"
                    rows={3}
                  />
                  {isChecking ? (
                    <Flex align="center" gap={2} mt={1}>
                      <Spinner size="xs" />
                      <Text fontSize="xs" color={mutedColor}>
                        Checking invoice numbers...
                      </Text>
                    </Flex>
                  ) : precheckFailed ? (
                    <Text fontSize="xs" color={mutedColor} mt={1}>
                      Could not check for duplicates. The server will check when you save.
                    </Text>
                  ) : null}
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>GST Input Tax (%)</FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={form.gst_input_tax}
                    onChange={(e) => setField("gst_input_tax", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>GST in Amount</FormLabel>
                  <Input
                    isReadOnly
                    value={form.gst_in_amount === "" ? "" : formatCostNumber(form.gst_in_amount, 4)}
                    placeholder="Filled by server"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Date Agent Invoice</FormLabel>
                  <Input
                    type="date"
                    value={form.date_agent_invoice}
                    onChange={(e) => setField("date_agent_invoice", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <CostDueField
                    values={form}
                    onPatch={patchForm}
                    label="Date Due Agent"
                    labelProps={fieldLabelProps}
                    controlProps={controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Date Agent Paid</FormLabel>
                  <Input
                    type="date"
                    value={form.date_agent_paid}
                    onChange={(e) => setField("date_agent_paid", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Biz Category</FormLabel>
                  <Select
                    value={form.biz_category}
                    onChange={(e) => setField("biz_category", e.target.value)}
                    placeholder="Select category"
                    {...controlProps}
                  >
                    {BIZ_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel {...fieldLabelProps}>Invoice Link</FormLabel>
                  <Flex gap={2} align="center">
                    <Input
                      value={form.invoice_link}
                      onChange={(e) => setField("invoice_link", e.target.value)}
                      placeholder="https://..."
                      {...controlProps}
                    />
                    {isProbablyUrl(form.invoice_link) && (
                      <Link href={form.invoice_link.trim()} isExternal flexShrink={0} color="blue.500">
                        Open
                      </Link>
                    )}
                  </Flex>
                </FormControl>
              </SimpleGrid>

              <Text fontSize="xs" color="gray.500" mt={5}>
                Required to create: SO Number, Agent and Currency Amount. The rate of exchange and due date
                are filled automatically unless you type them. After that, changes save automatically. USD
                Cost, GST in Amount, client, vessel, destination, SO dates/status, and currency code are
                filled by the server after save.
              </Text>
            </>
          )}
        </Box>
        )}
      </Box>
      <LedgerDuplicateInvoiceModal
        isOpen={isDuplicateOpen}
        onClose={closeDuplicateModal}
        duplicates={duplicates}
        agentLabel={selectedAgentLabel}
      />
    </Box>
  );
}
