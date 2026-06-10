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
  intOrUndef,
  lineFromApi,
  m2oId,
  m2oName,
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
  const [header, setHeader] = useState(emptyHeader);
  const [lines, setLines] = useState([emptyLine()]);
  const [clientOptions, setClientOptions] = useState([]);
  const [vesselOptions, setVesselOptions] = useState([]);
  const [soOptions, setSoOptions] = useState([]);
  const [headerOptionsLoading, setHeaderOptionsLoading] = useState(false);
  const [lineOptionsLoading, setLineOptionsLoading] = useState({});

  const headerSearchTimer = useRef(null);
  const editOptionLabels = useRef({
    client: { name: "", code: "", address: "" },
    vessel: { name: "", imo: "" },
    so: { name: "" },
  });
  const selectProps = { size: "sm", bg: inputBg, color: inputText, borderColor };
  const headerSelectProps = { ...selectProps, bg: "transparent" };
  const lineCellFont = { fontSize: "xs", lineHeight: "short" };
  const lineCell = { py: 1.5, px: 2, verticalAlign: "middle" };
  const lineSelectProps = { ...selectProps, fontSize: "xs", w: "100%" };
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
      setHeaderOptionsLoading(true);
      try {
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
        const result = await getNarviQuotationOptions(payload);
        setClientOptions(
          ensureSelectedOption(
            normalizeOptions(result.client_options),
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

  const loadLineOptions = useCallback(
    async (lineIndex, lineState, clientId) => {
      if (lineState.is_client_specific && !intOrUndef(clientId)) {
        setLines((prev) =>
          prev.map((line, i) =>
            i === lineIndex
              ? {
                ...line,
                locationOptions: [],
                agentOptions: [],
                rateItemOptions: [],
              }
              : line
          )
        );
        return;
      }

      setLineOptionsLoading((prev) => ({ ...prev, [lineIndex]: true }));
      try {
        const payload = {
          page: 1,
          page_size: 50,
          is_client_specific: Boolean(lineState.is_client_specific),
        };
        if (lineState.is_client_specific) payload.client_id = intOrUndef(clientId);
        if (lineState.location) payload.location = lineState.location;
        if (lineState.agent_id) payload.agent_id = intOrUndef(lineState.agent_id);

        const result = await getNarviQuotationLineOptions(payload);
        setLines((prev) =>
          prev.map((line, i) => {
            if (i !== lineIndex) return line;
            const updates = { ...line };
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
                      name: line.rate_list_name || line.rate_id || line.rate_item_name || `Rate ${rateId}`,
                      rate_id: line.rate_id,
                      rate_item_name: line.rate_item_name,
                      rate_remark: line.rate_remark,
                    }
                    : null
              );
            }
            return updates;
          })
        );
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
    [toast]
  );

  const scheduleHeaderSearch = (field, value, currentHeader) => {
    if (headerSearchTimer.current) clearTimeout(headerSearchTimer.current);
    headerSearchTimer.current = setTimeout(() => {
      loadHeaderOptions({
        client_id: currentHeader.client_id,
        vessel_id: currentHeader.vessel_id,
        sale_order_id: currentHeader.sale_order_id,
        q_client: field === "client" ? value : "",
        q_vessel: field === "vessel" ? value : "",
        q_so: field === "so" ? value : "",
      });
    }, 300);
  };

  useEffect(() => {
    const init = async () => {
      if (!isEdit) {
        await loadHeaderOptions();
        await loadLineOptions(0, emptyLine(), "");
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
        await Promise.all(
          loadedLines.map((line, index) => loadLineOptions(index, line, nextHeader.client_id))
        );
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
      if (headerSearchTimer.current) clearTimeout(headerSearchTimer.current);
    };
  }, [id, isEdit, history, loadHeaderOptions, loadLineOptions, toast]);

  const handleClientChange = async (value) => {
    setHeader((prev) => ({ ...prev, client_id: value || "", vessel_id: "", sale_order_id: "" }));
    setVesselOptions([]);
    setSoOptions([]);
    await loadHeaderOptions({ client_id: value || undefined });
    setLines((prev) => {
      const updated = prev.map((line) => ({
        ...line,
        ...(line.is_client_specific
          ? {
            location: "",
            agent_id: "",
            rate_list_id: "",
            rate_id: "",
            rate_item_name: "",
            rate_remark: "",
            locationOptions: [],
            agentOptions: [],
            rateItemOptions: [],
          }
          : {}),
      }));
      updated.forEach((line, index) => {
        if (line.is_client_specific) {
          loadLineOptions(index, { ...line, location: "", agent_id: "" }, value);
        } else {
          loadLineOptions(index, line, value);
        }
      });
      return updated;
    });
  };

  const handleVesselChange = async (value) => {
    setHeader((prev) => ({ ...prev, vessel_id: value || "", sale_order_id: "" }));
    setSoOptions([]);
    await loadHeaderOptions({
      client_id: header.client_id || undefined,
      vessel_id: value || undefined,
    });
  };

  const updateLineCascade = async (index, field, value) => {
    let nextLine;
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        nextLine = { ...line, [field]: value };
        if (field === "location") {
          Object.assign(nextLine, {
            agent_id: "",
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
          nextLine.rate_remark = item?.rate_remark ?? "";
        }
        return nextLine;
      })
    );
    if (!["rate_list_id", "free_text", "remark", "pre_text_rate_item_name"].includes(field)) {
      await loadLineOptions(index, nextLine, header.client_id);
    }
  };

  const addLine = async () => {
    const newLine = emptyLine();
    setLines((prev) => [...prev, newLine]);
    await loadLineOptions(lines.length, newLine, header.client_id);
  };

  const removeLine = (index) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const buildPayload = () => ({
    ...(isEdit ? { id: Number(id) } : {}),
    client_id: intOrUndef(header.client_id),
    vessel_id: intOrUndef(header.vessel_id),
    sale_order_id: intOrUndef(header.sale_order_id),
    validity_date: header.validity_date || undefined,
    currency_id: intOrUndef(header.currency_id),
    usd_roe: header.usd_roe !== "" ? Number(header.usd_roe) : 1.0,
    general_mu: header.general_mu !== "" ? Number(header.general_mu) : undefined,
    caf: header.caf !== "" ? Number(header.caf) : undefined,
    quotation_lines: lines.map((line) => ({
      ...(line.id ? { id: line.id } : {}),
      is_client_specific: Boolean(line.is_client_specific),
      location: line.location || undefined,
      agent_id: intOrUndef(line.agent_id),
      rate_list_id: intOrUndef(line.rate_list_id),
      free_text: line.free_text || undefined,
      pre_text_rate_item_name: Boolean(line.pre_text_rate_item_name),
      remark: line.remark || undefined,
    })),
  });

  const validate = () => {
    if (!header.client_id) return "Client is required.";
    if (lines.some((line) => line.is_client_specific && !header.client_id)) {
      return "Client is required for client-specific lines.";
    }
    if (lines.some((line) => !line.rate_list_id)) return "Each line must have a rate item.";
    return "";
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast({ title: "Validation", description: error, status: "warning", duration: 3000, isClosable: true });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await updateNarviQuotation(payload);
        toast({ title: "Quotation updated", status: "success", duration: 2500, isClosable: true });
      } else {
        await createNarviQuotation(payload);
        toast({ title: "Quotation created", status: "success", duration: 2500, isClosable: true });
      }
      history.push("/admin/quotations/list");
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(
          error,
          isEdit ? "Failed to update quotation." : "Failed to create quotation."
        ),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
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
            onChange={(val) => setHeader((p) => ({ ...p, currency_id: val || "" }))}
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
            onChange={(e) => setHeader((p) => ({ ...p, [key]: e.target.value }))}
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
              {isEdit ? `Edit Quotation #${id}` : "New Quotation"}
            </Text>
          </HStack>
          <HStack>
            <Button variant="outline" onClick={() => history.push("/admin/quotations/list")}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
              {isEdit ? "Update" : "Create"}
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
                    onSearchChange={(q) => scheduleHeaderSearch("client", q, header)}
                    {...headerSelectProps}
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
                    onSearchChange={(q) => scheduleHeaderSearch("vessel", q, header)}
                    {...headerSelectProps}
                  />
                </ValueCell>

                <LabelCell bordered={false}>SO ID</LabelCell>
                <ValueCell bordered={false} bg="transparent">
                  <SimpleSearchableSelect
                    value={header.sale_order_id}
                    onChange={(val) => setHeader((p) => ({ ...p, sale_order_id: val || "" }))}
                    options={soOptions}
                    placeholder="Select SO"
                    isLoading={headerOptionsLoading}
                    formatOption={formatSoOption}
                    onSearchChange={(q) => scheduleHeaderSearch("so", q, header)}
                    {...headerSelectProps}
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
                        <SimpleSearchableSelect
                          value={line.agent_id}
                          onChange={(val) => updateLineCascade(index, "agent_id", val || "")}
                          options={line.agentOptions}
                          placeholder="Vendor"
                          isLoading={lineOptionsLoading[index]}
                          formatOption={formatAgentOption}
                          {...lineSelectProps}
                        />
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
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === index ? { ...l, free_text: e.target.value } : l
                              )
                            )
                          }
                        />
                      </Td>
                      <Td {...lineCell} textAlign="center">
                        <Checkbox
                          size="sm"
                          isChecked={line.pre_text_rate_item_name}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === index
                                  ? { ...l, pre_text_rate_item_name: e.target.checked }
                                  : l
                              )
                            )
                          }
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
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === index ? { ...l, remark: e.target.value } : l
                              )
                            )
                          }
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
