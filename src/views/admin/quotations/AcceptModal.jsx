import React, { useEffect, useRef, useState } from "react";
import {
  Button,
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
  VStack,
} from "@chakra-ui/react";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  acceptNarviQuotation,
  extractNarviQuotationError,
  getNarviQuotationOptions,
} from "../../../api/narviQuotation";
import {
  formatSoOption,
  intOrUndef,
  m2oId,
  normalizeQuotationOptions,
  quotationClientId,
  quotationVesselId,
} from "./quotationUtils";

export default function AcceptModal({ isOpen, onClose, quotation, onAccepted }) {
  const toast = useToast();
  const [soId, setSoId] = useState("");
  const [siId, setSiId] = useState("");
  const [soOptions, setSoOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimer = useRef(null);

  const loadSo = async (query = "") => {
    const clientId = quotationClientId(quotation);
    const vesselId = quotationVesselId(quotation);
    if (!clientId) {
      setSoOptions([]);
      return;
    }
    setLoadingOptions(true);
    try {
      const result = await getNarviQuotationOptions({
        page: 1,
        page_size: 50,
        client_id: intOrUndef(clientId),
        vessel_id: intOrUndef(vesselId),
        q_so: query,
        q_client: "",
        q_vessel: "",
      });
      setSoOptions(normalizeQuotationOptions(result).saleOrders);
    } catch (loadError) {
      setSoOptions([]);
      setError(extractNarviQuotationError(loadError, "Failed to load sale orders."));
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const existing = m2oId(quotation?.sale_order_id);
    setSoId(existing && existing !== false ? String(existing) : "");
    setSiId("");
    setError("");
    loadSo("");
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // Reload options each time the modal opens for this quotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quotation?.id]);

  const handleSearch = (query) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadSo(query), 300);
  };

  const handleAccept = async () => {
    if (!soId) {
      setError("Sale order is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        id: Number(quotation.id),
        sale_order_id: Number(soId),
      };
      if (String(siId).trim()) payload.shipping_instruction_id = Number(siId);
      await acceptNarviQuotation(payload);
      toast({ title: "Quotation accepted", status: "success", duration: 2000, isClosable: true });
      onAccepted?.();
    } catch (acceptError) {
      setError(extractNarviQuotationError(acceptError, "Failed to accept quotation."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Accept quotation</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm">
              A sale order is linked when the quotation is accepted. It is not stored on the draft.
            </Text>
            {!quotationVesselId(quotation) ? (
              <Text fontSize="sm" color="orange.500">
                This quotation has no vessel, so the sale order list may be empty.
              </Text>
            ) : null}
            <BoxField label="Sale order">
              <SimpleSearchableSelect
                value={soId}
                onChange={(value) => {
                  setSoId(value || "");
                  setError("");
                }}
                options={soOptions}
                placeholder="Select sale order"
                isLoading={loadingOptions}
                formatOption={formatSoOption}
                prefillOnFocus={false}
                clearOnEmptySearch={false}
                serverSideSearch
                onSearchChange={handleSearch}
                size="sm"
              />
            </BoxField>
            <BoxField label="Shipping instruction ID">
              <Input
                size="sm"
                type="number"
                placeholder="Optional"
                value={siId}
                onChange={(event) => setSiId(event.target.value)}
              />
            </BoxField>
            {error ? (
              <Text fontSize="sm" color="red.500">
                {error}
              </Text>
            ) : null}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="green" onClick={handleAccept} isLoading={saving}>
            Accept
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function BoxField({ label, children }) {
  return (
    <VStack align="stretch" spacing={2} w="100%">
      <Text fontSize="sm" fontWeight="600">
        {label}
      </Text>
      {children}
    </VStack>
  );
}
