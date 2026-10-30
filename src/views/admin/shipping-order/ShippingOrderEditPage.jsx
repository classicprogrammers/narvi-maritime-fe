import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
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
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { MdArrowBack, MdContentCopy } from "react-icons/md";
import { getNarviQuotations } from "../../../api/narviQuotation";
import { createShippingOrder, getShippingOrderById, getShippingOrderStockApi, updateShippingOrder } from "../../../api/shippingOrders";
import { useMasterData } from "../../../hooks/useMasterData";
import { normalizeOrder, buildPayloadFromForm, validateShippingOrderServiceBoat, validateShippingOrderRequiredFields } from "./shippingOrderUtils";
import {
  applyShippingOrderFilesToPayload,
  notifyShippingOrderSaveResult,
} from "../../../utils/shippingOrderAttachments";
import { getMsoApiError, isMsoOrder } from "../../../utils/shippingOrderMso";
import ShippingOrderFormFields from "./ShippingOrderFormFields";
import ShippingOrderStockList from "../../../components/shipping-order/ShippingOrderStockList";
import EditModeNotice, { useEditModeColors } from "../../../components/forms/EditModeNotice";

const toEditFormData = (normalized) => ({
  ...normalized,
  attachments: [],
  existingAttachments: Array.isArray(normalized.existingAttachments)
    ? normalized.existingAttachments
    : [],
  attachment_to_delete: normalized.attachment_to_delete || [],
  cipl_files: [],
  existingCiplFiles: Array.isArray(normalized.existingCiplFiles)
    ? normalized.existingCiplFiles
    : [],
  cipl_files_to_delete: normalized.cipl_files_to_delete || [],
});

const unwrapOrderPayload = (payload) => {
  if (!payload) return null;
  const nested = payload.order;
  if (Array.isArray(nested)) {
    return nested.find((item) => item && typeof item === "object") || null;
  }
  if (nested && typeof nested === "object") return nested;
  if (payload.id != null && (payload.so_id != null || Array.isArray(payload.stock_list))) {
    return payload;
  }
  return null;
};

const getEmptyFormData = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    id: null,
    so_number: "",
    date_created: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    done: "active",
    cancel_text: "",
    pic_new: null,
    client: "",
    client_id: null,
    vessel_name: "",
    vessel_id: null,
    destination_type: "",
    destination: "",
    country_id: null,
    destination_id: null,
    eta_date: "",
    etb: "",
    etd: "",
    delivery_via_service_boat: false,
    service_boat_paid_by: "",
    cost_confirmed_to_client: "",
    so_delivery_date: "",
    next_action: "",
    internal_remark: "",
    client_case_invoice_ref: "",
    vsls_agent_dtls: "",
    quotation: "",
    quotation_id: null,
    attachments: [],
    existingAttachments: [],
    attachment_to_delete: [],
    cipl_files: [],
    existingCiplFiles: [],
    cipl_files_to_delete: [],
  };
};

