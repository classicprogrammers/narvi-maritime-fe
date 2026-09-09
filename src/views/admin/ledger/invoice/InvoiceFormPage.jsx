import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  ScaleFade,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdArrowBack, MdCheckCircle, MdCloudQueue, MdInfoOutline } from "react-icons/md";
import { useHistory, useParams } from "react-router-dom";
import RemoteSearchableSelect from "components/forms/RemoteSearchableSelect";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { getShippingOrders } from "api/shippingOrders";
import { getLedgerCosts } from "api/ledgerCost";
import { createLedgerInvoice, getLedgerInvoiceById, updateLedgerInvoice } from "api/ledgerInvoice";
import { useMasterData } from "hooks/useMasterData";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import {
  applyComputedFromRecord,
  buildCreatePayload,
  buildUpdatePayload,
  computeInvoicePreview,
  emptyInvoiceForm,
  extractApiMessage,
  extractLedgerInvoiceRecord,
  fillFromShippingOrder,
  formatCostNumber,
  formatSoLabel,
  getMany2oneName,
  bizCategoryDisplay,
  normalizeBizCategory,
  getWritableInvoiceSignature,
  GST_OUTPUT_OPTIONS,
  isShippingStatusOrder,
  paymentStatusDisplay,
  recordToForm,
  validateInvoiceForm,
} from "./ledgerInvoiceUtils";

const SO_PAGE_SIZE = 50;
const LIST_PATH = "/admin/ledger/invoice";
const FORM_PATH = "/admin/ledger/invoice/form";
const AUTOSAVE_DELAY_MS = 700;

