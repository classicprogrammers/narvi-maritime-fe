import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  Spinner,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { MdAdd, MdArrowBack, MdDelete } from "react-icons/md";
import { useHistory, useParams } from "react-router-dom";
import Card from "components/card/Card";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  createNarviQuotation,
  extractNarviQuotationError,
  getNarviQuotation,
  getNarviQuotationLineOptions,
  getNarviQuotationOptions,
  updateNarviQuotation,
} from "../../../api/narviQuotation";
import { useMasterData } from "../../../hooks/useMasterData";
import {
  apiString,
  buildLineSavePayload,
  emptyHeader,
  emptyLine,
  ensureSelectedOption,
  fieldWidthCh,
  formatAgentOption,
  formatClientOption,
  formatLocationOption,
  formatPercentDisplay,
  formatQuotationNumber,
  formatRateItemOption,
  formatSoOption,
  formatVesselOption,
  headerFromApi,
  intOrNull,
  intOrUndef,
  lineFromApi,
  mergeLineFromApi,
  m2oId,
  m2oName,
  normalizeClientOptions,
  normalizeLocationOptions,
  normalizeOptions,
  normalizeRateItems,
  normalizeStatusOptions,
  QUOTATION_LINE_STATUS_OPTIONS,
  reconcileQuotationLines,
} from "./quotationUtils";

function LabelCell({ children, bordered = true, bg: bgProp, accentLabel = false, ...props }) {
  const accentBg = useColorModeValue("orange.100", "orange.800");
  const defaultBg = accentLabel ? accentBg : "transparent";
  const color = useColorModeValue(
    accentLabel ? "orange.900" : "gray.700",
    accentLabel ? "orange.50" : "gray.200"
  );
  const cellBorderColor = useColorModeValue(
    accentLabel ? "orange.200" : "gray.200",
    accentLabel ? "orange.700" : "whiteAlpha.200"
  );
  return (
    <Box
      bg={bgProp ?? defaultBg}
      color={color}
      fontWeight={accentLabel ? "700" : "600"}
      fontSize="sm"
      px={4}
      py={3}
      borderWidth={bordered ? "1px" : 0}
      borderColor={cellBorderColor}
      display="flex"
      alignItems="center"
      minH="48px"
      {...props}
    >
      {children}
    </Box>
  );
}

function ValueCell({ children, accent, bordered = true, bg: bgProp, ...props }) {
  const defaultBg = useColorModeValue(
    accent ? "green.50" : "white",
    accent ? "green.900" : "gray.800"
  );
  const cellBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  return (
    <Box
      bg={bgProp ?? defaultBg}
      px={3}
      py={2}
      borderWidth={bordered ? "1px" : 0}
      borderColor={cellBorderColor}
      minH="48px"
      display="flex"
      alignItems="center"
      {...props}
    >
      {children}
    </Box>
  );
}