export default function ShippingOrderEditPage() {
  const { id } = useParams();
  const isCreate = id == null || id === "";
  const history = useHistory();
  const location = useLocation();
  // Opened from the MSO tab as /admin/shipping-orders/create?is_mso=1
  const isCreateMso = isCreate && new URLSearchParams(location.search).get("is_mso") === "1";
  const listPath = isCreateMso ? "/admin/shipping-orders?tab=mso" : "/admin/shipping-orders";
  const toast = useToast();

  const [formData, setFormData] = useState(null);
  const [originalOrder, setOriginalOrder] = useState(null);
  const isEditMso = !isCreate && isMsoOrder(originalOrder?._raw || originalOrder);
  const isMsoPage = isCreateMso || isEditMso;
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [loadError, setLoadError] = useState("");

  const { clients, vessels, countries, pics } = useMasterData();
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  const vslsAgentDtlsDisclosure = useDisclosure();
  const [vslsAgentDtlsModalValue, setVslsAgentDtlsModalValue] = useState("");
  const [vslsAgentDtlsModalMode, setVslsAgentDtlsModalMode] = useState("view");
  const [vslsAgentDtlsModalTitle, setVslsAgentDtlsModalTitle] = useState("VSLS Agent Details");
  const [vslsAgentDtlsModalTargetField, setVslsAgentDtlsModalTargetField] = useState(null);

  const { editModeBg, editModeBorderColor } = useEditModeColors();

  const openVslsAgentDtlsModal = useCallback((value, mode = "view", title = "Details", targetField = null) => {
    setVslsAgentDtlsModalMode(mode);
    setVslsAgentDtlsModalTitle(title);
    setVslsAgentDtlsModalTargetField(targetField);
    setVslsAgentDtlsModalValue(String(value || ""));
    vslsAgentDtlsDisclosure.onOpen();
  }, [vslsAgentDtlsDisclosure]);

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      if (isCreate) {
        setFormData(getEmptyFormData());
        setOriginalOrder(null);
        setIsLoadingOrder(false);
        return;
      }
      setIsLoadingOrder(true);
      setLoadError("");
      try {
        const response = await getShippingOrderById(id);
        const raw = unwrapOrderPayload(response);
        let normalized = normalizeOrder(raw);
        if (!normalized) {
          throw new Error("Shipping order not found");
        }
        if (
          Number(normalized.stock_item_count) > 0 &&
          (!Array.isArray(normalized.stock_list) || normalized.stock_list.length === 0)
        ) {
          try {
            const stockRes = await getShippingOrderStockApi(
              normalized.id,
              normalized.stock_items_url
            );
            normalized = {
              ...normalized,
              stock_list: stockRes.stock_list || [],
              stock_item_count: stockRes.count ?? stockRes.stock_list?.length ?? normalized.stock_item_count,
            };
          } catch (stockErr) {
            console.error("Failed to load shipping order stock", stockErr);
          }
        }
        if (cancelled) return;
        setOriginalOrder(normalized);
        setFormData(toEditFormData(normalized));
      } catch (error) {
        if (cancelled) return;
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.result?.message ||
          error?.message ||
          "Unable to load shipping order";
        setLoadError(message);
        setFormData(null);
        setOriginalOrder(null);
        toast({
          title: "Unable to load shipping order",
          description: message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        if (!cancelled) setIsLoadingOrder(false);
      }
    };

    loadOrder();
    return () => {
      cancelled = true;
    };
  }, [id, isCreate, toast]);

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setIsLoadingQuotations(true);
        const response = await getNarviQuotations({ page: 1, page_size: 200 });
        const list = Array.isArray(response?.data) ? response.data : [];
        const normalized = list.map((q) => ({
          id: q.id,
          name: q.name || `Q-${q.id}`,
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
    const requiredError = formData ? validateShippingOrderRequiredFields(formData) : "Client is required.";
    if (requiredError) {
      toast({
        title: "Missing details",
        description: requiredError,
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    const serviceBoatError = validateShippingOrderServiceBoat(formData);
    if (serviceBoatError) {
      toast({
        title: "Missing details",
        description: serviceBoatError,
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    try {
      setIsSaving(true);
      if (isCreate) {
        const createPayload = applyShippingOrderFilesToPayload(
          buildPayloadFromForm(formData, false),
          formData
        );
        if (isCreateMso) createPayload.is_mso = true;
        const createResponse = await createShippingOrder(createPayload);
        const createError = getMsoApiError(createResponse);
        if (createError) throw new Error(createError);
        const createNotify = notifyShippingOrderSaveResult(createResponse, toast, { created: true });
        if (createNotify.ok && !createNotify.partial) {
          toast({
            title: isCreateMso ? "MSO created" : "SO created",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        }
        history.push(listPath);
        return;
      }
      const payload =applyShippingOrderFilesToPayload(
        buildPayloadFromForm(formData, true, originalOrder || {}),
        formData
      );
      const response = await updateShippingOrder(id, payload, originalOrder?._raw || {});
      const notify = notifyShippingOrderSaveResult(response, toast, { created: false });
      if (notify.ok && !notify.partial) {
        toast({
          title: "SO updated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      history.push(`/admin/shipping-orders/${id}`);
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
    history.push(listPath);
  };

  if (isLoadingOrder) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="4">
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Box>
    );
  }

  if (!formData) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="4">
        <Flex direction="column" align="flex-start" gap={4} minH="200px">
          <Button
            leftIcon={<Icon as={MdArrowBack} />}
            variant="ghost"
            size="sm"
            onClick={handleCancel}
          >
            Back
          </Button>
          <Text color="red.500">{loadError || "Shipping order not found."}</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="4" pb="8">
      <Box
        mx="auto"
        p={6}
        {...(isCreate
          ? {
              bg: "white",
              border: "1px solid",
              borderColor: "gray.200",
              borderRadius: "lg",
              boxShadow: "sm",
            }
          : {
              bg: editModeBg,
              border: `3px solid ${editModeBorderColor}`,
              borderRadius: "lg",
              boxShadow: "0 0 0 1px rgba(229, 62, 62, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)",
            })}
      >
        {!isCreate && (
          <Box mx={-6} mt={-6} mb={6}>
            <EditModeNotice
              entity="shipping order"
              name={formData.so_number || `SO-${id}`}
            />
          </Box>
        )}
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
              {isCreateMso
                ? "Create MSO"
                : isCreate
                  ? "Create SO"
                  : `Edit ${isEditMso ? "MSO" : "SO"} — ${formData.so_number || `SO-${id}`}`}
            </Text>
            {isMsoPage && (
              <Badge colorScheme="orange" variant="solid" borderRadius="full" px={2} fontSize="xs" textTransform="none">
                In progress
              </Badge>
            )}
          </Flex>
          <Flex gap={2}>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleSave} isLoading={isSaving} loadingText={isCreate ? "Creating..." : "Updating..."}>
              {isCreateMso ? "Create MSO" : isCreate ? "Create SO" : "Save Changes"}
            </Button>
          </Flex>
        </Flex>

        {isMsoPage && (
          <Alert status="warning" variant="left-accent" borderRadius="md" mb={6} alignItems="flex-start">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">MSO is still in progress</AlertTitle>
              <AlertDescription fontSize="sm">
                This feature is not complete yet and may change. Please use test SOs only. Master Ledger MSO totals are not available yet.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        <ShippingOrderFormFields
          formData={formData}
          setFormData={setFormData}
          isEditMode={!isCreate}
          clients={clients}
          vessels={vessels}
          countries={countries}
          pics={pics}
          quotations={quotations}
          isLoadingQuotations={isLoadingQuotations}
          onOpenVslsAgentDtlsModal={openVslsAgentDtlsModal}
          showVesselDbLink={isCreate}
        />

        {!isCreate && (
          <Box mt={8}>
            <ShippingOrderStockList
              title="Stock items"
              variant="full"
              allowOpenInStockList
              stockList={formData.stock_list}
              stockItemCount={formData.stock_item_count}
            />
          </Box>
        )}
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
