import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  FaAtom,
  FaCalculator,
  FaPen,
  FaPlaneDeparture,
  FaShip,
  FaSync,
  FaTruck,
  FaUndo,
} from "react-icons/fa";
import {
  calculateCarbonApi,
  extractCarbonErrorMessage,
  getEmissionFactorsApi,
  updateEmissionFactorsApi,
} from "api/carbon";
import { useUser } from "redux/hooks/useUser";

const FONT = '"Plus Jakarta Sans", sans-serif';

const MODE_STYLE = {
  air: { icon: FaPlaneDeparture, color: "#38bdf8", glow: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.45))" },
  sea: { icon: FaShip, color: "#34d399", glow: "drop-shadow(0 0 8px rgba(52, 211, 153, 0.4))" },
  road: { icon: FaTruck, color: "#fbbf24", glow: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))" },
};

const RING_RADIUS = [95, 75, 55];
const RING_STROKE = [13, 12, 11];

function formatFactorUnit(unit) {
  if (unit === "kg_co2e_per_tonne_km") return "kg CO₂e / tonne-km";
  return String(unit || "").replace(/_/g, " ");
}

function formatTonnesFromKg(kg) {
  const tonnes = Number(kg) / 1000;
  if (!Number.isFinite(tonnes)) return "—";
  return tonnes >= 10 ? tonnes.toFixed(2) : tonnes.toFixed(3);
}