export default function QuotationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const history = useHistory();
  const toast = useToast();
  const { currencies } = useMasterData();

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const tableHeaderBg = useColorModeValue("orange.50", "orange.900");
  const tableHeaderText = useColorModeValue("orange.900", "orange.50");
  const lineTableHeaderBg = useColorModeValue("gray.600", "gray.700");
  const lineTableHeaderText = "white";
  const lineInputCellBg = useColorModeValue("green.50", "green.900");
  const lineCalcCellBg = useColorModeValue("blue.50", "blue.900");
  const lineEditableBg = useColorModeValue("white", "gray.800");
  const lineEditableBorder = useColorModeValue("gray.300", "gray.500");
  const lineReadOnlyColor = useColorModeValue("gray.700", "gray.200");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [quotationId, setQuotationId] = useState(isEdit ? id : null);
  const [header, setHeader] = useState(emptyHeader);
  const [lines, setLines] = useState([emptyLine()]);
  const [clientOptions, setClientOptions] = useState([]);
  const [vesselOptions, setVesselOptions] = useState([]);
  const [soOptions, setSoOptions] = useState([]);
  const [headerOptionsLoading, setHeaderOptionsLoading] = useState(false);
  const [lineOptionsLoading, setLineOptionsLoading] = useState({});
  const [deletedLineIds, setDeletedLineIds] = useState([]);
  const [statusSummary, setStatusSummary] = useState([]);
  const [quotationName, setQuotationName] = useState("");

  const autoSaveTimerRef = useRef(null);
  const lineSearchTimerRef = useRef({});
  const headerSearchTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const isReadyToSaveRef = useRef(false);
  const headerRef = useRef(header);
  headerRef.current = header;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const deletedLineIdsRef = useRef(deletedLineIds);
  deletedLineIdsRef.current = deletedLineIds;
  const quotationIdRef = useRef(quotationId);
  quotationIdRef.current = quotationId;

  const syncHeader = (updater) => {
    const next = typeof updater === "function" ? updater(headerRef.current) : updater;
    headerRef.current = next;
    setHeader(next);
    return next;
  };

  const syncLines = (updater) => {
    const next = typeof updater === "function" ? updater(linesRef.current) : updater;
    linesRef.current = next;
    setLines(next);
    return next;
  };

  const initKeyRef = useRef(null);
  const lastHeaderOptionsKeyRef = useRef("");
  const lastLineOptionsKeyRef = useRef({});
  const editOptionLabels = useRef({
    client: { name: "", code: "", address: "" },
    vessel: { name: "", imo: "" },
    so: { name: "" },
  });
  const selectProps = { size: "sm", bg: inputBg, color: inputText, borderColor };
  const headerSelectProps = { ...selectProps, bg: "transparent" };
  const lineCellFont = { fontSize: "xs", lineHeight: "short" };
  const lineCell = { py: 2, px: 2, verticalAlign: "middle" };
  const lineSelectProps = {
    ...selectProps,
    fontSize: "xs",
    prefillOnFocus: false,
    clearOnEmptySearch: false,
    bg: lineEditableBg,
    borderColor: lineEditableBorder,
    borderWidth: "1px",
  };
  const lineAutoSelectProps = {
    ...lineSelectProps,
    w: "auto",
    autoWidth: true,
    autoWidthMin: 10,
    autoWidthMax: 0,
    autoWidthPadding: 3,
  };
  const lineEditableInputProps = {
    size: "sm",
    variant: "outline",
    fontSize: "xs",
    bg: lineEditableBg,
    borderColor: lineEditableBorder,
    borderRadius: "md",
    px: 2,
    h: "28px",
    _hover: { borderColor: "blue.300" },
    _focus: {
      borderColor: "blue.400",
      boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
    },
  };
  const lineInputWidth = (value, placeholder = "", minCh = 6) => ({
    w: fieldWidthCh(value, placeholder),
    minW: `${minCh}ch`,
    maxW: "max-content",
  });
  const lineReadOnlyCell = { whiteSpace: "nowrap" };
  const lineReadOnlyText = {
    ...lineCellFont,
    color: lineReadOnlyColor,
    fontWeight: "600",
  };
  const headerDropdownProps = {
    ...headerSelectProps,
    prefillOnFocus: false,
    clearOnEmptySearch: false,
    serverSideSearch: true,
  };
  const LINE_TABLE_COLUMNS = [
    "Location ID",
    "Vendor",
    "Rate Item Name",
    "Rate Remark",
    "Cost sum",
    "ROE",
    "Cost USD",
    "MU %",
    "MU Amount",
    "QT Rate",
    "Amended Rate",
    "Rate to client",
    "GroupFree text",
    "Status",
  ];

  const loadHeaderOptions = useCallback(
    async (overrides = {}) => {
      const payload = {
        page: 1,
        page_size: 50,
        client_id: intOrUndef(overrides.client_id),
        vessel_id: intOrUndef(overrides.vessel_id),
        sale_order_id: intOrUndef(overrides.sale_order_id),
        q_client: overrides.q_client ?? "",
        q_vessel: overrides.q_vessel ?? "",
        q_so: overrides.q_so ?? "",
      };
      const requestKey = JSON.stringify(payload);
      if (requestKey === lastHeaderOptionsKeyRef.current) return;
      lastHeaderOptionsKeyRef.current = requestKey;

      setHeaderOptionsLoading(true);
      try {
        const result = await getNarviQuotationOptions(payload);
        setClientOptions(
          ensureSelectedOption(
            normalizeClientOptions(result.client_options),
            payload.client_id,
            (id) =>
              editOptionLabels.current.client.name
                ? {
                  id,
                  name: editOptionLabels.current.client.name,
                  client_code: editOptionLabels.current.client.code,
                  client_address: editOptionLabels.current.client.address,
                }
                : null
          )
        );
        if (result.vessel_options) {
          setVesselOptions(
            ensureSelectedOption(
              normalizeOptions(result.vessel_options),
              payload.vessel_id,
              (id) =>
                editOptionLabels.current.vessel.name
                  ? { id, name: editOptionLabels.current.vessel.name, imo: editOptionLabels.current.vessel.imo }
                  : null
            )
          );
        }
        if (result.so_options) {
          setSoOptions(
            ensureSelectedOption(
              normalizeOptions(result.so_options),
              payload.sale_order_id,
              (id) =>
                editOptionLabels.current.so.name
                  ? { id, name: editOptionLabels.current.so.name }
                  : null
            )
          );
        }
      } catch (error) {
        toast({
          title: "Error",
          description: extractNarviQuotationError(error, "Failed to load options."),
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setHeaderOptionsLoading(false);
      }
    },
    [toast]
  );

  const buildLineOptionsPayload = (lineState, search = {}) => {
    const h = headerRef.current;
    const payload = {
      quotation_id: intOrUndef(quotationIdRef.current),
      line_id: intOrUndef(lineState.id),
      is_client_specific: Boolean(lineState.is_client_specific),
      page: 1,
      page_size: 50,
      q_location: search.q_location ?? "",
      q_agent: search.q_agent ?? "",
      q_rate: search.q_rate ?? "",
    };
    if (lineState.is_client_specific) {
      payload.client_id = intOrUndef(h.client_id);
    }
    if (lineState.location) {
      payload.location = lineState.location;
    }
    if (lineState.is_client_specific && intOrUndef(lineState.agent_id)) {
      payload.agent_id = intOrUndef(lineState.agent_id);
    }
    return payload;
  };

  const getLineCascadeStage = (field) => {
    if (field === "is_client_specific" || field === "location") return "filters";
    if (field === "agent_id" || field === "rate_list_id") return "filters";
    return null;
  };

  const showLineOptionsWarnings = useCallback(
    (result) => {
      const warnings = result?.warnings ?? result?.warning;
      if (warnings) {
        const message = Array.isArray(warnings)
          ? warnings.filter(Boolean).join(" ")
          : String(warnings);
        if (message.trim()) {
          toast({
            title: "Line options",
            description: message,
            status: "warning",
            duration: 4000,
            isClosable: true,
          });
        }
      }
    },
    [toast]
  );

  const loadLineOptions = useCallback(
    async (lineIndex, lineState, search = {}) => {
      const quotationId = quotationIdRef.current;
      if (!intOrUndef(quotationId) || !intOrUndef(lineState.id)) return;

      const linePayload = buildLineOptionsPayload(lineState, search);
      const requestKey = `${lineIndex}:${JSON.stringify(linePayload)}`;
      if (lastLineOptionsKeyRef.current[requestKey]) return;
      lastLineOptionsKeyRef.current[requestKey] = true;

      setLineOptionsLoading((prev) => ({ ...prev, [lineIndex]: true }));
      try {
        const result = await getNarviQuotationLineOptions(linePayload);
        showLineOptionsWarnings(result);

        const nextLines = linesRef.current.map((line, i) => {
          if (i !== lineIndex) return line;
          const updates = { ...line };
          if (result.agent_required != null) {
            updates.agent_required = Boolean(result.agent_required);
          }
          if (result.rate_type_filter != null) {
            updates.rate_type_filter = apiString(result.rate_type_filter);
          }
          if (result.location_options) {
            updates.locationOptions = ensureSelectedOption(
              normalizeLocationOptions(result.location_options),
              line.location,
              (loc) => (loc ? { id: loc, name: loc, location: loc } : null)
            );
          }
          if (result.agent_options) {
            updates.agentOptions = ensureSelectedOption(
              normalizeOptions(result.agent_options),
              line.agent_id,
              (agentId) =>
                agentId
                  ? {
                    id: agentId,
                    name: line.agent_name || `Agent ${agentId}`,
                    company_name: line.agent_name || "",
                  }
                  : null
            );
          }
          if (result.rate_item_options) {
            updates.rateItemOptions = ensureSelectedOption(
              normalizeRateItems(result.rate_item_options),
              line.rate_list_id,
              (rateId) =>
                rateId
                  ? {
                    id: rateId,
                    name:
                      line.rate_list_name ||
                      line.rate_id ||
                      line.rate_item_name ||
                      `Rate ${rateId}`,
                    rate_id: line.rate_id,
                    rate_item_name: line.rate_item_name,
                    rate_remark: line.rate_remark,
                  }
                  : null
            );
          }
          if (result.status_options) {
            updates.statusOptions = normalizeStatusOptions(result.status_options);
          }
          if (result.currency_options) {
            updates.currencyOptions = normalizeOptions(result.currency_options);
          }
          if (!lineState.is_client_specific) {
            updates.agentOptions = [];
          }
          return updates;
        });
        linesRef.current = nextLines;
        setLines(nextLines);
      } catch (error) {
        toast({
          title: "Error",
          description: extractNarviQuotationError(error, "Failed to load line options."),
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLineOptionsLoading((prev) => ({ ...prev, [lineIndex]: false }));
      }
    },
    [showLineOptionsWarnings, toast]
  );

  const scheduleLineSearch = (lineIndex, field, value) => {
    const q = String(value ?? "").trim();
    if (!q) return;
    const timerKey = `${lineIndex}:${field}`;
    if (lineSearchTimerRef.current[timerKey]) {
      clearTimeout(lineSearchTimerRef.current[timerKey]);
    }
    lineSearchTimerRef.current[timerKey] = setTimeout(() => {
      const lineState = linesRef.current[lineIndex];
      if (!lineState) return;
      const searchKey = field === "location" ? "q_location" : field === "agent" ? "q_agent" : "q_rate";
      clearLineOptionsCache(lineIndex);
      loadLineOptions(lineIndex, lineState, { [searchKey]: q });
    }, 300);
  };

  const scheduleHeaderSearch = (field, value) => {
    const q = String(value ?? "").trim();
    if (!q) return;

    if (headerSearchTimerRef.current) clearTimeout(headerSearchTimerRef.current);
    headerSearchTimerRef.current = setTimeout(() => {
      lastHeaderOptionsKeyRef.current = "";
      const currentHeader = headerRef.current;
      loadHeaderOptions({
        client_id: currentHeader.client_id,
        vessel_id: currentHeader.vessel_id,
        sale_order_id: currentHeader.sale_order_id,
        q_client: field === "client" ? q : "",
        q_vessel: field === "vessel" ? q : "",
        q_so: field === "so" ? q : "",
      });
    }, 300);
  };

  useEffect(() => {
    const initKey = isEdit ? `edit-${id}` : "new";
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;

    const init = async () => {
      lastHeaderOptionsKeyRef.current = "";
      lastLineOptionsKeyRef.current = {};

      if (!isEdit) {
        await loadHeaderOptions();
        isReadyToSaveRef.current = true;
        return;
      }

      setLoading(true);
      try {
        const q = await getNarviQuotation(id);
        setQuotationName(q.name || "");
        setStatusSummary(Array.isArray(q.status_summary) ? q.status_summary : []);
        editOptionLabels.current = {
          client: {
            id: m2oId(q.client_id),
            name: q.client_name || m2oName(q.client_id),
            code: q.client_code || "",
            address: q.client_address || "",
          },
          vessel: {
            id: m2oId(q.vessel_id),
            name: q.vessel_name || m2oName(q.vessel_id),
            imo: q.vessel_imo || "",
          },
          so: {
            id: m2oId(q.sale_order_id),
            name: m2oName(q.sale_order_id) || apiString(q.so_id) || apiString(q.so_number),
          },
        };
        const nextHeader = headerFromApi(q);
        setHeader(nextHeader);
        const apiLines = Array.isArray(q.quotation_lines)
          ? q.quotation_lines.map(lineFromApi)
          : [emptyLine()];
        const loadedLines = apiLines.length ? apiLines : [emptyLine()];
        setLines(loadedLines);

        await loadHeaderOptions({
          client_id: nextHeader.client_id,
          vessel_id: nextHeader.vessel_id,
          sale_order_id: nextHeader.sale_order_id,
        });
        await Promise.all(loadedLines.map((line, index) => loadLineOptions(index, line)));
        setQuotationId(id);
        quotationIdRef.current = id;
        isReadyToSaveRef.current = true;
      } catch (error) {
        toast({
          title: "Error",
          description: extractNarviQuotationError(error, "Failed to load quotation."),
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        history.push("/admin/quotations/list");
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (headerSearchTimerRef.current) clearTimeout(headerSearchTimerRef.current);
      Object.values(lineSearchTimerRef.current).forEach((timer) => clearTimeout(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const extractSavedQuotationId = (result) =>
    result?.data?.id ?? result?.id ?? result?.quotation?.id ?? null;

  const applyQuotationFromApi = useCallback((q) => {
    if (!q || typeof q !== "object") return;

    if (q.name) setQuotationName(q.name);
    setStatusSummary(Array.isArray(q.status_summary) ? q.status_summary : []);

    if (q.client_id != null || q.validity_date != null) {
      const nextHeader = headerFromApi(q);
      headerRef.current = nextHeader;
      setHeader(nextHeader);
    }

    const savedLines = q.quotation_lines;
    if (!Array.isArray(savedLines) || !savedLines.length) return;

    const next = reconcileQuotationLines(linesRef.current, savedLines);
    linesRef.current = next;
    setLines(next);
  }, []);

  const applySaveResponse = useCallback(
    (result) => {
      const saved = result?.data ?? result?.quotation ?? result;
      applyQuotationFromApi(saved);
    },
    [applyQuotationFromApi]
  );

  const ensureLineOptionsForIndex = useCallback(
    async (lineIndex) => {
      let line = linesRef.current[lineIndex];
      if (!line) return;

      if (!line.id && quotationIdRef.current) {
        try {
          const full = await getNarviQuotation(quotationIdRef.current);
          applyQuotationFromApi(full);
          line = linesRef.current[lineIndex];
        } catch (error) {
          toast({
            title: "Error",
            description: extractNarviQuotationError(error, "Failed to refresh quotation lines."),
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }

      if (!line?.id || !quotationIdRef.current) return;

      Object.keys(lastLineOptionsKeyRef.current).forEach((key) => {
        if (key.startsWith(`${lineIndex}:`)) {
          delete lastLineOptionsKeyRef.current[key];
        }
      });
      await loadLineOptions(lineIndex, line);
    },
    [applyQuotationFromApi, loadLineOptions, toast]
  );

  const buildPayload = useCallback((qId) => {
    const h = headerRef.current;
    const ls = linesRef.current;
    const dels = deletedLineIdsRef.current;
    return {
      ...(qId ? { id: Number(qId) } : {}),
      client_id: intOrNull(h.client_id),
      vessel_id: intOrNull(h.vessel_id),
      sale_order_id: intOrNull(h.sale_order_id),
      validity_date: h.validity_date?.trim() ? h.validity_date : null,
      currency_id: intOrNull(h.currency_id),
      usd_roe: h.usd_roe !== "" && h.usd_roe != null ? Number(h.usd_roe) : null,
      general_mu: h.general_mu !== "" && h.general_mu != null ? Number(h.general_mu) : null,
      caf: h.caf !== "" && h.caf != null ? Number(h.caf) : null,
      quotation_lines: [
        ...ls.map((line) => buildLineSavePayload(line)),
        ...dels.map((lineId) => ({ id: lineId, delete: true })),
      ],
    };
  }, []);

  const canAutoSave = useCallback(() => {
    if (!isReadyToSaveRef.current || loading) return false;
    if (!headerRef.current.client_id) return false;
    if (linesRef.current.some((line) => line.is_client_specific && !headerRef.current.client_id)) {
      return false;
    }
    return true;
  }, [loading]);

  const persistQuotation = useCallback(async () => {
    if (!canAutoSave()) return false;

    setSaving(true);
    try {
      const currentId = quotationIdRef.current;
      const payload = buildPayload(currentId);

      if (!currentId) {
        const result = await createNarviQuotation(payload);
        const newId = extractSavedQuotationId(result);
        if (newId) {
          quotationIdRef.current = newId;
          setQuotationId(String(newId));
          const newInitKey = `edit-${newId}`;
          initKeyRef.current = newInitKey;
          history.replace(`/admin/quotations/edit/${newId}`);
        }
        applySaveResponse(result);
        if (newId && !result?.data?.quotation_lines) {
          const full = await getNarviQuotation(newId);
          applyQuotationFromApi(full);
        }
      } else {
        const result = await updateNarviQuotation(payload);
        applySaveResponse(result);
      }

      if (deletedLineIdsRef.current.length) {
        deletedLineIdsRef.current = [];
        setDeletedLineIds([]);
      }
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(
          error,
          quotationIdRef.current ? "Failed to update quotation." : "Failed to create quotation."
        ),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [applyQuotationFromApi, applySaveResponse, buildPayload, canAutoSave, history, toast]);

  const runPersistThenOptions = useCallback(
    async (optionsFn) => {
      if (!isReadyToSaveRef.current) return false;
      const run = async () => {
        const saved = await persistQuotation();
        if (saved && optionsFn) {
          await optionsFn();
        }
        return saved;
      };
      saveQueueRef.current = saveQueueRef.current.then(run).catch(() => false);
      return saveQueueRef.current;
    },
    [persistQuotation]
  );

  const schedulePersist = useCallback(
    (optionsFn, delay = 500) => {
      if (!isReadyToSaveRef.current) return;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        runPersistThenOptions(optionsFn);
      }, delay);
    },
    [runPersistThenOptions]
  );

  const clearLineOptionsCache = (lineIndex) => {
    const lineKeyPrefix = `${lineIndex}:`;
    Object.keys(lastLineOptionsKeyRef.current).forEach((key) => {
      if (key.startsWith(lineKeyPrefix)) {
        delete lastLineOptionsKeyRef.current[key];
      }
    });
  };

  const handleClientChange = async (value) => {
    syncHeader((prev) => ({
      ...prev,
      client_id: value || "",
      vessel_id: "",
      sale_order_id: "",
    }));
    setVesselOptions([]);
    setSoOptions([]);

    syncLines((prev) =>
      prev.map((line) => {
        if (!line.is_client_specific) return line;
        return {
          ...line,
          location: "",
          agent_id: "",
          agent_name: "",
          rate_list_id: "",
          rate_id: "",
          rate_item_name: "",
          rate_remark: "",
          locationOptions: [],
          agentOptions: [],
          rateItemOptions: [],
        };
      })
    );

    await runPersistThenOptions(async () => {
      lastHeaderOptionsKeyRef.current = "";
      await loadHeaderOptions({ client_id: value || undefined });
      lastLineOptionsKeyRef.current = {};
      await Promise.all(
        linesRef.current.map((line, index) =>
          intOrUndef(line.id) ? loadLineOptions(index, line) : Promise.resolve()
        )
      );
    });
  };

  const handleVesselChange = async (value) => {
    syncHeader((prev) => ({ ...prev, vessel_id: value || "", sale_order_id: "" }));
    setSoOptions([]);

    await runPersistThenOptions(async () => {
      lastHeaderOptionsKeyRef.current = "";
      await loadHeaderOptions({
        client_id: headerRef.current.client_id || undefined,
        vessel_id: value || undefined,
      });
    });
  };

  const updateLineCascade = async (index, field, value) => {
    syncLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const nextLine = { ...line, [field]: value };
        if (field === "is_client_specific") {
          Object.assign(nextLine, {
            location: "",
            agent_id: "",
            agent_name: "",
            rate_list_id: "",
            rate_id: "",
            rate_item_name: "",
            rate_remark: "",
            locationOptions: [],
            agentOptions: [],
            rateItemOptions: [],
          });
        } else if (field === "location") {
          Object.assign(nextLine, {
            agent_id: "",
            agent_name: "",
            rate_list_id: "",
            rate_id: "",
            rate_item_name: "",
            rate_remark: "",
            agentOptions: [],
            rateItemOptions: [],
          });
        } else if (field === "agent_id") {
          Object.assign(nextLine, {
            rate_list_id: "",
            rate_id: "",
            rate_item_name: "",
            rate_remark: "",
            rateItemOptions: [],
          });
        } else if (field === "rate_list_id") {
          const item = line.rateItemOptions.find((r) => String(r.id) === String(value));
          nextLine.rate_list_id = value || "";
          nextLine.rate_id = item?.rate_id ?? "";
          nextLine.rate_item_name = item?.rate_item_name ?? "";
          nextLine.rate_remark = item?.rate_remark ?? item?.remarks ?? "";
        }
        return nextLine;
      })
    );

    const lineState = linesRef.current[index];
    const cascadeStage = getLineCascadeStage(field);

    await runPersistThenOptions(async () => {
      if (!cascadeStage) return;
      clearLineOptionsCache(index);
      const currentLine = linesRef.current[index];
      if (!currentLine) return;
      await loadLineOptions(index, currentLine);
    });
  };

  const updateLineField = (index, field, value) => {
    syncLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
    const delay = ["remark", "group_free_text", "free_text"].includes(field) ? 800 : 500;
    schedulePersist(null, delay);
  };

  const addLine = async () => {
    const template =
      linesRef.current.find((line) => line.locationOptions?.length) || linesRef.current[0];
    const newLine = {
      ...emptyLine(),
      statusOptions: template?.statusOptions?.length
        ? template.statusOptions
        : QUOTATION_LINE_STATUS_OPTIONS,
      currencyOptions: template?.currencyOptions?.length ? template.currencyOptions : [],
    };
    const newIndex = linesRef.current.length;
    syncLines((prev) => [...prev, newLine]);

    await runPersistThenOptions(async () => {
      await ensureLineOptionsForIndex(newIndex);
    });
  };

  const removeLine = (index) => {
    if (linesRef.current.length <= 1) return;
    const line = linesRef.current[index];
    const nextLines = linesRef.current.filter((_, i) => i !== index);
    linesRef.current = nextLines;
    setLines(nextLines);
    if (line.id) {
      const nextDeleted = [...deletedLineIdsRef.current, line.id];
      deletedLineIdsRef.current = nextDeleted;
      setDeletedLineIds(nextDeleted);
    }
    schedulePersist();
  };

  if (loading) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="24px">
        <Flex justify="center" py={20}>
          <Spinner size="lg" />
        </Flex>
      </Box>
    );
  }

  const worksheetFields = [
    { label: "Validity Date", key: "validity_date", type: "date" },
    { label: "Currency", key: "currency_id", type: "currency" },
    { label: "USD ROE", key: "usd_roe", type: "text" },
    { label: "General MU", key: "general_mu", type: "text" },
    { label: "CAF", key: "caf", type: "text" },
  ];

  const renderWorksheetField = ({ label, key, type }) => (
    <React.Fragment key={key}>
      <LabelCell bordered={false} accentLabel minH="34px" px={2} py={1}>
        {label}
      </LabelCell>
      <ValueCell bordered={false} accent minH="34px" px={2} py={1}>
        {type === "currency" ? (
          <SimpleSearchableSelect
            value={header.currency_id}
            onChange={(val) => {
              syncHeader((p) => ({ ...p, currency_id: val || "" }));
              runPersistThenOptions();
            }}
            options={currencies}
            placeholder="Currency"
            formatOption={(c) => c.name || `Currency ${c.id}`}
            {...selectProps}
          />
        ) : (
          <Input
            type={type === "date" ? "date" : "text"}
            size="sm"
            variant="unstyled"
            bg="transparent"
            w="100%"
            value={header[key]}
            onChange={(e) => {
              syncHeader((p) => ({ ...p, [key]: e.target.value }));
              schedulePersist(null, 800);
            }}
          />
        )}
      </ValueCell>
    </React.Fragment>
  );

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px={{ base: "16px", md: "24px" }} pb={10}>
      <VStack align="stretch" spacing={5}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={MdArrowBack} />}
              variant="ghost"
              size="sm"
              onClick={() => history.push("/admin/quotations/list")}
            >
              Back
            </Button>
            <Text color={textColor} fontSize="xl" fontWeight="700">
              {quotationName ||
                (quotationId ? `Edit Quotation #${quotationId}` : "New Quotation")}
            </Text>
          </HStack>
          <HStack spacing={3}>
            {saving ? (
              <HStack spacing={2}>
                <Spinner size="sm" />
                <Text fontSize="sm" color={textColor}>
                  Saving...
                </Text>
              </HStack>
            ) : null}
            <Button variant="outline" onClick={() => history.push("/admin/quotations/list")}>
              Back to list
            </Button>
          </HStack>
        </Flex>

        <Card direction="column" w="100%" px="0" overflow="hidden">
          <Box p={{ base: 3, md: 5 }}>
            <Flex
              direction={{ base: "column", lg: "row" }}
              align="flex-start"
              justify="space-between"
              gap={{ base: 4, lg: 0 }}
              w="100%"
            >
              <Grid
                templateColumns={{ base: "130px 1fr", lg: "130px minmax(180px, 260px)" }}
                gap={0}
                flexShrink={0}
                w={{ base: "100%", lg: "auto" }}
              >
                <LabelCell bordered={false}>Client</LabelCell>
                <ValueCell bordered={false} bg="transparent">
                  <SimpleSearchableSelect
                    value={header.client_id}
                    onChange={handleClientChange}
                    options={clientOptions}
                    placeholder="Select client"
                    isLoading={headerOptionsLoading}
                    formatOption={formatClientOption}
                    onSearchChange={(q) => scheduleHeaderSearch("client", q)}
                    {...headerDropdownProps}
                  />
                </ValueCell>

                <LabelCell bordered={false}>Vessel</LabelCell>
                <ValueCell bordered={false} bg="transparent">
                  <SimpleSearchableSelect
                    value={header.vessel_id}
                    onChange={handleVesselChange}
                    options={vesselOptions}
                    placeholder="Select vessel"
                    isLoading={headerOptionsLoading}
                    formatOption={formatVesselOption}
                    onSearchChange={(q) => scheduleHeaderSearch("vessel", q)}
                    {...headerDropdownProps}
                  />
                </ValueCell>

                <LabelCell bordered={false}>SO ID</LabelCell>
                <ValueCell bordered={false} bg="transparent">
                  <SimpleSearchableSelect
                    value={header.sale_order_id}
                    onChange={(val) => {
                      syncHeader((p) => ({ ...p, sale_order_id: val || "" }));
                      runPersistThenOptions();
                    }}
                    options={soOptions}
                    placeholder="Select SO"
                    isLoading={headerOptionsLoading}
                    formatOption={formatSoOption}
                    onSearchChange={(q) => scheduleHeaderSearch("so", q)}
                    {...headerDropdownProps}
                  />
                </ValueCell>
              </Grid>

              <Grid
                templateColumns={{ base: "130px 1fr", lg: "140px minmax(160px, 240px)" }}
                gap={0}
                flexShrink={0}
                alignContent="start"
                w={{ base: "100%", lg: "auto" }}

              >
                {worksheetFields.map(renderWorksheetField)}
              </Grid>

              <Grid
                gap={0}
                flexShrink={0}
                w={{ base: "100%", lg: "auto" }}
              >
                {statusSummary.length > 0 && (
                  <Box w="100%">
                    <Box
                      w={{ base: "100%", lg: "fit-content" }}
                      ml={{ base: 0, lg: "auto" }}
                      overflowX="auto"
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                    >
                      <Table size="sm" variant="simple" minW="480px">
                        <Thead bg={tableHeaderBg}>
                          <Tr>
                            {["Status", "Cost", "Markup", "Sale", "Profit Rate"].map((col) => (
                              <Th
                                key={col}
                                fontSize="10px"
                                textTransform="uppercase"
                                color={tableHeaderText}
                                py={3}
                                px={3}
                                whiteSpace="nowrap"
                              >
                                {col}
                              </Th>
                            ))}
                          </Tr>
                        </Thead>
                        <Tbody>
                          {statusSummary.map((row) => (
                            <Tr key={row.status}>
                              <Td {...lineCell}>
                                <Text {...lineCellFont} fontWeight="600">
                                  {row.status_label || row.status}
                                </Text>
                              </Td>
                              <Td {...lineCell}>
                                <Text {...lineCellFont}>{formatQuotationNumber(row.cost)}</Text>
                              </Td>
                              <Td {...lineCell}>
                                <Text {...lineCellFont}>{formatQuotationNumber(row.markup)}</Text>
                              </Td>
                              <Td {...lineCell}>
                                <Text {...lineCellFont}>{formatQuotationNumber(row.sale)}</Text>
                              </Td>
                              <Td {...lineCell}>
                                <Text {...lineCellFont}>
                                  {row.profit_rate_display ||
                                    formatPercentDisplay(row.profit_rate)}
                                </Text>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </Box>
                )}
              </Grid>
            </Flex>
            <Box mt={6} />

            <Flex justify="space-between" align="center" mb={3} flexWrap="wrap" gap={3}>
              <Text fontWeight="700" color={textColor}>
                Quotation Lines
              </Text>
              <Button size="sm" leftIcon={<Icon as={MdAdd} />} colorScheme="blue" variant="outline" onClick={addLine}>
                Add Row
              </Button>
            </Flex>

            <Box w="100%" overflowX="auto" borderWidth="1px" borderColor={borderColor} borderRadius="md">
              <Table
                size="sm"
                variant="simple"
                sx={{ tableLayout: "auto", width: "max-content", minWidth: "100%" }}
              >
                <Thead bg={lineTableHeaderBg}>
                  <Tr>
                    <Th
                      w="100px"
                      py={2}
                      px={1}
                      borderColor="whiteAlpha.300"
                      fontSize="10px"
                      fontWeight="600"
                      textTransform="none"
                      color={lineTableHeaderText}
                      title="Client specific"
                    >
                      Client Specific
                    </Th>
                    {LINE_TABLE_COLUMNS.map((col) => (
                      <Th
                        key={col}
                        fontSize="xs"
                        fontWeight="600"
                        textTransform="none"
                        color={lineTableHeaderText}
                        whiteSpace="nowrap"
                        py={2}
                        px={2}
                        borderColor="whiteAlpha.300"
                      >
                        {col}
                      </Th>
                    ))}
                    <Th w="40px" py={2} px={1} borderColor="whiteAlpha.300" />
                  </Tr>
                </Thead>
                <Tbody>
                  {lines.map((line, index) => {
                    const statusOptions = line.statusOptions?.length
                      ? line.statusOptions
                      : QUOTATION_LINE_STATUS_OPTIONS;
                    return (
                      <Tr key={line.id ?? `line-${index}`}>
                        <Td {...lineCell} textAlign="center" px={1} title="Client specific">
                          <Switch
                            size="sm"
                            colorScheme="blue"
                            isChecked={line.is_client_specific}
                            onChange={(e) =>
                              updateLineCascade(index, "is_client_specific", e.target.checked)
                            }
                          />
                        </Td>
                        <Td {...lineCell} bg={lineInputCellBg} {...lineReadOnlyCell}>
                          <SimpleSearchableSelect
                            value={line.location}
                            onChange={(val) => updateLineCascade(index, "location", val || "")}
                            options={line.locationOptions}
                            placeholder="Location"
                            isLoading={lineOptionsLoading[index]}
                            formatOption={formatLocationOption}
                            serverSideSearch
                            onSearchChange={(q) => scheduleLineSearch(index, "location", q)}
                            {...lineAutoSelectProps}
                          />
                        </Td>
                        <Td {...lineCell} bg={lineInputCellBg} {...lineReadOnlyCell}>
                          {line.is_client_specific ? (
                            <SimpleSearchableSelect
                              value={line.agent_id}
                              onChange={(val) => updateLineCascade(index, "agent_id", val || "")}
                              options={line.agentOptions}
                              placeholder="Vendor"
                              isLoading={lineOptionsLoading[index]}
                              formatOption={formatAgentOption}
                              serverSideSearch
                              onSearchChange={(q) => scheduleLineSearch(index, "agent", q)}
                              {...lineAutoSelectProps}
                            />
                          ) : (
                            <Text {...lineCellFont} color="gray.500">
                              —
                            </Text>
                          )}
                        </Td>
                        <Td {...lineCell} bg={lineInputCellBg} {...lineReadOnlyCell}>
                          <SimpleSearchableSelect
                            value={line.rate_list_id}
                            onChange={(val) => updateLineCascade(index, "rate_list_id", val || "")}
                            options={line.rateItemOptions}
                            placeholder="Rate item"
                            isLoading={lineOptionsLoading[index]}
                            formatOption={(item) =>
                              item.rate_item_name || item.name || formatRateItemOption(item)
                            }
                            serverSideSearch
                            onSearchChange={(q) => scheduleLineSearch(index, "rate", q)}
                            {...lineAutoSelectProps}
                          />
                        </Td>
                        <Td {...lineCell} bg={lineInputCellBg} {...lineReadOnlyCell}>
                          <Text {...lineReadOnlyText} title={line.rate_remark || undefined}>
                            {line.rate_remark || "—"}
                          </Text>
                        </Td>
                        <Td {...lineCell} bg={lineInputCellBg} {...lineReadOnlyCell}>
                          <Text {...lineReadOnlyText}>
                            {formatQuotationNumber(line.cost_sum)}
                          </Text>
                        </Td>
                        <Td {...lineCell} bg={lineInputCellBg} {...lineReadOnlyCell}>
                          <Input
                            {...lineEditableInputProps}
                            {...lineInputWidth(line.roe, "ROE", 5)}
                            type="number"
                            value={line.roe}
                            onChange={(e) => updateLineField(index, "roe", e.target.value)}
                          />
                        </Td>
                        <Td {...lineCell} bg={lineCalcCellBg} {...lineReadOnlyCell}>
                          <Text {...lineReadOnlyText}>
                            {formatQuotationNumber(line.cost_usd)}
                          </Text>
                        </Td>
                        <Td {...lineCell} bg={lineCalcCellBg} {...lineReadOnlyCell}>
                          <Input
                            {...lineEditableInputProps}
                            {...lineInputWidth(line.mu_percent, "MU %", 5)}
                            type="number"
                            value={line.mu_percent}
                            onChange={(e) => updateLineField(index, "mu_percent", e.target.value)}
                          />
                        </Td>
                        <Td {...lineCell} bg={lineCalcCellBg} {...lineReadOnlyCell}>
                          <Text {...lineReadOnlyText}>
                            {formatQuotationNumber(line.mu_amount)}
                          </Text>
                        </Td>
                        <Td {...lineCell} bg={lineCalcCellBg} {...lineReadOnlyCell}>
                          <Text {...lineReadOnlyText}>
                            {formatQuotationNumber(line.qt_rate)}
                          </Text>
                        </Td>
                        <Td {...lineCell} bg={lineCalcCellBg} {...lineReadOnlyCell}>
                          <Input
                            {...lineEditableInputProps}
                            {...lineInputWidth(line.amended_value, "Amended", 6)}
                            type="number"
                            value={line.amended_value}
                            onChange={(e) => updateLineField(index, "amended_value", e.target.value)}
                          />
                        </Td>
                        <Td {...lineCell} bg={lineCalcCellBg} {...lineReadOnlyCell}>
                          <Text {...lineReadOnlyText}>
                            {formatQuotationNumber(line.rate_to_client)}
                          </Text>
                        </Td>
                        <Td {...lineCell} {...lineReadOnlyCell}>
                          <Input
                            {...lineEditableInputProps}
                            {...lineInputWidth(line.group_free_text, "GroupFree text", 12)}
                            value={line.group_free_text}
                            onChange={(e) =>
                              updateLineField(index, "group_free_text", e.target.value)
                            }
                          />
                        </Td>
                        <Td {...lineCell} {...lineReadOnlyCell}>
                          <SimpleSearchableSelect
                            value={line.status}
                            onChange={(val) => updateLineField(index, "status", val || "quote_current")}
                            options={statusOptions}
                            placeholder="Status"
                            formatOption={(opt) => opt.name || opt.id}
                            {...lineAutoSelectProps}
                            autoWidthMin={12}
                          />
                        </Td>
                        <Td {...lineCell} textAlign="center" px={1}>
                          <IconButton
                            aria-label="Remove line"
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            icon={<MdDelete />}
                            isDisabled={lines.length <= 1}
                            onClick={() => removeLine(index)}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>
        </Card>
      </VStack>
    </Box>
  );
}
