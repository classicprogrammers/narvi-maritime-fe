import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import Card from "components/card/Card";
import {
  archiveNarviQuotation,
  extractNarviQuotationError,
  getNarviQuotation,
  getNarviQuotationVersions,
  readyForInvoiceNarviQuotation,
  reviseNarviQuotation,
  updateNarviQuotation,
} from "../../../api/narviQuotation";
import AcceptModal from "./AcceptModal";
import CopyTextButton from "./CopyTextButton";
import QuotationStateBadge from "./QuotationStateBadge";
import QuotationTotalsBar from "./QuotationTotalsBar";
import RevisionTimeline from "./RevisionTimeline";
import ScenarioCard from "./ScenarioCard";
import { downloadQuotationPdf } from "./quotationReport";
import {
  apiString,
  draftToLinePayload,
  draftsFromQuotation,
  extractRevisionId,
  formatPercentDisplay,
  formatUsd,
  m2oName,
  namesFromQuotation,
  normalizeVersions,
  quotationReference,
  quotationSoDisplay,
  quotationStateLabel,
  quotationVesselId,
  quotationVesselName,
} from "./quotationUtils";

export default function QuotationDetail() {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const toast = useToast();
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const muted = useColorModeValue("gray.500", "gray.400");
  const bannerBg = useColorModeValue("orange.50", "whiteAlpha.100");

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [names, setNames] = useState({});
  const [baseline, setBaseline] = useState({ drafts: {}, names: {} });
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [currentRevisionId, setCurrentRevisionId] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const applyQuotation = (result) => {
    const nextDrafts = draftsFromQuotation(result);
    const nextNames = namesFromQuotation(result);
    setQuotation(result);
    setDrafts(nextDrafts);
    setNames(nextNames);
    setBaseline({ drafts: nextDrafts, names: nextNames });
    setCurrentRevisionId(null);
  };

  const load = async () => {
    const seeded = location.state?.quotation;
    const hasSeed = seeded && String(seeded.id) === String(id);
    if (hasSeed) applyQuotation(seeded);
    else setLoading(true);
    try {
      const result = await getNarviQuotation(id);
      const seededCount = Array.isArray(seeded?.scenarios) ? seeded.scenarios.length : 0;
      const loadedCount = Array.isArray(result?.scenarios) ? result.scenarios.length : 0;
      if (!hasSeed || loadedCount > 0 || seededCount === 0) applyQuotation(result);
    } catch (error) {
      if (!hasSeed) {
        setQuotation(null);
        toast({
          title: "Error",
          description: extractNarviQuotationError(error, "Failed to load quotation."),
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Reload when the route id changes, including after revise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isCurrent = quotation?.is_current_revision !== false;
  const isDraft = quotation?.state === "draft";
  const editable = isDraft;
  const scenarios = Array.isArray(quotation?.scenarios) ? quotation.scenarios : [];
  const hasRevisions = Number(quotation?.revision_no) > 0 || quotation?.is_current_revision === false;

  useEffect(() => {
    if (!quotation || quotation.is_current_revision !== false) return undefined;
    let cancelled = false;
    getNarviQuotationVersions(quotation.id)
      .then((result) => {
        if (cancelled) return;
        const current = normalizeVersions(result).find((version) => version.is_current_revision);
        if (current?.id) setCurrentRevisionId(current.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quotation]);

  const dirty = useMemo(() => {
    return JSON.stringify(drafts) !== JSON.stringify(baseline.drafts) || JSON.stringify(names) !== JSON.stringify(baseline.names);
  }, [drafts, names, baseline]);

  const changedPayload = (extraScenarios = []) => {
    const lineChanges = Object.keys(drafts)
      .filter((lineId) => JSON.stringify(drafts[lineId]) !== JSON.stringify(baseline.drafts[lineId]))
      .map((lineId) => draftToLinePayload(lineId, drafts[lineId]));
    const scenarioChanges = Object.keys(names)
      .filter((scenarioId) => names[scenarioId] !== baseline.names[scenarioId])
      .map((scenarioId) => ({ id: Number(scenarioId), name: names[scenarioId] }));
    const payload = { id: Number(quotation.id) };
    if (lineChanges.length) payload.quotation_lines = lineChanges;
    const scenariosPayload = [...scenarioChanges, ...extraScenarios];
    if (scenariosPayload.length) payload.scenarios = scenariosPayload;
    if (!payload.quotation_lines && !payload.scenarios) return null;
    return payload;
  };

  const persist = async (extraScenarios = [], successTitle = "Quotation saved") => {
    const payload = changedPayload(extraScenarios);
    if (!payload) return false;
    setSaving(true);
    try {
      await updateNarviQuotation(payload);
      toast({ title: successTitle, status: "success", duration: 2000, isClosable: true });
      await load();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Failed to update quotation."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (message, request, successTitle, after) => {
    if (message && !window.confirm(message)) return;
    setSaving(true);
    try {
      const result = await request();
      toast({ title: successTitle, status: "success", duration: 2000, isClosable: true });
      if (after) await after(result);
      else await load();
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Request failed."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const openVersions = async () => {
    setVersionsOpen(true);
    setVersionsLoading(true);
    try {
      const result = await getNarviQuotationVersions(id);
      setVersions(normalizeVersions(result));
    } catch (error) {
      setVersions([]);
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Failed to load versions."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setVersionsLoading(false);
    }
  };

  if ((loading && !quotation) || (quotation && String(quotation.id) !== String(id))) {
    return (
      <Flex pt={{ base: "130px", md: "80px" }} justify="center" py={20}>
        <Spinner />
      </Flex>
    );
  }

  if (!quotation) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
        <Card px="25px" py="24px">
          <Text mb={4}>Quotation could not be loaded.</Text>
          <Button onClick={() => history.push("/admin/quotations/list")}>Back to list</Button>
        </Card>
      </Box>
    );
  }

  const totals = quotation.totals || {};
  const canAccept = quotation.state === "draft";
  const canRevise = isCurrent && (quotation.state === "accepted" || quotation.state === "ready_for_invoice");
  const canReady = quotation.state === "accepted";
  const canArchive = quotation.state !== "archived";

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack align="stretch" spacing={4}>
        <Card px="25px" py="24px">
          <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
            <Box>
              <HStack spacing={3} mb={2}>
                <Text color={textColor} fontSize="22px" fontWeight="700">
                  {quotationReference(quotation)}
                </Text>
                <QuotationStateBadge state={quotation.state} label={quotationStateLabel(quotation)} />
                <Text fontSize="sm" color={muted}>
                  Revision {quotation.revision_no ?? 0}
                </Text>
              </HStack>
              <Text fontSize="sm" color={muted}>
                {quotation.client_name || m2oName(quotation.client_id, "—")} · {quotationVesselName(quotation)} · Valid{" "}
                {apiString(quotation.validity_date) || "—"}
              </Text>
              <Text fontSize="sm" color={muted}>
                MU {apiString(quotation.general_mu) || "—"} · CAF {apiString(quotation.caf) || "—"} · SO{" "}
                {quotationSoDisplay(quotation)}
              </Text>
            </Box>
            <Flex gap={2} wrap="wrap" justify="flex-end">
              <Button size="sm" variant="ghost" onClick={() => history.push("/admin/quotations/list")}>
                Back
              </Button>
              {isDraft ? (
                <Button size="sm" colorScheme="blue" isDisabled={!dirty} isLoading={saving} onClick={() => persist()}>
                  Save changes
                </Button>
              ) : null}
              {canAccept ? (
                <Button size="sm" colorScheme="green" onClick={() => setAcceptOpen(true)}>
                  Accept
                </Button>
              ) : null}
              {canRevise ? (
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  isLoading={saving}
                  onClick={() =>
                    runAction("Create a new draft revision of this quotation?", () => reviseNarviQuotation(quotation.id), "Revision created", async (result) => {
                      const nextId = extractRevisionId(result);
                      if (!nextId || String(nextId) === String(quotation.id)) {
                        toast({
                          title: "Revision created",
                          description: "The new revision id was not returned, so the previous quotation was left open.",
                          status: "warning",
                          duration: 4000,
                          isClosable: true,
                        });
                        return;
                      }
                      const nextQuotation =
                        result?.quotation && typeof result.quotation === "object" && !Array.isArray(result.quotation)
                          ? result.quotation
                          : result?.data && typeof result.data === "object" && !Array.isArray(result.data)
                            ? result.data
                            : null;
                      history.push({
                        pathname: `/admin/quotations/view/${nextId}`,
                        state: nextQuotation ? { quotation: nextQuotation } : undefined,
                      });
                    })
                  }
                >
                  Revise
                </Button>
              ) : null}
              {canReady ? (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={saving}
                  onClick={() =>
                    runAction(
                      "Mark this quotation ready for invoice? It will be locked for editing.",
                      () => readyForInvoiceNarviQuotation(quotation.id),
                      "Marked ready for invoice"
                    )
                  }
                >
                  Ready for Invoice
                </Button>
              ) : null}
              {canArchive ? (
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="orange"
                  isLoading={saving}
                  onClick={() => runAction("Archive this quotation?", () => archiveNarviQuotation(quotation.id), "Quotation archived")}
                >
                  Archive
                </Button>
              ) : null}
              <CopyTextButton quotationId={quotation.id} />
              {hasRevisions ? (
                <Button size="sm" variant="outline" onClick={openVersions}>
                  View versions
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                isLoading={pdfLoading}
                onClick={async () => {
                  setPdfLoading(true);
                  try {
                    await downloadQuotationPdf(quotation);
                  } catch (error) {
                    toast({
                      title: "PDF failed",
                      description: "Could not generate the quotation PDF.",
                      status: "error",
                      duration: 3000,
                      isClosable: true,
                    });
                  } finally {
                    setPdfLoading(false);
                  }
                }}
              >
                PDF
              </Button>
            </Flex>
          </Flex>
        </Card>

        {!isCurrent ? (
          <Box bg={bannerBg} borderRadius="12px" px={4} py={3}>
            <Text fontSize="sm">
              This is an earlier revision.
              {currentRevisionId ? (
                <Button
                  ml={2}
                  size="xs"
                  variant="link"
                  colorScheme="blue"
                  onClick={() => history.push(`/admin/quotations/view/${currentRevisionId}`)}
                >
                  Open current revision
                </Button>
              ) : null}
            </Text>
          </Box>
        ) : null}

        {!editable ? (
          <Box bg={bannerBg} borderRadius="12px" px={4} py={3}>
            <Text fontSize="sm">
              {quotation.state === "accepted"
                ? isCurrent
                  ? "Accepted quotations are locked. Use Revise to make changes."
                  : "Accepted quotations are locked."
                : quotation.state === "ready_for_invoice"
                  ? "This quotation is locked for invoicing."
                  : quotation.state === "archived"
                    ? "Archived quotations are locked."
                    : "This quotation cannot be edited."}
            </Text>
          </Box>
        ) : null}

        <QuotationTotalsBar
          items={[
            { label: "Standard total", value: formatUsd(totals.grand_total_standard_usd) },
            { label: "Grand total", value: formatUsd(totals.grand_total_usd), emphasis: true },
            { label: "Profit margin", value: formatPercentDisplay(totals.total_profit_margin_percent) },
          ]}
          note={dirty ? "Save to refresh USD totals." : "Totals are in USD."}
        />

        {scenarios.length === 0 ? (
          <Card px="25px" py="24px">
            <Text mb={3}>This quotation has no scenarios yet.</Text>
            {Array.isArray(quotation.quotation_lines) && quotation.quotation_lines.length > 0 ? (
              <Button size="sm" variant="outline" onClick={() => history.push(`/admin/quotations/edit/${quotation.id}`)}>
                Open legacy editor
              </Button>
            ) : null}
          </Card>
        ) : (
          scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              drafts={drafts}
              editable={editable}
              name={names[String(scenario.id)] ?? ""}
              onNameChange={(value) => setNames((prev) => ({ ...prev, [String(scenario.id)]: value }))}
              onLineChange={(lineId, field, value) =>
                setDrafts((prev) => ({
                  ...prev,
                  [String(lineId)]: { ...prev[String(lineId)], [field]: value },
                }))
              }
            />
          ))
        )}
      </VStack>

      <AcceptModal
        isOpen={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        quotation={quotation}
        onAccepted={() => {
          setAcceptOpen(false);
          load();
        }}
      />

      <Modal isOpen={versionsOpen} onClose={() => setVersionsOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Versions</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {versionsLoading ? (
              <Flex justify="center" py={6}>
                <Spinner />
              </Flex>
            ) : (
              <RevisionTimeline
                versions={versions}
                activeId={quotation.id}
                onSelect={(version) => {
                  setVersionsOpen(false);
                  if (version?.id && String(version.id) !== String(quotation.id)) {
                    history.push(`/admin/quotations/view/${version.id}`);
                  }
                }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

