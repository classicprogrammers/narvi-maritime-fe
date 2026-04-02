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
  GridItem,
  Badge,
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
  FormControl,
  FormLabel,
  Select,
  Textarea,
} from "@chakra-ui/react";
import { MdPrint, MdSettings, MdHelpOutline, MdCalendarToday } from "react-icons/md";
import SimpleSearchableSelect from "../../../../components/forms/SimpleSearchableSelect";
import narviLetterheadPrint from "../../../../assets/letterHead/NarviLetterhead.jpeg";
import { getSiFormOptionsApi, postSiFormApi, postSiFormUpdateApi } from "../../../../api/shippingInstructions";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function ShippingInstructionDetail({ formType = "instruction" }) {
  const isShippingAdvise = formType === "advise";
  const history = useHistory();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingInstruction, setShippingInstruction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  const [siOptions, setSiOptions] = useState([]);
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
    consignBlock: "",
    siNo: "", // stores selected option id
    jobNo: "",
    shippedBy: "",
    shippedById: null,
    from: "",
    fromId: null,
    to: "", // display name (used for print)
    toId: null,
    deadline: "",
    pic: "", // stores selected PIC id
    date: "",
    totalPackedQuantity: "",
    totalPackedWeight: "",
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
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      ww: 0,
      stockItemId: "",
    },
    {
      id: 2,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      ww: 0,
      stockItemId: "",
    },
  ]);

  // Calculate totals
  const totals = {
    boxes: cargoItems.reduce((sum, item) => sum + item.boxes, 0),
    kg: cargoItems.reduce((sum, item) => sum + item.kg, 0),
    cbm: cargoItems.reduce((sum, item) => sum + item.cbm, 0),
    ww: cargoItems.reduce((sum, item) => sum + item.ww, 0),
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [qSi, setQSi] = useState("");
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

  const blankCargoRows = () => ([
    {
      id: 1,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      ww: 0,
      stockItemId: "",
    },
    {
      id: 2,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      ww: 0,
      stockItemId: "",
    },
  ]);

  const applySiFormResponse = (form, { lockedConsigneeId, lockedSiId } = {}) => {
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
      form.si_number_id && typeof form.si_number_id === "object" ? form.si_number_id.id : "";
    const siName =
      form.si_number_id && typeof form.si_number_id === "object" ? (form.si_number_id.name || "") : "";
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

    const cneeTextOnly =
      form.cnee_text && form.cnee_text !== false ? String(form.cnee_text) : "";
    const stockList = Array.isArray(form.stock_list) ? form.stock_list : [];
    const stockTotals = {
      quantity: stockList.reduce((sum, it) => sum + Number(it?.boxes || 0), 0),
      weight: stockList.reduce((sum, it) => sum + Number(it?.kg || 0), 0),
    };
    const hasPackedQty =
      form.total_packed_quantity != null &&
      form.total_packed_quantity !== false &&
      form.total_packed_quantity !== "";
    const hasPackedWeight =
      form.total_packed_weight != null &&
      form.total_packed_weight !== false &&
      form.total_packed_weight !== "";
    packedTotalsUserEditedRef.current = Boolean(hasPackedQty || hasPackedWeight);

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
      // header card
      siNo: (lockedSiId ?? siId) ?? "",
      jobNo: form.job_no && form.job_no !== false ? String(form.job_no) : "",
      shippedBy:
        shippedByName ||
        (form.si_shipped_by_id != null && form.si_shipped_by_id !== false && form.si_shipped_by_id !== ""
          ? (getOptionNameById(shippedByOptions, form.si_shipped_by_id) || String(form.si_shipped_by_id))
          : String(lastSubmittedHeaderRef.current.to_be_shipped_by || "")),
      shippedById:
        form.si_shipped_by_id && typeof form.si_shipped_by_id === "object" && form.si_shipped_by_id.id != null
          ? Number(form.si_shipped_by_id.id)
          : form.si_shipped_by_id != null && form.si_shipped_by_id !== false && form.si_shipped_by_id !== ""
            ? (Number.isFinite(Number(form.si_shipped_by_id)) ? Number(form.si_shipped_by_id) : null)
            : null,
      from:
        fromName ||
        (form.siform_from_id != null && form.siform_from_id !== false && form.siform_from_id !== ""
          ? (getOptionNameById(fromOptions, form.siform_from_id) || String(form.siform_from_id))
          : String(lastSubmittedHeaderRef.current.from_text || "")),
      fromId:
        form.siform_from_id && typeof form.siform_from_id === "object" && form.siform_from_id.id != null
          ? Number(form.siform_from_id.id)
          : form.siform_from_id != null && form.siform_from_id !== false && form.siform_from_id !== ""
            ? (Number.isFinite(Number(form.siform_from_id)) ? Number(form.siform_from_id) : null)
            : null,
      to:
        toName ||
        (form.siform_to_id != null && form.siform_to_id !== false && form.siform_to_id !== ""
          ? (getOptionNameById(toOptions, form.siform_to_id) || String(form.siform_to_id))
          : String(lastSubmittedHeaderRef.current.to_text || "")),
      toId:
        form.siform_to_id && typeof form.siform_to_id === "object" && form.siform_to_id.id != null
          ? Number(form.siform_to_id.id)
          : form.siform_to_id != null && form.siform_to_id !== false && form.siform_to_id !== ""
            ? (Number.isFinite(Number(form.siform_to_id)) ? Number(form.siform_to_id) : null)
            : null,
      deadline:
        form.deadline_text && form.deadline_text !== false
          ? String(form.deadline_text)
          : String(lastSubmittedHeaderRef.current.deadline_text || ""),
      pic: resolvedPicId,
      date: form.header_date && form.header_date !== false ? String(form.header_date) : "",
      totalPackedQuantity: hasPackedQty ? Number(form.total_packed_quantity) : stockTotals.quantity,
      totalPackedWeight: hasPackedWeight ? Number(form.total_packed_weight) : stockTotals.weight,

      // consign block + consignee id
      consignBlock: cneeTextOnly,
      selectAgent: agentId ?? "",
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

    const mapped = stockList.map((it, idx) => ({
      id: it.id ?? idx + 1,
      origin: it.origin || "",
      warehouseId: it.warehouse_id || "",
      supplier: it.supplier_id && typeof it.supplier_id === "object" ? (it.supplier_id.name || "") : "",
      poNumber: it.po_number || "",
      details: it.details && it.details !== false ? String(it.details) : "",
      boxes: Number(it.boxes || 0),
      kg: Number(it.kg || 0),
      cbm: Number(it.cbm || 0),
      lwh: it.lwh && it.lwh !== false ? String(it.lwh) : "",
      ww: Number(it.vw || 0),
      stockItemId: it.stock_item_id || "",
    }));

    setCargoItems(mapped.length ? mapped : blankCargoRows());
    // allow autosave effects after this render flushes
    setTimeout(() => {
      isApplyingFormRef.current = false;
    }, 0);
  };

  const ensureFormId = async () => {
    if (siFormId) return siFormId;
    const latest = await postSiFormApi({ latest_only: true });
    const id = latest?.id ?? null;
    if (id) setSiFormId(id);
    return id;
  };

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setIsOptionsLoading(true);
        const data = await getSiFormOptionsApi({
          page: 1,
          page_size: 200,
          q_cnee: qCnee,
          q_si: qSi,
          q_agent: qAgent,
          q_ship_by: qShipBy,
          q_from: qFrom,
          q_to: qTo,
          agent_id: formData.selectAgent || undefined,
        });
        if (cancelled) return;

        const result = data?.result;
        const siNos = Array.isArray(result?.si_number_options) ? result.si_number_options : [];
        const agents = Array.isArray(result?.agent_options) ? result.agent_options : [];
        const consignees = Array.isArray(result?.cnee_options) ? result.cnee_options : [];
        const pics = Array.isArray(result?.pic_options)
          ? result.pic_options
          : Array.isArray(result?.pics)
            ? result.pics
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

        setSiOptions(normalizeOptions(siNos));
        setAgentOptions(normalizeOptions(agents));
        setConsigneeOptions(formData.selectAgent ? normalizeOptions(consignees) : []);
        setPicOptions(normalizeOptions(pics));
        setFromOptions(normalizeTextOptions(result?.from_options));
        setShippedByOptions(normalizeTextOptions(result?.shipped_by_options));
        setToOptions(normalizeTextOptions(result?.to_options));
      } catch (e) {
        console.error("Failed to load SI form options:", e);
      } finally {
        if (!cancelled) setIsOptionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [qCnee, qSi, qAgent, qShipBy, qFrom, qTo, formData.selectAgent]);

  // On page load: fetch latest saved SI form
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsSiFormLoading(true);
        const form = await postSiFormApi({ latest_only: true });
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
  }, []);

  // Autosave centered header fields (debounced)
  useEffect(() => {
    if (isApplyingFormRef.current) return;
    // Don't call update on page load / initial fill. Only after user edits.
    if (!headerUserEditedRef.current) return;
    // don't autosave while initial latest record is still loading
    // (prevents racing user edits vs initial load)
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!currentId) return;

        setIsSiFormLoading(true);
        const payload = {
          id: currentId,
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
        lastSubmittedHeaderRef.current = {
          to_be_shipped_by: payload.to_be_shipped_by ?? "",
          from_text: payload.from_text ?? "",
          to_text: payload.to_text ?? "",
          deadline_text: payload.deadline_text ?? "",
        };
        const updated = await postSiFormUpdateApi(payload);
        applySiFormResponse(updated, {
          lockedConsigneeId: formData.selectConsignee,
          lockedSiId: formData.siNo,
        });
      } catch (e) {
        console.error("Failed to autosave SI header fields:", e);
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    formData.shippedBy,
    formData.shippedById,
    formData.from,
    formData.fromId,
    formData.to,
    formData.toId,
    formData.deadline,
    formData.pic,
    formData.date,
  ]);

  // Autosave CONSIGN TO block into backend cnee_text (debounced)
  useEffect(() => {
    if (isApplyingFormRef.current) return;
    if (!consignBlockUserEditedRef.current) return;
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!currentId) return;

        setIsSiFormLoading(true);
        const updated = await postSiFormUpdateApi({
          id: currentId,
          cnee_text: formData.consignBlock ?? "",
        });
        applySiFormResponse(updated, {
          lockedConsigneeId: formData.selectConsignee,
          lockedSiId: formData.siNo,
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
    if (isApplyingFormRef.current || packedTotalsUserEditedRef.current) return;
    setFormData((prev) => ({
      ...prev,
      totalPackedQuantity: Number(totals.boxes || 0),
      totalPackedWeight: Number((totals.kg || 0).toFixed(2)),
    }));
  }, [totals.boxes, totals.kg]);

  // Autosave packed totals (debounced)
  useEffect(() => {
    if (isApplyingFormRef.current) return;
    if (!packedTotalsUserEditedRef.current) return;
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!currentId) return;

        setIsSiFormLoading(true);
        const updated = await postSiFormUpdateApi({
          id: currentId,
          total_packed_quantity: Number(formData.totalPackedQuantity || 0),
          total_packed_weight: Number(formData.totalPackedWeight || 0),
        });
        applySiFormResponse(updated, {
          lockedConsigneeId: formData.selectConsignee,
          lockedSiId: formData.siNo,
        });
      } catch (e) {
        console.error("Failed to autosave packed totals:", e);
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.totalPackedQuantity, formData.totalPackedWeight]);


  // Button handlers
  const handleResetShippingInstruction = async () => {
    try {
      setIsSiFormLoading(true);
      // Ensure we have a record id to update
      let currentId = siFormId;
      if (!currentId) {
        const latestBefore = await postSiFormApi({ latest_only: true });
        currentId = latestBefore?.id ?? null;
        if (currentId) setSiFormId(currentId);
      }
      if (!currentId) return;

      // Full reset: send explicit empty/null keys (as requested)
      const updated = await postSiFormUpdateApi({
        id: currentId,

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
        total_packed_quantity: 0,
        total_packed_weight: 0,

        agents_pic: null,
        warnings: "",

        si_number_id: null,
        job_no: "",

        stock_list: [],
      });
      packedTotalsUserEditedRef.current = false;
      setFormData((prev) => ({
        ...prev,
        shippedBy: "",
        shippedById: null,
        from: "",
        fromId: null,
        to: "",
        toId: null,
        deadline: "",
      }));
      setQAgent("");
      setQCnee("");
      setQShipBy("");
      setQFrom("");
      setQTo("");
      applySiFormResponse(updated);
    } catch (e) {
      console.error("Failed to reset SI form:", e);
    } finally {
      setIsSiFormLoading(false);
    }
  };

  const handlePrintShippingInstruction = async () => {
    const siNoLabel =
      siOptions.find((o) => Number(o.id) === Number(formData.siNo))?.name ||
      selectedSiName ||
      "";
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

    doc.setFontSize(12);
    doc.text(`Shipping Instruction - ${formData.vessel || "-"}`, contentLeft, contentTop);
    doc.setFontSize(9);
    doc.text(`Date: ${new Date().toLocaleString()}`, contentLeft, contentTop + 14);

    const consignLines = String(formData.consignBlock || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const twoColStartY = contentTop + 26;
    const leftColWidth = 250;
    const gapBetweenCols = 16;
    const rightColLeft = contentLeft + leftColWidth + gapBetweenCols;
    const rightColWidth = 260;

    autoTable(doc, {
      startY: twoColStartY,
      head: [["CONSIGN TO"]],
      body: (consignLines.length ? consignLines : ["-"]).map((line) => [line]),
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [28, 74, 149], textColor: 255 },
      margin: { left: contentLeft, right: 24 },
      tableWidth: leftColWidth,
    });
    const consignTableTopY = twoColStartY;
    const consignTableEndY = doc.lastAutoTable?.finalY || twoColStartY;

    autoTable(doc, {
      startY: twoColStartY,
      head: [["Field", "Value"]],
      body: [
        ["SI NO", siNoLabel || "-"],
        ["JOB NO", formData.jobNo || "-"],
        ["TO BE SHIPPED BY", formData.shippedBy || "-"],
        ["FROM", formData.from || "-"],
        ["TO", formData.to || "-"],
        ["DEADLINE", formData.deadline || "-"],
        ["PIC", picLabel || "-"],
      ],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [28, 74, 149], textColor: 255 },
      margin: { left: rightColLeft, right: 24 },
      tableWidth: rightColWidth,
    });
    const siTableEndY = doc.lastAutoTable?.finalY || twoColStartY;
    const twoColEndY = Math.max(consignTableEndY, siTableEndY);
    doc.setDrawColor(205, 215, 232);
    doc.setLineWidth(0.35);
    const sharedBoxHeight = Math.max(12, twoColEndY - consignTableTopY);
    doc.rect(contentLeft, consignTableTopY, leftColWidth, sharedBoxHeight);
    doc.rect(rightColLeft, consignTableTopY, rightColWidth, sharedBoxHeight);

    const cargoRows = (cargoItems || []).map((item) => [
      item.origin || "-",
      item.warehouseId || "-",
      item.supplier || "-",
      item.poNumber || "-",
      String(item.boxes ?? "-"),
      item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "-",
      item.cbm != null && item.cbm !== "" ? Number(item.cbm).toFixed(2) : "-",
      item.lwh || "-",
    ]);

    cargoRows.push([
      "CARGO TO BE SHIPPED",
      "",
      "",
      "",
      String(totals.boxes ?? 0),
      Number(totals.kg || 0).toFixed(2),
      "",
      "",
    ]);
    cargoRows.push([
      "PACKED AS",
      "",
      "",
      "",
      String(formData.totalPackedQuantity ?? ""),
      String(formData.totalPackedWeight ?? ""),
      "",
      "",
    ]);

    autoTable(doc, {
      startY: twoColEndY + 14,
      head: [["ORIGIN", "WAREHOUSE ID", "SUPPLIER", "PO NUMBER", "BOXES", "KG", "CBM", "LWH"]],
      body: cargoRows,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [230, 236, 247], textColor: [33, 51, 91] },
      margin: { left: contentLeft, right: 24, bottom: 24 },
    });

    const dateTag = new Date().toISOString().slice(0, 10);
    doc.save(`shipping-instruction-${dateTag}.pdf`);
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={bgColor} minH="100vh">
      <Box px={{ base: "4", md: "6", lg: "8" }} pt={0} pb={6} mx="auto">
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
              leftIcon={<Icon as={MdPrint} />}
              variant="outline"
              size="sm"
              onClick={handlePrintShippingInstruction}
            >
              Print
            </Button>
          </HStack>
        </Flex>

        <Text fontSize="2xl" fontWeight="bold" mb={6}>
          {isShippingAdvise
            ? `SHIPPING ADVICE FOR ${formData.vessel}`
            : `INSTRUCTION / CARGO MANIFEST FOR ${formData.vessel}`}
        </Text>

        <Grid templateColumns={{ base: "1fr", lg: "3fr 1fr" }} gap={4} mb={6}>
          <Box>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={4}>
              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  {isShippingAdvise ? "SHIP TO:" : "CONSIGN TO:"}
                </Text>
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
                  rows={8}
                  placeholder="Consignee Text will show here after you select the consignee."
                  style={{
                    background: "#cdd0d3b5",
                    borderRadius: "6px",
                    padding: "15px",
                    minHeight: "255px",
                    lineHeight: "1.4rem",
                  }}
                />
              </Box>

              <Box bg="orange.400" p={3} borderRadius="md">
                <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="siNo"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      {isShippingAdvise ? "SI NUMBER:" : "SI NO:"}
                    </FormLabel>
                    <SimpleSearchableSelect
                      id="siNo"
                      value={formData.siNo}
                      onChange={async (val) => {
                        const v = val ?? "";
                        handleInputChange("siNo", v);
                        const selectedName = v !== "" ? getOptionNameById(siOptions, v) : "";
                        setQSi(selectedName);
                        setQCnee("");

                        // When an SI number is chosen: update SI form, then render returned form
                        if (v === "") return;
                        try {
                          setIsSiFormLoading(true);
                          if (!siFormId) {
                            const latestBefore = await postSiFormApi({ latest_only: true });
                            if (latestBefore?.id) setSiFormId(latestBefore.id);
                          }
                          const currentId = siFormId ?? (await postSiFormApi({ latest_only: true }))?.id;
                          if (!currentId) return;
                          const updated = await postSiFormUpdateApi({ id: currentId, si_number_id: Number(v) });
                          applySiFormResponse(updated, { lockedSiId: v });
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
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="jobNo"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      {isShippingAdvise ? "SIC NUMBER:" : "JOB NO:"}
                    </FormLabel>
                    <Box bg="orange.200" px={2} py={1} borderRadius="sm">
                      <Input
                        id="jobNo"
                        value={formData.jobNo}
                        onChange={(e) => handleInputChange("jobNo", e.target.value)}
                        size="sm"
                        fontWeight="medium"
                        variant="unstyled"
                        bg="transparent"
                        color="gray.800"

                      />
                    </Box>
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="shippedBy"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      {isShippingAdvise ? "AWB NUMBER:" : "TO BE SHIPPED BY:"}
                    </FormLabel>
                    <Input
                      id="shippedBy"
                      list="si-shipped-by-options"
                      value={formData.shippedBy}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        headerUserEditedRef.current = true;
                        handleInputChange("shippedBy", nextVal);
                        handleInputChange("shippedById", getTextOptionIdByValue(shippedByOptions, nextVal));
                        setQShipBy(nextVal);
                      }}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                      placeholder="Select or type shipped by..."
                      _placeholder={{ color: "whiteAlpha.800" }}
                    />
                    <datalist id="si-shipped-by-options">
                      {shippedByOptions.map((opt) => (
                        <option key={opt.key || `${opt.id ?? "txt"}-${opt.name}`} value={opt.name} />
                      ))}
                    </datalist>
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="from"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      FROM:
                    </FormLabel>
                    <Input
                      id="from"
                      list="si-from-options"
                      value={formData.from}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        headerUserEditedRef.current = true;
                        handleInputChange("from", nextVal);
                        handleInputChange("fromId", getTextOptionIdByValue(fromOptions, nextVal));
                        setQFrom(nextVal);
                      }}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                      placeholder="Select or type origin..."
                      _placeholder={{ color: "whiteAlpha.800" }}
                    />
                    <datalist id="si-from-options">
                      {fromOptions.map((opt) => (
                        <option key={opt.key || `${opt.id ?? "txt"}-${opt.name}`} value={opt.name} />
                      ))}
                    </datalist>
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="to"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      {isShippingAdvise ? "DESTINATION:" : "TO:"}
                    </FormLabel>
                    <Input
                      id="to"
                      list="si-to-options"
                      value={formData.to}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        headerUserEditedRef.current = true;
                        handleInputChange("to", nextVal);
                        handleInputChange("toId", getTextOptionIdByValue(toOptions, nextVal));
                        setQTo(nextVal);
                      }}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                      placeholder="Select or type destination..."
                      _placeholder={{ color: "whiteAlpha.800" }}
                    />
                    <datalist id="si-to-options">
                      {toOptions.map((opt) => (
                        <option key={opt.key || `${opt.id ?? "txt"}-${opt.name}`} value={opt.name} />
                      ))}
                    </datalist>
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="deadline-text"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      {isShippingAdvise ? "ETA:" : "DEADLINE:"}
                    </FormLabel>
                    <Box position="relative">
                      <Input
                        id="deadline-text"
                        type="text"
                        value={formData.deadline}
                        onChange={(e) => {
                          headerUserEditedRef.current = true;
                          handleInputChange("deadline", e.target.value);
                        }}
                        size="sm"
                        fontWeight="medium"
                        variant="unstyled"
                        bg="transparent"
                        color="white"
                        pr="28px"
                        placeholder="Type deadline or pick a date"
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
                        aria-label="Open deadline calendar"
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
                    <FormLabel
                      htmlFor="pic"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      {isShippingAdvise ? "PAGE:" : "PIC:"}
                    </FormLabel>
                    <SimpleSearchableSelect
                      id="pic"
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
                      placeholder="Select PIC..."
                      _placeholder={{ color: "whiteAlpha.800" }}
                      style={{ color: "white" }}
                    />
                  </FormControl>

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
                </Grid>
              </Box>
            </Grid>

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>
                CARGO TO BE INCLUDED IN THIS SHIPPING INSTRUCTION:
              </Text>
              <Box overflowX="auto">
                <Table variant="simple" size="sm" border="1px" borderColor="gray.300">
                  <Thead bg="gray.100">
                    <Tr>
                      {isShippingAdvise && (
                        <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" bg="orange.200">STOKITEM ID</Th>
                      )}
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">FROM</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">WAREHOUSE ID</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">SUPPLIER</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">PO NUMBER</Th>
                      {!isShippingAdvise && (
                        <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">DG/UN NUMBER</Th>
                      )}
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">{isShippingAdvise ? "BOXES" : "PCS"}</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">KG</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">CBM</Th>
                      {isShippingAdvise && (
                        <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">VW</Th>
                      )}
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">LWH</Th>
                      {!isShippingAdvise && (
                        <>
                          <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" bg="yellow.200">WW</Th>
                          <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">StockItemID</Th>
                        </>
                      )}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {cargoItems.map((item, index) => (
                      <Tr key={item.id} bg={index % 2 === 0 ? "white" : "gray.50"}>
                        {isShippingAdvise && (
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="orange.50">{item.stockItemId || ""}</Td>
                        )}
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.origin}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">
                          {item.warehouseId || ""}
                        </Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.supplier}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.poNumber}</Td>
                        {!isShippingAdvise && (
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.details || ""}</Td>
                        )}
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.boxes}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.kg.toFixed(2)}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.cbm.toFixed(2)}</Td>
                        {isShippingAdvise ? (
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.ww.toFixed(2)}</Td>
                        ) : null}
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.lwh}</Td>
                        {!isShippingAdvise && (
                          <>
                            <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="yellow.100">{item.ww.toFixed(2)}</Td>
                            <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.stockItemId || ""}</Td>
                          </>
                        )}
                      </Tr>
                    ))}
                    <Tr bg="gray.100" fontWeight="bold">
                      <Td colSpan={isShippingAdvise ? 6 : 5} borderRight="1px" borderColor="gray.300" py={4} px={4} fontSize="xs">
                        CARGO TO BE SHIPPED:
                      </Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{totals.boxes}</Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{totals.kg.toFixed(2)}</Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                      {!isShippingAdvise && (
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="yellow.100"></Td>
                      )}
                      <Td py={2} px={2} fontSize="xs" borderRight="1px" borderColor="gray.300"></Td>
                    </Tr>
                    <Tr bg="gray.50">
                      <Td colSpan={isShippingAdvise ? 6 : 5} borderRight="1px" borderColor="gray.300" py={2} px={4} fontSize="xs" fontWeight="bold">
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
                      {!isShippingAdvise && (
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="yellow.100"></Td>
                      )}
                      <Td py={2} px={2} fontSize="xs" borderRight="1px" borderColor="gray.300"></Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            </Box>
          </Box>

          {/* Right Section: Select Consignee */}
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
                        const latestBefore = await postSiFormApi({ latest_only: true });
                        currentId = latestBefore?.id ?? null;
                        if (currentId) setSiFormId(currentId);
                      }
                      if (!currentId) return;

                      const updated = await postSiFormUpdateApi({
                        id: currentId,
                        agent_id: v !== "" ? Number(v) : null,
                        agent_cnee_id: null,
                      });
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
                        const latestBefore = await postSiFormApi({ latest_only: true });
                        currentId = latestBefore?.id ?? null;
                        if (currentId) setSiFormId(currentId);
                      }
                      if (!currentId) return;

                      const updated = await postSiFormUpdateApi({ id: currentId, agent_cnee_id: Number(v) });
                      applySiFormResponse(updated, { lockedConsigneeId: v });
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
                <FormLabel htmlFor="warnings" fontWeight="bold" m={0} fontSize="sm" >
                  Warnings:
                </FormLabel>
                <Textarea
                  id="warnings"
                  value={formData.warnings || ""}
                  onChange={(e) => handleInputChange("warnings", e.target.value)}
                  size="sm"
                  rows={2}
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>
            </Grid>
          </Box>
        </Grid>

      </Box>
    </Box>
  );
}
