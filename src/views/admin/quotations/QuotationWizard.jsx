import React, { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Select,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { MdAdd, MdClose } from "react-icons/md";
import { useHistory } from "react-router-dom";
import Card from "components/card/Card";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  createQuotationFromSelection,
  extractNarviQuotationError,
  getNarviQuotationOptions,
  getQuotationBuildOrigins,
  getQuotationBuildRates,
} from "../../../api/narviQuotation";
import QuotationTotalsBar from "./QuotationTotalsBar";
import RateCheckboxList from "./RateCheckboxList";
import {
  createEmptyScenario,
  ensureSelectedOption,
  extractCreatedQuotationId,
  findOrigin,
  formatAgentOption,
  normalizeBuildOrigins,
  formatAmountWithCurrencies,
  formatClientOption,
  formatVesselOption,
  initialRateSelection,
  intOrUndef,
  normalizeQuotationOptions,
  previewQuotationTotals,
  previewScenarioTotals,
  RATE_TYPE_OPTIONS,
  rateTypeLabel,
  rateTypesForSelection,
  scenarioHasSelection,
  sectionsFromRatesResponse,
  selectedRateCount,
  selectedRatesPayload,
} from "./quotationUtils";

const STEPS = ["Origin + Agent", "Rate type", "Select rates", "Review & save"];

