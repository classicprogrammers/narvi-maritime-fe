import React, { useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Grid,
  Progress,
  IconButton,
  useColorModeValue,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  Tabs,
  TabList,
  Tab,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Spinner,
  useDisclosure,
} from "@chakra-ui/react";
import { MdPrint, MdSettings, MdHelpOutline, MdCalendarToday, MdPictureAsPdf, MdDownload } from "react-icons/md";
import SimpleSearchableSelect from "../../../../components/forms/SimpleSearchableSelect";
import narviLetterheadPrint from "../../../../assets/letterHead/NarviLetterhead.jpeg";
import { getSiFormOptionsApi, postSiFormApi, postSiFormUpdateApi } from "../../../../api/shippingInstructions";
import {
  getShippingAdviseOptionsApi,
  postShippingAdviseFormApi,
  postShippingAdviseFormUpdateApi,
} from "../../../../api/shippingAdvise";
import {
  getDeliveryInstructionOptionsApi,
  postDeliveryInstructionFormApi,
  postDeliveryInstructionFormUpdateApi,
} from "../../../../api/deliveryInstruction";
import {
  getDeliveryConfirmationOptionsApi,
  postDeliveryConfirmationFormApi,
  postDeliveryConfirmationFormUpdateApi,
} from "../../../../api/deliveryConfirmation";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function ShippingInstructionDetail({ formType = "instruction" }) {
  const isShippingAdvise = formType === "advise";
  const isDeliveryForm = formType === "delivery";
  const isDeliveryConfirmation = formType === "deliveryConfirmation";
  const isDeliveryLike = isDeliveryForm || isDeliveryConfirmation;
  const todayIso = new Date().toISOString().slice(0, 10);
  const loadFormLatest = isShippingAdvise
    ? postShippingAdviseFormApi
    : isDeliveryConfirmation
      ? postDeliveryConfirmationFormApi
      : isDeliveryForm
        ? postDeliveryInstructionFormApi
        : postSiFormApi;
  const loadOptions = isShippingAdvise
    ? getShippingAdviseOptionsApi
    : isDeliveryConfirmation
      ? getDeliveryConfirmationOptionsApi
      : isDeliveryForm
        ? getDeliveryInstructionOptionsApi
        : getSiFormOptionsApi;
  const saveForm = isShippingAdvise
    ? postShippingAdviseFormUpdateApi
    : isDeliveryConfirmation
      ? postDeliveryConfirmationFormUpdateApi
      : isDeliveryForm
        ? postDeliveryInstructionFormUpdateApi
        : postSiFormUpdateApi;
  const history = useHistory();
  const { id } = useParams();
  const {
    isOpen: isPdfPreviewOpen,
    onOpen: onPdfPreviewOpen,
    onClose: onPdfPreviewClose,
  } = useDisclosure();
  const {
    isOpen: isDescriptionModalOpen,
    onOpen: onDescriptionModalOpen,
    onClose: onDescriptionModalClose,
  } = useDisclosure();
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPdfPreviewLoading, setIsPdfPreviewLoading] = useState(false);
  const [editingDescriptionIndex, setEditingDescriptionIndex] = useState(null);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState("");
  const pdfPreviewBlobUrlRef = useRef(null);
  const pdfPreviewIframeRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [ciPlTabIndex, setCiPlTabIndex] = useState(0);
  const [shippingInstruction, setShippingInstruction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  const [siOptions, setSiOptions] = useState([]);
  const [sicOptions, setSicOptions] = useState([]);
  const [diOptions, setDiOptions] = useState([]);
  const [agentOptions, setAgentOptions] = useState([]);
  const [consigneeOptions, setConsigneeOptions] = useState([]);
  const [picOptions, setPicOptions] = useState([]);
  const [fromOptions, setFromOptions] = useState([]);
  const [shippedByOptions, setShippedByOptions] = useState([]);
  const [toOptions, setToOptions] = useState([]);
  const [isSiFormLoading, setIsSiFormLoading] = useState(false);
  const [selectedSiName, setSelectedSiName] = useState("");
  const [siFormId, setSiFormId] = useState(null);
  // Backend requires agent_cnee_id; keep last valid id even if UI is cleared
  const [requiredAgentCneeId, setRequiredAgentCneeId] = useState(null);
  const isApplyingFormRef = useRef(false);
  const headerUserEditedRef = useRef(false);
  const consignBlockUserEditedRef = useRef(false);
  const packedTotalsUserEditedRef = useRef(false);
  const isResettingRef = useRef(false);
  const deadlinePickerRef = useRef(null);
  const lastSubmittedHeaderRef = useRef({
    to_be_shipped_by: "",
    from_text: "",
    to_text: "",
    deadline_text: "",
  });

  // Color mode values
  const textColor = useColorModeValue("gray.700", "white");
  const bgColor = useColorModeValue("white", "gray.800");

  // Form state
  const [formData, setFormData] = useState({
    vessel: "",
    deliveryToAt: "",
    consignBlock: "",
    siNo: "", // stores selected option id
    sicNo: "", // stores selected SIC option id
    diNo: "", // stores selected DI option id
    jobNo: "",
    soNo: "",
    shippedBy: "",
    shippedById: null,
    from: "",
    fromId: null,
    to: "", // display name (used for print)
    toId: null,
    deadline: "",
    pic: "", // stores selected PIC id
    transportDetails: "",
    date: "",
    totalPackedQuantity: "",
    totalPackedWeight: "",
    totalPackedVw: "",
    totalVw: "",
    selectAgent: "", // stores selected agent id
    selectConsignee: "", // stores selected option id
    company: "",
    consigneeAddress1: "",
    consigneeAddress2: "",
    consigneePostcode: "",
    consigneeCity: "",
    consigneeCountry: "",
    regNo: "",
    consigneeEmail: "",
    consigneePhone: "",
    consigneePhone2: "",
    web: "",
    cneeText: "",
    agentsPIC: "",
    warnings: "",
    includeInLiasonWith: false,
  });

  // Cargo items
  const [cargoItems, setCargoItems] = useState([
    {
      id: 1,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      valueUsd: "",
      quantity: "",
      perUnit: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      vw: 0,
      stockItemId: "",
      awbNumber: "",
    },
    {
      id: 2,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      valueUsd: "",
      quantity: "",
      perUnit: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      vw: 0,
      stockItemId: "",
      awbNumber: "",
    },
  ]);

  // Calculate totals
  const totals = {
    boxes: cargoItems.reduce((sum, item) => sum + item.boxes, 0),
    kg: cargoItems.reduce((sum, item) => sum + item.kg, 0),
    cbm: cargoItems.reduce((sum, item) => sum + item.cbm, 0),
    vw: cargoItems.reduce((sum, item) => sum + item.vw, 0),
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const updateCargoItem = (index, field, value) => {
    setCargoItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };
  const openDescriptionEditor = (index) => {
    setEditingDescriptionIndex(index);
    setEditingDescriptionValue(String(cargoItems[index]?.details || ""));
    onDescriptionModalOpen();
  };
  const handleSaveDescription = () => {
    if (editingDescriptionIndex != null) {
      updateCargoItem(editingDescriptionIndex, "details", editingDescriptionValue);
    }
    onDescriptionModalClose();
    setEditingDescriptionIndex(null);
    setEditingDescriptionValue("");
  };
  const isCiPlPerUnitTab = !isShippingAdvise && !isDeliveryLike && ciPlTabIndex === 1;

  const [qSi, setQSi] = useState("");
  const [qSic, setQSic] = useState("");
  const [qDi, setQDi] = useState("");
  const [qAgent, setQAgent] = useState("");
  const [qCnee, setQCnee] = useState("");
  const [qShipBy, setQShipBy] = useState("");
  const [qFrom, setQFrom] = useState("");
  const [qTo, setQTo] = useState("");
  const getOptionNameById = (list, id) => {
    const match = Array.isArray(list) ? list.find((o) => Number(o.id) === Number(id)) : null;
    return match?.name ? String(match.name) : "";
  };
  const getTextOptionIdByValue = (list, value) => {
    if (!Array.isArray(list) || value == null) return null;
    const match = list.find((opt) => String(opt.name || "").toLowerCase() === String(value).trim().toLowerCase());
    if (!match || match.id == null || !Number.isFinite(Number(match.id))) return null;
    return Number(match.id);
  };
  const toNullIfEmpty = (value) => {
    const text = value == null ? "" : String(value).trim();
    return text === "" ? null : value;
  };
  const getStickyConsigneeId = () => {
    if (isDeliveryLike) return null;
    if (formData.selectConsignee != null && formData.selectConsignee !== "" && Number.isFinite(Number(formData.selectConsignee))) {
      return Number(formData.selectConsignee);
    }
    if (requiredAgentCneeId != null && Number.isFinite(Number(requiredAgentCneeId))) {
      return Number(requiredAgentCneeId);
    }
    return null;
  };
  const getStickyAgentId = () => {
    if (isDeliveryLike) return null;
    if (formData.selectAgent != null && formData.selectAgent !== "" && Number.isFinite(Number(formData.selectAgent))) {
      return Number(formData.selectAgent);
    }
    return null;
  };

  const blankCargoRows = () => ([
    {
      id: 1,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      valueUsd: "",
      quantity: "",
      perUnit: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      vw: 0,
      stockItemId: "",
      awbNumber: "",
    },
    {
      id: 2,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      valueUsd: "",
      quantity: "",
      perUnit: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      vw: 0,
      stockItemId: "",
      awbNumber: "",
    },
  ]);

  const applySiFormResponse = (form, { lockedConsigneeId, lockedSiId, lockedAgentId } = {}) => {
    if (!form) return;
    isApplyingFormRef.current = true;
    setSiFormId(form.id ?? null);

    const countryName =
      form.country_id && typeof form.country_id === "object" ? (form.country_id.name || "") : "";

    const consigneeId =
      form.agent_cnee_id && typeof form.agent_cnee_id === "object" ? form.agent_cnee_id.id : "";
    const consigneeName =
      form.agent_cnee_id && typeof form.agent_cnee_id === "object"
        ? (form.agent_cnee_id.name || "")
        : "";
    const agentId =
      form.agent_id && typeof form.agent_id === "object"
        ? form.agent_id.id
        : form.agent_id != null && form.agent_id !== false && form.agent_id !== ""
          ? form.agent_id
          : form.agent_partner_id && typeof form.agent_partner_id === "object"
            ? form.agent_partner_id.id
            : form.agent_partner_id != null && form.agent_partner_id !== false && form.agent_partner_id !== ""
              ? form.agent_partner_id
              : "";
    const agentName =
      form.agent_id && typeof form.agent_id === "object"
        ? (form.agent_id.name || "")
        : form.agent_partner_id && typeof form.agent_partner_id === "object"
          ? (form.agent_partner_id.name || "")
          : "";

    const siId =
      isDeliveryLike
        ? (form.di_number_id && typeof form.di_number_id === "object" ? form.di_number_id.id : "")
        : (form.si_number_id && typeof form.si_number_id === "object" ? form.si_number_id.id : "");
    const siName =
      isDeliveryLike
        ? (form.di_number_id && typeof form.di_number_id === "object" ? (form.di_number_id.name || "") : "")
        : (form.si_number_id && typeof form.si_number_id === "object" ? (form.si_number_id.name || "") : "");
    const sicId =
      !isDeliveryLike
        ? (form.sic_number_id && typeof form.sic_number_id === "object" ? form.sic_number_id.id : "")
        : "";
    const sicName =
      !isDeliveryLike
        ? (form.sic_number_id && typeof form.sic_number_id === "object" ? (form.sic_number_id.name || "") : "")
        : "";
    const shippedByName =
      form.to_be_shipped_by && form.to_be_shipped_by !== false
        ? String(form.to_be_shipped_by)
        : form.si_shipped_by_id && typeof form.si_shipped_by_id === "object" && form.si_shipped_by_id.name
          ? String(form.si_shipped_by_id.name)
          : "";
    const fromName =
      form.from_text && form.from_text !== false
        ? String(form.from_text)
        : form.siform_from_id && typeof form.siform_from_id === "object" && form.siform_from_id.name
          ? String(form.siform_from_id.name)
          : "";
    const toName =
      form.to_text && form.to_text !== false
        ? String(form.to_text)
        : form.siform_to_id && typeof form.siform_to_id === "object" && form.siform_to_id.name
          ? String(form.siform_to_id.name)
          : "";

    const cneeTextOnly = isDeliveryLike
      ? (form.in_liason_with && form.in_liason_with !== false ? String(form.in_liason_with) : "")
      : (form.cnee_text && form.cnee_text !== false ? String(form.cnee_text) : "");
    const includeInLiasonWith = isDeliveryLike
      ? Boolean(form.in_liason_with && String(form.in_liason_with).trim() !== "")
      : false;
    const stockList = Array.isArray(form.stock_list) ? form.stock_list : [];
    const stockTotals = {
      quantity: stockList.reduce((sum, it) => sum + Number(it?.boxes || 0), 0),
      weight: stockList.reduce((sum, it) => sum + Number(it?.kg || 0), 0),
      vw: stockList.reduce((sum, it) => sum + Number(it?.vw ?? it?.ww ?? 0), 0),
    };
    const hasPackedQty =
      form.total_packed_quantity != null &&
      form.total_packed_quantity !== false &&
      form.total_packed_quantity !== "";
    const hasPackedWeight =
      form.total_packed_weight != null &&
      form.total_packed_weight !== false &&
      form.total_packed_weight !== "";
    const hasPackedVw =
      form.total_packed_vw != null &&
      form.total_packed_vw !== false &&
      form.total_packed_vw !== "";
    const hasTotalVw =
      form.total_vw != null &&
      form.total_vw !== false &&
      form.total_vw !== "";
    packedTotalsUserEditedRef.current = Boolean(hasPackedQty || hasPackedWeight || hasPackedVw);

    const resolvedPicId = (() => {
      const fromHeaderPicIdObj =
        form.header_pic_id && typeof form.header_pic_id === "object" ? form.header_pic_id.id : null;
      const fromHeaderPicObj =
        form.header_pic && typeof form.header_pic === "object" ? form.header_pic.id : null;
      const fromHeaderPicId =
        fromHeaderPicIdObj != null
          ? fromHeaderPicIdObj
          : form.header_pic_id != null && form.header_pic_id !== false && form.header_pic_id !== ""
            ? form.header_pic_id
            : fromHeaderPicObj != null
              ? fromHeaderPicObj
              : form.header_pic != null && form.header_pic !== false && form.header_pic !== ""
                ? form.header_pic
                : "";
      if (Number.isFinite(Number(fromHeaderPicId))) return String(Number(fromHeaderPicId));

      // Fallback: if backend returns PIC name only, resolve against loaded options.
      const fromHeaderPicName =
        form.header_pic && typeof form.header_pic === "object"
          ? form.header_pic.name
          : typeof form.header_pic === "string"
            ? form.header_pic
            : "";
      if (fromHeaderPicName) {
        const match = picOptions.find((opt) => String(opt.name) === String(fromHeaderPicName));
        if (match?.id != null) return String(match.id);
      }
      return "";
    })();
    const resolvedPicName = (() => {
      if (form.header_pic && typeof form.header_pic === "object" && form.header_pic.name) {
        return String(form.header_pic.name);
      }
      const match =
        resolvedPicId !== ""
          ? picOptions.find((opt) => String(opt.id) === String(resolvedPicId))
          : null;
      return match?.name ? String(match.name) : "";
    })();

    setFormData((prev) => ({
      ...prev,
      vessel:
        form.vessel_name && form.vessel_name !== false
          ? String(form.vessel_name)
          : prev.vessel,
      // header card mapping by form type
      deliveryToAt:
        isDeliveryLike && form.delivery_to_at != null && form.delivery_to_at !== false
          ? String(form.delivery_to_at)
          : "",
      siNo: isDeliveryLike
        ? (lockedSiId ?? (form.di_number_id && typeof form.di_number_id === "object" ? form.di_number_id.id : (form.di_number_id ?? ""))) ?? ""
        : (lockedSiId ?? siId) ?? "",
      sicNo:
        !isDeliveryLike
          ? (form.sic_number_id && typeof form.sic_number_id === "object"
            ? form.sic_number_id.id
            : (form.sic_number_id ?? ""))
          : "",
      diNo:
        !isDeliveryLike
          ? (form.di_number_id && typeof form.di_number_id === "object"
            ? form.di_number_id.id
            : (form.di_number_id ?? ""))
          : "",
      jobNo: isShippingAdvise
        ? (form.job_no != null && form.job_no !== false
          ? String(form.job_no)
          : form.sic_number != null && form.sic_number !== false
            ? String(form.sic_number)
            : "")
        : isDeliveryLike
          ? (form.job_no != null && form.job_no !== false
            ? String(form.job_no)
            : form.so_number != null && form.so_number !== false
              ? String(form.so_number)
              : "")
          : (form.job_no && form.job_no !== false ? String(form.job_no) : ""),
      shippedBy: isShippingAdvise
        ? (form.awb_number != null && form.awb_number !== false ? String(form.awb_number) : "")
        : (shippedByName ||
          (form.si_shipped_by_id != null && form.si_shipped_by_id !== false && form.si_shipped_by_id !== ""
            ? (getOptionNameById(shippedByOptions, form.si_shipped_by_id) || String(form.si_shipped_by_id))
            : String(lastSubmittedHeaderRef.current.to_be_shipped_by || ""))),
      shippedById: isShippingAdvise
        ? null
        : (form.si_shipped_by_id && typeof form.si_shipped_by_id === "object" && form.si_shipped_by_id.id != null
          ? Number(form.si_shipped_by_id.id)
          : form.si_shipped_by_id != null && form.si_shipped_by_id !== false && form.si_shipped_by_id !== ""
            ? (Number.isFinite(Number(form.si_shipped_by_id)) ? Number(form.si_shipped_by_id) : null)
            : null),
      from: isShippingAdvise
        ? (form.from_text != null && form.from_text !== false ? String(form.from_text) : "")
        : (fromName ||
          (form.siform_from_id != null && form.siform_from_id !== false && form.siform_from_id !== ""
            ? (getOptionNameById(fromOptions, form.siform_from_id) || String(form.siform_from_id))
            : String(lastSubmittedHeaderRef.current.from_text || ""))),
      fromId:
        form.siform_from_id && typeof form.siform_from_id === "object" && form.siform_from_id.id != null
          ? Number(form.siform_from_id.id)
          : form.siform_from_id != null && form.siform_from_id !== false && form.siform_from_id !== ""
            ? (Number.isFinite(Number(form.siform_from_id)) ? Number(form.siform_from_id) : null)
            : null,
      to: isShippingAdvise
        ? (form.destination_text != null && form.destination_text !== false ? String(form.destination_text) : "")
        : isDeliveryLike
          ? (form.location_text != null && form.location_text !== false
            ? String(form.location_text)
            : form.delivery_to_at != null && form.delivery_to_at !== false
              ? String(form.delivery_to_at)
              : toName)
          : (toName ||
            (form.siform_to_id != null && form.siform_to_id !== false && form.siform_to_id !== ""
              ? (getOptionNameById(toOptions, form.siform_to_id) || String(form.siform_to_id))
              : String(lastSubmittedHeaderRef.current.to_text || ""))),
      toId:
        form.siform_to_id && typeof form.siform_to_id === "object" && form.siform_to_id.id != null
          ? Number(form.siform_to_id.id)
          : form.siform_to_id != null && form.siform_to_id !== false && form.siform_to_id !== ""
            ? (Number.isFinite(Number(form.siform_to_id)) ? Number(form.siform_to_id) : null)
            : null,
      deadline: isShippingAdvise
        ? (form.eta_text != null && form.eta_text !== false ? String(form.eta_text) : "")
        : isDeliveryConfirmation
          ? (form.delivery_date != null && form.delivery_date !== false
            ? String(form.delivery_date)
            : form.deadline_text != null && form.deadline_text !== false
              ? String(form.deadline_text)
              : "")
          : isDeliveryForm
            ? (form.deadline_text != null && form.deadline_text !== false ? String(form.deadline_text) : "")
            : (form.deadline_text && form.deadline_text !== false
              ? String(form.deadline_text)
              : String(lastSubmittedHeaderRef.current.deadline_text || "")),
      pic: isShippingAdvise
        ? ""
        : isDeliveryLike
          ? resolvedPicId
          : resolvedPicId,
      date: isShippingAdvise
        ? (form.date != null && form.date !== false && String(form.date).trim() !== ""
          ? String(form.date)
          : todayIso)
        : isDeliveryLike
          ? (form.header_date != null && form.header_date !== false && String(form.header_date).trim() !== ""
            ? String(form.header_date)
            : todayIso)
          : (form.header_date && form.header_date !== false ? String(form.header_date) : ""),
      totalPackedQuantity: hasPackedQty ? Number(form.total_packed_quantity) : stockTotals.quantity,
      totalPackedWeight: hasPackedWeight ? Number(form.total_packed_weight) : stockTotals.weight,
      totalPackedVw: hasPackedVw ? Number(form.total_packed_vw) : stockTotals.vw,
      totalVw: hasTotalVw ? Number(form.total_vw) : stockTotals.vw,
      transportDetails:
        isShippingAdvise && form.transport_details && form.transport_details !== false
          ? String(form.transport_details)
          : "",

      // consign block + consignee id
      consignBlock: cneeTextOnly,
      selectAgent: (() => {
        const fromForm =
          agentId !== "" && agentId != null && agentId !== false ? String(agentId) : "";
        if (fromForm) return fromForm;
        if (lockedAgentId != null && lockedAgentId !== "" && lockedAgentId !== false) {
          return String(lockedAgentId);
        }
        return "";
      })(),
      selectConsignee: (lockedConsigneeId ?? consigneeId) ?? "",

      // consignee detail fields
      company: form.company && form.company !== false ? String(form.company) : "",
      consigneeAddress1: form.address1 && form.address1 !== false ? String(form.address1) : "",
      consigneeAddress2: form.address2 && form.address2 !== false ? String(form.address2) : "",
      consigneePostcode: form.postcode && form.postcode !== false ? String(form.postcode) : "",
      consigneeCity: form.city && form.city !== false ? String(form.city) : "",
      consigneeCountry: countryName,
      regNo: form.reg_no && form.reg_no !== false ? String(form.reg_no) : "",
      consigneeEmail: form.email1 && form.email1 !== false ? String(form.email1) : "",
      consigneePhone: form.phone1 && form.phone1 !== false ? String(form.phone1) : "",
      consigneePhone2: form.phone2 && form.phone2 !== false ? String(form.phone2) : "",
      web: form.web && form.web !== false ? String(form.web) : "",
      cneeText: form.cnee_text && form.cnee_text !== false ? String(form.cnee_text) : "",
      agentsPIC: form.agents_pic && form.agents_pic !== false ? String(form.agents_pic) : "",
      warnings: form.warnings && form.warnings !== false ? String(form.warnings) : "",
      includeInLiasonWith,
    }));

    // Keep selected agent visible in the dropdown even before options list refreshes.
    if (agentId !== "" && Number.isFinite(Number(agentId)) && agentName) {
      setAgentOptions((prev) => {
        const exists = Array.isArray(prev) && prev.some((o) => Number(o.id) === Number(agentId));
        if (exists) return prev;
        return [...(Array.isArray(prev) ? prev : []), { id: Number(agentId), name: String(agentName) }];
      });
    }
    // Keep selected SI number visible even when options are paged/filtered.
    if (siId !== "" && Number.isFinite(Number(siId)) && siName) {
      setSiOptions((prev) => {
        const exists = Array.isArray(prev) && prev.some((o) => Number(o.id) === Number(siId));
        if (exists) return prev;
        return [...(Array.isArray(prev) ? prev : []), { id: Number(siId), name: String(siName) }];
      });
    }
    if (sicId !== "" && Number.isFinite(Number(sicId)) && sicName) {
      setSicOptions((prev) => {
        const exists = Array.isArray(prev) && prev.some((o) => Number(o.id) === Number(sicId));
        if (exists) return prev;
        return [...(Array.isArray(prev) ? prev : []), { id: Number(sicId), name: String(sicName) }];
      });
    }
    // Keep selected consignee visible even when cnee options are scoped by agent/query.
    if (consigneeId !== "" && Number.isFinite(Number(consigneeId)) && consigneeName) {
      setConsigneeOptions((prev) => {
        const exists = Array.isArray(prev) && prev.some((o) => Number(o.id) === Number(consigneeId));
        if (exists) return prev;
        return [...(Array.isArray(prev) ? prev : []), { id: Number(consigneeId), name: String(consigneeName) }];
      });
    }
    // Keep selected PIC visible if backend returns it in form payload only.
    if (resolvedPicId !== "" && Number.isFinite(Number(resolvedPicId)) && resolvedPicName) {
      setPicOptions((prev) => {
        const exists = Array.isArray(prev) && prev.some((o) => Number(o.id) === Number(resolvedPicId));
        if (exists) return prev;
        return [...(Array.isArray(prev) ? prev : []), { id: Number(resolvedPicId), name: String(resolvedPicName) }];
      });
    }

    setSelectedSiName(siName ? String(siName) : "");
    if (consigneeId) setRequiredAgentCneeId(Number(consigneeId));

    const mapped = stockList.map((it, idx) => {
      const supplierName =
        it.supplier && typeof it.supplier === "object" && it.supplier.name != null
          ? String(it.supplier.name)
          : it.supplier_id && typeof it.supplier_id === "object" && it.supplier_id.name != null
            ? String(it.supplier_id.name)
            : typeof it.supplier === "string"
              ? it.supplier
              : "";
      const originVal =
        it.from != null && it.from !== false
          ? String(it.from)
          : it.from_si_advise != null && it.from_si_advise !== false
            ? String(it.from_si_advise)
            : (it.origin != null && it.origin !== false ? String(it.origin) : "");
      const whRaw = it.warehouse_id;
      const warehouseId =
        whRaw != null && whRaw !== false ? String(whRaw) : "";
      const lwhVal = it.lwh != null && it.lwh !== false ? String(it.lwh) : "";
      const stockIdRaw = it.stock_item_id;
      const stockItemId =
        stockIdRaw != null && stockIdRaw !== false ? String(stockIdRaw) : "";
      return {
        id: it.id ?? idx + 1,
        origin: originVal,
        warehouseId,
        supplier: supplierName,
        awbNumber:
          it.awb_number != null && it.awb_number !== false
            ? String(it.awb_number)
            : it.awb_si_advise != null && it.awb_si_advise !== false
              ? String(it.awb_si_advise)
              : it.awb != null && it.awb !== false
                ? String(it.awb)
                : "",
        poNumber: it.po_number != null && it.po_number !== false ? String(it.po_number) : "",
        details: it.details && it.details !== false ? String(it.details) : "",
        valueUsd:
          it.value_in_usd != null && it.value_in_usd !== false
            ? String(it.value_in_usd)
            : it.value_usd != null && it.value_usd !== false
              ? String(it.value_usd)
              : "",
        quantity:
          it.quantity != null && it.quantity !== false
            ? String(it.quantity)
            : "",
        perUnit:
          it.per_unit != null && it.per_unit !== false
            ? String(it.per_unit)
            : "",
        boxes: Number(it.boxes || 0),
        kg: Number(it.kg || 0),
        cbm: Number(it.cbm || 0),
        lwh: lwhVal,
        vw: Number(it.vw ?? it.ww ?? 0),
        stockItemId,
      };
    });

    setCargoItems(mapped.length ? mapped : blankCargoRows());
    // allow autosave effects after this render flushes
    setTimeout(() => {
      isApplyingFormRef.current = false;
    }, 0);
  };

  const ensureFormId = async () => {
    if (siFormId) return siFormId;
    const latest = await loadFormLatest({ latest_only: true });
    const id = latest?.id ?? null;
    if (id) setSiFormId(id);
    return id;
  };

  /** Shipping Advise may omit id so backend updates latest record. */
  const buildSavePayloadWithId = (currentId, fields) => {
    if (isShippingAdvise) {
      if (currentId != null && currentId !== "") {
        return { id: Number(currentId), ...fields };
      }
      return { ...fields };
    }
    return { id: Number(currentId), ...fields };
  };

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setIsOptionsLoading(true);
        const optionsParams = {
          page: 1,
          page_size: 200,
          q_to: qTo,
        };
        if (!isDeliveryLike) {
          optionsParams.q_cnee = qCnee;
          optionsParams.q_agent = qAgent;
          optionsParams.agent_id = formData.selectAgent || undefined;
        }
        if (isDeliveryLike) {
          optionsParams.q_di = qSi;
          optionsParams.q_pic = qShipBy;
        } else {
          optionsParams.q_si = qSi;
          optionsParams.q_sic = qSic;
          optionsParams.q_di = qDi;
          optionsParams.q_from = qFrom;
        }
        if (!isShippingAdvise && !isDeliveryLike) {
          optionsParams.q_ship_by = qShipBy;
        }
        const data = await loadOptions(optionsParams);
        if (cancelled) return;

        const result = data?.result && typeof data.result === "object" ? data.result : data;
        const optionsSource =
          result?.data && typeof result.data === "object"
            ? result.data
            : data?.data && typeof data.data === "object"
              ? data.data
              : result;
        const siNos = Array.isArray(optionsSource?.si_number_options)
          ? optionsSource.si_number_options
          : Array.isArray(optionsSource?.di_number_options)
            ? optionsSource.di_number_options
            : [];
        const sicNos = Array.isArray(optionsSource?.sic_number_options)
          ? optionsSource.sic_number_options
          : [];
        const diNos = Array.isArray(optionsSource?.di_number_options)
          ? optionsSource.di_number_options
          : [];
        const agents = Array.isArray(optionsSource?.agent_options) ? optionsSource.agent_options : [];
        const consignees = Array.isArray(optionsSource?.cnee_options) ? optionsSource.cnee_options : [];
        const pics = Array.isArray(optionsSource?.pic_options)
          ? optionsSource.pic_options
          : Array.isArray(optionsSource?.pics)
            ? optionsSource.pics
            : [];

        const normalizeOptions = (arr) =>
          arr
            .filter((x) => x && x.name) // filters out name:false and empty
            .map((x) => ({ id: Number(x.id), name: String(x.name) }))
            .filter((x) => Number.isFinite(x.id));
        const extractOptionArray = (raw) => {
          if (Array.isArray(raw)) return raw;
          if (!raw || typeof raw !== "object") return [];
          const candidate = raw.options || raw.items || raw.records || raw.data || raw.results || raw.list || raw.rows;
          return Array.isArray(candidate) ? candidate : [];
        };
        const normalizeTextOptions = (raw) => {
          const arr = extractOptionArray(raw);
          if (!Array.isArray(arr)) return [];
          const normalized = arr
            .map((x, idx) => {
              if (typeof x === "string") return { id: null, name: x.trim(), key: `txt-${idx}-${x.trim()}` };
              if (x && typeof x === "object") {
                const name = String(x.name ?? x.value ?? x.label ?? "").trim();
                const rawId = x.id ?? x.value_id ?? x.option_id ?? null;
                const id = rawId != null && rawId !== "" && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
                return { id, name, key: id != null ? `id-${id}` : `txt-${idx}-${name}` };
              }
              return null;
            })
            .filter((x) => x && x.name);
          const uniq = [];
          const seen = new Set();
          normalized.forEach((opt) => {
            const dedupeKey = opt.id != null ? `id:${opt.id}` : `name:${String(opt.name).toLowerCase()}`;
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);
            uniq.push(opt);
          });
          return uniq;
        };

        const normalizedSiNos = normalizeOptions(siNos);
        const normalizedSicNos = normalizeOptions(sicNos);
        const normalizedDiNos = normalizeOptions(diNos);
        setSiOptions((prev) => {
          const sid = formData.siNo;
          if (sid !== "" && Number.isFinite(Number(sid))) {
            const idNum = Number(sid);
            if (!normalizedSiNos.some((o) => Number(o.id) === idNum)) {
              const keep = Array.isArray(prev) ? prev.find((o) => Number(o.id) === idNum) : null;
              if (keep) return [keep, ...normalizedSiNos];
              if (selectedSiName && String(selectedSiName).trim() !== "") {
                return [{ id: idNum, name: String(selectedSiName) }, ...normalizedSiNos];
              }
            }
          }
          return normalizedSiNos;
        });
        setSicOptions((prev) => {
          const sid = formData.sicNo;
          if (sid !== "" && Number.isFinite(Number(sid))) {
            const idNum = Number(sid);
            if (!normalizedSicNos.some((o) => Number(o.id) === idNum)) {
              const keep = Array.isArray(prev) ? prev.find((o) => Number(o.id) === idNum) : null;
              if (keep) return [keep, ...normalizedSicNos];
            }
          }
          return normalizedSicNos;
        });
        setDiOptions((prev) => {
          const sid = formData.diNo;
          if (sid !== "" && Number.isFinite(Number(sid))) {
            const idNum = Number(sid);
            if (!normalizedDiNos.some((o) => Number(o.id) === idNum)) {
              const keep = Array.isArray(prev) ? prev.find((o) => Number(o.id) === idNum) : null;
              if (keep) return [keep, ...normalizedDiNos];
            }
          }
          return normalizedDiNos;
        });
        const normalizedAgents = normalizeOptions(agents);
        setAgentOptions((prev) => {
          const sid = formData.selectAgent;
          if (sid !== "" && Number.isFinite(Number(sid))) {
            const idNum = Number(sid);
            if (!normalizedAgents.some((o) => Number(o.id) === idNum)) {
              const keep = Array.isArray(prev) ? prev.find((o) => Number(o.id) === idNum) : null;
              if (keep) return [keep, ...normalizedAgents];
            }
          }
          return normalizedAgents;
        });
        setConsigneeOptions(formData.selectAgent ? normalizeOptions(consignees) : []);
        setPicOptions(normalizeOptions(pics));
        setFromOptions(normalizeTextOptions(optionsSource?.from_options));
        setShippedByOptions(
          normalizeTextOptions(
            isDeliveryLike
              ? (optionsSource?.pic_options || optionsSource?.pics || [])
              : optionsSource?.shipped_by_options
          )
        );
        setToOptions(normalizeTextOptions(optionsSource?.to_options || optionsSource?.location_options));
      } catch (e) {
        console.error("Failed to load form options:", e);
      } finally {
        if (!cancelled) setIsOptionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [qCnee, qSi, qSic, qDi, qAgent, qShipBy, qFrom, qTo, formData.selectAgent, formData.siNo, formData.sicNo, formData.diNo, selectedSiName, isShippingAdvise, isDeliveryLike]);

  // On page load: fetch latest saved SI form
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsSiFormLoading(true);
        const form = await loadFormLatest({ latest_only: true });
        if (cancelled) return;
        applySiFormResponse(form);
      } catch (e) {
        // If backend has no "latest" yet or rejects, keep page usable
        console.error("Failed to load latest SI form:", e);
      } finally {
        if (!cancelled) setIsSiFormLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isShippingAdvise, isDeliveryLike]);

  useEffect(() => {
    return () => {
      if (pdfPreviewBlobUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
        pdfPreviewBlobUrlRef.current = null;
      }
    };
  }, []);

  // Autosave centered header fields (debounced)
  useEffect(() => {
    if (isResettingRef.current) return;
    if (isApplyingFormRef.current) return;
    // Don't call update on page load / initial fill. Only after user edits.
    if (!headerUserEditedRef.current) return;
    // don't autosave while initial latest record is still loading
    // (prevents racing user edits vs initial load)
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!isShippingAdvise && !currentId) return;

        setIsSiFormLoading(true);
        const ciPlSelectedNumberFields = !isShippingAdvise && !isDeliveryConfirmation && !isDeliveryForm
          ? {
            si_number_id:
              formData.siNo != null && formData.siNo !== "" && Number.isFinite(Number(formData.siNo))
                ? Number(formData.siNo)
                : null,
            sic_number_id:
              formData.sicNo != null && formData.sicNo !== "" && Number.isFinite(Number(formData.sicNo))
                ? Number(formData.sicNo)
                : null,
            di_number_id:
              formData.diNo != null && formData.diNo !== "" && Number.isFinite(Number(formData.diNo))
                ? Number(formData.diNo)
                : null,
          }
          : {};
        const activeNumberKey =
          ciPlSelectedNumberFields.si_number_id != null
            ? "si_number_id"
            : ciPlSelectedNumberFields.sic_number_id != null
              ? "sic_number_id"
              : ciPlSelectedNumberFields.di_number_id != null
                ? "di_number_id"
                : null;
        const ciPlExclusiveNumberFields = activeNumberKey
          ? {
            si_number_id: activeNumberKey === "si_number_id" ? ciPlSelectedNumberFields.si_number_id : null,
            sic_number_id: activeNumberKey === "sic_number_id" ? ciPlSelectedNumberFields.sic_number_id : null,
            di_number_id: activeNumberKey === "di_number_id" ? ciPlSelectedNumberFields.di_number_id : null,
          }
          : {};
        const fields = isShippingAdvise
          ? {
            si_number_id:
              formData.siNo != null && formData.siNo !== "" && Number.isFinite(Number(formData.siNo))
                ? Number(formData.siNo)
                : null,
            sic_number_id:
              formData.sicNo != null && formData.sicNo !== "" && Number.isFinite(Number(formData.sicNo))
                ? Number(formData.sicNo)
                : null,
            siform_from_id:
              formData.fromId != null && Number.isFinite(Number(formData.fromId))
                ? Number(formData.fromId)
                : null,
            siform_to_id:
              formData.toId != null && Number.isFinite(Number(formData.toId))
                ? Number(formData.toId)
                : null,
            from_text: toNullIfEmpty(formData.from),
            destination_text: toNullIfEmpty(formData.to),
            awb_number: toNullIfEmpty(formData.shippedBy),
            eta_text: formData.deadline ?? "",
            date: formData.date ?? "",
            job_no: toNullIfEmpty(formData.jobNo),
            transport_details: toNullIfEmpty(formData.transportDetails),
          }
          : isDeliveryConfirmation
            ? {
              di_number_id:
                formData.siNo != null && formData.siNo !== "" && Number.isFinite(Number(formData.siNo))
                  ? Number(formData.siNo)
                  : null,
              header_pic_id:
                formData.pic != null && formData.pic !== "" && Number.isFinite(Number(formData.pic))
                  ? Number(formData.pic)
                  : null,
              header_date: formData.date ?? "",
              delivery_date: formData.deadline ?? "",
              location_text: toNullIfEmpty(formData.to),
            }
            : isDeliveryForm
              ? {
                di_number_id:
                  formData.siNo != null && formData.siNo !== "" && Number.isFinite(Number(formData.siNo))
                    ? Number(formData.siNo)
                    : null,
                so_number: toNullIfEmpty(formData.soNo),
                header_pic_id:
                  formData.pic != null && formData.pic !== "" && Number.isFinite(Number(formData.pic))
                    ? Number(formData.pic)
                    : null,
                header_date: formData.date ?? "",
                deadline_text: formData.deadline ?? "",
                delivery_to_at: toNullIfEmpty(formData.deliveryToAt),
                siform_to_id:
                  formData.toId != null && Number.isFinite(Number(formData.toId))
                    ? Number(formData.toId)
                    : null,
                location_text: toNullIfEmpty(formData.to),
              }
              : {
                ...ciPlExclusiveNumberFields,
                si_shipped_by_id:
                  formData.shippedById != null && Number.isFinite(Number(formData.shippedById))
                    ? Number(formData.shippedById)
                    : null,
                siform_from_id:
                  formData.fromId != null && Number.isFinite(Number(formData.fromId))
                    ? Number(formData.fromId)
                    : null,
                siform_to_id:
                  formData.toId != null && Number.isFinite(Number(formData.toId))
                    ? Number(formData.toId)
                    : null,
                from_text: toNullIfEmpty(formData.from),
                to_text: toNullIfEmpty(formData.to),
                to_be_shipped_by: toNullIfEmpty(formData.shippedBy),
                deadline_text: formData.deadline ?? "",
                header_pic_id:
                  formData.pic != null && formData.pic !== "" ? Number(formData.pic) : null,
                header_date: formData.date ?? "",
              };
        const stickyAgentId = getStickyAgentId();
        const stickyConsigneeId = getStickyConsigneeId();
        const payload = buildSavePayloadWithId(currentId, {
          ...fields,
          ...(stickyAgentId != null ? { agent_id: stickyAgentId } : {}),
          ...(stickyConsigneeId != null ? { agent_cnee_id: stickyConsigneeId } : {}),
        });
        lastSubmittedHeaderRef.current = {
          to_be_shipped_by: isShippingAdvise ? (payload.awb_number ?? "") : (payload.to_be_shipped_by ?? ""),
          from_text: payload.from_text ?? "",
          to_text: isShippingAdvise
            ? (payload.destination_text ?? "")
            : isDeliveryConfirmation
              ? (payload.location_text ?? "")
              : isDeliveryForm
                ? (payload.location_text ?? "")
                : (payload.to_text ?? ""),
          deadline_text: isShippingAdvise
            ? (payload.eta_text ?? "")
            : isDeliveryConfirmation
              ? (payload.delivery_date ?? "")
              : (payload.deadline_text ?? ""),
        };
        const updated = await saveForm(payload);
        if (updated?.id != null) setSiFormId(updated.id);
        applySiFormResponse(updated, {
          lockedConsigneeId: formData.selectConsignee,
          lockedSiId: formData.siNo,
          lockedAgentId: formData.selectAgent,
        });
      } catch (e) {
        console.error("Failed to autosave SI header fields:", e);
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    formData.siNo,
    formData.sicNo,
    formData.jobNo,
    formData.deliveryToAt,
    formData.shippedBy,
    formData.shippedById,
    formData.from,
    formData.fromId,
    formData.to,
    formData.toId,
    formData.deadline,
    formData.pic,
    formData.date,
    formData.transportDetails,
  ]);

  // Autosave CONSIGN TO block into backend cnee_text (debounced)
  useEffect(() => {
    if (isResettingRef.current) return;
    if (isApplyingFormRef.current) return;
    if (!consignBlockUserEditedRef.current) return;
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!isShippingAdvise && !currentId) return;

        setIsSiFormLoading(true);
        const stickyAgentId = getStickyAgentId();
        const stickyConsigneeId = getStickyConsigneeId();
        const updated = await saveForm(
          buildSavePayloadWithId(currentId, {
            ...(isDeliveryLike
              ? {
                in_liason_with:
                  String(formData.consignBlock ?? "").trim() === ""
                    ? false
                    : formData.consignBlock,
              }
              : {
                cnee_text: formData.consignBlock ?? "",
              }),
            ...(stickyAgentId != null ? { agent_id: stickyAgentId } : {}),
            ...(stickyConsigneeId != null ? { agent_cnee_id: stickyConsigneeId } : {}),
          })
        );
        if (updated?.id != null) setSiFormId(updated.id);
        applySiFormResponse(updated, {
          lockedConsigneeId: formData.selectConsignee,
          lockedSiId: formData.siNo,
          lockedAgentId: formData.selectAgent,
        });
      } catch (e) {
        console.error("Failed to autosave cnee_text:", e);
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.consignBlock]);

  // Keep packed totals auto-calculated from cargo unless user overrides.
  useEffect(() => {
    if (isResettingRef.current) return;
    if (isApplyingFormRef.current || packedTotalsUserEditedRef.current) return;
    setFormData((prev) => ({
      ...prev,
      totalPackedQuantity: Number(totals.boxes || 0),
      totalPackedWeight: Number((totals.kg || 0).toFixed(2)),
      totalPackedVw: Number((totals.vw || 0).toFixed(2)),
      totalVw: Number((totals.vw || 0).toFixed(2)),
    }));
  }, [totals.boxes, totals.kg, totals.vw]);

  // Autosave packed totals (debounced)
  useEffect(() => {
    if (isResettingRef.current) return;
    if (isApplyingFormRef.current) return;
    if (!packedTotalsUserEditedRef.current) return;
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!isShippingAdvise && !currentId) return;

        setIsSiFormLoading(true);
        const stickyAgentId = getStickyAgentId();
        const stickyConsigneeId = getStickyConsigneeId();
        const updated = await saveForm(
          buildSavePayloadWithId(currentId, {
            total_packed_quantity: Number(formData.totalPackedQuantity || 0),
            total_packed_weight: Number(formData.totalPackedWeight || 0),
            total_packed_vw: Number(formData.totalPackedVw || 0),
            ...(stickyAgentId != null ? { agent_id: stickyAgentId } : {}),
            ...(stickyConsigneeId != null ? { agent_cnee_id: stickyConsigneeId } : {}),
          })
        );
        if (updated?.id != null) setSiFormId(updated.id);
        applySiFormResponse(updated, {
          lockedConsigneeId: formData.selectConsignee,
          lockedSiId: formData.siNo,
          lockedAgentId: formData.selectAgent,
        });
      } catch (e) {
        console.error("Failed to autosave packed totals:", e);
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.totalPackedQuantity, formData.totalPackedWeight, formData.totalPackedVw]);


  // Button handlers
  const handleResetShippingInstruction = async () => {
    try {
      isResettingRef.current = true;
      setIsSiFormLoading(true);
      headerUserEditedRef.current = false;
      consignBlockUserEditedRef.current = false;
      packedTotalsUserEditedRef.current = false;
      setRequiredAgentCneeId(null);
      // Ensure we have a record id to update
      let currentId = siFormId;
      if (!currentId) {
        const latestBefore = await loadFormLatest({ latest_only: true });
        currentId = latestBefore?.id ?? null;
        if (currentId) setSiFormId(currentId);
      }
      if (!isShippingAdvise && !currentId) return;

      // Full reset: send explicit empty/null keys (as requested)
      const updated = await saveForm(
        buildSavePayloadWithId(currentId, {
          agent_id: null,
          agent_cnee_id: null,
          agent_contact_id: null,
          agent_partner_id: null,

          si_shipped_by_id: null,
          to_be_shipped_by: null,
          siform_from_id: null,
          from_text: null,
          siform_to_id: null,
          to_text: null,
          deadline_text: null,
          delivery_date: null,
          header_pic_id: null,
          header_date: null,

          company: "",
          address1: "",
          address2: "",
          postcode: "",
          city: "",
          country_id: null,
          reg_no: "",
          email1: "",
          phone1: "",
          phone2: "",
          web: "",

          cnee1: null,
          cnee2: null,
          cnee3: null,
          cnee4: null,
          cnee5: null,
          cnee6: null,
          cnee7: null,
          cnee8: null,
          cnee9: null,
          cnee10: null,
          cnee11: null,
          cnee12: null,
          cnee_text: "",
          in_liason_with: false,
          total_packed_quantity: 0,
          total_packed_weight: 0,
          total_packed_vw: 0,
          total_vw: 0,

          agents_pic: null,
          warnings: "",

          si_number_id: null,
          sic_number_id: null,
          di_number_id: null,
          job_no: "",
          so_number: null,
          delivery_to_at: null,
          location_text: null,

          stock_list: [],
        })
      );
      if (updated?.id != null) setSiFormId(updated.id);
      setFormData((prev) => ({
        ...prev,
        includeInLiasonWith: false,
        selectAgent: "",
        selectConsignee: "",
        siNo: "",
        sicNo: "",
        diNo: "",
        jobNo: "",
        soNo: "",
        deliveryToAt: "",
        shippedBy: "",
        shippedById: null,
        from: "",
        fromId: null,
        to: "",
        toId: null,
        deadline: "",
        totalVw: "",
      }));
      setQAgent("");
      setQCnee("");
      setQSi("");
      setQSic("");
      setQShipBy("");
      setQFrom("");
      setQTo("");
      applySiFormResponse(updated);
      // Prevent immediate post-reset autosave loops from stale refs.
      headerUserEditedRef.current = false;
      consignBlockUserEditedRef.current = false;
      packedTotalsUserEditedRef.current = false;
      setRequiredAgentCneeId(null);
    } catch (e) {
      console.error("Failed to reset SI form:", e);
    } finally {
      setIsSiFormLoading(false);
      setTimeout(() => {
        isResettingRef.current = false;
      }, 0);
    }
  };

  const getShippingFormPdfFilename = () => {
    const dateTag = new Date().toISOString().slice(0, 10);
    return isShippingAdvise
      ? `shipping-advise-${dateTag}.pdf`
      : isDeliveryConfirmation
        ? `delivery-confirmation-${dateTag}.pdf`
        : isDeliveryForm
          ? `delivery-instruction-${dateTag}.pdf`
          : `shipping-instruction-${dateTag}.pdf`;
  };

  /** Builds the same PDF used for preview, download, and print */
  const buildShippingFormPdf = async () => {
    const siNoLabel =
      siOptions.find((o) => Number(o.id) === Number(formData.siNo))?.name ||
      selectedSiName ||
      "";
    const sicNoLabel =
      sicOptions.find((o) => Number(o.id) === Number(formData.sicNo))?.name ||
      "";
    const selectedIdentifierLabel = formData.siNo
      ? ["SI NUMBER", siNoLabel || "-"]
      : formData.sicNo
        ? ["SIC NO", sicNoLabel || "-"]
        : ["SI NUMBER", "-"];
    const picLabel =
      picOptions.find((o) => Number(o.id) === Number(formData.pic))?.name || formData.pic || "";
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentLeft = 30;
    const contentTop = 160;

    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          doc.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight);
          resolve();
        };
        img.onerror = reject;
        img.src = narviLetterheadPrint;
      });
    } catch (e) {
      console.error("Failed to load letterhead image for PDF:", e);
    }

    const isCiPlPdf = !isShippingAdvise && !isDeliveryConfirmation && !isDeliveryForm;
    if (isCiPlPdf) {
      const invoiceRefValue = [
        selectedIdentifierLabel?.[1] ? `${selectedIdentifierLabel[0]}: ${selectedIdentifierLabel[1]}` : "",
        formData.jobNo ? `JOB NO: ${formData.jobNo}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const ciPlRows = (cargoItems || []).map((item) => (
        isCiPlPerUnitTab
          ? [
            item.poNumber || "via system",
            String(item.boxes ?? "via system"),
            item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "via system",
            item.details || "Free text, line shifts",
            item.quantity || "Free text",
            item.perUnit || "Free text",
            item.valueUsd || "Free text",
          ]
          : [
            item.poNumber || "via system",
            String(item.boxes ?? "via system"),
            item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "via system",
            item.details || "Free text, line shifts",
            item.valueUsd || "Free text",
          ]
      ));

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("INVOICE / PACKING LIST", pageWidth / 2, 168, { align: "center" });
      doc.setDrawColor(52, 76, 255);
      doc.setLineWidth(1);
      doc.line(30, 180, pageWidth - 40, 180);

      doc.setFontSize(9);
      doc.text("CONSIGNED TO:", 32, 204);
      doc.rect(30, 212, 260, 56);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        doc.splitTextToSize(formData.consignBlock || "Select agent + Select consignee + Free text (copy / paste)", 245),
        36,
        234
      );
      if (isCiPlPerUnitTab) {
        doc.setFont("helvetica", "bold");
        doc.text("PIC :", 32, 284);
        doc.setFont("helvetica", "normal");
        doc.text(formData.pic || "TAS", 84, 284);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("INVOICE REF / JOB NO SI, SIC, DI NUMBER", 365, 204);
      doc.text("DATE :", 365, 238);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(invoiceRefValue || "-", 170), 365, 218);
      doc.text(formData.date || "-", 365, 252);

      autoTable(doc, {
        startY: 324,
        head: [isCiPlPerUnitTab
          ? ["PO#", "BOX", "WEIGHT", "DESCRIPTION", "QUANTITY / PCS", "PER UNIT", "VALUE IN USD"]
          : ["PO#", "BOX", "WEIGHT", "DESCRIPTION", "VALUE IN USD"]],
        body: ciPlRows.length
          ? ciPlRows
          : [isCiPlPerUnitTab
            ? ["via system", "via system", "via system", "Free text, line shifts", "Free text", "Free text", "Free text"]
            : ["via system", "via system", "via system", "Free text, line shifts", "Free text"]],
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: [0, 0, 0],
          lineWidth: 0.6,
          textColor: [0, 0, 0],
          overflow: "linebreak",
          valign: "top",
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 60 },
          2: { cellWidth: 70 },
          3: { cellWidth: isCiPlPerUnitTab ? 170 : 210 },
          4: { cellWidth: isCiPlPerUnitTab ? 90 : 110 },
          5: { cellWidth: isCiPlPerUnitTab ? 90 : 0 },
          6: { cellWidth: isCiPlPerUnitTab ? 100 : 0 },
        },
        margin: { left: 30, right: 40 },
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("VALUE FOR CUSTOMS PURPOSE ONLY USD.", 405, 522, { align: "right" });
      doc.setLineWidth(1);
      doc.line(430, 512, pageWidth - 40, 512);
      doc.line(430, 526, pageWidth - 40, 526);

      doc.text("PACKING DETAILS :", pageWidth / 2, 730, { align: "center" });
      doc.line(30, 736, pageWidth - 40, 736);

      return doc;
    }

    const docTitle = isShippingAdvise
      ? `Shipping Advise - ${formData.vessel || "-"}`
      : isDeliveryConfirmation
        ? `Delivery Confirmation - ${formData.vessel || "-"}`
        : isDeliveryForm
          ? `Delivery Instruction - ${formData.vessel || "-"}`
          : `Shipping Instruction - ${formData.vessel || "-"}`;
    doc.setFontSize(12);
    doc.text(docTitle, contentLeft, contentTop);
    doc.setFontSize(9);
    doc.text(`Date: ${new Date().toLocaleString()}`, contentLeft, contentTop + 14);

    const consignLines = String(formData.consignBlock || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const twoColStartY = contentTop + 26;
    const leftColWidth = 250;
    const gapBetweenCols = 16;
    const rightColLeftDefault = contentLeft + leftColWidth + gapBetweenCols;
    const rightColWidthDefault = 260;

    const shouldShowInLiasonPdf = isDeliveryLike
      ? Boolean(formData.includeInLiasonWith && consignLines.length)
      : true;
    const summaryLeft = shouldShowInLiasonPdf ? rightColLeftDefault : contentLeft;
    const summaryWidth = shouldShowInLiasonPdf
      ? rightColWidthDefault
      : (leftColWidth + gapBetweenCols + rightColWidthDefault);
    if (shouldShowInLiasonPdf) {
      autoTable(doc, {
        startY: twoColStartY,
        head: [[isDeliveryLike ? "IN LIASON WITH" : (isShippingAdvise ? "SHIP TO" : "CONSIGN TO")]],
        body: (consignLines.length ? consignLines : ["-"]).map((line) => [line]),
        theme: "plain",
        styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: [28, 74, 149], textColor: 255 },
        margin: { left: contentLeft, right: 24 },
        tableWidth: leftColWidth,
      });
    }
    const consignTableTopY = twoColStartY;
    const consignTableEndY = shouldShowInLiasonPdf ? (doc.lastAutoTable?.finalY || twoColStartY) : twoColStartY;

    const summaryRows = isShippingAdvise
      ? [
        selectedIdentifierLabel,
        ["JOB NO", formData.jobNo || "-"],
        ["AWB NUMBER", formData.shippedBy || "-"],
        ["FROM", formData.from || "-"],
        ["DESTINATION", formData.to || "-"],
        ["ETA", formData.deadline || "-"],
        ["TRANSPORT DETAILS", formData.transportDetails || "-"],
      ]
      : isDeliveryConfirmation
        ? [
          ["JOB NO", formData.jobNo || "-"],
          ["PIC", formData.pic || "-"],
          ["DELIVERY DATE", formData.deadline || "-"],
          ["LOCATION", formData.to || "-"],
        ]
        : isDeliveryForm
          ? [
            ["JOB NO", formData.jobNo || "-"],
            ["SO NO", formData.soNo || "-"],
            ["PIC", formData.pic || "-"],
            ["DEADLINE", formData.deadline || "-"],
            ["LOCATION", formData.to || "-"],
          ]
          : [
            selectedIdentifierLabel,
            ["JOB NO", formData.jobNo || "-"],
          ];

    autoTable(doc, {
      startY: twoColStartY,
      head: [["Field", "Value"]],
      body: summaryRows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [28, 74, 149], textColor: 255 },
      margin: { left: summaryLeft, right: 24 },
      tableWidth: summaryWidth,
    });
    const siTableEndY = doc.lastAutoTable?.finalY || twoColStartY;
    const twoColEndY = Math.max(consignTableEndY, siTableEndY);
    doc.setDrawColor(205, 215, 232);
    doc.setLineWidth(0.35);
    const sharedBoxHeight = Math.max(12, twoColEndY - consignTableTopY);
    if (shouldShowInLiasonPdf) {
      doc.rect(contentLeft, consignTableTopY, leftColWidth, sharedBoxHeight);
    }
    doc.rect(summaryLeft, consignTableTopY, summaryWidth, sharedBoxHeight);

    let cargoHead;
    let cargoRows;
    if (isShippingAdvise) {
      cargoHead = [
        "STOKITEM ID",
        "FROM",
        "WH ID",
        "SUPPLIER",
        "PO",
        "BOXES",
        "KG",
        "CBM",
        "VW",
        "LWH",
      ];
      cargoRows = (cargoItems || []).map((item) => [
        item.stockItemId || "-",
        item.origin || "-",
        item.warehouseId || "-",
        item.supplier || "-",
        item.poNumber || "-",
        String(item.boxes ?? "-"),
        item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "-",
        item.cbm != null && item.cbm !== "" ? Number(item.cbm).toFixed(2) : "-",
        item.vw != null && item.vw !== "" ? Number(item.vw).toFixed(2) : "-",
        item.lwh || "-",
      ]);
      cargoRows.push([
        "CARGO TO BE SHIPPED",
        "",
        "",
        "",
        "",
        String(totals.boxes ?? 0),
        Number(totals.kg || 0).toFixed(2),
        Number(totals.cbm || 0).toFixed(2),
        Number(formData.totalVw || 0).toFixed(2),
        "",
      ]);
    } else if (isDeliveryConfirmation) {
      cargoHead = ["STOKITEM ID", "WAREHOUSE ID", "AWB", "FROM", "SUPLIER", "PO NUMBER", "BOXES", "KG", "LWH"];
      cargoRows = (cargoItems || []).map((item) => [
        item.stockItemId || "-",
        item.warehouseId || "-",
        item.awbNumber || formData.shippedBy || "-",
        item.origin || "-",
        item.supplier || "-",
        item.poNumber || "-",
        String(item.boxes ?? "-"),
        item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "-",
        item.lwh || "-",
      ]);
    } else if (isDeliveryForm) {
      cargoHead = ["STOKITEM ID", "AWB", "FROM", "WAREHOUSE ID", "SUPLIER", "PO NUMBER", "BOXES", "KG", "LWH"];
      cargoRows = (cargoItems || []).map((item) => [
        item.stockItemId || "-",
        item.awbNumber || formData.shippedBy || "-",
        item.origin || "-",
        item.warehouseId || "-",
        item.supplier || "-",
        item.poNumber || "-",
        String(item.boxes ?? "-"),
        item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "-",
        item.lwh || "-",
      ]);
    } else {
      cargoHead = ["PO#", "BOX", "WEIGHT", "DESCRIPTION", "VALUE IN USD"];
      cargoRows = (cargoItems || []).map((item) => [
        item.poNumber || "-",
        String(item.boxes ?? "-"),
        item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "-",
        item.details || "-",
        item.valueUsd || "-",
      ]);
    }

    autoTable(doc, {
      startY: twoColEndY + 14,
      head: [cargoHead],
      body: cargoRows,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [230, 236, 247], textColor: [33, 51, 91] },
      margin: { left: contentLeft, right: 24, bottom: 24 },
      didParseCell: (hookData) => {
        if (!isShippingAdvise && !isDeliveryLike && hookData.section === "body") {
          const packedAsRowIndex = cargoRows.length - 1;
          if (hookData.row.index === packedAsRowIndex) {
            hookData.cell.styles.fillColor = [255, 245, 204];
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    const cargoTableEndY = doc.lastAutoTable?.finalY || (twoColEndY + 14);
    if (isDeliveryForm) {
      const warningText =
        "!! ALWAYS CHECK IF CARGO UPON DELIVERY IS IN GOOD CONDITION AND IF NOT - IF ANY IRREGULARITIES WE ARE TO BE INFORMED UPON DELIVERY COMPLETED";
      const warningY = cargoTableEndY + 20;
      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      doc.text(doc.splitTextToSize(warningText, pageWidth - (contentLeft + 24)), contentLeft, warningY);
      doc.setTextColor(0, 0, 0);

      const stampBoxWidth = 260;
      const stampBoxX = pageWidth - 24 - stampBoxWidth;
      const stampBoxY = warningY + 24;
      autoTable(doc, {
        startY: stampBoxY,
        head: [["DATE / SIGNATURE / VESSEL STAMP:"]],
        body: [["\n\n\n\n\n"]],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 4, valign: "top" },
        headStyles: { fillColor: [230, 236, 247], textColor: [33, 51, 91] },
        margin: { left: stampBoxX, right: 24, bottom: 24 },
        tableWidth: stampBoxWidth,
      });
    }

    return doc;
  };

  const handleClosePdfPreview = () => {
    if (pdfPreviewBlobUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
      pdfPreviewBlobUrlRef.current = null;
    }
    setPdfPreviewUrl(null);
    onPdfPreviewClose();
  };

  const handleOpenPdfPreview = async () => {
    setIsPdfPreviewLoading(true);
    try {
      const doc = await buildShippingFormPdf();
      const blob = doc.output("blob");
      if (pdfPreviewBlobUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
        pdfPreviewBlobUrlRef.current = null;
      }
      const url = URL.createObjectURL(blob);
      pdfPreviewBlobUrlRef.current = url;
      setPdfPreviewUrl(url);
      onPdfPreviewOpen();
    } catch (e) {
      console.error("Failed to build PDF preview:", e);
    } finally {
      setIsPdfPreviewLoading(false);
    }
  };

  const handleDownloadShippingPdf = async () => {
    try {
      const doc = await buildShippingFormPdf();
      doc.save(getShippingFormPdfFilename());
    } catch (e) {
      console.error("Failed to download PDF:", e);
    }
  };

  const handlePrintFromPdfPreview = () => {
    const win = pdfPreviewIframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={bgColor} minH="100vh">
      <Box px={{ base: "4", md: "6", lg: "8" }} pt={0} pb={6} mx="auto">
        <Tabs variant="enclosed" colorScheme="orange" isLazy index={ciPlTabIndex} onChange={setCiPlTabIndex}>
          <TabList mb={4}>
            <Tab fontWeight="semibold">Simple</Tab>
            <Tab fontWeight="semibold">Per unit</Tab>
          </TabList>
          {/* Header with actions */}
          <Flex justify="end" align="center" mb={1}>
            <HStack spacing={3}>
              <Button
                variant="outline"
                size="sm"
                isLoading={isSiFormLoading}
                onClick={handleResetShippingInstruction}
              >
                Reset
              </Button>
              <Button
                leftIcon={<Icon as={MdPictureAsPdf} />}
                variant="outline"
                size="sm"
                isLoading={isPdfPreviewLoading}
                loadingText="Preparing…"
                onClick={handleOpenPdfPreview}
              >
                PDF
              </Button>
            </HStack>
          </Flex>


          <Grid templateColumns={`${isDeliveryLike ? "1fr" : "3fr 1fr"}`} gap={4} mb={6} mt={6}>
            <Box>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    {isShippingAdvise ? "SHIP TO:" : isDeliveryLike ? "TO DELIVER TO AT:" : "CONSIGN TO:"}
                  </Text>
                  {isDeliveryLike && (
                    <Input
                      id="delivery-to-at"
                      value={formData.deliveryToAt}
                      onChange={(e) => {
                        headerUserEditedRef.current = true;
                        handleInputChange("deliveryToAt", e.target.value);
                      }}
                      size="sm"
                      fontWeight="semibold"
                      mb={2}
                      variant="unstyled"
                      bg="orange.400"
                      color="white"
                      px={3}
                      py={1}
                      borderRadius="sm"
                      placeholder="Type delivery to at..."
                      _placeholder={{ color: "whiteAlpha.800" }}
                    />
                  )}
                  {isDeliveryLike && (
                    <Flex align="center" justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="bold">
                        IN LIASON WITH :
                      </Text>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.600">
                          Do not show
                        </Text>
                        <Switch
                          colorScheme="green"
                          isChecked={Boolean(formData.includeInLiasonWith)}
                          onChange={(e) => {
                            handleInputChange("includeInLiasonWith", e.target.checked);
                          }}
                        />
                        <Text fontSize="xs" color="gray.600">
                          Show
                        </Text>
                      </HStack>
                    </Flex>
                  )}
                  {(!isDeliveryLike || formData.includeInLiasonWith) && (
                    <Textarea
                      value={formData.consignBlock || ""}
                      onChange={(e) => {
                        consignBlockUserEditedRef.current = true;
                        handleInputChange("consignBlock", e.target.value);
                      }}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                      rows={5}
                      placeholder="Write liaison details here..."
                      style={{
                        background: "#cdd0d3b5",
                        borderRadius: "6px",
                        padding: "15px",
                        minHeight: "160px",
                        lineHeight: "1.4rem",
                      }}
                    />
                  )}
                </Box>

                <Box bg="orange.400" p={3} borderRadius="md">
                  <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                    {!isDeliveryLike && (
                      <FormControl display="contents">
                        <FormLabel
                          htmlFor={isDeliveryForm ? "jobNo-delivery" : "siNo"}
                          fontWeight="bold"
                          textTransform="uppercase"
                          m={0}
                        >
                          {isDeliveryForm ? "JOB NO :" : (isShippingAdvise ? "SI NUMBER:" : "SI NO:")}
                        </FormLabel>
                        {isDeliveryForm ? (
                          <Input
                            id="jobNo-delivery"
                            value={formData.jobNo}
                            onChange={(e) => {
                              headerUserEditedRef.current = true;
                              handleInputChange("jobNo", e.target.value);
                            }}
                            size="sm"
                            fontWeight="semibold"
                            variant="unstyled"
                            bg="transparent"
                            color="white"
                          />
                        ) : (
                          <SimpleSearchableSelect
                            id="siNo"
                            value={formData.siNo}
                            onChange={async (val) => {
                              const v = val ?? "";
                              handleInputChange("siNo", v);
                              if (!isDeliveryLike) {
                                handleInputChange("sicNo", "");
                                handleInputChange("diNo", "");
                              }
                              const selectedName = v !== "" ? getOptionNameById(siOptions, v) : "";
                              setQSi(selectedName);
                              setQSic("");
                              setQDi("");
                              setQCnee("");

                              // When an SI number is chosen: update SI form, then render returned form
                              if (v === "") return;
                              try {
                                setIsSiFormLoading(true);
                                if (!siFormId) {
                                  const latestBefore = await loadFormLatest({ latest_only: true });
                                  if (latestBefore?.id) setSiFormId(latestBefore.id);
                                }
                                const currentId = siFormId ?? (await loadFormLatest({ latest_only: true }))?.id;
                                if (!isShippingAdvise && !currentId) return;
                                const updated = await saveForm(
                                  buildSavePayloadWithId(
                                    currentId,
                                    isDeliveryForm
                                      ? { di_number_id: Number(v) }
                                      : { si_number_id: Number(v), sic_number_id: null }
                                  )
                                );
                                if (updated?.id != null) setSiFormId(updated.id);
                                applySiFormResponse(updated, {
                                  lockedSiId: v,
                                  lockedAgentId: formData.selectAgent,
                                });
                              } catch (e) {
                                console.error("Failed to load SI form by SI number:", e);
                              } finally {
                                setIsSiFormLoading(false);
                              }
                            }}
                            onSearchChange={(txt) => {
                              setQSi(txt ?? "");
                              setQCnee("");
                            }}
                            prefillOnFocus={false}
                            options={siOptions}
                            displayKey="name"
                            valueKey="id"
                            size="sm"
                            bg="transparent"
                            borderColor="transparent"
                            variant="unstyled"
                            px={0}
                            py={0}
                            _focus={{ boxShadow: "none", outline: "none" }}
                            _focusVisible={{ boxShadow: "none", outline: "none" }}
                            isLoading={isOptionsLoading || isSiFormLoading}
                            style={{
                              color: "white",
                            }}
                            placeholder="Select SI number..."
                            _placeholder={{ color: "whiteAlpha.800" }}
                          />
                        )}
                      </FormControl>
                    )}

                    {!isDeliveryLike && !isDeliveryForm && (
                      <FormControl display="contents">
                        <FormLabel
                          htmlFor="sicNo"
                          fontWeight="bold"
                          textTransform="uppercase"
                          m={0}
                        >
                          SIC NO:
                        </FormLabel>
                        <SimpleSearchableSelect
                          id="sicNo"
                          value={formData.sicNo}
                          onChange={async (val) => {
                            const v = val ?? "";
                            handleInputChange("sicNo", v);
                            handleInputChange("siNo", "");
                            handleInputChange("diNo", "");
                            const selectedName = v !== "" ? getOptionNameById(sicOptions, v) : "";
                            setQSic(selectedName);
                            setQSi("");
                            setQDi("");
                            setQCnee("");
                            if (v === "") return;
                            try {
                              setIsSiFormLoading(true);
                              const currentId = siFormId ?? (await loadFormLatest({ latest_only: true }))?.id;
                              if (!isShippingAdvise && !currentId) return;
                              const updated = await saveForm(
                                buildSavePayloadWithId(currentId, {
                                  sic_number_id: Number(v),
                                  si_number_id: null,
                                  di_number_id: null,
                                })
                              );
                              if (updated?.id != null) setSiFormId(updated.id);
                              applySiFormResponse(updated, {
                                lockedAgentId: formData.selectAgent,
                              });
                            } catch (e) {
                              console.error("Failed to load SI form by SIC number:", e);
                            } finally {
                              setIsSiFormLoading(false);
                            }
                          }}
                          onSearchChange={(txt) => {
                            setQSic(txt ?? "");
                            setQSi("");
                          }}
                          prefillOnFocus={false}
                          options={sicOptions}
                          displayKey="name"
                          valueKey="id"
                          size="sm"
                          bg="transparent"
                          borderColor="transparent"
                          variant="unstyled"
                          px={0}
                          py={0}
                          _focus={{ boxShadow: "none", outline: "none" }}
                          _focusVisible={{ boxShadow: "none", outline: "none" }}
                          isLoading={isOptionsLoading || isSiFormLoading}
                          style={{ color: "white" }}
                          placeholder="Select SIC number..."
                          _placeholder={{ color: "whiteAlpha.800" }}
                        />
                      </FormControl>
                    )}

                    {!isDeliveryLike && !isDeliveryForm && (
                      <FormControl display="contents">
                        <FormLabel
                          htmlFor="diNo"
                          fontWeight="bold"
                          textTransform="uppercase"
                          m={0}
                        >
                          DI NO:
                        </FormLabel>
                        <SimpleSearchableSelect
                          id="diNo"
                          value={formData.diNo}
                          onChange={async (val) => {
                            const v = val ?? "";
                            handleInputChange("diNo", v);
                            handleInputChange("siNo", "");
                            handleInputChange("sicNo", "");
                            const selectedName = v !== "" ? getOptionNameById(diOptions, v) : "";
                            setQDi(selectedName);
                            setQSi("");
                            setQSic("");
                            setQCnee("");
                            if (v === "") return;
                            try {
                              setIsSiFormLoading(true);
                              const currentId = siFormId ?? (await loadFormLatest({ latest_only: true }))?.id;
                              if (!currentId) return;
                              const updated = await saveForm(
                                buildSavePayloadWithId(currentId, {
                                  di_number_id: Number(v),
                                  si_number_id: null,
                                  sic_number_id: null,
                                })
                              );
                              if (updated?.id != null) setSiFormId(updated.id);
                              applySiFormResponse(updated, {
                                lockedAgentId: formData.selectAgent,
                              });
                            } catch (e) {
                              console.error("Failed to load SI form by DI number:", e);
                            } finally {
                              setIsSiFormLoading(false);
                            }
                          }}
                          onSearchChange={(txt) => {
                            setQDi(txt ?? "");
                          }}
                          prefillOnFocus={false}
                          options={diOptions}
                          displayKey="name"
                          valueKey="id"
                          size="sm"
                          bg="transparent"
                          borderColor="transparent"
                          variant="unstyled"
                          px={0}
                          py={0}
                          _focus={{ boxShadow: "none", outline: "none" }}
                          _focusVisible={{ boxShadow: "none", outline: "none" }}
                          isLoading={isOptionsLoading || isSiFormLoading}
                          style={{ color: "white" }}
                          placeholder="Select DI number..."
                          _placeholder={{ color: "whiteAlpha.800" }}
                        />
                      </FormControl>
                    )}

                    {!isDeliveryLike && (
                      <FormControl display="contents">
                        <FormLabel
                          htmlFor={isDeliveryForm ? "siNo-delivery" : "jobNo"}
                          fontWeight="bold"
                          textTransform="uppercase"
                          m={0}
                        >
                          {isDeliveryForm ? "SO NO:" : "JOB NO:"}
                        </FormLabel>
                        {isDeliveryForm ? (
                          <SimpleSearchableSelect
                            id="siNo-delivery"
                            value={formData.siNo}
                            onChange={async (val) => {
                              const v = val ?? "";
                              handleInputChange("siNo", v);
                              const selectedName = v !== "" ? getOptionNameById(siOptions, v) : "";
                              setQSi(selectedName);
                              if (v === "") return;
                              try {
                                setIsSiFormLoading(true);
                                const currentId = siFormId ?? (await loadFormLatest({ latest_only: true }))?.id;
                                if (!currentId) return;
                                const updated = await saveForm(
                                  buildSavePayloadWithId(currentId, { di_number_id: Number(v) })
                                );
                                if (updated?.id != null) setSiFormId(updated.id);
                                applySiFormResponse(updated, { lockedSiId: v, lockedAgentId: formData.selectAgent });
                              } catch (e) {
                                console.error("Failed to update SO number:", e);
                              } finally {
                                setIsSiFormLoading(false);
                              }
                            }}
                            onSearchChange={(txt) => setQSi(txt ?? "")}
                            prefillOnFocus={false}
                            options={siOptions}
                            displayKey="name"
                            valueKey="id"
                            size="sm"
                            bg="transparent"
                            borderColor="transparent"
                            variant="unstyled"
                            px={0}
                            py={0}
                            _focus={{ boxShadow: "none", outline: "none" }}
                            _focusVisible={{ boxShadow: "none", outline: "none" }}
                            isLoading={isOptionsLoading || isSiFormLoading}
                            style={{ color: "white" }}
                            placeholder="Select SO number..."
                            _placeholder={{ color: "whiteAlpha.800" }}
                          />
                        ) : (
                          <Box bg="orange.200" px={2} py={1} borderRadius="sm">
                            <Input
                              id="jobNo"
                              value={formData.jobNo}
                              onChange={(e) => {
                                headerUserEditedRef.current = true;
                                handleInputChange("jobNo", e.target.value);
                              }}
                              size="sm"
                              fontWeight="medium"
                              variant="unstyled"
                              bg="transparent"
                              color="gray.800"
                            />
                          </Box>
                        )}
                      </FormControl>
                    )}

                    {isShippingAdvise && (
                      <FormControl display="contents">
                        <FormLabel
                          htmlFor="transport-details"
                          fontWeight="bold"
                          textTransform="uppercase"
                          m={0}
                        >
                          TRANSPORT DETAILS:
                        </FormLabel>
                        <Input
                          id="transport-details"
                          value={formData.transportDetails}
                          onChange={(e) => {
                            headerUserEditedRef.current = true;
                            handleInputChange("transportDetails", e.target.value);
                          }}
                          size="sm"
                          fontWeight="medium"
                          variant="unstyled"
                          bg="transparent"
                          color="white"
                          placeholder="Type transport details..."
                          _placeholder={{ color: "whiteAlpha.800" }}
                        />
                      </FormControl>
                    )}

                    {!isDeliveryLike && (
                      <FormControl display="contents">
                        <FormLabel
                          htmlFor="date"
                          fontWeight="bold"
                          textTransform="uppercase"
                          m={0}
                        >
                          DATE:
                        </FormLabel>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => {
                            headerUserEditedRef.current = true;
                            handleInputChange("date", e.target.value);
                          }}
                          size="sm"
                          fontWeight="medium"
                          variant="unstyled"
                          bg="transparent"
                          color="white"
                        />
                      </FormControl>
                    )}

                    {isCiPlPerUnitTab && (
                      <FormControl display="contents">
                        <FormLabel
                          htmlFor="pic-ci-pl"
                          fontWeight="bold"
                          textTransform="uppercase"
                          m={0}
                        >
                          PIC:
                        </FormLabel>
                        <SimpleSearchableSelect
                          id="pic-ci-pl"
                          value={formData.pic}
                          onChange={(val) => {
                            headerUserEditedRef.current = true;
                            handleInputChange("pic", val ?? "");
                          }}
                          options={picOptions}
                          displayKey="name"
                          valueKey="id"
                          prefillOnFocus={false}
                          size="sm"
                          bg="transparent"
                          borderColor="transparent"
                          variant="unstyled"
                          px={0}
                          py={0}
                          _focus={{ boxShadow: "none", outline: "none" }}
                          _focusVisible={{ boxShadow: "none", outline: "none" }}
                          isLoading={isOptionsLoading || isSiFormLoading}
                          color="white"
                          placeholder="Select PIC..."
                          _placeholder={{ color: "whiteAlpha.800" }}
                          style={{ color: "white" }}
                        />
                      </FormControl>
                    )}

                    {isDeliveryLike && (
                      <>
                        <FormControl display="contents">
                          <FormLabel htmlFor="job-delivery" fontWeight="bold" textTransform="uppercase" m={0}>
                            JOB NO :
                          </FormLabel>
                          {
                            <SimpleSearchableSelect
                              id="job-delivery"
                              value={formData.siNo}
                              onChange={async (val) => {
                                const v = val ?? "";
                                handleInputChange("siNo", v);
                                const selectedName = v !== "" ? getOptionNameById(siOptions, v) : "";
                                setQSi(selectedName);
                                if (v === "") return;
                                try {
                                  setIsSiFormLoading(true);
                                  const currentId = siFormId ?? (await loadFormLatest({ latest_only: true }))?.id;
                                  if (!currentId) return;
                                  const updated = await saveForm(
                                    buildSavePayloadWithId(currentId, { di_number_id: Number(v) })
                                  );
                                  if (updated?.id != null) setSiFormId(updated.id);
                                  applySiFormResponse(updated, { lockedSiId: v, lockedAgentId: formData.selectAgent });
                                } catch (e) {
                                  console.error("Failed to update DI number:", e);
                                } finally {
                                  setIsSiFormLoading(false);
                                }
                              }}
                              onSearchChange={(txt) => setQSi(txt ?? "")}
                              prefillOnFocus={false}
                              options={siOptions}
                              displayKey="name"
                              valueKey="id"
                              size="sm"
                              bg="transparent"
                              borderColor="transparent"
                              variant="unstyled"
                              px={0}
                              py={0}
                              _focus={{ boxShadow: "none", outline: "none" }}
                              _focusVisible={{ boxShadow: "none", outline: "none" }}
                              isLoading={isOptionsLoading || isSiFormLoading}
                              style={{ color: "white" }}
                              placeholder="Select DI number..."
                              _placeholder={{ color: "whiteAlpha.800" }}
                            />
                          }
                        </FormControl>
                        {isDeliveryForm && (
                          <FormControl display="contents">
                            <FormLabel htmlFor="so-delivery" fontWeight="bold" textTransform="uppercase" m={0}>
                              SO NO:
                            </FormLabel>
                            <Input
                              id="so-delivery"
                              value={formData.soNo}
                              onChange={(e) => {
                                headerUserEditedRef.current = true;
                                handleInputChange("soNo", e.target.value);
                              }}
                              size="sm"
                              fontWeight="semibold"
                              variant="unstyled"
                              bg="transparent"
                              color="white"
                              placeholder="SO number"
                              _placeholder={{ color: "whiteAlpha.800" }}
                            />
                          </FormControl>
                        )}
                        <FormControl display="contents">
                          <FormLabel htmlFor="pic-delivery" fontWeight="bold" textTransform="uppercase" m={0}>
                            PIC :
                          </FormLabel>
                          <SimpleSearchableSelect
                            id="pic-delivery"
                            value={formData.pic}
                            onChange={(val) => {
                              headerUserEditedRef.current = true;
                              handleInputChange("pic", val ?? "");
                            }}
                            options={picOptions}
                            displayKey="name"
                            valueKey="id"
                            prefillOnFocus={false}
                            size="sm"
                            bg="transparent"
                            borderColor="transparent"
                            variant="unstyled"
                            px={0}
                            py={0}
                            _focus={{ boxShadow: "none", outline: "none" }}
                            _focusVisible={{ boxShadow: "none", outline: "none" }}
                            isLoading={isOptionsLoading || isSiFormLoading}
                            color="white"
                            placeholder="Select PIC..."
                            _placeholder={{ color: "whiteAlpha.800" }}
                            style={{ color: "white" }}
                          />
                        </FormControl>
                        <FormControl display="contents">
                          <FormLabel htmlFor="date-delivery" fontWeight="bold" textTransform="uppercase" m={0}>
                            DATE :
                          </FormLabel>
                          <Input
                            id="date-delivery"
                            type="date"
                            value={formData.date}
                            onChange={(e) => {
                              headerUserEditedRef.current = true;
                              handleInputChange("date", e.target.value);
                            }}
                            size="sm"
                            fontWeight="semibold"
                            variant="unstyled"
                            bg="transparent"
                            color="white"
                          />
                        </FormControl>
                        <FormControl display="contents">
                          <FormLabel htmlFor="deadline-delivery" fontWeight="bold" textTransform="uppercase" m={0}>
                            {isDeliveryConfirmation ? "DELIVERY DATE :" : "DEADLINE :"}
                          </FormLabel>
                          <Box position="relative">
                            <Input
                              id="deadline-delivery"
                              type="text"
                              value={formData.deadline}
                              onChange={(e) => {
                                headerUserEditedRef.current = true;
                                handleInputChange("deadline", e.target.value);
                              }}
                              size="sm"
                              fontWeight="semibold"
                              variant="unstyled"
                              bg="transparent"
                              color="white"
                              pr="28px"
                              placeholder={isDeliveryConfirmation ? "Type delivery date or pick a date" : "Type deadline or pick a date"}
                              _placeholder={{ color: "whiteAlpha.800" }}
                            />
                            <Input
                              ref={deadlinePickerRef}
                              type="date"
                              value={formData.deadline}
                              onChange={(e) => {
                                headerUserEditedRef.current = true;
                                handleInputChange("deadline", e.target.value);
                              }}
                              position="absolute"
                              opacity={0}
                              pointerEvents="none"
                              h="1px"
                              w="1px"
                              p={0}
                              border={0}
                              overflow="hidden"
                              aria-hidden="true"
                              tabIndex={-1}
                            />
                            <IconButton
                              aria-label="Open delivery deadline calendar"
                              icon={<Icon as={MdCalendarToday} />}
                              size="xs"
                              variant="ghost"
                              color="whiteAlpha.900"
                              position="absolute"
                              right="0"
                              top="50%"
                              transform="translateY(-50%)"
                              onClick={() => {
                                const pickerEl = deadlinePickerRef.current;
                                if (!pickerEl) return;
                                if (typeof pickerEl.showPicker === "function") {
                                  pickerEl.showPicker();
                                } else {
                                  pickerEl.focus();
                                  pickerEl.click();
                                }
                              }}
                            />
                          </Box>
                        </FormControl>
                        <FormControl display="contents">
                          <FormLabel htmlFor="location-delivery" fontWeight="bold" textTransform="uppercase" m={0}>
                            LOCATION :
                          </FormLabel>
                          <Input
                            id="location-delivery"
                            list="si-to-options"
                            value={formData.to}
                            onChange={(e) => {
                              headerUserEditedRef.current = true;
                              const nextVal = e.target.value;
                              handleInputChange("to", nextVal);
                              handleInputChange("toId", getTextOptionIdByValue(toOptions, nextVal));
                              setQTo(nextVal);
                            }}
                            size="sm"
                            fontWeight="semibold"
                            variant="unstyled"
                            bg="transparent"
                            color="white"
                            placeholder="Select or type location..."
                            _placeholder={{ color: "whiteAlpha.800" }}
                          />
                          <datalist id="si-to-options">
                            {toOptions.map((opt) => (
                              <option key={opt.key || `${opt.id ?? "txt"}-${opt.name}`} value={opt.name} />
                            ))}
                          </datalist>
                        </FormControl>
                      </>
                    )}
                  </Grid>
                </Box>
              </Grid>

              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  {isDeliveryLike
                    ? "CARGO TO BE DELIVERED TO THE VESSEL:"
                    : "CARGO TO BE INCLUDED IN THIS SHIPPING INSTRUCTION:"}
                </Text>
                <Box overflowX="auto">
                  <Table variant="simple" size="sm" border="1px" borderColor="gray.300">
                    <Thead bg="gray.100">
                      <Tr>
                        {isDeliveryForm && (
                          <>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" bg="orange.200">STOCKITEM ID</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">AWB</Th>
                          </>
                        )}
                        {isDeliveryConfirmation && (
                          <>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" bg="orange.200">STOCKITEM ID</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">WAREHOUSE ID</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">AWB</Th>
                          </>
                        )}
                        {isDeliveryLike ? (
                          <>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">
                              FROM
                            </Th>
                            {!isDeliveryConfirmation && <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">WAREHOUSE ID</Th>}
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">SUPPLIER</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">PO NUMBER</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">BOXES</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">KG</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">LWH</Th>
                          </>
                        ) : (
                          <>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">PO#</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">BOX</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">WEIGHT</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">DESCRIPTION</Th>
                            {isCiPlPerUnitTab && (
                              <>
                                <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">QUANTITY / PCS</Th>
                                <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">PER UNIT</Th>
                              </>
                            )}
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">VALUE IN USD</Th>
                          </>
                        )}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cargoItems.map((item, index) => (
                        <Tr key={item.id} bg={index % 2 === 0 ? "white" : "gray.50"}>
                          {isDeliveryForm && (
                            <>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="orange.50">{item.stockItemId || ""}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.awbNumber || formData.shippedBy || ""}</Td>
                            </>
                          )}
                          {isDeliveryConfirmation && (
                            <>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="orange.50">{item.stockItemId || ""}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.warehouseId || ""}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.awbNumber || formData.shippedBy || ""}</Td>
                            </>
                          )}
                          {isDeliveryLike ? (
                            <>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.origin}</Td>
                              {!isDeliveryConfirmation && <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">
                                {item.warehouseId || ""}
                              </Td>}
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.supplier}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.poNumber}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.boxes}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.kg.toFixed(2)}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.lwh}</Td>
                            </>
                          ) : (
                            <>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.poNumber}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.boxes}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.kg.toFixed(2)}</Td>
                              <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5">
                                <Box
                                  minH="32px"
                                  cursor="pointer"
                                  whiteSpace="pre-wrap"
                                  px={2}
                                  py={2}
                                  borderRadius="sm"
                                  bg="#f1f3f5"
                                  border="1px solid"
                                  borderColor="gray.300"
                                  onClick={() => openDescriptionEditor(index)}
                                >
                                  {item.details || "Free text"}
                                </Box>
                              </Td>
                              {isCiPlPerUnitTab && (
                                <>
                                  <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5">
                                    <Input
                                      value={item.quantity || ""}
                                      onChange={(e) => updateCargoItem(index, "quantity", e.target.value)}
                                      size="xs"
                                      variant="unstyled"
                                      bg="#f1f3f5"
                                      px={2}
                                      py={2}
                                      borderRadius="sm"
                                      border="1px solid"
                                      borderColor="gray.300"
                                      placeholder="Free text"
                                    />
                                  </Td>
                                  <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5">
                                    <Input
                                      value={item.perUnit || ""}
                                      onChange={(e) => updateCargoItem(index, "perUnit", e.target.value)}
                                      size="xs"
                                      variant="unstyled"
                                      bg="#f1f3f5"
                                      px={2}
                                      py={2}
                                      borderRadius="sm"
                                      border="1px solid"
                                      borderColor="gray.300"
                                      placeholder="Free text"
                                    />
                                  </Td>
                                </>
                              )}
                              <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5">
                                <Input
                                  value={item.valueUsd || ""}
                                  onChange={(e) => updateCargoItem(index, "valueUsd", e.target.value)}
                                  size="xs"
                                  variant="unstyled"
                                  bg="#f1f3f5"
                                  px={2}
                                  py={2}
                                  borderRadius="sm"
                                  border="1px solid"
                                  borderColor="gray.300"
                                />
                              </Td>
                            </>
                          )}
                        </Tr>
                      ))}
                      {isDeliveryLike && (
                        <Tr bg="gray.100" fontWeight="bold">
                          <Td colSpan={6} borderRight="1px" borderColor="gray.300" py={4} px={4} fontSize="xs">
                            CARGO TO BE SHIPPED:
                          </Td>
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{totals.boxes}</Td>
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{totals.kg.toFixed(2)}</Td>
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                        </Tr>
                      )}
                      {!isShippingAdvise && !isDeliveryLike && false && (
                        <Tr bg="gray.50">
                          <Td colSpan={5} borderRight="1px" borderColor="gray.300" py={2} px={4} fontSize="xs" fontWeight="bold">
                            PACKED AS:
                          </Td>
                          <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="orange.100">
                            <Input
                              id="totalPackedQuantity"
                              type="number"
                              value={formData.totalPackedQuantity}
                              onChange={(e) => {
                                packedTotalsUserEditedRef.current = true;
                                handleInputChange("totalPackedQuantity", e.target.value);
                              }}
                              size="xs"
                              variant="unstyled"
                              bg="transparent"
                              fontWeight="semibold"
                            />
                          </Td>
                          <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="orange.100">
                            <Input
                              id="totalPackedWeight"
                              type="number"
                              step="0.01"
                              value={formData.totalPackedWeight}
                              onChange={(e) => {
                                packedTotalsUserEditedRef.current = true;
                                handleInputChange("totalPackedWeight", e.target.value);
                              }}
                              size="xs"
                              variant="unstyled"
                              bg="transparent"
                              fontWeight="semibold"
                            />
                          </Td>
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                          <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="yellow.100">
                            <Input
                              id="totalPackedVw"
                              type="number"
                              step="0.01"
                              value={formData.totalPackedVw}
                              onChange={(e) => {
                                packedTotalsUserEditedRef.current = true;
                                handleInputChange("totalPackedVw", e.target.value);
                              }}
                              size="xs"
                              variant="unstyled"
                              bg="transparent"
                              fontWeight="semibold"
                            />
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </Box>

            {/* Right Section: Select Consignee */}
            {!isDeliveryLike && (
              <Box bg="orange.50" p={3} border="1px" borderColor="orange.200">
                <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                  <FormControl display="contents">
                    <FormLabel htmlFor="selectAgent" fontWeight="bold" m={0}>
                      Select Agent:
                    </FormLabel>
                    <SimpleSearchableSelect
                      id="selectAgent"
                      value={formData.selectAgent}
                      onChange={async (val) => {
                        const v = val ?? "";
                        handleInputChange("selectAgent", v);
                        handleInputChange("selectConsignee", "");
                        setRequiredAgentCneeId(null);
                        const selectedName = v !== "" ? getOptionNameById(agentOptions, v) : "";
                        setQAgent(selectedName);
                        setQCnee("");

                        // Persist selected agent, and clear consignee selection for the new agent
                        try {
                          setIsSiFormLoading(true);
                          let currentId = siFormId;
                          if (!currentId) {
                            const latestBefore = await loadFormLatest({ latest_only: true });
                            currentId = latestBefore?.id ?? null;
                            if (currentId) setSiFormId(currentId);
                          }
                          if (!isShippingAdvise && !currentId) return;

                          const updated = await saveForm(
                            buildSavePayloadWithId(currentId, {
                              agent_id: v !== "" ? Number(v) : null,
                              agent_cnee_id: null,
                            })
                          );
                          if (updated?.id != null) setSiFormId(updated.id);
                          applySiFormResponse(updated, { lockedConsigneeId: "" });
                        } catch (e) {
                          console.error("Failed to update SI form by agent:", e);
                        } finally {
                          setIsSiFormLoading(false);
                        }
                      }}
                      onSearchChange={(txt) => {
                        setQAgent(txt ?? "");
                        setQCnee("");
                      }}
                      prefillOnFocus={false}
                      options={agentOptions}
                      displayKey="name"
                      valueKey="id"
                      size="sm"
                      bg="transparent"
                      borderColor="transparent"
                      variant="unstyled"
                      px={0}
                      py={0}
                      _focus={{ boxShadow: "none", outline: "none" }}
                      _focusVisible={{ boxShadow: "none", outline: "none" }}
                      isLoading={isOptionsLoading || isSiFormLoading}
                      placeholder="Select agent..."
                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="selectConsignee" fontWeight="bold" m={0}>
                      Select Consignee:
                    </FormLabel>
                    <SimpleSearchableSelect
                      id="selectConsignee"
                      value={formData.selectConsignee}
                      onChange={async (val) => {
                        const v = val ?? "";
                        handleInputChange("selectConsignee", v);
                        const selectedName = v !== "" ? getOptionNameById(consigneeOptions, v) : "";
                        setQCnee(selectedName);
                        setQSi("");

                        // When a consignee is chosen: update SI form, then render returned form
                        if (v === "") return;
                        try {
                          setIsSiFormLoading(true);
                          setRequiredAgentCneeId(Number(v));

                          // Ensure we have a record id to update (latest record flow)
                          let currentId = siFormId;
                          if (!currentId) {
                            const latestBefore = await loadFormLatest({ latest_only: true });
                            currentId = latestBefore?.id ?? null;
                            if (currentId) setSiFormId(currentId);
                          }
                          if (!isShippingAdvise && !currentId) return;

                          const updated = await saveForm(
                            buildSavePayloadWithId(currentId, { agent_cnee_id: Number(v) })
                          );
                          if (updated?.id != null) setSiFormId(updated.id);
                          applySiFormResponse(updated, {
                            lockedConsigneeId: v,
                            lockedAgentId: formData.selectAgent,
                          });
                        } catch (e) {
                          console.error("Failed to load SI form by consignee:", e);
                        } finally {
                          setIsSiFormLoading(false);
                        }
                      }}
                      onSearchChange={(txt) => {
                        setQCnee(txt ?? "");
                        setQSi("");
                      }}
                      prefillOnFocus={false}
                      options={consigneeOptions}
                      displayKey="name"
                      valueKey="id"
                      size="sm"
                      bg="transparent"
                      borderColor="transparent"
                      variant="unstyled"
                      px={0}
                      py={0}
                      _focus={{ boxShadow: "none", outline: "none" }}
                      _focusVisible={{ boxShadow: "none", outline: "none" }}
                      isLoading={isOptionsLoading || isSiFormLoading}
                      isDisabled={!formData.selectAgent}
                      placeholder="Select consignee..."
                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="company" fontWeight="bold" m={0} fontSize="sm">
                      Company:
                    </FormLabel>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="consigneeAddress1" fontWeight="bold" m={0} fontSize="sm">
                      {isShippingAdvise ? "Address1:" : "Address 1:"}
                    </FormLabel>
                    <Input
                      id="consigneeAddress1"
                      value={formData.consigneeAddress1}
                      onChange={(e) => handleInputChange("consigneeAddress1", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="consigneeAddress2" fontWeight="bold" m={0} fontSize="sm">
                      {isShippingAdvise ? "Address2:" : "Address 2:"}
                    </FormLabel>
                    <Input
                      id="consigneeAddress2"
                      value={formData.consigneeAddress2}
                      onChange={(e) => handleInputChange("consigneeAddress2", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="consigneePostcode" fontWeight="bold" m={0} fontSize="sm">
                      Post code:
                    </FormLabel>
                    <Input
                      id="consigneePostcode"
                      value={formData.consigneePostcode}
                      onChange={(e) => handleInputChange("consigneePostcode", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="consigneeCity" fontWeight="bold" m={0} fontSize="sm">
                      City:
                    </FormLabel>
                    <Input
                      id="consigneeCity"
                      value={formData.consigneeCity}
                      onChange={(e) => handleInputChange("consigneeCity", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="consigneeCountry" fontWeight="bold" m={0} fontSize="sm">
                      Country:
                    </FormLabel>
                    <Input
                      id="consigneeCountry"
                      value={formData.consigneeCountry}
                      onChange={(e) => handleInputChange("consigneeCountry", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="regNo" fontWeight="bold" m={0} fontSize="sm">
                      RegNo:
                    </FormLabel>
                    <Input
                      id="regNo"
                      value={formData.regNo}
                      onChange={(e) => handleInputChange("regNo", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="consigneeEmail" fontWeight="bold" m={0} fontSize="sm">
                      E-mail 1:
                    </FormLabel>
                    <Input
                      id="consigneeEmail"
                      value={formData.consigneeEmail}
                      onChange={(e) => handleInputChange("consigneeEmail", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="consigneePhone" fontWeight="bold" m={0} fontSize="sm">
                      {isShippingAdvise ? "Phone1:" : "Phone 1:"}
                    </FormLabel>
                    <Input
                      id="consigneePhone"
                      value={formData.consigneePhone}
                      onChange={(e) => handleInputChange("consigneePhone", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="consigneePhone2" fontWeight="bold" m={0} fontSize="sm">
                      {isShippingAdvise ? "Phone2:" : "Phone 2:"}
                    </FormLabel>
                    <Input
                      id="consigneePhone2"
                      value={formData.consigneePhone2 || ""}
                      onChange={(e) => handleInputChange("consigneePhone2", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="web" fontWeight="bold" m={0} fontSize="sm">
                      Web:
                    </FormLabel>
                    <Input
                      id="web"
                      value={formData.web}
                      onChange={(e) => handleInputChange("web", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="agentsPIC" fontWeight="bold" m={0} fontSize="sm" >
                      Agents PIC:
                    </FormLabel>
                    <Input
                      id="agentsPIC"
                      value={formData.agentsPIC}
                      onChange={(e) => handleInputChange("agentsPIC", e.target.value)}
                      size="sm"
                      variant="unstyled"
                      bg="transparent"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel htmlFor="warnings" fontWeight="bold" m={0} fontSize="sm">
                      Warnings:
                    </FormLabel>
                    <Textarea
                      id="warnings"
                      value={formData.warnings || ""}
                      onChange={(e) => handleInputChange("warnings", e.target.value)}
                      size="sm"
                      rows={8}
                      variant="unstyled"
                      bg="transparent"
                    />
                  </FormControl>
                </Grid>
              </Box>
            )}
          </Grid>

        </Tabs>

      </Box>

      <Modal
        isOpen={isPdfPreviewOpen}
        onClose={handleClosePdfPreview}
        size="full"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent m={4} maxH="calc(100vh - 2rem)">
          <ModalHeader>
            {isShippingAdvise ? "Shipping Advise — preview" : "Shipping Instruction — preview"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} display="flex" flexDirection="column" flex="1" minH={0}>
            {isPdfPreviewLoading ? (
              <Flex align="center" justify="center" minH="60vh">
                <Spinner size="lg" />
              </Flex>
            ) : pdfPreviewUrl ? (
              <iframe
                ref={pdfPreviewIframeRef}
                title="PDF preview"
                src={pdfPreviewUrl}
                style={{
                  border: 0,
                  width: "100%",
                  minHeight: "70vh",
                  flex: 1,
                }}
              />
            ) : null}
          </ModalBody>
          <ModalFooter gap={2} flexWrap="wrap">
            <Button variant="ghost" onClick={handleClosePdfPreview}>
              Close
            </Button>
            <Button
              leftIcon={<Icon as={MdDownload} />}
              variant="outline"
              onClick={handleDownloadShippingPdf}
            >
              Download
            </Button>
            <Button
              leftIcon={<Icon as={MdPrint} />}
              colorScheme="blue"
              onClick={handlePrintFromPdfPreview}
              isDisabled={!pdfPreviewUrl}
            >
              Print
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={isDescriptionModalOpen} onClose={onDescriptionModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Description</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Textarea
              value={editingDescriptionValue}
              onChange={(e) => setEditingDescriptionValue(e.target.value)}
              rows={10}
              placeholder="Enter description..."
            />
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onDescriptionModalClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveDescription}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
