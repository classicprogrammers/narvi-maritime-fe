import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { MdArrowBack, MdContentCopy } from "react-icons/md";
import quotationsAPI from "../../../api/quotations";
import { updateShippingOrder } from "../../../api/shippingOrders";
import { useMasterData } from "../../../hooks/useMasterData";
import { normalizeOrder, buildPayloadFromForm } from "./shippingOrderUtils";
import ShippingOrderFormFields from "./ShippingOrderFormFields";

export default function ShippingOrderEditPage() {
  const { id } = useParams();
  const location = useLocation();
  const history = useHistory();
  const toast = useToast();

  const [formData, setFormData] = useState(null);
  const [originalOrder, setOriginalOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [missingOrder, setMissingOrder] = useState(false);

  const { clients, vessels, countries, pics } = useMasterData();
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  const vslsAgentDtlsDisclosure = useDisclosure();
  const [vslsAgentDtlsModalValue, setVslsAgentDtlsModalValue] = useState("");
  const [vslsAgentDtlsModalMode, setVslsAgentDtlsModalMode] = useState("view");
  const [vslsAgentDtlsModalTitle, setVslsAgentDtlsModalTitle] = useState("VSLS Agent Details");
  const [vslsAgentDtlsModalTargetField, setVslsAgentDtlsModalTargetField] = useState(null);

  const editModeBg = useColorModeValue("blue.50", "blue.900");
  const editModeBorderColor = useColorModeValue("blue.300", "blue.500");

  const openVslsAgentDtlsModal = useCallback((value, mode = "view", title = "Details", targetField = null) => {
    setVslsAgentDtlsModalMode(mode);
    setVslsAgentDtlsModalTitle(title);
    setVslsAgentDtlsModalTargetField(targetField);
    setVslsAgentDtlsModalValue(String(value || ""));
    vslsAgentDtlsDisclosure.onOpen();
  }, [vslsAgentDtlsDisclosure]);

  useEffect(() => {
    const orderFromState = location.state?.order;
    if (!orderFromState) {
      setMissingOrder(true);
      toast({
        title: "Open from list",
        description: "Please open the edit page from the Shipping Orders list.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      history.replace("/admin/shipping-orders");
      return;
    }
    const order = normalizeOrder(orderFromState);
    if (order) {
      setOriginalOrder(order);
      setFormData({ ...order });
    } else {
      setMissingOrder(true);
      history.replace("/admin/shipping-orders");
    }
  }, [id, location.state, history, toast]);

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setIsLoadingQuotations(true);
        const response = await quotationsAPI.getQuotations();
        const data = response || {};
        const list =
          (Array.isArray(data.quotations) && data.quotations) ||
          (Array.isArray(data.result?.quotations) && data.result.quotations) ||
          [];
        const normalized = list.map((q) => ({
          id: q.id,
          name: q.oc_number || q.name || `Q-${q.id}`,
        }));
        setQuotations(normalized);
      } catch (err) {
        console.error("Failed to load quotations", err);
      } finally {
        setIsLoadingQuotations(false);
      }
    };
    fetchQuotations();
  }, []);

  const handleSave = async () => {
    const hasClient = !!formData?.client_id;
    const hasVessel = !!formData?.vessel_id;
    if (!formData || !hasClient || !hasVessel) {
      toast({
        title: "Missing details",
        description: "Client and vessel are required.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    try {
      setIsSaving(true);
      const payload = buildPayloadFromForm(formData, true, originalOrder?._raw || {});
      await updateShippingOrder(id, payload, originalOrder?._raw || {});
      toast({
        title: "SO updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      history.push("/admin/shipping-orders");
    } catch (error) {
      console.error("Failed to update shipping order", error);
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save shipping order",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    history.push("/admin/shipping-orders");
  };

  if (missingOrder) return null;
  if (!formData) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="4">
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="4" pb="8">
      <Box
        mx="auto"
        p={6}
        bg={editModeBg}
        border={`3px solid ${editModeBorderColor}`}
        borderRadius="lg"
        boxShadow="0 0 0 1px rgba(66, 153, 225, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)"
      >
        <Flex align="center" justify="space-between" mb={6} flexWrap="wrap" gap={3}>
          <Flex align="center" gap={3}>
            <Button
              leftIcon={<Icon as={MdArrowBack} />}
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              Back
            </Button>
            <Text fontSize="xl" fontWeight="bold">
              Edit SO — {formData.so_number || `SO-${id}`}
            </Text>
          </Flex>
          <Flex gap={2}>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={isSaving}>
              Save Changes
            </Button>
          </Flex>
        </Flex>

        <ShippingOrderFormFields
          formData={formData}
          setFormData={setFormData}
          isEditMode
          clients={clients}
          vessels={vessels}
          countries={countries}
          pics={pics}
          quotations={quotations}
          isLoadingQuotations={isLoadingQuotations}
          onOpenVslsAgentDtlsModal={openVslsAgentDtlsModal}
          showVesselDbLink={false}
        />
      </Box>

      {/* VSLS Agent Details modal */}
      <Modal
        isOpen={vslsAgentDtlsDisclosure.isOpen}
        onClose={() => {
          vslsAgentDtlsDisclosure.onClose();
          setVslsAgentDtlsModalTargetField(null);
        }}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{vslsAgentDtlsModalTitle}</ModalHeader>
          <ModalBody>
            <Textarea
              value={vslsAgentDtlsModalValue}
              onChange={(e) => {
                if (vslsAgentDtlsModalMode === "edit") {
                  setVslsAgentDtlsModalValue(e.target.value);
                }
              }}
              onPaste={(e) => {
                if (vslsAgentDtlsModalMode === "edit") {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData("text");
                  const normalizedText = pastedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
                  const textarea = e.target;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const currentValue = vslsAgentDtlsModalValue;
                  const newValue = currentValue.substring(0, start) + normalizedText + currentValue.substring(end);
                  setVslsAgentDtlsModalValue(newValue);
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + normalizedText.length;
                  }, 0);
                }
              }}
              isReadOnly={vslsAgentDtlsModalMode !== "edit"}
              rows={16}
              resize="vertical"
              placeholder="Enter details..."
            />
          </ModalBody>
          <ModalFooter>
            <Button
              leftIcon={<Icon as={MdContentCopy} />}
              variant="outline"
              mr={3}
              onClick={async () => {
                try {
                  if (vslsAgentDtlsModalValue?.trim()) {
                    await navigator.clipboard.writeText(vslsAgentDtlsModalValue);
                    toast({ title: "Copied to clipboard", status: "success", duration: 2000, isClosable: true });
                  } else {
                    toast({ title: "Nothing to copy", status: "warning", duration: 2000, isClosable: true });
                  }
                } catch (err) {
                  toast({ title: "Copy failed", status: "error", duration: 2000, isClosable: true });
                }
              }}
            >
              Copy
            </Button>
            {vslsAgentDtlsModalMode === "edit" && (
              <Button
                colorScheme="blue"
                mr={3}
                onClick={() => {
                  if (vslsAgentDtlsModalTargetField && formData) {
                    setFormData((prev) => ({
                      ...prev,
                      [vslsAgentDtlsModalTargetField]: vslsAgentDtlsModalValue,
                    }));
                  }
                  vslsAgentDtlsDisclosure.onClose();
                  setVslsAgentDtlsModalTargetField(null);
                  toast({ title: "Saved", status: "success", duration: 2000, isClosable: true });
                }}
              >
                Save
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                vslsAgentDtlsDisclosure.onClose();
                setVslsAgentDtlsModalTargetField(null);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