export default function CarbonEmission() {
  const toast = useToast();
  const { user } = useUser();
  const isAdmin = user?.user_type === "admin";

  const [mode, setMode] = useState("");
  const [distance, setDistance] = useState("");
  const [weight, setWeight] = useState("");
  const [factorRows, setFactorRows] = useState([]);
  const [factorsLoading, setFactorsLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const id = "plus-jakarta-sans";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const loadFactors = async () => {
    setFactorsLoading(true);
    try {
      const result = await getEmissionFactorsApi();
      const rows = result.factors || [];
      setFactorRows(rows);
      setMode((current) => (rows.some((row) => row.mode === current) ? current : rows[0]?.mode || ""));
    } catch (error) {
      setFactorRows([]);
      toast({
        title: "Could not load emission factors",
        description: extractCarbonErrorMessage(error, "The factors request did not complete."),
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setFactorsLoading(false);
    }
  };

  useEffect(() => {
    loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedFactor = factorRows.find((row) => row.mode === mode);
  const maxFactor = Math.max(...factorRows.map((row) => Number(row.factor) || 0), 0);
  const unitLabel = formatFactorUnit(selectedFactor?.unit || factorRows[0]?.unit);

  const resetCalculator = () => {
    setDistance("");
    setWeight("");
    setResult(null);
  };

  const runCalculate = async () => {
    const distanceKm = Number(distance);
    const weightKg = Number(weight);
    if (!mode || !(distanceKm > 0) || !(weightKg > 0)) {
      toast({ title: "Choose a mode and enter a distance and weight greater than zero.", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    setCalculating(true);
    try {
      const calculated = await calculateCarbonApi({ mode, distanceKm, weightKg });
      setResult(calculated);
      if (Number.isFinite(calculated.factor)) {
        setFactorRows((rows) => rows.map((row) => (row.mode === calculated.mode ? { ...row, factor: calculated.factor } : row)));
      }
    } catch (error) {
      setResult(null);
      toast({
        title: "Calculation failed",
        description: extractCarbonErrorMessage(error, "The calculate request did not complete."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setCalculating(false);
    }
  };

  const openEditor = () => {
    if (!isAdmin) return;
    if (!factorRows.length) {
      toast({ title: "Emission factors are not loaded yet.", status: "info", duration: 3000, isClosable: true });
      return;
    }
    setDraft(factorRows.reduce((acc, row) => ({ ...acc, [row.mode]: String(row.factor) }), {}));
    setEditOpen(true);
  };

  const saveFactors = async () => {
    const payload = factorRows.map((row) => ({ mode: row.mode, factor: Number(draft[row.mode]) }));
    if (!payload.length || payload.some((row) => !Number.isFinite(row.factor) || row.factor < 0)) {
      toast({ title: "Enter a number for each mode returned by the API.", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    setSaving(true);
    try {
      await updateEmissionFactorsApi(payload);
      setEditOpen(false);
      setResult(null);
      toast({ title: "Emission factors saved", status: "success", duration: 2500, isClosable: true });
      await loadFactors();
    } catch (error) {
      toast({
        title: "Could not save factors",
        description: extractCarbonErrorMessage(error, "Update failed."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box fontFamily={FONT} bg="#f8fafc" color="#1e293b" borderRadius="24px" overflow="hidden">
      <Box px={{ base: 4, lg: 8 }} pt="6" pb="8">
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="8" alignItems="start">
                <Box bg="white" borderRadius="24px" borderWidth="1px" borderColor="#e2e8f0" boxShadow="0 20px 40px rgba(148, 163, 184, 0.18)" p={{ base: 6, sm: 8 }}>
                  <Text fontSize="xl" fontWeight="700" color="#0f172a">
                    Quick estimate
                  </Text>
                  <Text fontSize="sm" color="#64748b" mt="1" fontWeight="500">
                    Estimate CO₂e for one movement. Weight times distance, using the factor for the selected mode.
                  </Text>
                  <Box as="form" mt="6" onSubmit={(event) => { event.preventDefault(); runCalculate(); }}>
                    <Flex justify="space-between" align="center" mb="2.5">
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="#475569">
                        Transport mode
                      </Text>
                      <Text fontSize="xs" fontWeight="600" color="#2563eb">
                        {selectedFactor ? `Active: ${selectedFactor.label}` : ""}
                      </Text>
                    </Flex>
                    {!factorRows.length ? (
                      <Text fontSize="sm" color="#64748b" mb="3">
                        {factorsLoading ? "Loading emission factors…" : "No emission factors were returned."}
                      </Text>
                    ) : null}
                    <Grid templateColumns="repeat(3, 1fr)" gap="3">
                      {factorRows.map((row) => {
                        const selected = mode === row.mode;
                        const style = MODE_STYLE[row.mode] || {};
                        const Icon = style.icon;
                        return (
                          <Button
                            key={row.mode}
                            type="button"
                            h="auto"
                            py="4"
                            px="3"
                            borderRadius="16px"
                            borderWidth="2px"
                            position="relative"
                            flexDirection="column"
                            bg={selected ? "#1e3a8a" : "white"}
                            color={selected ? "white" : "#334155"}
                            borderColor={selected ? "#3b82f6" : "#e2e8f0"}
                            boxShadow={selected ? "0 10px 25px -5px rgba(30, 58, 138, 0.35)" : "none"}
                            _hover={{ borderColor: selected ? "#3b82f6" : "#cbd5e1", bg: selected ? "#1e3a8a" : "#f8fafc" }}
                            onClick={() => {
                              setMode(row.mode);
                              setResult(null);
                            }}
                          >
                            <Text
                              position="absolute"
                              top="2"
                              right="2"
                              fontSize="10px"
                              fontWeight="700"
                              px="1.5"
                              borderRadius="4px"
                              bg={selected ? "whiteAlpha.300" : "#f1f5f9"}
                              color={selected ? "#dbeafe" : "#475569"}
                            >
                              {row.factor} kg
                            </Text>
                            {Icon ? <Box as={Icon} fontSize="22px" mb="2" color={selected ? "white" : "#94a3b8"} /> : null}
                            <Text fontSize="sm" fontWeight="700" color={selected ? "white" : "#1e293b"}>
                              {row.label}
                            </Text>
                          </Button>
                        );
                      })}
                    </Grid>

                    <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="5" mt="6">
                      <Box>
                        <Text as="label" display="block" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="#475569" mb="2">
                          Distance (km)
                        </Text>
                        <Box position="relative">
                          <Input
                            type="number"
                            min="0"
                            value={distance}
                            onChange={(event) => {
                              setDistance(event.target.value);
                              setResult(null);
                            }}
                            h="56px"
                            borderRadius="16px"
                            borderColor="#e2e8f0"
                            fontWeight="800"
                            fontSize="md"
                            pr="14"
                            color="#0f172a"
                          />
                          <Text position="absolute" right="4" top="50%" transform="translateY(-50%)" fontSize="xs" fontWeight="700" color="#94a3b8" pointerEvents="none">
                            KM
                          </Text>
                        </Box>
                      </Box>
                      <Box>
                        <Text as="label" display="block" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="#475569" mb="2">
                          Weight (kg)
                        </Text>
                        <Box position="relative">
                          <Input
                            type="number"
                            min="0"
                            value={weight}
                            onChange={(event) => {
                              setWeight(event.target.value);
                              setResult(null);
                            }}
                            h="56px"
                            borderRadius="16px"
                            borderColor="#e2e8f0"
                            fontWeight="800"
                            fontSize="md"
                            pr="14"
                            color="#0f172a"
                          />
                          <Text position="absolute" right="4" top="50%" transform="translateY(-50%)" fontSize="xs" fontWeight="700" color="#94a3b8" pointerEvents="none">
                            KG
                          </Text>
                        </Box>
                      </Box>
                    </Grid>

                    <Box mt="6">
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="#475569" mb="2">
                        Emission factor applied
                      </Text>
                      <Flex align="center" justify="space-between" p="4" bg="#f8fafc" borderWidth="1px" borderColor="#e2e8f0" borderRadius="16px" gap="3">
                        <Flex align="center" gap="3">
                          <Flex w="32px" h="32px" borderRadius="12px" bg="#dbeafe" color="#1d4ed8" align="center" justify="center">
                            <FaAtom size={12} />
                          </Flex>
                          <Text fontSize="sm" fontWeight="800" color="#0f172a">
                            {selectedFactor ? `${selectedFactor.factor} ${unitLabel}` : "—"}
                          </Text>
                        </Flex>
                      </Flex>
                    </Box>

                    <Flex direction={{ base: "column", sm: "row" }} gap="3" pt="4">
                      <Button
                        type="submit"
                        flex="1"
                        h="56px"
                        borderRadius="16px"
                        bg="#1d4ed8"
                        color="white"
                        fontWeight="700"
                        leftIcon={<FaCalculator />}
                        boxShadow="0 12px 24px rgba(29, 78, 216, 0.25)"
                        _hover={{ bg: "#1e40af" }}
                        isLoading={calculating}
                      >
                        Calculate
                      </Button>
                      <Button
                        type="button"
                        h="56px"
                        px="5"
                        borderRadius="16px"
                        bg="#f1f5f9"
                        color="#475569"
                        _hover={{ bg: "#e2e8f0" }}
                        onClick={resetCalculator}
                        aria-label="Reset to defaults"
                      >
                        <FaUndo />
                      </Button>
                    </Flex>

                    <Box mt="6" p="5" borderRadius="16px" borderWidth="1px" borderColor="#bfdbfe" bgGradient="linear(to-br, #eff6ff, #f8fafc)">
                      <Flex align="start" justify="space-between" gap="3">
                        <Box>
                          <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="#1e40af">
                            Calculated Result
                          </Text>
                          <Flex align="baseline" gap="2" mt="1" wrap="wrap">
                            {result ? (
                              <>
                                <Text fontSize="3xl" fontWeight="900" color="#0f172a" lineHeight="1">
                                  {formatTonnesFromKg(result.co2eKg)}
                                </Text>
                                <Text fontSize="md" fontWeight="700" color="#334155">
                                  t CO₂e
                                </Text>
                                <Text fontSize="sm" fontWeight="600" color="#64748b">
                                  ({Number(result.co2eKg).toLocaleString()} kg)
                                </Text>
                              </>
                            ) : (
                              <Text fontSize="sm" fontWeight="600" color="#64748b">
                                The result appears here after the calculate request returns.
                              </Text>
                            )}
                          </Flex>
                          {result ? (
                            <Text fontSize="sm" color="#64748b" mt="2">
                              {result.modeLabel || result.mode} · {Number(result.distanceKm).toLocaleString()} km · {Number(result.weightKg).toLocaleString()} kg
                              {Number.isFinite(result.factor) ? ` · factor ${result.factor}` : ""}
                            </Text>
                          ) : null}
                        </Box>
                      </Flex>
                    </Box>
                  </Box>
                </Box>

                <Flex
                  direction="column"
                  justify="space-between"
                  bg="#0c1524"
                  color="white"
                  borderRadius="24px"
                  p={{ base: 6, sm: 8 }}
                  borderWidth="1px"
                  borderColor="#1e293b"
                  boxShadow="0 24px 48px rgba(15, 23, 42, 0.35)"
                >
                  <Flex justify="space-between" align={{ base: "start", sm: "center" }} direction={{ base: "column", sm: "row" }} gap="4" pb="5" borderBottomWidth="1px" borderColor="#1e293b">
                    <Box>
                      <Text fontSize="xl" fontWeight="700">
                        Emission factors & Comparison
                      </Text>
                      <Text fontSize="xs" color="#94a3b8" mt="0.5">
                        {unitLabel || "kg CO₂e per tonne-km"}
                      </Text>
                    </Box>
                    <Flex gap="2">
                      <Button
                        size="xs"
                        h="30px"
                        px="3"
                        borderRadius="12px"
                        bg="#1e293b"
                        color="#e2e8f0"
                        borderWidth="1px"
                        borderColor="#334155"
                        fontWeight="600"
                        leftIcon={<FaSync size={11} color="#94a3b8" />}
                        _hover={{ bg: "#334155" }}
                        onClick={loadFactors}
                        isLoading={factorsLoading}
                      >
                        Refresh
                      </Button>
                      {isAdmin ? (
                      <Button
                        size="xs"
                        h="30px"
                        px="3.5"
                        borderRadius="12px"
                        bg="#2563eb"
                        color="white"
                        fontWeight="600"
                        leftIcon={<FaPen size={11} />}
                        _hover={{ bg: "#3b82f6" }}
                        onClick={openEditor}
                      >
                        Edit
                      </Button>
                      ) : null}
                    </Flex>
                  </Flex>

                  <Grid templateColumns={{ base: "1fr", md: "1.3fr 0.9fr" }} gap="6" my="6" alignItems="center">
                    <Flex justify="center" py="2">
                      <Box position="relative" w="256px" h="256px">
                        <svg viewBox="0 0 240 240" width="100%" height="100%" style={{ transform: "rotate(-90deg)" }}>
                          {factorRows.map((row, index) => {
                            const radius = RING_RADIUS[index] ?? 55;
                            const stroke = RING_STROKE[index] ?? 11;
                            return (
                              <circle
                                key={`track-${row.mode}`}
                                cx="120"
                                cy="120"
                                r={radius}
                                fill="none"
                                stroke="#1e293b"
                                strokeWidth={stroke}
                                strokeDasharray="4 4"
                                opacity="0.4"
                              />
                            );
                          })}
                          {factorRows.map((row, index) => {
                            const radius = RING_RADIUS[index] ?? 55;
                            const stroke = RING_STROKE[index] ?? 11;
                            const length = 2 * Math.PI * radius;
                            const filled = maxFactor > 0 ? length * (Number(row.factor) / maxFactor) : 0;
                            const style = MODE_STYLE[row.mode] || {};
                            return (
                              <circle
                                key={`fill-${row.mode}`}
                                cx="120"
                                cy="120"
                                r={radius}
                                fill="none"
                                stroke={style.color || "#94a3b8"}
                                strokeWidth={stroke}
                                strokeLinecap="round"
                                strokeDasharray={`${filled} ${length}`}
                                style={{ filter: style.glow }}
                              />
                            );
                          })}
                        </svg>
                        <Flex position="absolute" inset="0" direction="column" align="center" justify="center" textAlign="center" pointerEvents="none" px="8">
                          <Text fontSize="10px" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="#94a3b8">
                            {selectedFactor?.label || "Factor"}
                          </Text>
                          <Text fontSize="2xl" fontWeight="900" letterSpacing="-0.03em">
                            {selectedFactor ? selectedFactor.factor : "—"}
                          </Text>
                          <Text fontSize="10px" fontWeight="600" color="#94a3b8">
                            {selectedFactor ? formatFactorUnit(selectedFactor.unit) : ""}
                          </Text>
                        </Flex>
                      </Box>
                    </Flex>
                    <Flex direction="column" gap="3">
                      {factorRows.map((row) => {
                        const style = MODE_STYLE[row.mode] || {};
                        return (
                        <Flex key={row.mode} align="center" justify="space-between" p="2.5" borderRadius="12px" bg="rgba(15,23,42,0.6)" borderWidth="1px" borderColor="#1e293b">
                          <Flex align="center" gap="2.5">
                            <Box w="12px" h="12px" borderRadius="full" bg={style.color || "#94a3b8"} />
                            <Text fontSize="xs" fontWeight="700" color="#e2e8f0">
                              {row.label}
                            </Text>
                          </Flex>
                          <Box textAlign="right">
                            <Text fontSize="xs" fontWeight="900" color={style.color || "white"}>
                              {row.factor}
                            </Text>
                            <Text fontSize="10px" color="#94a3b8" mt="-1px">
                              {formatFactorUnit(row.unit)}
                            </Text>
                          </Box>
                        </Flex>
                        );
                      })}
                    </Flex>
                  </Grid>

                  <Image
                    src={require("assets/img/karachi_rotterdam_route.jpg")}
                    alt="Container ship"
                    display="block"
                    w="100%"
                    h="auto"
                    my="2"
                    borderRadius="12px"
                    sx={{ filter: "drop-shadow(0 8px 8px rgba(0, 0, 0, 0.45))" }}
                  />
                </Flex>
              </Grid>
      </Box>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="16px" fontFamily={FONT}>
          <ModalHeader fontSize="md">Scope 3 emission factors</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="#64748b" mb="4">
              kg CO₂e per tonne-km. All three modes are saved together.
            </Text>
            {factorRows.map((row) => (
              <Box key={row.mode} mb="3">
                <Text fontSize="xs" fontWeight="700" mb="1" color="#475569">{row.label}</Text>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={draft[row.mode] ?? ""}
                  onChange={(event) => setDraft((prev) => ({ ...prev, [row.mode]: event.target.value }))}
                />
              </Box>
            ))}
          </ModalBody>
          <ModalFooter gap="2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button bg="#1d4ed8" color="white" _hover={{ bg: "#1e40af" }} onClick={saveFactors} isLoading={saving}>
              Save changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
