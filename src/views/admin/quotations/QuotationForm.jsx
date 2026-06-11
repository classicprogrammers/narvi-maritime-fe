import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
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
  Textarea,
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
  emptyHeader,
  emptyLine,
  ensureSelectedOption,
  formatAgentOption,
  formatClientOption,
  formatLocationOption,
  formatRateItemOption,
  formatSoOption,
  formatVesselOption,
  intOrNull,
  intOrUndef,
  lineFromApi,
  numOrNull,
  strOrNull,
  m2oId,
  m2oName,
  normalizeClientOptions,
  normalizeLocationOptions,
  normalizeOptions,
  normalizeRateItems,
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
  const remarkReadonlyBg = useColorModeValue("blue.50", "blue.900");
  const freeTextBg = useColorModeValue("green.50", "green.900");

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

  const autoSaveTimerRef = useRef(null);
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
  const lineCell = { py: 1.5, px: 2, verticalAlign: "middle" };
  const lineSelectProps = {
    ...selectProps,
    fontSize: "xs",
    w: "100%",
    prefillOnFocus: false,
    clearOnEmptySearch: false,
  };
  const headerDropdownProps = {
    ...headerSelectProps,
    prefillOnFocus: false,
    clearOnEmptySearch: false,
    serverSideSearch: true,
  };
  const lineColumnWidths = [
    "72px",
    "9%",
    "13%",
    "15%",
    "14%",
    "12%",
    "10%",
    "56px",
    "12%",
    "40px",
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

  const buildLineOptionsPayload = (stage, lineState, quotationId) => {
    const payload = {
      quotation_id: intOrUndef(quotationId),
      line_id: intOrUndef(lineState.id),
      is_client_specific: Boolean(lineState.is_client_specific),
    };
    if (stage !== "location" && lineState.location) {
      payload.location = lineState.location;
    }
    if (stage === "rate" && lineState.is_client_specific && intOrUndef(lineState.agent_id)) {
      payload.agent_id = intOrUndef(lineState.agent_id);
    }
    return payload;
  };

  const getLineCascadeStage = (field, lineState) => {
    if (field === "is_client_specific") return "location";
    if (field === "location") return lineState.is_client_specific ? "agent" : "rate";
    if (field === "agent_id") return "rate";
    return null;
  };

  const showLineOptionsWarnings = useCallback(
    (result, stage) => {
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
          return;
        }
      }
      const emptyLocations =
        stage === "location" &&
        (!Array.isArray(result?.location_options) || result.location_options.length === 0);
      const emptyAgents =
        stage === "agent" &&
        (!Array.isArray(result?.agent_options) || result.agent_options.length === 0);
      const emptyRates =
        stage === "rate" &&
        (!Array.isArray(result?.rate_item_options) || result.rate_item_options.length === 0);
      if (emptyLocations || emptyAgents || emptyRates) {
        toast({
          title: "No options available",
          description: "The server returned no matching options for this line. Check saved values and try again.",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
      }
    },
    [toast]
  );

  const loadLineOptionsStage = useCallback(
    async (lineIndex, lineState, stage) => {
      const quotationId = quotationIdRef.current;
      if (!intOrUndef(quotationId) || !intOrUndef(lineState.id)) return;

      if (stage === "agent") {
        if (!lineState.is_client_specific || !lineState.location) return;
      }
      if (stage === "rate") {
        if (!lineState.location) return;
        if (lineState.is_client_specific && !intOrUndef(lineState.agent_id)) return;
      }

      const linePayload = buildLineOptionsPayload(stage, lineState, quotationId);
      const requestKey = `${lineIndex}:${stage}:${JSON.stringify(linePayload)}`;
      if (lastLineOptionsKeyRef.current[requestKey]) return;
      lastLineOptionsKeyRef.current[requestKey] = true;

      setLineOptionsLoading((prev) => ({ ...prev, [lineIndex]: true }));
      try {
        const result = await getNarviQuotationLineOptions(linePayload);
        showLineOptionsWarnings(result, stage);

        const nextLines = linesRef.current.map((line, i) => {
          if (i !== lineIndex) return line;
          const updates = { ...line };
          if (result.agent_required != null) {
            updates.agent_required = Boolean(result.agent_required);
          }
          if (result.rate_type_filter != null) {
            updates.rate_type_filter = apiString(result.rate_type_filter);
          }
          if (result.client_id != null && lineState.is_client_specific) {
            updates.line_client_id = m2oId(result.client_id);
          }
          if (stage === "location" && result.location_options) {
            updates.locationOptions = ensureSelectedOption(
              normalizeLocationOptions(result.location_options),
              line.location,
              (loc) => (loc ? { id: loc, name: loc, location: loc } : null)
            );
          }
          if (stage === "agent") {
            updates.rateItemOptions = [];
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
          }
          if (stage === "rate" && !lineState.is_client_specific) {
            updates.agentOptions = [];
          }
          if (stage === "rate" && result.rate_item_options) {
            updates.rateItemOptions = ensureSelectedOption(
              normalizeRateItems(result.rate_item_options),
              line.rate_list_id,
              (rateId) =>
                rateId
                  ? {
                    id: rateId,
                    name: line.rate_list_name || line.rate_id || line.rate_item_name || `Rate ${rateId}`,
                    rate_id: line.rate_id,
                    rate_item_name: line.rate_item_name,
                    rate_remark: line.rate_remark,
                  }
                  : null
            );
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

  const loadAllLineOptions = useCallback(
    async (lineIndex, lineState) => {
      if (!intOrUndef(quotationIdRef.current) || !intOrUndef(lineState.id)) return;
      await loadLineOptionsStage(lineIndex, lineState, "location");
      if (!lineState.location) return;
      if (lineState.is_client_specific) {
        await loadLineOptionsStage(lineIndex, lineState, "agent");
        if (intOrUndef(lineState.agent_id)) {
          await loadLineOptionsStage(lineIndex, lineState, "rate");
        }
      } else {
        await loadLineOptionsStage(lineIndex, lineState, "rate");
      }
    },
    [loadLineOptionsStage]
  );

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
        const nextHeader = {
          client_id: m2oId(q.client_id),
          vessel_id: m2oId(q.vessel_id),
          sale_order_id: m2oId(q.sale_order_id),
          validity_date: apiString(q.validity_date),
          currency_id: m2oId(q.currency_id),
          usd_roe: q.usd_roe != null ? String(q.usd_roe) : "1",
          general_mu: q.general_mu != null ? String(q.general_mu) : "",
          caf: q.caf != null ? String(q.caf) : "",
        };
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
        await Promise.all(loadedLines.map((line, index) => loadAllLineOptions(index, line)));
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const extractSavedQuotationId = (result) =>
    result?.id ?? result?.data?.id ?? result?.quotation?.id ?? null;

  const applySaveResponse = useCallback((result) => {
    const saved = result?.quotation ?? result?.data ?? result;
    const savedLines = saved?.quotation_lines;
    if (!Array.isArray(savedLines) || !savedLines.length) return;

    const next = linesRef.current.map((line, index) => {
      const apiLine = savedLines[index];
      if (!apiLine) return line;
      return { ...line, id: apiLine.id ?? line.id };
    });
    linesRef.current = next;
    setLines(next);
  }, []);

  const buildPayload = useCallback((qId) => {
    const h = headerRef.current;
    const ls = linesRef.current;
    const dels = deletedLineIdsRef.current;
    return {
      ...(qId ? { id: Number(qId) } : {}),
      client_id: intOrNull(h.client_id),
      vessel_id: intOrNull(h.vessel_id),
      sale_order_id: intOrNull(h.sale_order_id),
      validity_date: strOrNull(h.validity_date),
      currency_id: intOrNull(h.currency_id),
      usd_roe: numOrNull(h.usd_roe),
      general_mu: numOrNull(h.general_mu),
      caf: numOrNull(h.caf),
      quotation_lines: [
        ...ls.map((line) => {
          const row = {
            id: line.id ?? null,
            is_client_specific: Boolean(line.is_client_specific),
            location: strOrNull(line.location),
            rate_list_id: intOrNull(line.rate_list_id),
            free_text: strOrNull(line.free_text),
            pre_text_rate_item_name: Boolean(line.pre_text_rate_item_name),
            remark: strOrNull(line.remark),
          };
          if (line.is_client_specific) {
            row.agent_id = intOrNull(line.agent_id);
          }
          return row;
        }),
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
  }, [applySaveResponse, buildPayload, canAutoSave, history, toast]);

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

  const clearLineOptionsCache = (lineIndex, stage) => {
    const lineKeyPrefix = `${lineIndex}:${stage}:`;
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
          intOrUndef(line.id) ? loadLineOptionsStage(index, line, "location") : Promise.resolve()
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
    const cascadeStage = lineState ? getLineCascadeStage(field, lineState) : null;

    await runPersistThenOptions(async () => {
      if (!cascadeStage) return;
      clearLineOptionsCache(index, cascadeStage);
      const currentLine = linesRef.current[index];
      if (!currentLine) return;
      await loadLineOptionsStage(index, currentLine, cascadeStage);
    });
  };

  const addLine = async () => {
    const newLine = emptyLine();
    const newIndex = linesRef.current.length;
    syncLines((prev) => [...prev, newLine]);
    await runPersistThenOptions(async () => {
      const savedLine = linesRef.current[newIndex];
      if (savedLine?.id) {
        await loadLineOptionsStage(newIndex, savedLine, "location");
      }
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
              {quotationId ? `Edit Quotation #${quotationId}` : "New Quotation"}
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
                templateColumns={{ base: "130px 1fr", lg: "140px minmax(160px, 440px)" }}
                gap={0}
                flexShrink={0}
                alignContent="start"
                w={{ base: "100%", lg: "auto" }}

              >
                {worksheetFields.map(renderWorksheetField)}
              </Grid>
            </Flex>

            <Box mt={6} />

            <Flex justify="space-between" align="center" mb={3}>
              <Text fontWeight="700" color={textColor}>
                Quotation Lines
              </Text>
              <Button size="sm" leftIcon={<Icon as={MdAdd} />} colorScheme="blue" variant="outline" onClick={addLine}>
                Add Row
              </Button>
            </Flex>

            <Box w="100%" overflowX="auto" borderWidth="1px" borderColor={borderColor} borderRadius="md">
              <Table size="sm" variant="simple" w="100%" sx={{ tableLayout: "fixed" }}>
                <colgroup>
                  {lineColumnWidths.map((width, i) => (
                    <col key={i} style={{ width }} />
                  ))}
                </colgroup>
                <Thead bg={tableHeaderBg}>
                  <Tr>
                    {[
                      "Client Specific",
                      "Location ID",
                      "Vendor",
                      "Rate Item",
                      "Rate Item Name",
                      "Rate Remark",
                      "Free Text",
                      "Pre-text",
                      "Remark",
                      "",
                    ].map((col) => (
                      <Th
                        key={col || "actions"}
                        fontSize="10px"
                        textTransform="uppercase"
                        color={tableHeaderText}
                        whiteSpace="nowrap"
                        py={1.5}
                        px={2}
                      >
                        {col}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {lines.map((line, index) => (
                    <Tr key={line.id ?? `line-${index}`}>
                      <Td {...lineCell} textAlign="center">
                        <Switch
                          size="sm"
                          isChecked={line.is_client_specific}
                          onChange={(e) =>
                            updateLineCascade(index, "is_client_specific", e.target.checked)
                          }
                        />
                      </Td>
                      <Td {...lineCell}>
                        <SimpleSearchableSelect
                          value={line.location}
                          onChange={(val) => updateLineCascade(index, "location", val || "")}
                          options={line.locationOptions}
                          placeholder="Location"
                          isLoading={lineOptionsLoading[index]}
                          formatOption={formatLocationOption}
                          {...lineSelectProps}
                        />
                      </Td>
                      <Td {...lineCell}>
                        {line.is_client_specific ? (
                          <SimpleSearchableSelect
                            value={line.agent_id}
                            onChange={(val) => updateLineCascade(index, "agent_id", val || "")}
                            options={line.agentOptions}
                            placeholder="Vendor"
                            isLoading={lineOptionsLoading[index]}
                            formatOption={formatAgentOption}
                            {...lineSelectProps}
                          />
                        ) : (
                          <Text {...lineCellFont} color="gray.500">
                            —
                          </Text>
                        )}
                      </Td>
                      <Td {...lineCell}>
                        <SimpleSearchableSelect
                          value={line.rate_list_id}
                          onChange={(val) => updateLineCascade(index, "rate_list_id", val || "")}
                          options={line.rateItemOptions}
                          placeholder="Rate item"
                          isLoading={lineOptionsLoading[index]}
                          formatOption={formatRateItemOption}
                          {...lineSelectProps}
                        />
                      </Td>
                      <Td {...lineCell}>
                        <Text {...lineCellFont} noOfLines={2}>
                          {line.rate_item_name || "—"}
                        </Text>
                      </Td>
                      <Td {...lineCell} bg={remarkReadonlyBg}>
                        <Text {...lineCellFont} noOfLines={2} color={textColor}>
                          {line.rate_remark || "—"}
                        </Text>
                      </Td>
                      <Td {...lineCell} bg={freeTextBg}>
                        <Input
                          size="sm"
                          variant="unstyled"
                          px={1}
                          w="100%"
                          fontSize="xs"
                          value={line.free_text}
                          onChange={(e) => {
                            const { value } = e.target;
                            syncLines((prev) =>
                              prev.map((l, i) =>
                                i === index ? { ...l, free_text: value } : l
                              )
                            );
                            schedulePersist(null, 800);
                          }}
                        />
                      </Td>
                      <Td {...lineCell} textAlign="center">
                        <Checkbox
                          size="sm"
                          isChecked={line.pre_text_rate_item_name}
                          onChange={(e) => {
                            const { checked } = e.target;
                            syncLines((prev) =>
                              prev.map((l, i) =>
                                i === index
                                  ? { ...l, pre_text_rate_item_name: checked }
                                  : l
                              )
                            );
                            schedulePersist();
                          }}
                        />
                      </Td>
                      <Td {...lineCell}>
                        <Textarea
                          size="sm"
                          rows={1}
                          resize="none"
                          px={1}
                          py={0}
                          w="100%"
                          fontSize="xs"
                          value={line.remark}
                          onChange={(e) => {
                            const { value } = e.target;
                            syncLines((prev) =>
                              prev.map((l, i) =>
                                i === index ? { ...l, remark: value } : l
                              )
                            );
                            schedulePersist(null, 800);
                          }}
                        />
                      </Td>
                      <Td {...lineCell} textAlign="center">
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
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>
        </Card>
      </VStack>
    </Box>
  );
}