export default function QuotationWizard() {
  const history = useHistory();
  const toast = useToast();
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const cardBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("white", "navy.900");

  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [clientId, setClientId] = useState("");
  const [vesselId, setVesselId] = useState("");
  const [validityDate, setValidityDate] = useState("");
  const [generalMu, setGeneralMu] = useState("");
  const [caf, setCaf] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [origins, setOrigins] = useState([]);
  const [originsLoading, setOriginsLoading] = useState(false);
  const [scenarios, setScenarios] = useState(() => [createEmptyScenario()]);
  const [clientOptions, setClientOptions] = useState([]);
  const [vesselOptions, setVesselOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const clientSearchTimer = useRef(null);
  const vesselSearchTimer = useRef(null);
  const inflightRates = useRef(new Set());
  const selectedClientRef = useRef(null);

  const visibleOrigins = origins.filter((item) =>
    item.origin.toLowerCase().includes(originFilter.trim().toLowerCase())
  );

  const loadClients = async (query = "") => {
    setOptionsLoading(true);
    try {
      const result = await getNarviQuotationOptions({
        page: 1,
        page_size: 50,
        q_client: query,
        q_vessel: "",
        q_so: "",
      });
      const { clients } = normalizeQuotationOptions(result);
      const selected = selectedClientRef.current;
      setClientOptions(
        ensureSelectedOption(clients, selected?.id, () => selected)
      );
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Failed to load clients."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setOptionsLoading(false);
    }
  };

  const loadVessels = async (query = "") => {
    if (!clientId) {
      setVesselOptions([]);
      return;
    }
    setOptionsLoading(true);
    try {
      const result = await getNarviQuotationOptions({
        page: 1,
        page_size: 50,
        client_id: intOrUndef(clientId),
        q_client: "",
        q_vessel: query,
        q_so: "",
      });
      const { vessels } = normalizeQuotationOptions(result);
      setVesselOptions(
        ensureSelectedOption(vessels, vesselId, (id) => ({
          id,
          name: `Vessel ${id}`,
        }))
      );
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Failed to load vessels."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    loadClients("");
    return () => {
      if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    };
    // Initial client list only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!clientId) {
      setOrigins([]);
      return undefined;
    }
    let cancelled = false;
    setOriginsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await getQuotationBuildOrigins({ client_id: Number(clientId) });
        if (!cancelled) setOrigins(normalizeBuildOrigins(result));
      } catch (error) {
        if (!cancelled) {
          setOrigins([]);
          toast({
            title: "Error",
            description: extractNarviQuotationError(error, "Failed to load origins."),
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }
      } finally {
        if (!cancelled) setOriginsLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clientId, toast]);

  useEffect(() => {
    if (step === 3 && clientId) loadVessels("");
    // Vessel options refresh when the review step opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, clientId]);

  const patchScenario = (key, patch, clearRates = false) => {
    setScenarios((prev) =>
      prev.map((scenario) => {
        if (scenario.key !== key) return scenario;
        return {
          ...scenario,
          ...patch,
          ...(clearRates
            ? { sections: [], selectedByRateId: {}, ratesSignature: "", ratesError: "", ratesLoading: false }
            : {}),
        };
      })
    );
  };

  const handleClientChange = (value) => {
    const selected = clientOptions.find((item) => String(item.id) === String(value)) || null;
    selectedClientRef.current = selected;
    const hadWork = scenarios.some((scenario) => scenario.origin || scenario.agent_id);
    setClientId(value || "");
    setVesselId("");
    setOriginFilter("");
    setScenarios([createEmptyScenario()]);
    setStep(0);
    setMaxStep(0);
    if (hadWork && value) {
      toast({
        title: "Scenarios reset",
        description: "Origin and agent selections were cleared for the new client.",
        status: "info",
        duration: 2500,
        isClosable: true,
      });
    }
  };

  const handleOriginChange = (key, origin) => {
    patchScenario(key, { origin: origin || "", agent_id: "", rate_type: "", agentRateTypes: [] }, true);
    setMaxStep(0);
  };

  const handleAgentChange = (key, agentId) => {
    const scenario = scenarios.find((item) => item.key === key);
    const origin = findOrigin(origins, scenario?.origin);
    const agent = (origin?.agents || []).find((item) => String(item.id) === String(agentId));
    const types = rateTypesForSelection(origin, agent);
    const rateType = types.length === 1 ? types[0] : types.includes(scenario?.rate_type) ? scenario.rate_type : "";
    patchScenario(
      key,
      { agent_id: agentId || "", agentRateTypes: types, rate_type: rateType },
      true
    );
    setMaxStep(0);
  };

  const handleRateTypeChange = (key, rateType) => {
    patchScenario(key, { rate_type: rateType }, true);
    setMaxStep((current) => Math.min(current, 1));
  };

  const loadRates = async (scenario, signature) => {
    const token = `${scenario.key}:${signature}`;
    if (inflightRates.current.has(token)) return;
    inflightRates.current.add(token);
    setScenarios((prev) =>
      prev.map((item) => (item.key === scenario.key ? { ...item, ratesLoading: true, ratesError: "" } : item))
    );
    try {
      const result = await getQuotationBuildRates({
        origin: scenario.origin,
        agent_id: Number(scenario.agent_id),
        rate_type: scenario.rate_type,
        client_id: Number(clientId),
      });
      const sections = sectionsFromRatesResponse(result.sections);
      setScenarios((prev) =>
        prev.map((item) => {
          if (item.key !== scenario.key) return item;
          const currentSignature = `${clientId}|${item.origin}|${item.agent_id}|${item.rate_type}`;
          if (currentSignature !== signature) return item;
          return {
            ...item,
            sections,
            selectedByRateId: initialRateSelection(sections),
            ratesSignature: signature,
            ratesLoading: false,
            ratesError: "",
          };
        })
      );
    } catch (error) {
      setScenarios((prev) =>
        prev.map((item) =>
          item.key === scenario.key
            ? {
                ...item,
                ratesLoading: false,
                ratesSignature: signature,
                ratesError: extractNarviQuotationError(error, "Failed to load rates."),
                sections: [],
                selectedByRateId: {},
              }
            : item
        )
      );
    } finally {
      inflightRates.current.delete(token);
    }
  };

  useEffect(() => {
    if (step !== 2 || !clientId) return;
    scenarios.forEach((scenario) => {
      const signature = `${clientId}|${scenario.origin}|${scenario.agent_id}|${scenario.rate_type}`;
      if (!scenario.origin || !scenario.agent_id || !scenario.rate_type) return;
      if (scenario.ratesLoading || scenario.ratesSignature === signature) return;
      loadRates(scenario, signature);
    });
    // Rates load when the select-rates step is active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, scenarios, clientId]);

  const toggleRate = (key, rateId, selected) => {
    setScenarios((prev) =>
      prev.map((scenario) => {
        if (scenario.key !== key) return scenario;
        return {
          ...scenario,
          selectedByRateId: { ...scenario.selectedByRateId, [String(rateId)]: selected },
        };
      })
    );
  };

  const toggleSection = (key, section, selected) => {
    setScenarios((prev) =>
      prev.map((scenario) => {
        if (scenario.key !== key) return scenario;
        const next = { ...scenario.selectedByRateId };
        (section.rates || []).forEach((rate) => {
          next[String(rate.id)] = selected;
        });
        return { ...scenario, selectedByRateId: next };
      })
    );
  };

  const stepError = (() => {
    if (step === 0) {
      if (!clientId) return "Select a client.";
      if (scenarios.some((scenario) => !scenario.origin || !scenario.agent_id)) {
        return "Each scenario needs an origin and an agent.";
      }
    }
    if (step === 1) {
      if (scenarios.some((scenario) => !scenario.rate_type)) return "Choose a rate type for each scenario.";
      if (scenarios.some((scenario) => !(scenario.agentRateTypes || []).includes(scenario.rate_type))) {
        return "Each rate type must be available for that agent.";
      }
    }
    if (step === 2) {
      if (scenarios.some((scenario) => scenario.ratesLoading || !scenario.ratesSignature)) return "Loading rates…";
      if (scenarios.some((scenario) => scenario.ratesError)) return "Could not load rates for every scenario.";
      if (scenarios.some((scenario) => (scenario.sections || []).every((section) => !(section.rates || []).length))) {
        return "One or more scenarios have no rates.";
      }
      if (scenarios.some((scenario) => !scenarioHasSelection(scenario))) {
        return "Select at least one rate in each scenario.";
      }
    }
    if (step === 3) {
      if (!vesselId) return "Vessel is required.";
      if (!validityDate) return "Validity date is required.";
    }
    return "";
  })();

  const preview = previewQuotationTotals(scenarios);
  const clientName = clientOptions.find((option) => String(option.id) === String(clientId));

  const goNext = () => {
    if (stepError) return;
    const next = Math.min(STEPS.length - 1, step + 1);
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
  };

  const handleSave = async () => {
    if (stepError) return;
    setSaving(true);
    try {
      const result = await createQuotationFromSelection({
        client_id: Number(clientId),
        vessel_id: Number(vesselId),
        validity_date: validityDate,
        general_mu: finiteNumber(generalMu),
        caf: finiteNumber(caf),
        scenarios: scenarios.map((scenario) => ({
          origin: scenario.origin,
          agent_id: Number(scenario.agent_id),
          rate_type: scenario.rate_type,
          name: scenario.name.trim() || `${scenario.origin} / ${rateTypeLabel(scenario.rate_type)}`,
          selected_rates: selectedRatesPayload(scenario),
        })),
      });
      const newId = extractCreatedQuotationId(result);
      toast({ title: "Quotation created", status: "success", duration: 2000, isClosable: true });
      if (newId) history.push(`/admin/quotations/view/${newId}`);
      else history.push("/admin/quotations/list");
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Failed to create quotation."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Card px="25px" py="24px">
        <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
          <Box>
            <Text color={textColor} fontSize="22px" fontWeight="700">
              New quotation
            </Text>
            <Text fontSize="sm" color={muted}>
              {clientName ? formatClientOption(clientName) : "Choose a client, then build one or more scenarios."}
            </Text>
          </Box>
          <HStack>
            <Button variant="outline" size="sm" onClick={() => history.push("/admin/quotations/manual")}>
              Manual entry
            </Button>
            <Button variant="ghost" size="sm" onClick={() => history.push("/admin/quotations/list")}>
              Back to list
            </Button>
          </HStack>
        </Flex>

        <Flex gap={2} wrap="wrap" mb={6}>
          {STEPS.map((label, index) => {
            const enabled = index <= maxStep;
            return (
              <Button
                key={label}
                size="sm"
                borderRadius="full"
                variant={index === step ? "solid" : "outline"}
                colorScheme={index <= step ? "blue" : "gray"}
                isDisabled={!enabled && index !== step}
                onClick={() => enabled && setStep(index)}
              >
                {index + 1}. {label}
              </Button>
            );
          })}
        </Flex>

        {step === 0 && (
          <VStack align="stretch" spacing={4}>
            <Field label="Client">
              <SimpleSearchableSelect
                value={clientId}
                fallbackDisplay={formatClientOption(selectedClientRef.current)}
                onChange={handleClientChange}
                options={clientOptions}
                placeholder="Select client"
                isLoading={optionsLoading}
                formatOption={formatClientOption}
                prefillOnFocus={false}
                clearOnEmptySearch={false}
                serverSideSearch
                onSearchChange={(query) => {
                  if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
                  clientSearchTimer.current = setTimeout(() => loadClients(query), 300);
                }}
                size="sm"
                bg={inputBg}
              />
            </Field>
            {scenarios.map((scenario, index) => {
              const origin = findOrigin(origins, scenario.origin);
              const agents = origin?.agents || [];
              return (
                <Box key={scenario.key} borderWidth="1px" borderColor={borderColor} borderRadius="16px" bg={cardBg} p={4}>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Text fontWeight="700">Scenario {index + 1}</Text>
                    {scenarios.length > 1 ? (
                      <IconButton
                        aria-label="Remove scenario"
                        size="sm"
                        variant="ghost"
                        icon={<MdClose />}
                        onClick={() => {
                          setScenarios((prev) => prev.filter((item) => item.key !== scenario.key));
                          setMaxStep(0);
                        }}
                      />
                    ) : null}
                  </Flex>
                  <Flex gap={4} wrap="wrap">
                    <Box flex="1" minW="220px">
                      <Text fontSize="sm" mb={2} fontWeight="600">
                        Origin
                      </Text>
                      <SimpleSearchableSelect
                        value={scenario.origin}
                        fallbackDisplay={scenario.origin}
                        onChange={(value) => handleOriginChange(scenario.key, value || "")}
                        options={visibleOrigins.map((item) => ({ id: item.origin, name: item.origin }))}
                        placeholder={
                          originsLoading
                            ? "Loading origins..."
                            : clientId
                              ? `Select origin${origins.length ? ` (${origins.length})` : ""}`
                              : "Select a client first"
                        }
                        isDisabled={!clientId || originsLoading}
                        prefillOnFocus={false}
                        clearOnEmptySearch={false}
                        size="sm"
                        bg={inputBg}
                      />
                    </Box>
                    <Box flex="1" minW="220px">
                      <Text fontSize="sm" mb={2} fontWeight="600">
                        Agent
                      </Text>
                      <Select
                        size="sm"
                        bg={inputBg}
                        placeholder="Select agent"
                        value={scenario.agent_id}
                        isDisabled={!scenario.origin}
                        onChange={(event) => handleAgentChange(scenario.key, event.target.value)}
                      >
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {formatAgentOption(agent)}
                          </option>
                        ))}
                      </Select>
                    </Box>
                    <Box flex="1" minW="220px">
                      <Text fontSize="sm" mb={2} fontWeight="600">
                        Label
                      </Text>
                      <Input
                        size="sm"
                        bg={inputBg}
                        placeholder="Optional scenario name"
                        value={scenario.name}
                        onChange={(event) => patchScenario(scenario.key, { name: event.target.value })}
                      />
                    </Box>
                  </Flex>
                  {scenario.agentRateTypes.length > 0 ? (
                    <HStack mt={3} spacing={2}>
                      <Text fontSize="xs" color={muted}>
                        Available rate types
                      </Text>
                      {scenario.agentRateTypes.map((type) => (
                        <Badge key={type}>{rateTypeLabel(type)}</Badge>
                      ))}
                    </HStack>
                  ) : null}
                </Box>
              );
            })}
            <Button
              leftIcon={<MdAdd />}
              alignSelf="flex-start"
              variant="outline"
              isDisabled={!clientId}
              onClick={() => {
                setScenarios((prev) => [...prev, createEmptyScenario()]);
                setMaxStep(0);
              }}
            >
              Add scenario
            </Button>
            {!originsLoading && clientId && origins.length === 0 ? (
              <Text fontSize="sm" color={muted}>
                No origins found for this client.
              </Text>
            ) : null}
          </VStack>
        )}

        {step === 1 && (
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color={muted}>
              A quotation can mix general and client-specific scenarios. Each choice has to match that agent.
            </Text>
            {scenarios.map((scenario, index) => (
              <Box key={scenario.key} borderWidth="1px" borderColor={borderColor} borderRadius="16px" p={4}>
                <Text fontWeight="700" mb={1}>
                  {scenario.name || `Scenario ${index + 1}`}
                </Text>
                <Text fontSize="sm" color={muted} mb={3}>
                  {scenario.origin} · {agentLabel(origins, scenario)}
                </Text>
                <HStack spacing={3}>
                  {RATE_TYPE_OPTIONS.map((option) => {
                    const allowed = (scenario.agentRateTypes || []).includes(option.id);
                    return (
                      <Button
                        key={option.id}
                        size="sm"
                        variant={scenario.rate_type === option.id ? "solid" : "outline"}
                        colorScheme={scenario.rate_type === option.id ? "blue" : "gray"}
                        isDisabled={!allowed}
                        onClick={() => handleRateTypeChange(scenario.key, option.id)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        {step === 2 && (
          <VStack align="stretch" spacing={5}>
            <Text fontSize="sm" color={muted}>
              Standard charges start selected. Adjust each scenario, then continue.
            </Text>
            {scenarios.map((scenario, index) => {
              const totals = previewScenarioTotals(scenario);
              return (
                <Box key={scenario.key} borderWidth="1px" borderColor={borderColor} borderRadius="16px" p={4}>
                  <Text fontWeight="700" mb={1}>
                    {scenario.name || `Scenario ${index + 1}`}
                  </Text>
                  <Text fontSize="sm" color={muted} mb={3}>
                    {scenario.origin} · {agentLabel(origins, scenario)} · {rateTypeLabel(scenario.rate_type)}
                  </Text>
                  {scenario.ratesError ? (
                    <Box mb={3}>
                      <Text color="red.500" fontSize="sm" mb={2}>
                        {scenario.ratesError}
                      </Text>
                      <Button size="sm" variant="outline" onClick={() => patchScenario(scenario.key, { ratesSignature: "", ratesError: "" })}>
                        Retry
                      </Button>
                    </Box>
                  ) : null}
                  {scenario.ratesLoading ? (
                    <Text fontSize="sm" color={muted}>
                      Loading rates…
                    </Text>
                  ) : (
                    <RateCheckboxList
                      sections={scenario.sections}
                      selectedByRateId={scenario.selectedByRateId}
                      onToggle={(rateId, selected) => toggleRate(scenario.key, rateId, selected)}
                      onToggleSection={(section, selected) => toggleSection(scenario.key, section, selected)}
                    />
                  )}
                  <Text fontSize="sm" fontWeight="600" mt={3}>
                    Standard subtotal: {formatAmountWithCurrencies(totals.standard, totals.standardCurrencies)}
                  </Text>
                </Box>
              );
            })}
            <Box position="sticky" bottom="0">
              <QuotationTotalsBar
                items={[
                  {
                    label: "Standard subtotal",
                    value: formatAmountWithCurrencies(preview.standard, preview.standardCurrencies),
                  },
                  {
                    label: "Running grand total",
                    value: formatAmountWithCurrencies(preview.selectedTotal, preview.selectedCurrencies),
                    emphasis: true,
                  },
                ]}
                note="Preview sums the listed rate amounts. Saved quotation totals are in USD."
              />
            </Box>
          </VStack>
        )}

        {step === 3 && (
          <VStack align="stretch" spacing={4}>
            <Flex gap={4} wrap="wrap">
              <Field label="Client">
                <Text fontSize="sm" py={2}>
                  {clientName ? formatClientOption(clientName) : `Client ${clientId}`}
                </Text>
              </Field>
              <Field label="Vessel">
                <SimpleSearchableSelect
                  value={vesselId}
                  onChange={(value) => setVesselId(value || "")}
                  options={vesselOptions}
                  placeholder="Select vessel"
                  isLoading={optionsLoading}
                  formatOption={formatVesselOption}
                  prefillOnFocus={false}
                  clearOnEmptySearch={false}
                  serverSideSearch
                  onSearchChange={(query) => {
                    if (vesselSearchTimer.current) clearTimeout(vesselSearchTimer.current);
                    vesselSearchTimer.current = setTimeout(() => loadVessels(query), 300);
                  }}
                  size="sm"
                  bg={inputBg}
                />
              </Field>
              <Field label="Validity">
                <Input
                  size="sm"
                  type="date"
                  bg={inputBg}
                  value={validityDate}
                  onChange={(event) => setValidityDate(event.target.value)}
                />
              </Field>
              <Field label="MU %">
                <Input
                  size="sm"
                  type="number"
                  bg={inputBg}
                  value={generalMu}
                  onChange={(event) => setGeneralMu(event.target.value)}
                />
              </Field>
              <Field label="CAF">
                <Input size="sm" type="number" bg={inputBg} value={caf} onChange={(event) => setCaf(event.target.value)} />
              </Field>
            </Flex>
            {scenarios.map((scenario, index) => (
              <Box key={scenario.key} borderWidth="1px" borderColor={borderColor} borderRadius="12px" p={3}>
                <Text fontWeight="700">
                  {scenario.name.trim() || `${scenario.origin} / ${rateTypeLabel(scenario.rate_type)}`}
                </Text>
                <Text fontSize="sm" color={muted}>
                  {scenario.origin} · {agentLabel(origins, scenario)} · {rateTypeLabel(scenario.rate_type)} ·{" "}
                  {selectedRateCount(scenario)} rates selected
                </Text>
              </Box>
            ))}
            <QuotationTotalsBar
              items={[
                {
                  label: "Standard subtotal",
                  value: formatAmountWithCurrencies(preview.standard, preview.standardCurrencies),
                },
                {
                  label: "Running grand total",
                  value: formatAmountWithCurrencies(preview.selectedTotal, preview.selectedCurrencies),
                  emphasis: true,
                },
              ]}
              note="Official totals are calculated in USD when the quotation is saved."
            />
          </VStack>
        )}

        <Flex justify="space-between" align="center" mt={6} gap={3} wrap="wrap">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? history.push("/admin/quotations/list") : setStep((current) => current - 1))}
          >
            Back
          </Button>
          <Flex align="center" gap={3}>
            {stepError ? (
              <Text fontSize="sm" color={muted}>
                {stepError}
              </Text>
            ) : null}
            {step < 3 ? (
              <Button colorScheme="blue" isDisabled={Boolean(stepError)} onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button colorScheme="blue" isDisabled={Boolean(stepError)} isLoading={saving} onClick={handleSave}>
                Save quotation
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>
    </Box>
  );
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function Field({ label, children }) {
  return (
    <Box flex="1" minW="180px">
      <Text fontSize="sm" fontWeight="600" mb={2}>
        {label}
      </Text>
      {children}
    </Box>
  );
}

function agentLabel(origins, scenario) {
  const origin = findOrigin(origins, scenario.origin);
  const agent = (origin?.agents || []).find((item) => String(item.id) === String(scenario.agent_id));
  return agent ? formatAgentOption(agent) : "Agent";
}