function InvoiceAutosaveBadge({ mode, savedCaption, pulse }) {
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
            ? "Required fields missing"
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

const displayComputed = (previewValue, apiValue, digits = 4) => {
  const value = previewValue !== "" && previewValue != null ? previewValue : apiValue;
  if (value === "" || value == null) return "";
  return formatCostNumber(value, digits);
};

export default function InvoiceFormPage() {
  const { id } = useParams();
  const history = useHistory();
  const toast = useToast();
  const isEditRoute = Boolean(id);

  const { refreshCurrencies } = useMasterData();
  const [currencies, setCurrencies] = useState(() => getCached(MASTER_KEYS.CURRENCIES) ?? []);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(isEditRoute);
  const [isSaving, setIsSaving] = useState(false);
  const [savePulse, setSavePulse] = useState(0);
  const [savedCaption, setSavedCaption] = useState("All changes saved");

  const [form, setForm] = useState(emptyInvoiceForm());
  const [originalForm, setOriginalForm] = useState(emptyInvoiceForm());
  const [shippingOrders, setShippingOrders] = useState([]);
  const [isLoadingSo, setIsLoadingSo] = useState(false);
  const pinnedSoRef = useRef(null);
  const soRequestGenRef = useRef(0);
  const soSearchTimerRef = useRef(null);
  const soBizRequestGenRef = useRef(0);
  const recordIdRef = useRef(null);
  const originalFormRef = useRef(originalForm);
  const lastSavedSignatureRef = useRef("");
  const skipAutosaveRef = useRef(true);
  const createInFlightRef = useRef(false);
  const lastValidationErrorRef = useRef(null);
  const firstSaveToastShownRef = useRef(false);

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
        id: "invoice-autosave",
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
    setForm((prev) => ({ ...prev, [field]: value }));
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
      const list = (Array.isArray(response?.orders) ? response.orders : []).filter(isShippingStatusOrder);
      const pinned = pinnedSoRef.current;
      const merged =
        pinned && !list.some((order) => String(order.id) === String(pinned.id)) ? [pinned, ...list] : list;
      setShippingOrders(merged);
    } catch (error) {
      if (gen !== soRequestGenRef.current) return;
      console.error("Failed to load shipping orders for Invoice DB:", error);
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
      lastSavedSignatureRef.current = getWritableInvoiceSignature(nextForm);
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
      fetchShippingOrders("");
    },
    [fetchShippingOrders]
  );

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
    getLedgerInvoiceById(id)
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
          description: extractApiMessage(error, "Failed to load invoice record."),
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

  const applyBizCategoryFromCostDb = useCallback(async (saleOrderId) => {
    const gen = ++soBizRequestGenRef.current;
    if (saleOrderId == null || saleOrderId === "") return;
    try {
      const data = await getLedgerCosts({
        sale_order_id: saleOrderId,
        page: 1,
        page_size: 20,
      });
      if (gen !== soBizRequestGenRef.current) return;
      const list = Array.isArray(data.data) ? data.data : [];
      const withBiz = list.find((row) => normalizeBizCategory(row?.biz_category));
      const biz_category = withBiz ? normalizeBizCategory(withBiz.biz_category) : "";
      const biz_category_label = withBiz
        ? bizCategoryDisplay(withBiz.biz_category, withBiz.biz_category_label)
        : "";
      setForm((prev) => ({
        ...prev,
        biz_category,
        biz_category_label,
      }));
    } catch {
      // Keep SO-derived values if Cost DB lookup fails.
    }
  }, []);

  const handleSoChange = useCallback(
    (value) => {
      if (value == null || value === "") {
        pinnedSoRef.current = null;
        soBizRequestGenRef.current += 1;
        setForm((prev) => ({
          ...prev,
          sale_order_id: "",
          ...fillFromShippingOrder(null),
        }));
        return;
      }
      const order = shippingOrders.find((item) => String(item.id) === String(value));
      if (order) {
        pinnedSoRef.current = order;
        setForm((prev) => ({
          ...prev,
          sale_order_id: value,
          ...fillFromShippingOrder(order),
        }));
        applyBizCategoryFromCostDb(value);
        return;
      }
      setField("sale_order_id", value);
      applyBizCategoryFromCostDb(value);
    },
    [applyBizCategoryFromCostDb, setField, shippingOrders]
  );

  const handleCurrencyChange = useCallback(
    (value) => {
      const selected = currencies.find((item) => String(item.id) === String(value));
      setForm((prev) => ({
        ...prev,
        currency_id: value || "",
        currency_code: selected?.name || selected?.symbol || prev.currency_code || "",
      }));
    },
    [currencies]
  );

  const soOptions = useMemo(
    () =>
      shippingOrders.map((order) => ({
        id: order.id,
        name: formatSoLabel(order),
      })),
    [shippingOrders]
  );

  const selectedSoFallback = editingRecord
    ? getMany2oneName(editingRecord.sale_order_id) ||
      (editingRecord.so_number ? `SO-${editingRecord.so_number}` : "")
    : "";
  const selectedCurrencyFallback = editingRecord
    ? getMany2oneName(editingRecord.currency_id) || editingRecord.currency_code || ""
    : "";

  const preview = useMemo(() => computeInvoicePreview(form), [form]);
  const statusValue = preview.payment_status || form.payment_status;
  const statusLabel = paymentStatusDisplay(
    preview.payment_status || form.payment_status,
    preview.payment_status_label || form.payment_status_label
  );

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
    if (isLoadingRecord || skipAutosaveRef.current) return;

    const signature = getWritableInvoiceSignature(form);
    if (signature === lastSavedSignatureRef.current) return;

    const requiredError = validateInvoiceForm(form);
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
        if (!recordIdRef.current) {
          if (createInFlightRef.current) return;
          createInFlightRef.current = true;
          ownsCreate = true;
          started = true;
          setIsSaving(true);
          const response = await createLedgerInvoice(buildCreatePayload(snapshot));
          const created = extractLedgerInvoiceRecord(response);
          const newId = created?.id;
          if (newId == null) {
            showError("Invoice was created but no record id was returned.");
            return;
          }
          recordIdRef.current = newId;
          lastSavedSignatureRef.current = getWritableInvoiceSignature(snapshot);
          let record = created;
          try {
            record = await getLedgerInvoiceById(newId);
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
          lastSavedSignatureRef.current = getWritableInvoiceSignature(snapshot);
          return;
        }
        started = true;
        setIsSaving(true);
        const response = await updateLedgerInvoice(payload);
        let record = extractLedgerInvoiceRecord(response);
        try {
          record = await getLedgerInvoiceById(recordIdRef.current);
        } catch {
          // Keep update response if refetch fails.
        }
        lastSavedSignatureRef.current = getWritableInvoiceSignature(snapshot);
        if (record) setEditingRecord(record);
        setForm((prev) => (record ? applyComputedFromRecord(prev, record) : prev));
        const savedBaseline = record ? applyComputedFromRecord(snapshot, record) : snapshot;
        setOriginalForm(savedBaseline);
        originalFormRef.current = savedBaseline;
        markSaved();
      } catch (error) {
        showError(
          extractApiMessage(error, recordIdRef.current ? "Failed to update invoice." : "Failed to create invoice.")
        );
      } finally {
        if (ownsCreate) createInFlightRef.current = false;
        if (started) setIsSaving(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [form, isLoadingRecord, history, showError, markSaved]);

  const hasSavedRecord = Boolean(id || editingRecord?.id);
  const requiredError = validateInvoiceForm(form);
  const isDirty = getWritableInvoiceSignature(form) !== lastSavedSignatureRef.current;
  const saveMode = isSaving
    ? "saving"
    : !hasSavedRecord && requiredError
      ? "idle"
      : isDirty && requiredError
        ? "blocked"
        : isDirty
          ? "pending"
          : hasSavedRecord
            ? "saved"
            : "idle";

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
                {hasSavedRecord ? "Edit Invoice" : "New Invoice"}
              </Heading>
              <Text fontSize="sm" color="gray.500">
                Changes save automatically after required fields are filled
              </Text>
            </Box>
          </Flex>
          {!isLoadingRecord && (
            <InvoiceAutosaveBadge mode={saveMode} savedCaption={savedCaption} pulse={savePulse} />
          )}
        </Flex>

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

                <FormControl>
                  <FormLabel {...fieldLabelProps}>SO Date Created</FormLabel>
                  <Input isReadOnly value={form.so_create_date} placeholder="Filled from SO" {...controlProps} bg={readonlyBg} />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>SO Status</FormLabel>
                  <Input
                    isReadOnly
                    value={form.so_status_label || form.so_status}
                    placeholder="Filled from SO"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Client</FormLabel>
                  <Input isReadOnly value={form.client} placeholder="Filled from SO" {...controlProps} bg={readonlyBg} />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Vessel Name</FormLabel>
                  <Input isReadOnly value={form.vessel_name} placeholder="Filled from SO" {...controlProps} bg={readonlyBg} />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Destination</FormLabel>
                  <Input isReadOnly value={form.destination} placeholder="Filled from SO" {...controlProps} bg={readonlyBg} />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Biz Category</FormLabel>
                  <Input
                    isReadOnly
                    value={form.biz_category_label || form.biz_category}
                    placeholder="Filled from Cost DB / SO"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel {...fieldLabelProps}>Invoice Number</FormLabel>
                  <Input
                    value={form.invoice_number}
                    onChange={(e) => setField("invoice_number", e.target.value)}
                    placeholder="INV-2026-001"
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Date Sales Invoice</FormLabel>
                  <Input
                    type="date"
                    value={form.date_sales_invoice}
                    onChange={(e) => setField("date_sales_invoice", e.target.value)}
                    {...controlProps}
                  />
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

                <FormControl isRequired>
                  <FormLabel {...fieldLabelProps}>ROE</FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={form.roe}
                    onChange={(e) => setField("roe", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>USD Amount</FormLabel>
                  <Input
                    isReadOnly
                    value={displayComputed(preview.usd_amount, form.usd_amount, 4)}
                    placeholder="Auto-calculated"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Currency Code</FormLabel>
                  <Input isReadOnly value={form.currency_code} placeholder="From currency" {...controlProps} bg={readonlyBg} />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Date Due</FormLabel>
                  <Input
                    type="date"
                    value={form.date_due}
                    onChange={(e) => setField("date_due", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Date Paid</FormLabel>
                  <Input
                    type="date"
                    value={form.date_paid}
                    onChange={(e) => setField("date_paid", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Client Amount Paid</FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={form.client_amount_paid}
                    onChange={(e) => setField("client_amount_paid", e.target.value)}
                    placeholder="Can be negative"
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Invoice Balance</FormLabel>
                  <Input
                    isReadOnly
                    value={displayComputed(preview.invoice_balance, form.invoice_balance, 4)}
                    placeholder="Auto-calculated"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Invoice Balance USD</FormLabel>
                  <Input
                    isReadOnly
                    value={displayComputed(preview.invoice_balance_usd, form.invoice_balance_usd, 4)}
                    placeholder="Auto-calculated"
                    {...controlProps}
                    bg={readonlyBg}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Payment Status</FormLabel>
                  {statusValue ? (
                    <Flex align="center" h="40px">
                      <Badge
                        colorScheme={String(statusValue).toLowerCase() === "paid" ? "green" : "orange"}
                        variant="subtle"
                        borderRadius="full"
                        px={3}
                        py={1}
                        fontSize="sm"
                        textTransform="none"
                      >
                        {statusLabel}
                      </Badge>
                    </Flex>
                  ) : (
                    <Input isReadOnly value="" placeholder="Auto-calculated" {...controlProps} bg={readonlyBg} />
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Bank Change USD</FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={form.bank_change_usd}
                    onChange={(e) => setField("bank_change_usd", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>GST Output Tax</FormLabel>
                  <Select
                    value={form.gst_output_tax}
                    onChange={(e) => setField("gst_output_tax", e.target.value)}
                    placeholder="Select"
                    {...controlProps}
                  >
                    {GST_OUTPUT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>GST Out Amount</FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={form.gst_out_amount}
                    onChange={(e) => setField("gst_out_amount", e.target.value)}
                    {...controlProps}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel {...fieldLabelProps}>Invoice SOA</FormLabel>
                  <Flex align="center" h="40px">
                    <Checkbox
                      isChecked={Boolean(form.invoice_soa)}
                      onChange={(e) => setField("invoice_soa", e.target.checked)}
                      colorScheme="blue"
                    >
                      SOA
                    </Checkbox>
                  </Flex>
                </FormControl>

                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel {...fieldLabelProps}>Customer Billing Remarks</FormLabel>
                  <Textarea
                    value={form.customer_billing_remarks}
                    onChange={(e) => setField("customer_billing_remarks", e.target.value)}
                    bg={inputBg}
                    minH="80px"
                    rows={3}
                  />
                </FormControl>

                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel {...fieldLabelProps}>Payment Remark</FormLabel>
                  <Textarea
                    value={form.payment_remark}
                    onChange={(e) => setField("payment_remark", e.target.value)}
                    bg={inputBg}
                    minH="80px"
                    rows={3}
                  />
                </FormControl>

                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel {...fieldLabelProps}>SO Remark</FormLabel>
                  <Textarea
                    value={form.so_remark}
                    onChange={(e) => setField("so_remark", e.target.value)}
                    bg={inputBg}
                    minH="80px"
                    rows={3}
                  />
                </FormControl>
              </SimpleGrid>

              <Text fontSize="xs" color="gray.500" mt={5}>
                Required to create: SO Number, Invoice Number, Currency Amount, and ROE. After that, changes
                save automatically. USD Amount, balances, payment status, and SO details are calculated or
                filled by the server after save. Payment status is never sent from the form.
              </Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
