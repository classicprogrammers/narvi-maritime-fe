import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Text,
  useToast,
} from "@chakra-ui/react";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { createRateListApi, getRateListApi, getRateListOptionsApi } from "../../../api/rate";
import { buildRateCreatePayload, mapRateItemToFormRow } from "../../../utils/rateListForm";
import { normalizeIdOptions, tariffErrorMessage } from "./tariffScreenUtils";

/**
 * Copies every rate of the selected client tariff (same filters as the list) to another client,
 * so a tariff does not have to be rebuilt rate by rate. Copies are new client specific rates.
 */
export default function CopyTariffModal({ isOpen, onClose, sourceClient, filterParams, onCopied }) {
  const toast = useToast();
  const [targetId, setTargetId] = useState("");
  const [targetPin, setTargetPin] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const timerRef = useRef(null);

  const loadClients = useCallback(async (query = "") => {
    setClientsLoading(true);
    try {
      const result = await getRateListOptionsApi(query ? { q_client: query } : {});
      setClients(normalizeIdOptions(result.client_options));
    } catch (error) {
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setTargetId("");
    setTargetPin(null);
    setProgress({ done: 0, total: 0 });
    loadClients();
  }, [isOpen, loadClients]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const sourceId = sourceClient?.id;
  const options = [...clients].filter((client) => String(client.id) !== String(sourceId));
  if (targetPin && !options.some((client) => String(client.id) === String(targetPin.id))) {
    options.unshift(targetPin);
  }

  const handleCopy = async () => {
    if (!targetId || !sourceId) return;
    setRunning(true);
    try {
      const { client_id, location, agent_id, incl_in_tariff } = filterParams;
      const result = await getRateListApi({
        rate_type: "client_specific",
        client_id,
        location_text: location,
        agent_id,
        // The tariff screen omits In Tariff for "Yes" (backend default); the rate list does not default.
        incl_in_tariff: incl_in_tariff ?? true,
        fetch_all: true,
      });
      const sourceRates = Array.isArray(result.data) ? result.data : [];
      if (!sourceRates.length) {
        toast({ title: "No rates to copy", status: "info", duration: 3000, isClosable: true });
        return;
      }
      setProgress({ done: 0, total: sourceRates.length });
      let created = 0;
      let failed = 0;
      let lastError = "";
      for (const rate of sourceRates) {
        const row = {
          ...mapRateItemToFormRow(rate),
          id: undefined,
          rate_id: "",
          rate_type: "client_specific",
          client_id: targetId,
        };
        try {
          // eslint-disable-next-line no-await-in-loop
          await createRateListApi(buildRateCreatePayload(row));
          created += 1;
        } catch (error) {
          failed += 1;
          lastError = tariffErrorMessage(error, "");
        }
        setProgress({ done: created + failed, total: sourceRates.length });
      }
      toast({
        title: failed ? "Tariff partly copied" : "Tariff copied",
        description: failed
          ? `${created} rate(s) copied, ${failed} failed. ${lastError}`
          : `${created} rate${created === 1 ? "" : "s"} copied to the new client.`,
        status: failed ? "warning" : "success",
        duration: 5000,
        isClosable: true,
      });
      if (created) onCopied?.(targetPin || options.find((client) => String(client.id) === String(targetId)));
      if (!failed) onClose();
    } catch (error) {
      toast({
        title: "Copy failed",
        description: tariffErrorMessage(error, "Could not copy the tariff."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={running ? () => {} : onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Copy tariff to another client</ModalHeader>
        {!running && <ModalCloseButton />}
        <ModalBody>
          <Text fontSize="sm" mb="3">
            Copies all rates currently filtered for <b>{sourceClient?.name}</b> (including the Location,
            Agent and In Tariff filters) as new rates for the client chosen below. You can then adjust the
            copied rates in the Rate List.
          </Text>
          <FormControl>
            <FormLabel fontSize="sm">New client name</FormLabel>
            <SimpleSearchableSelect
              size="sm"
              prefillOnFocus={false}
              value={targetId}
              options={options}
              placeholder="Select client"
              formatOption={(option) => option.name}
              isLoading={clientsLoading}
              onSearchChange={(query) => {
                clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => loadClients((query || "").trim()), 300);
              }}
              onChange={(value) => {
                setTargetId(value || "");
                setTargetPin(options.find((client) => String(client.id) === String(value)) || null);
              }}
            />
          </FormControl>
          {running && (
            <>
              <Progress mt="4" size="sm" value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              <Text fontSize="xs" mt="1">
                {progress.done} / {progress.total} rates copied
              </Text>
            </>
          )}
          <Alert status="info" mt="4" fontSize="xs" borderRadius="md">
            <AlertIcon />
            Rates already existing for the new client are not checked; copy a tariff once per client.
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr="3" onClick={onClose} isDisabled={running}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleCopy} isDisabled={!targetId} isLoading={running} loadingText="Copying...">
            Copy tariff
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
