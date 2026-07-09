import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
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
  useToast,
} from "@chakra-ui/react";
import { MdPrint, MdSettings, MdHelpOutline, MdPictureAsPdf, MdDownload, MdArchive, MdAdd, MdDelete } from "react-icons/md";
import SimpleSearchableSelect from "../../../../components/forms/SimpleSearchableSelect";
import DeletableOptionCombobox from "../../../../components/forms/DeletableOptionCombobox";
import DmyDateInput, { formatIsoToDisplayDate, formatDateForApi } from "../../../../components/forms/DmyDateInput";
import { showFormSaveError } from "../../../../utils/formApiErrors";
import { buildHeaderMasterOptionFields } from "../../../../utils/masterOptionFormSave";
import useFormOptionDelete from "../../../../hooks/useFormOptionDelete";
import narviLetterheadPrint from "../../../../assets/letterHead/NarviLetterhead.jpeg";
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
import {
  getCiplSimpleFormOptionsApi,
  getCiplPerUnitFormOptionsApi,
  getCiplSimpleFormByIdApi,
  postCiplSimpleFormApi,
  postCiplSimpleFormCreateApi,
  postCiplSimpleFormUpdateApi,
  postCiplSimpleFormArchiveApi,
  postCiplPerUnitFormApi,
  postCiplPerUnitFormCreateApi,
  postCiplPerUnitFormUpdateApi,
  postCiplPerUnitFormArchiveApi,
} from "../../../../api/cipl";
import {
  getShippingInvoiceManifestFormOptionsApi,
  postShippingInvoiceManifestFormApi,
  postShippingInvoiceManifestFormCreateApi,
  postShippingInvoiceManifestFormUpdateApi,
  postShippingInvoiceManifestFormArchiveApi,
} from "../../../../api/shippingInvoiceManifest";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  snapshotValue,
  pickChangedFields,
  toIdOrNull,
  buildCiPlExclusiveNumberFields,
  withOptionalFormIds,
  omitNullPayloadFields,
} from "../../../../utils/shippingFormAutosave";
import { getMasterData, MASTER_KEYS } from "../../../../utils/masterDataCache";
import {
  formatCiPlMultiFieldDisplay,
  getCiPlPdfMultiFieldLines,
  parseCiPlDescriptionFromApi,
  parseCiPlMultiFieldLines,
  serializeCiPlMultiFieldLines,
  CI_PL_MANIFEST_DEFAULT_DESCRIPTION,
} from "../../../../utils/ciPlDescriptionField";
import { formatApiNumericDisplay, formatCiPlCurrencyDisplay } from "../../../../utils/formatApiNumericDisplay";
import {
  buildCiplStockLinePayload,
  createEmptyCiplEntry,
  getCiplActiveEntries,
  getCiplEntryValueUsd,
  getCiplEntryValueUsdForDisplay,
  getCiplPdfEntryRows,
  getCiplStockLineValueUsd,
  mergeCiplStockLineFromApi,
  parseCiplStockLineEntriesFromApi,
  syncCiplStockLineSummaryFields,
} from "../../../../utils/ciPlStockLineEntries";

const normalizeCurrencyMasterOptions = (rawList) => {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set();
  const options = [];
  rawList.forEach((currency) => {
    if (!currency || typeof currency !== "object") return;
    const idNum = Number(currency.id);
    if (!Number.isFinite(idNum)) return;
    const name = String(currency.name ?? currency.full_name ?? currency.symbol ?? "").trim();
    if (!name) return;
    if (seen.has(idNum)) return;
    seen.add(idNum);
    options.push({ id: idNum, name });
  });
  return options.sort((a, b) => a.name.localeCompare(b.name));
};

const mergeCurrencyOptions = (masterOptions, apiOptions, selectedId, selectedName) => {
  const merged = [...(Array.isArray(masterOptions) ? masterOptions : [])];
  const seen = new Set(merged.map((option) => Number(option.id)));
  (Array.isArray(apiOptions) ? apiOptions : []).forEach((option) => {
    if (!option || !Number.isFinite(Number(option.id))) return;
    const idNum = Number(option.id);
    const name = String(option.name ?? "").trim();
    if (!name || seen.has(idNum)) return;
    seen.add(idNum);
    merged.push({ id: idNum, name });
  });
  if (selectedId !== "" && selectedId != null && Number.isFinite(Number(selectedId))) {
    const idNum = Number(selectedId);
    const selectedLabel = String(selectedName ?? "").trim();
    if (!seen.has(idNum) && selectedLabel) {
      merged.push({ id: idNum, name: selectedLabel });
    }
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name));
};

const formatLwhWithLineBreaks = (value) => {
  if (value == null || value === false) return "";
  const text = String(value).replace(/\\n/g, "\n").trim();
  if (!text) return "";
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
};

const normalizeCiPlSingleValueField = (value) => {
  if (value == null || value === false) return "";
  return String(parseCiPlMultiFieldLines(value)[0] ?? "").trim();
};

const formatCiPlDescriptionDisplay = formatCiPlMultiFieldDisplay;

const formatCiPlValueDisplay = (value) => {
  const normalized = normalizeCiPlSingleValueField(value);
  return formatCiPlCurrencyDisplay(normalized);
};

const resolveStockLineSupplierName = (line) => {
  if (!line || typeof line !== "object") return "";
  if (line.supplier && typeof line.supplier === "object" && line.supplier.name != null) {
    return String(line.supplier.name);
  }
  if (line.supplier_id && typeof line.supplier_id === "object" && line.supplier_id.name != null) {
    return String(line.supplier_id.name);
  }
  if (typeof line.supplier === "string" && line.supplier.trim() !== "") {
    return line.supplier;
  }
  return "";
};

const parseCiPlFormTotalsFromApi = (form) => {
  const formTotalsSource =
    form?.totals && typeof form.totals === "object" ? form.totals : form ?? {};
  const parseFormTotal = (value) => {
    if (value == null || value === false || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const parseFormTotalDisplay = (value) => {
    if (value == null || value === false || value === "") return null;
    return String(value);
  };
  return {
    totalBox: parseFormTotal(form?.total_box ?? formTotalsSource.total_box),
    totalWeight: parseFormTotal(form?.total_weight ?? formTotalsSource.total_weight),
    totalValueInUsd: parseFormTotalDisplay(
      form?.total_value_in_usd ?? formTotalsSource.total_value_in_usd
    ),
    totalPerUnit: parseFormTotalDisplay(
      form?.total_per_unit ?? formTotalsSource.total_per_unit
    ),
    totalQuantityPcs: parseFormTotalDisplay(
      form?.total_quantity_pcs ?? formTotalsSource.total_quantity_pcs
    ),
  };
};

/** TOTAL row value — show backend string exactly (keep .00, no reformatting). */
const formatCiPlTotalValueDisplay = (value) => {
  if (value == null || value === false || value === "") return "-";
  return String(value);
};

const ciPlInlineFieldStyles = {
  size: "xs",
  variant: "unstyled",
  bg: "#f1f3f5",
  px: 2,
  py: 2,
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "gray.300",
  flex: 1,
  minW: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflow: "visible",
  resize: "vertical",
};

const ciPlDescriptionTextareaRows = (text) => {
  const value = String(text ?? "");
  if (!value.trim()) return 2;
  const lines = value.split(/\n/);
  const rowCount = lines.reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.length / 52)),
    0
  );
  return Math.max(2, Math.min(12, rowCount));
};

const ciPlValueInputStyles = {
  size: "xs",
  variant: "unstyled",
  bg: "#f1f3f5",
  px: 2,
  py: 2,
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "gray.300",
  w: "100%",
  textAlign: "center",
};

function CiPlInlineMultiField({ value, onChange, placeholder = "Free text", newLineDefault = "" }) {
  const lines = parseCiPlMultiFieldLines(value);
  const commit = (nextLines) => onChange(serializeCiPlMultiFieldLines(nextLines));
  const updateLine = (lineIndex, nextValue) => {
    commit(lines.map((line, idx) => (idx === lineIndex ? nextValue : line)));
  };
  const addLine = () => commit([...lines, newLineDefault]);
  const removeLine = (lineIndex) => {
    if (lines.length <= 1) return;
    commit(lines.filter((_, idx) => idx !== lineIndex));
  };

  return (
    <VStack align="stretch" spacing={1} w="100%">
      {lines.map((line, lineIndex) => (
        <HStack key={`line-${lineIndex}`} align="flex-start" spacing={1}>
          <Textarea
            {...ciPlInlineFieldStyles}
            value={line}
            onChange={(e) => updateLine(lineIndex, e.target.value)}
            placeholder={placeholder}
            rows={ciPlDescriptionTextareaRows(line)}
            minH="unset"
          />
          <IconButton
            aria-label="Remove field"
            icon={<Icon as={MdDelete} />}
            size="xs"
            variant="ghost"
            colorScheme="red"
            flexShrink={0}
            mt={1}
            isDisabled={lines.length <= 1}
            onClick={() => removeLine(lineIndex)}
          />
        </HStack>
      ))}
      <IconButton
        aria-label="Add field"
        icon={<Icon as={MdAdd} />}
        size="xs"
        variant="outline"
        alignSelf="flex-start"
        onClick={addLine}
      />
    </VStack>
  );
}

export default function ShippingInstructionDetail({ formType = "instruction", archivedFormId: archivedFormIdProp = null }) {
  const { id: routeArchivedId } = useParams();
  const location = useLocation();
  const archivedFormId =
    archivedFormIdProp ??
    (/\/forms\/ci-pl\/archived\/[^/]+/.test(location.pathname) ? routeArchivedId : null);
  const isShippingAdvise = formType === "advise";
  const isDeliveryForm = formType === "delivery";
  const isDeliveryConfirmation = formType === "deliveryConfirmation";
  const isDeliveryLike = isDeliveryForm || isDeliveryConfirmation;
  const isCiPlForm = !isShippingAdvise && !isDeliveryLike;
  const isCiPlArchivedView = isCiPlForm && archivedFormId != null && String(archivedFormId).trim() !== "";
  const ciPlTotalDescriptionLabel = "VALUE FOR CUSTOMS PURPOSE ONLY";
  const todayIso = new Date().toISOString().slice(0, 10);
  const resolveFormApis = () => {
    if (isShippingAdvise) {
      return {
        loadFormLatest: postShippingAdviseFormApi,
        loadOptions: getShippingAdviseOptionsApi,
        saveForm: postShippingAdviseFormUpdateApi,
        createForm: async () => null,
      };
    }
    if (isDeliveryConfirmation) {
      return {
        loadFormLatest: postDeliveryConfirmationFormApi,
        loadOptions: getDeliveryConfirmationOptionsApi,
        saveForm: postDeliveryConfirmationFormUpdateApi,
        createForm: async () => null,
      };
    }
    if (isDeliveryForm) {
      return {
        loadFormLatest: postDeliveryInstructionFormApi,
        loadOptions: getDeliveryInstructionOptionsApi,
        saveForm: postDeliveryInstructionFormUpdateApi,
        createForm: async () => null,
      };
    }
    if (ciPlTabIndex === 2 && !isCiPlArchivedView) {
      return {
        loadFormLatest: postShippingInvoiceManifestFormApi,
        loadOptions: getShippingInvoiceManifestFormOptionsApi,
        saveForm: postShippingInvoiceManifestFormUpdateApi,
        createForm: postShippingInvoiceManifestFormCreateApi,
        archiveForm: postShippingInvoiceManifestFormArchiveApi,
      };
    }
    if (ciPlTabIndex === 1 && !isCiPlArchivedView) {
      return {
        loadFormLatest: postCiplPerUnitFormApi,
        loadOptions: getCiplPerUnitFormOptionsApi,
        saveForm: postCiplPerUnitFormUpdateApi,
        createForm: postCiplPerUnitFormCreateApi,
        archiveForm: postCiplPerUnitFormArchiveApi,
      };
    }
    return {
      loadFormLatest: postCiplSimpleFormApi,
      loadOptions: getCiplSimpleFormOptionsApi,
      saveForm: postCiplSimpleFormUpdateApi,
      createForm: postCiplSimpleFormCreateApi,
      archiveForm: postCiplSimpleFormArchiveApi,
    };
  };
  const loadFormLatest = (...args) => resolveFormApis().loadFormLatest(...args);
  const loadOptions = (...args) => resolveFormApis().loadOptions(...args);
  const saveForm = (...args) => resolveFormApis().saveForm(...args);
  const createForm = (...args) => resolveFormApis().createForm(...args);
  const history = useHistory();
  const toast = useToast();
  const {
    isOpen: isPdfPreviewOpen,
    onOpen: onPdfPreviewOpen,
    onClose: onPdfPreviewClose,
  } = useDisclosure();
  const {
    isOpen: isArchiveModalOpen,
    onOpen: onArchiveModalOpen,
    onClose: onArchiveModalClose,
  } = useDisclosure();
  const [archiveResponse, setArchiveResponse] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPdfPreviewLoading, setIsPdfPreviewLoading] = useState(false);
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
  const [currencyOptions, setCurrencyOptions] = useState(() =>
    normalizeCurrencyMasterOptions(getMasterData(MASTER_KEYS.CURRENCIES))
  );
  const [optionsReloadToken, setOptionsReloadToken] = useState(0);
  const { ingestOptionsResponse, getDeleteSelectProps } = useFormOptionDelete();
  const [isSiFormLoading, setIsSiFormLoading] = useState(false);
  const [selectedSiName, setSelectedSiName] = useState("");
  const [siFormId, setSiFormId] = useState(null);
  const [ciPlFormMeta, setCiPlFormMeta] = useState({ state: null, archived_at: null });
  // Backend requires agent_cnee_id; keep last valid id even if UI is cleared
  const [requiredAgentCneeId, setRequiredAgentCneeId] = useState(null);
  const isApplyingFormRef = useRef(false);
  const headerUserEditedRef = useRef(false);
  const consignBlockUserEditedRef = useRef(false);
  const packedTotalsUserEditedRef = useRef(false);
  const isResettingRef = useRef(false);
  const lastSubmittedHeaderRef = useRef({
    to_be_shipped_by: "",
    from_text: "",
    to_text: "",
    deadline_text: "",
  });
  const lastSubmittedCiplLinesRef = useRef("");
  const lastSavedAutosaveRef = useRef({
    header: {},
    cneeText: null,
    packed: {},
    stockLines: "",
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
    totalBox: null,
    totalWeight: null,
    totalValueInUsd: null,
    totalPerUnit: null,
    totalQuantityPcs: null,
    currencyId: "",
    currencyName: "",
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
      dg_un: "",
      valueUsd: "",
      quantity: "",
      perUnit: "",
      entries: [createEmptyCiplEntry()],
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
      dg_un: "",
      valueUsd: "",
      quantity: "",
      perUnit: "",
      entries: [createEmptyCiplEntry()],
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      vw: 0,
      stockItemId: "",
      awbNumber: "",
    },
  ]);

  const isCiPlPerUnitTab = !isShippingAdvise && !isDeliveryLike && ciPlTabIndex === 1;
  const isCiPlManifestTab = !isShippingAdvise && !isDeliveryLike && ciPlTabIndex === 2;
  const isCiPlDraftTab = isCiPlForm && !isCiPlArchivedView;
  const isCiPlEntriesTab = isCiPlForm && !isCiPlManifestTab;

  // Calculate totals
  const totals = {
    boxes: cargoItems.reduce((sum, item) => sum + item.boxes, 0),
    kg: cargoItems.reduce((sum, item) => sum + item.kg, 0),
    cbm: cargoItems.reduce((sum, item) => sum + item.cbm, 0),
    vw: cargoItems.reduce((sum, item) => sum + item.vw, 0),
  };
  const stockListTableTotals = isCiPlPerUnitTab
    ? {
      boxes: formData.totalBox,
      weight: formData.totalWeight,
      quantityPcs: formData.totalQuantityPcs,
      perUnit: formData.totalPerUnit,
      valueUsd: formData.totalValueInUsd,
    }
    : {
      boxes: formData.totalBox != null ? formData.totalBox : totals.boxes,
      weight: formData.totalWeight != null ? formData.totalWeight : totals.kg,
      quantityPcs:
        formData.totalQuantityPcs != null
          ? formData.totalQuantityPcs
          : cargoItems.reduce((sum, item) => {
            const v = Number(item.quantity);
            return sum + (Number.isFinite(v) ? v : 0);
          }, 0),
      perUnit: formData.totalPerUnit != null ? formData.totalPerUnit : null,
      valueUsd:
        formData.totalValueInUsd != null
          ? formData.totalValueInUsd
          : cargoItems.reduce(
            (sum, item) => sum + getCiplStockLineValueUsd(item, isCiPlPerUnitTab),
            0
          ),
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
  const resolveCargoItemEntries = (item) => {
    const active = getCiplActiveEntries(item);
    if (active.length > 0) {
      return Array.isArray(item.entries) ? item.entries : active;
    }
    return parseCiplStockLineEntriesFromApi(
      {
        description: item.details,
        value_in_usd: item.valueUsd,
        quantity_pcs: item.quantity,
        per_unit: item.perUnit,
      },
      isCiPlPerUnitTab
    );
  };
  const updateCargoItemEntry = (itemIndex, entryLocalKey, field, value) => {
    setCargoItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const baseEntries = resolveCargoItemEntries(item);
        const nextEntries = baseEntries.map((entry) =>
          entry.localKey === entryLocalKey ? { ...entry, [field]: value } : entry
        );
        return syncCiplStockLineSummaryFields({ ...item, entries: nextEntries }, isCiPlPerUnitTab);
      })
    );
  };
  const addCargoItemEntry = (itemIndex) => {
    setCargoItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const baseEntries = resolveCargoItemEntries(item);
        return syncCiplStockLineSummaryFields(
          { ...item, entries: [...baseEntries, createEmptyCiplEntry()] },
          isCiPlPerUnitTab
        );
      })
    );
  };
  const removeCargoItemEntry = (itemIndex, entryLocalKey) => {
    setCargoItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const baseEntries = resolveCargoItemEntries(item);
        const active = baseEntries.filter((entry) => !entry.deleted);
        if (active.length <= 1) return item;
        let nextEntries = baseEntries
          .map((entry) => {
            if (entry.localKey !== entryLocalKey) return entry;
            if (entry.id) return { ...entry, deleted: true };
            return null;
          })
          .filter(Boolean);
        if (nextEntries.filter((entry) => !entry.deleted).length === 0) {
          nextEntries = [...nextEntries, createEmptyCiplEntry()];
        }
        return syncCiplStockLineSummaryFields({ ...item, entries: nextEntries }, isCiPlPerUnitTab);
      })
    );
  };
  const ciplEntryDisplayRows = useMemo(() => {
    if (!isCiPlEntriesTab) return [];
    return cargoItems.flatMap((item, itemIndex) => {
      const entries = resolveCargoItemEntries(item).filter((entry) => !entry.deleted);
      const rows = entries.length ? entries : [createEmptyCiplEntry()];
      return rows.map((entry, entryIndex) => ({
        item,
        itemIndex,
        entry,
        entryIndex,
        rowSpan: rows.length,
      }));
    });
  }, [cargoItems, isCiPlEntriesTab, isCiPlPerUnitTab]);
  const getPerUnitLineValueUsd = (item) => {
    const activeEntries = getCiplActiveEntries(item);
    if (activeEntries.length > 0) {
      if (activeEntries.length === 1) {
        const displayValue = getCiplEntryValueUsdForDisplay(activeEntries[0], true);
        return displayValue ? formatCiPlValueDisplay(displayValue) : "";
      }
      const sum = getCiplStockLineValueUsd(item, true);
      return sum ? formatCiPlValueDisplay(sum) : "";
    }
    if (item?.valueUsd != null && item.valueUsd !== false && String(item.valueUsd).trim() !== "") {
      return formatCiPlValueDisplay(item.valueUsd);
    }
    const q = Number(item?.quantity);
    const p = Number(item?.perUnit);
    if (Number.isFinite(q) && Number.isFinite(p)) {
      return formatCiPlValueDisplay(q * p);
    }
    return "";
  };

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
  const valueInCurrencyLabel = (() => {
    if (!isCiPlForm) return "VALUE IN USD";
    const name =
      (formData.currencyName && String(formData.currencyName).trim()) ||
      getOptionNameById(currencyOptions, formData.currencyId);
    return name ? `VALUE IN ${name}` : "VALUE IN USD";
  })();
  const getTextOptionIdByValue = (list, value) => {
    if (!Array.isArray(list) || value == null) return null;
    const match = list.find((opt) => String(opt.name || "").toLowerCase() === String(value).trim().toLowerCase());
    if (!match || match.id == null || !Number.isFinite(Number(match.id))) return null;
    return Number(match.id);
  };
  const refreshFormOptions = () => setOptionsReloadToken((token) => token + 1);
  const handleDeletedPicOption = (option) => {
    setPicOptions((prev) => prev.filter((row) => Number(row.id) !== Number(option.id)));
    setFormData((prev) => (
      String(prev.pic) === String(option.id) ? { ...prev, pic: "" } : prev
    ));
    refreshFormOptions();
  };
  const handleDeletedToOption = (option) => {
    setToOptions((prev) => prev.filter((row) => Number(row.id) !== Number(option.id)));
    setFormData((prev) => (
      String(prev.to).toLowerCase() === String(option.name).toLowerCase()
        ? { ...prev, to: "", toId: null }
        : prev
    ));
    refreshFormOptions();
  };
  const toNullIfEmpty = (value) => {
    const text = value == null ? "" : String(value).trim();
    return text === "" ? null : value;
  };
  const buildHeaderSaveCandidate = (data) => {
    if (isShippingAdvise) {
      return {
        ...withOptionalFormIds({
          si_number_id: data.siNo,
          sic_number_id: data.sicNo,
        }),
        ...buildHeaderMasterOptionFields({
          data,
          savedHeader: lastSavedAutosaveRef.current.header,
          fromOptions,
          toOptions,
          variant: "advise",
          fields: ["from", "to"],
        }),
        awb_number: toNullIfEmpty(data.shippedBy),
        eta_text: formatDateForApi(data.deadline),
        date: formatDateForApi(data.date),
        transport_details: toNullIfEmpty(data.transportDetails),
      };
    }
    if (isDeliveryConfirmation) {
      return {
        ...withOptionalFormIds({
          di_number_id: data.siNo,
          header_pic_id:
            data.pic != null && data.pic !== "" && Number.isFinite(Number(data.pic)) && Number(data.pic) > 0
              ? Number(data.pic)
              : undefined,
        }),
        header_date: formatDateForApi(data.date),
        delivery_date: formatDateForApi(data.deadline),
        location_text: toNullIfEmpty(data.to),
      };
    }
    if (isDeliveryForm) {
      return {
        ...withOptionalFormIds({
          di_number_id: data.siNo,
          header_pic_id:
            data.pic != null && data.pic !== "" && Number.isFinite(Number(data.pic)) && Number(data.pic) > 0
              ? Number(data.pic)
              : undefined,
          siform_to_id: data.toId,
        }),
        so_number: toNullIfEmpty(data.soNo),
        header_date: formatDateForApi(data.date),
        deadline_text: formatDateForApi(data.deadline),
        delivery_to_at: toNullIfEmpty(data.deliveryToAt),
        location_text: toNullIfEmpty(data.to),
      };
    }
    return {
      ...buildCiPlExclusiveNumberFields(data),
      ...withOptionalFormIds({
        currency_id: data.currencyId,
        header_pic_id:
          data.pic != null && data.pic !== "" && Number.isFinite(Number(data.pic)) && Number(data.pic) > 0
            ? Number(data.pic)
            : undefined,
      }),
      ...buildHeaderMasterOptionFields({
        data,
        savedHeader: lastSavedAutosaveRef.current.header,
        shippedByOptions,
        fromOptions,
        toOptions,
        variant: "si",
      }),
      deadline_text: formatDateForApi(data.deadline),
      date: formatDateForApi(data.date),
    };
  };
  const buildHeaderSnapshotFromApi = (form) => {
    if (!form) return {};
    if (isShippingAdvise) {
      return {
        si_number_id: toIdOrNull(form.si_number_id),
        sic_number_id: toIdOrNull(form.sic_number_id),
        siform_from_id: toIdOrNull(form.siform_from_id),
        siform_to_id: toIdOrNull(form.siform_to_id),
        from_text: toNullIfEmpty(form.from_text),
        destination_text: toNullIfEmpty(form.destination_text),
        awb_number: toNullIfEmpty(form.awb_number),
        eta_text: formatDateForApi(form.eta_text),
        date: formatDateForApi(form.date),
        job_no: toNullIfEmpty(form.job_no),
        transport_details: toNullIfEmpty(form.transport_details),
      };
    }
    if (isDeliveryConfirmation) {
      return {
        di_number_id: toIdOrNull(form.di_number_id),
        header_pic_id: toIdOrNull(form.header_pic_id),
        header_date: formatDateForApi(form.header_date),
        delivery_date: formatDateForApi(form.delivery_date),
        location_text: toNullIfEmpty(form.location_text),
      };
    }
    if (isDeliveryForm) {
      return {
        di_number_id: toIdOrNull(form.di_number_id),
        so_number: toNullIfEmpty(form.so_number),
        header_pic_id: toIdOrNull(form.header_pic_id),
        header_date: formatDateForApi(form.header_date),
        deadline_text: formatDateForApi(form.deadline_text),
        delivery_to_at: toNullIfEmpty(form.delivery_to_at),
        siform_to_id: toIdOrNull(form.siform_to_id),
        location_text: toNullIfEmpty(form.location_text),
      };
    }
    return {
      si_number_id: toIdOrNull(form.si_number_id),
      sic_number_id: toIdOrNull(form.sic_number_id),
      di_number_id: toIdOrNull(form.di_number_id),
      currency_id: toIdOrNull(form.currency_id),
      si_shipped_by_id: toIdOrNull(form.si_shipped_by_id),
      siform_from_id: toIdOrNull(form.siform_from_id),
      siform_to_id: toIdOrNull(form.siform_to_id),
      from_text: toNullIfEmpty(form.from_text),
      to_text: toNullIfEmpty(form.to_text),
      to_be_shipped_by: toNullIfEmpty(form.to_be_shipped_by),
      deadline_text: formatDateForApi(form.deadline_text),
      header_pic_id: toIdOrNull(form.header_pic_id),
      date: formatDateForApi(
        form.date != null && form.date !== false
          ? form.date
          : form.header_date != null && form.header_date !== false
            ? form.header_date
            : ""
      ),
    };
  };
  const syncFormTotalsFromApi = (form) => {
    const apiTotals = parseCiPlFormTotalsFromApi(form);
    setFormData((prev) => ({
      ...prev,
      totalBox: apiTotals.totalBox,
      totalWeight: apiTotals.totalWeight,
      totalValueInUsd: apiTotals.totalValueInUsd,
      totalPerUnit: apiTotals.totalPerUnit,
      totalQuantityPcs: apiTotals.totalQuantityPcs,
    }));
  };
  const syncAutosaveSnapshotsFromApi = (form, { stockLinesSignature } = {}) => {
    if (!form) return;
    lastSavedAutosaveRef.current.header = buildHeaderSnapshotFromApi(form);
    const cneeRaw = isDeliveryLike
      ? (Object.prototype.hasOwnProperty.call(form, "in_liason_with") && form.in_liason_with !== false
        ? form.in_liason_with
        : "")
      : form.cnee_text;
    lastSavedAutosaveRef.current.cneeText = snapshotValue(cneeRaw);
    const packedAsSnapshot =
      form.packed_as && typeof form.packed_as === "object" ? form.packed_as : null;
    lastSavedAutosaveRef.current.packed = {
      total_packed_quantity: Number(
        form.total_packed_quantity ?? packedAsSnapshot?.boxes ?? 0
      ),
      total_packed_weight: Number(
        form.total_packed_weight ?? packedAsSnapshot?.kg ?? 0
      ),
      total_packed_vw: Number(form.total_packed_vw || 0),
    };
    if (stockLinesSignature != null) {
      lastSavedAutosaveRef.current.stockLines = stockLinesSignature;
    }
  };
  const blankCargoRows = () => ([
    {
      id: 1,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      dg_un: "",
      valueUsd: "",
      quantity: "",
      perUnit: "",
      entries: [createEmptyCiplEntry()],
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      vw: 0,
      lineId: null,
      stockListId: null,
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
      dg_un: "",
      valueUsd: "",
      quantity: "",
      perUnit: "",
      entries: [createEmptyCiplEntry()],
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      vw: 0,
      lineId: null,
      stockListId: null,
      stockItemId: "",
      awbNumber: "",
    },
  ]);
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

  const applySiFormResponse = (form, { lockedConsigneeId, lockedSiId, lockedAgentId } = {}) => {
    if (!form) return;
    isApplyingFormRef.current = true;
    setSiFormId(form.id ?? null);
    if (isCiPlForm && isCiPlDraftTab) {
      setCiPlFormMeta({
        state: form.state ?? null,
        archived_at:
          form.archived_at != null && form.archived_at !== false ? form.archived_at : null,
      });
    }

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
    const {
      totalBox,
      totalWeight,
      totalValueInUsd,
      totalPerUnit,
      totalQuantityPcs,
    } = parseCiPlFormTotalsFromApi(form);
    const stockTotals = {
      quantity: stockList.reduce((sum, it) => sum + Number(it?.boxes ?? it?.box ?? 0), 0),
      weight: stockList.reduce((sum, it) => sum + Number(it?.kg ?? it?.weight ?? 0), 0),
      vw: stockList.reduce((sum, it) => sum + Number(it?.vw ?? it?.ww ?? 0), 0),
    };
    const packedAs =
      form.packed_as && typeof form.packed_as === "object"
        ? form.packed_as
        : null;
    const packedQtyValue =
      form.total_packed_quantity != null &&
        form.total_packed_quantity !== false &&
        form.total_packed_quantity !== ""
        ? form.total_packed_quantity
        : packedAs?.boxes;
    const packedWeightValue =
      form.total_packed_weight != null &&
        form.total_packed_weight !== false &&
        form.total_packed_weight !== ""
        ? form.total_packed_weight
        : packedAs?.kg;
    const hasPackedQty =
      packedQtyValue != null &&
      packedQtyValue !== false &&
      packedQtyValue !== "";
    const hasPackedWeight =
      packedWeightValue != null &&
      packedWeightValue !== false &&
      packedWeightValue !== "";
    const hasPackedVw =
      form.total_packed_vw != null &&
      form.total_packed_vw !== false &&
      form.total_packed_vw !== "";
    const hasTotalVw =
      form.total_vw != null &&
      form.total_vw !== false &&
      form.total_vw !== "";
    packedTotalsUserEditedRef.current = isCiPlForm
      ? Boolean(hasPackedQty || hasPackedWeight)
      : Boolean(hasPackedQty || hasPackedWeight || hasPackedVw);

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
    const currencyId =
      form.currency_id && typeof form.currency_id === "object"
        ? form.currency_id.id
        : form.currency_id != null && form.currency_id !== false && Number.isFinite(Number(form.currency_id))
          ? Number(form.currency_id)
          : "";
    const currencyName =
      form.currency_id && typeof form.currency_id === "object" && form.currency_id.name
        ? String(form.currency_id.name)
        : "";

    setFormData((prev) => ({
      ...prev,
      vessel: Object.prototype.hasOwnProperty.call(form, "vessel_name")
        ? form.vessel_name != null && form.vessel_name !== false
          ? String(form.vessel_name)
          : ""
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
      deadline: formatIsoToDisplayDate(
        isShippingAdvise
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
                : String(lastSubmittedHeaderRef.current.deadline_text || ""))
      ),
      pic: isShippingAdvise
        ? ""
        : isDeliveryLike
          ? resolvedPicId
          : resolvedPicId,
      date: formatIsoToDisplayDate(
        isShippingAdvise
          ? (form.date != null && form.date !== false && String(form.date).trim() !== ""
            ? String(form.date)
            : todayIso)
          : isDeliveryLike
            ? (form.header_date != null && form.header_date !== false && String(form.header_date).trim() !== ""
              ? String(form.header_date)
              : todayIso)
            : (form.header_date != null && form.header_date !== false && String(form.header_date).trim() !== ""
              ? String(form.header_date)
              : form.date != null && form.date !== false && String(form.date).trim() !== ""
                ? String(form.date)
                : "")
      ),
      totalPackedQuantity: hasPackedQty ? Number(packedQtyValue) : stockTotals.quantity,
      totalPackedWeight: hasPackedWeight ? Number(packedWeightValue) : stockTotals.weight,
      totalPackedVw: hasPackedVw ? Number(form.total_packed_vw) : stockTotals.vw,
      totalVw: hasTotalVw ? Number(form.total_vw) : stockTotals.vw,
      totalBox,
      totalWeight,
      totalValueInUsd,
      totalPerUnit,
      totalQuantityPcs,
      currencyId: isCiPlForm
        ? (currencyId !== "" && currencyId != null && currencyId !== false ? String(currencyId) : "")
        : prev.currencyId,
      currencyName: isCiPlForm ? currencyName : prev.currencyName,
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
    if (isCiPlForm) {
      setCurrencyOptions((prev) =>
        mergeCurrencyOptions(
          normalizeCurrencyMasterOptions(getMasterData(MASTER_KEYS.CURRENCIES)),
          prev,
          currencyId,
          currencyName
        )
      );
    }

    setSelectedSiName(siName ? String(siName) : "");
    if (consigneeId) setRequiredAgentCneeId(Number(consigneeId));

    const mapped = stockList.map((it, idx) => {
      const supplierName = resolveStockLineSupplierName(it);
      const originVal =
        it.from != null && it.from !== false
          ? String(it.from)
          : it.from_si_advise != null && it.from_si_advise !== false
            ? String(it.from_si_advise)
            : (it.origin != null && it.origin !== false ? String(it.origin) : "");
      const whRaw =
        it.warehouse_new != null && it.warehouse_new !== false
          ? it.warehouse_new
          : it.warehouse_id;
      const warehouseId =
        whRaw != null && whRaw !== false ? String(whRaw) : "";
      const lwhVal = it.lwh != null && it.lwh !== false ? String(it.lwh) : "";
      const stockIdRaw = it.stock_item_id;
      const stockItemId =
        stockIdRaw != null && stockIdRaw !== false ? String(stockIdRaw) : "";
      const lineId =
        it.id != null && it.id !== false && Number.isFinite(Number(it.id)) ? Number(it.id) : null;
      const stockListId =
        it.stock_list_id != null && it.stock_list_id !== false && Number.isFinite(Number(it.stock_list_id))
          ? Number(it.stock_list_id)
          : null;
      return (() => {
        const synced = syncCiplStockLineSummaryFields(
          {
            id: idx + 1,
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
            poNumber:
              it.po_number != null && it.po_number !== false
                ? String(it.po_number)
                : it.po != null && it.po !== false
                  ? String(it.po)
                  : "",
            dg_un:
              it.dg_un != null && it.dg_un !== false
                ? String(it.dg_un)
                : "",
            boxes: Number(it.boxes ?? it.box ?? 0),
            boxesRaw: it.boxes ?? it.box ?? null,
            kg: Number(it.kg ?? it.weight ?? 0),
            kgRaw: it.kg ?? it.weight ?? null,
            cbm: Number(it.cbm || 0),
            lwh: lwhVal,
            vw: Number(it.vw ?? it.ww ?? 0),
            lineId,
            stockListId,
            stockItemId,
            entries: parseCiplStockLineEntriesFromApi(it, isCiPlPerUnitTab),
          },
          isCiPlPerUnitTab
        );
        if (!isCiPlManifestTab) return synced;
        const apiValueUsd =
          it.value_in_usd != null && it.value_in_usd !== false
            ? it.value_in_usd
            : it.value_usd != null && it.value_usd !== false
              ? it.value_usd
              : synced.valueUsd;
        return {
          ...synced,
          details:
            it.description != null && it.description !== false
              ? parseCiPlDescriptionFromApi(it.description)
              : "",
          valueUsd:
            apiValueUsd != null && apiValueUsd !== false ? String(apiValueUsd) : "",
        };
      })();
    });

    const stockLines = mapped.length ? mapped : blankCargoRows();
    setCargoItems(stockLines);
    const stockLinesSignature = JSON.stringify(
      buildCiplStockLinePayload(stockLines, isCiPlPerUnitTab)
    );
    lastSubmittedCiplLinesRef.current = stockLinesSignature;
    syncAutosaveSnapshotsFromApi(form, { stockLinesSignature });
    consignBlockUserEditedRef.current = false;
    // allow autosave effects after this render flushes
    setTimeout(() => {
      isApplyingFormRef.current = false;
    }, 0);
  };

  const ensureFormId = async () => {
    if (siFormId) return siFormId;
    if (isCiPlArchivedView) {
      const archivedId = Number(archivedFormId);
      if (Number.isFinite(archivedId)) {
        setSiFormId(archivedId);
        return archivedId;
      }
      return null;
    }
    const latest = await loadFormLatest({ latest_only: true });
    let id = latest?.id ?? null;
    if (!id && !isShippingAdvise && !isDeliveryLike && !isCiPlArchivedView) {
      const created = await createForm({});
      id = created?.id ?? null;
      if (created) applySiFormResponse(created);
    }
    if (id) setSiFormId(id);
    return id;
  };

  /** CI PL draft tabs may omit id — backend updates the current draft. */
  const buildSavePayloadWithId = (currentId, fields) => {
    const isCiPlDraftWithOptionalId = isCiPlDraftTab;
    if (isShippingAdvise || isCiPlDraftWithOptionalId) {
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
        ingestOptionsResponse(data);

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
        const currencies = Array.isArray(optionsSource?.currency_options)
          ? optionsSource.currency_options
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
        const normalizedCurrencies = normalizeOptions(currencies);
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
        if (isCiPlForm) {
          const masterCurrencyOptions = normalizeCurrencyMasterOptions(
            getMasterData(MASTER_KEYS.CURRENCIES)
          );
          setCurrencyOptions(
            mergeCurrencyOptions(
              masterCurrencyOptions,
              normalizedCurrencies,
              formData.currencyId,
              formData.currencyName
            )
          );
        }
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
  }, [qCnee, qSi, qSic, qDi, qAgent, qShipBy, qFrom, qTo, formData.selectAgent, formData.siNo, formData.sicNo, formData.diNo, formData.currencyId, formData.currencyName, selectedSiName, isShippingAdvise, isDeliveryLike, isCiPlForm, ciPlTabIndex, optionsReloadToken, ingestOptionsResponse]);

  useEffect(() => {
    if (!isCiPlForm) return;
    setCurrencyOptions((prev) =>
      mergeCurrencyOptions(
        normalizeCurrencyMasterOptions(getMasterData(MASTER_KEYS.CURRENCIES)),
        prev,
        formData.currencyId,
        formData.currencyName
      )
    );
  }, [isCiPlForm, formData.currencyId, formData.currencyName]);

  // Archived CI PL: load one record by id
  useEffect(() => {
    if (!isCiPlForm || !isCiPlArchivedView) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setIsSiFormLoading(true);
        const form = await getCiplSimpleFormByIdApi(archivedFormId);
        if (cancelled) return;
        if (!form) {
          toast({
            title: "Error",
            description: "Archived CI PL form not found",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        applySiFormResponse(form);
      } catch (e) {
        console.error("Failed to load archived CI PL form:", e);
        toast({
          title: "Error",
          description: e?.message || "Failed to load archived CI PL form",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        if (!cancelled) setIsSiFormLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCiPlForm, isCiPlArchivedView, archivedFormId]);

  // Active draft (or per-unit tab): load latest working copy
  useEffect(() => {
    if (!isCiPlForm || isCiPlArchivedView) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setIsSiFormLoading(true);
        const form = await loadFormLatest({ latest_only: true });
        if (cancelled) return;
        applySiFormResponse(form);
      } catch (e) {
        console.error("Failed to load CI PL form:", e);
      } finally {
        if (!cancelled) setIsSiFormLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCiPlForm, isCiPlArchivedView, ciPlTabIndex]);

  // Autosave CIPL editable stock notebook line fields.
  useEffect(() => {
    if (isResettingRef.current) return;
    if (isApplyingFormRef.current) return;
    if (isShippingAdvise || isDeliveryLike) return;
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!currentId) return;
        const stockListPayload = buildCiplStockLinePayload(cargoItems, isCiPlPerUnitTab);
        const nextLinesSignature = JSON.stringify(stockListPayload);
        if (
          nextLinesSignature === lastSubmittedCiplLinesRef.current ||
          nextLinesSignature === lastSavedAutosaveRef.current.stockLines
        ) {
          return;
        }
        setIsSiFormLoading(true);
        const updated = await saveForm(
          buildSavePayloadWithId(currentId, { stock_list: stockListPayload })
        );
        lastSubmittedCiplLinesRef.current = nextLinesSignature;
        lastSavedAutosaveRef.current.stockLines = nextLinesSignature;
        if (updated?.id != null) setSiFormId(updated.id);
        if (Array.isArray(updated?.stock_list) && updated.stock_list.length > 0) {
          setCargoItems((prev) => {
            const next = prev.map((item, idx) => {
              const serverLine =
                updated.stock_list.find(
                  (line) =>
                    item.lineId != null &&
                    line?.id != null &&
                    Number(line.id) === Number(item.lineId)
                ) ??
                updated.stock_list.find(
                  (line) =>
                    item.stockListId != null &&
                    line?.stock_list_id != null &&
                    Number(line.stock_list_id) === Number(item.stockListId)
                ) ??
                updated.stock_list[idx];
              if (!serverLine) return item;
              const supplier = resolveStockLineSupplierName(serverLine) || item.supplier;
              const merged = mergeCiplStockLineFromApi(item, serverLine, isCiPlPerUnitTab, {
                isManifest: isCiPlManifestTab,
              });
              return supplier === merged.supplier ? merged : { ...merged, supplier };
            });
            const mergedSignature = JSON.stringify(
              buildCiplStockLinePayload(next, isCiPlPerUnitTab)
            );
            lastSubmittedCiplLinesRef.current = mergedSignature;
            lastSavedAutosaveRef.current.stockLines = mergedSignature;
            return next;
          });
        }
        if (updated) {
          syncFormTotalsFromApi(updated);
          syncAutosaveSnapshotsFromApi(updated);
        }
      } catch (e) {
        console.error("Failed to autosave CIPL stock notebook lines:", e);
        showFormSaveError(toast, e, "Failed to save stock lines");
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [cargoItems, isCiPlPerUnitTab]);

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
        const candidate = buildHeaderSaveCandidate(formData);
        const changed = pickChangedFields(candidate, lastSavedAutosaveRef.current.header);
        if (Object.keys(changed).length === 0) {
          return;
        }
        const payload = buildSavePayloadWithId(currentId, changed);
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
        lastSavedAutosaveRef.current.header = {
          ...lastSavedAutosaveRef.current.header,
          ...changed,
        };
        if (updated) {
          syncAutosaveSnapshotsFromApi(updated);
        }
      } catch (e) {
        console.error("Failed to autosave SI header fields:", e);
        showFormSaveError(toast, e, "Failed to save form");
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    formData.siNo,
    formData.sicNo,
    formData.diNo,
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
    formData.currencyId,
  ]);

  // Autosave CONSIGN TO / IN LIASON WITH block (debounced)
  useEffect(() => {
    if (isResettingRef.current) return;
    if (isApplyingFormRef.current) return;
    if (!consignBlockUserEditedRef.current) return;
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!isShippingAdvise && !currentId) return;

        const nextCneeValue = isDeliveryLike
          ? String(formData.consignBlock ?? "")
          : (formData.consignBlock ?? "");
        if (snapshotValue(nextCneeValue) === snapshotValue(lastSavedAutosaveRef.current.cneeText)) {
          return;
        }

        setIsSiFormLoading(true);
        const cneePayload = isDeliveryLike
          ? { in_liason_with: nextCneeValue }
          : { cnee_text: nextCneeValue };
        const updated = await saveForm(buildSavePayloadWithId(currentId, cneePayload));
        if (updated?.id != null) setSiFormId(updated.id);
        lastSavedAutosaveRef.current.cneeText = snapshotValue(nextCneeValue);
        consignBlockUserEditedRef.current = false;
        if (updated) {
          syncAutosaveSnapshotsFromApi(updated);
        }
      } catch (e) {
        console.error("Failed to autosave cnee_text:", e);
        showFormSaveError(toast, e, "Failed to save form");
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
      ...(isCiPlForm
        ? {}
        : {
          totalPackedVw: Number((totals.vw || 0).toFixed(2)),
          totalVw: Number((totals.vw || 0).toFixed(2)),
        }),
    }));
  }, [totals.boxes, totals.kg, totals.vw, isCiPlForm]);

  // Autosave packed totals (debounced)
  useEffect(() => {
    if (isResettingRef.current) return;
    if (isApplyingFormRef.current) return;
    if (!packedTotalsUserEditedRef.current) return;
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!isShippingAdvise && !currentId) return;

        const packedCandidate = {
          total_packed_quantity: Number(formData.totalPackedQuantity || 0),
          total_packed_weight: Number(formData.totalPackedWeight || 0),
          total_packed_vw: Number(formData.totalPackedVw || 0),
        };
        const packedChanged = pickChangedFields(packedCandidate, lastSavedAutosaveRef.current.packed);
        if (Object.keys(packedChanged).length === 0) {
          return;
        }

        setIsSiFormLoading(true);
        const updated = await saveForm(
          buildSavePayloadWithId(currentId, {
            ...packedChanged,
            ...(Object.prototype.hasOwnProperty.call(packedChanged, "total_packed_quantity") ||
              Object.prototype.hasOwnProperty.call(packedChanged, "total_packed_weight")
              ? {
                packed_as: {
                  boxes: Number(formData.totalPackedQuantity || 0),
                  kg: Number(formData.totalPackedWeight || 0),
                },
              }
              : {}),
          })
        );
        if (updated?.id != null) setSiFormId(updated.id);
        lastSavedAutosaveRef.current.packed = {
          ...lastSavedAutosaveRef.current.packed,
          ...packedChanged,
        };
      } catch (e) {
        console.error("Failed to autosave packed totals:", e);
        showFormSaveError(toast, e, "Failed to save form");
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.totalPackedQuantity, formData.totalPackedWeight, formData.totalPackedVw]);


  // Button handlers
  const handleArchiveCiPlDraft = async () => {
    if (!isCiPlForm || isCiPlArchivedView || !isCiPlDraftTab) return;

    const { archiveForm, loadFormLatest: loadDraftForm } = resolveFormApis();
    if (!archiveForm) return;

    try {
      isResettingRef.current = true;
      setIsSiFormLoading(true);
      const currentId =
        siFormId ?? (await loadDraftForm({ latest_only: true }))?.id ?? null;
      const archivePayload =
        currentId != null && currentId !== "" ? { id: Number(currentId) } : {};

      const result = await archiveForm(archivePayload);

      headerUserEditedRef.current = false;
      consignBlockUserEditedRef.current = false;
      packedTotalsUserEditedRef.current = false;
      setRequiredAgentCneeId(null);

      const nextDraft = await loadDraftForm({ latest_only: true });
      if (nextDraft) {
        applySiFormResponse(nextDraft);
      }

      setArchiveResponse({
        ...result,
        draftForm: nextDraft ?? result.draftForm,
      });

      onArchiveModalOpen();
    } catch (e) {
      console.error("Failed to archive CI PL form:", e);
      showFormSaveError(toast, e, "Failed to archive form");
    } finally {
      setIsSiFormLoading(false);
      setTimeout(() => {
        isResettingRef.current = false;
      }, 0);
    }
  };

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
          vessel_id: null,
          vessel_name: "",
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
          ...(isDeliveryLike ? { header_date: null } : { date: null }),

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
          packed_as: {
            boxes: 0,
            kg: 0,
          },
          total_packed_vw: 0,
          total_vw: 0,

          agents_pic: null,
          warnings: "",

          si_number_id: null,
          sic_number_id: null,
          di_number_id: null,
          currency_id: null,
          job_no: "",
          so_number: null,
          delivery_to_at: null,
          location_text: null,

          stock_list:
            !isShippingAdvise && !isDeliveryLike
              ? buildCiplStockLinePayload(
                cargoItems.map((item) => ({
                  ...item,
                  details: null,
                  dg_un: null,
                  valueUsd: null,
                  quantity: null,
                  perUnit: null,
                  entries: [],
                })),
                isCiPlPerUnitTab
              )
              : [],
        })
      );
      if (updated?.id != null) setSiFormId(updated.id);
      setFormData((prev) => ({
        ...prev,
        vessel: "",
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
        currencyId: "",
        currencyName: "",
        totalPackedQuantity: 0,
        totalPackedWeight: 0,
      }));
      setQAgent("");
      setQCnee("");
      setQSi("");
      setQSic("");
      setQShipBy("");
      setQFrom("");
      setQTo("");
      const resetStockLinesSignature = JSON.stringify(
        buildCiplStockLinePayload(
          cargoItems.map((item) => ({
            ...item,
            details: null,
            dg_un: null,
            valueUsd: null,
            quantity: null,
            perUnit: null,
            entries: [],
          })),
          isCiPlPerUnitTab
        )
      );
      lastSubmittedCiplLinesRef.current = resetStockLinesSignature;
      lastSavedAutosaveRef.current = {
        header: {},
        cneeText: null,
        packed: {},
        stockLines: resetStockLinesSignature,
      };
      applySiFormResponse(updated);
      // Prevent immediate post-reset autosave loops from stale refs.
      headerUserEditedRef.current = false;
      consignBlockUserEditedRef.current = false;
      packedTotalsUserEditedRef.current = false;
      setRequiredAgentCneeId(null);
    } catch (e) {
      console.error("Failed to reset SI form:", e);
      showFormSaveError(toast, e, "Failed to reset form");
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
          : `ci-pl-${dateTag}.pdf`;
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
    const diNoLabel =
      diOptions.find((o) => Number(o.id) === Number(formData.diNo))?.name ||
      "";
    const selectedIdentifierLabel = formData.siNo
      ? ["SI NUMBER", siNoLabel || "-"]
      : formData.sicNo
        ? ["SIC NO", sicNoLabel || "-"]
        : formData.diNo
          ? ["DI NO", diNoLabel || "-"]
          : ["SI / SIC / DI", "-"];
    const isCiPlPdf = !isShippingAdvise && !isDeliveryConfirmation && !isDeliveryForm;
    const selectedIdentifierLabelForPdf =
      isCiPlPdf &&
        selectedIdentifierLabel[1] &&
        selectedIdentifierLabel[1] !== "-"
        ? ["Invoice No", selectedIdentifierLabel[1]]
        : selectedIdentifierLabel;
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

    const dgUnPdf = (item) => {
      const v = item?.dg_un ?? item?.dgUn;
      if (v != null && v !== false && String(v).trim() !== "") return String(v);
      return "-";
    };

    if (isCiPlPdf) {
      const pdfDate =
        formData.date != null && String(formData.date).trim() !== ""
          ? String(formData.date)
          : todayIso;
      const leftColWidth = 250;
      const gapBetweenCols = 16;
      const rightColWidth = 260;
      const ciPlTableWidth = leftColWidth + gapBetweenCols + rightColWidth;
      const ciPlLwhColWidth = 52;
      const buildCiPlPdfColumnStyles = () => {
        const lwh = ciPlLwhColWidth;
        const toStyles = (widths) => {
          const styles = {};
          widths.forEach(({ index, width, overflowLinebreak, halign, valign }) => {
            styles[index] = { cellWidth: width };
            if (overflowLinebreak) {
              styles[index].overflow = "linebreak";
            }
            if (halign) styles[index].halign = halign;
            styles[index].valign = valign ?? (overflowLinebreak ? "top" : "middle");
          });
          return styles;
        };
        if (isCiPlPerUnitTab) {
          const fixed = [
            { index: 0, width: 46, halign: "center", valign: "middle" },
            { index: 1, width: 28, halign: "center", valign: "middle" },
            { index: 2, width: 34, halign: "center", valign: "middle" },
            { index: 3, width: lwh, overflowLinebreak: true, halign: "center", valign: "middle" },
            { index: 5, width: 34, halign: "center", valign: "middle" },
            { index: 6, width: 38, halign: "center", valign: "middle" },
            { index: 7, width: 42, halign: "center", valign: "middle" },
          ];
          const fixedSum = fixed.reduce((sum, col) => sum + col.width, 0);
          return toStyles([
            ...fixed.slice(0, 4),
            { index: 4, width: ciPlTableWidth - fixedSum, overflowLinebreak: true },
            ...fixed.slice(4),
          ]);
        }
        if (isCiPlManifestTab) {
          const fixed = [
            { index: 0, width: 48, halign: "center", valign: "middle" },
            { index: 1, width: 56 },
            { index: 2, width: 26, halign: "center", valign: "middle" },
            { index: 3, width: 32, halign: "center", valign: "middle" },
            { index: 4, width: lwh, overflowLinebreak: true, halign: "center", valign: "middle" },
            { index: 6, width: 42, halign: "center", valign: "middle" },
          ];
          const fixedSum = fixed.reduce((sum, col) => sum + col.width, 0);
          return toStyles([
            ...fixed.slice(0, 5),
            { index: 5, width: ciPlTableWidth - fixedSum, overflowLinebreak: true },
            fixed[5],
          ]);
        }
        const fixed = [
          { index: 0, width: 48, halign: "center", valign: "middle" },
          { index: 1, width: 26, halign: "center", valign: "middle" },
          { index: 2, width: 32, halign: "center", valign: "middle" },
          { index: 3, width: lwh, overflowLinebreak: true, halign: "center", valign: "middle" },
          { index: 5, width: 42, halign: "center", valign: "middle" },
        ];
        const fixedSum = fixed.reduce((sum, col) => sum + col.width, 0);
        return toStyles([
          ...fixed.slice(0, 4),
          { index: 4, width: ciPlTableWidth - fixedSum, overflowLinebreak: true },
          fixed[4],
        ]);
      };
      const ciPlColumnStyles = buildCiPlPdfColumnStyles();
      const formatCiPlPdfText = (value) => {
        if (value == null || value === false) return "";
        return String(value).trim();
      };
      const formatCiPlPdfNumber = (value) => {
        const text = formatApiNumericDisplay(value);
        return text === "-" ? "" : text;
      };
      const formatCiPlPdfBoxes = formatCiPlPdfNumber;
      const formatCiPlPdfValue = (value) => {
        const text = formatCiPlValueDisplay(value);
        return text || "";
      };
      const formatCiPlPdfLwh = (value) => {
        const text = formatLwhWithLineBreaks(value);
        return text || "";
      };
      const ciPlPdfSpanCell = (content, rowSpan) => {
        const text =
          content != null && String(content).trim() !== "" ? String(content) : "-";
        if (rowSpan <= 1) return text;
        return { content: text, rowSpan, styles: { valign: "middle" } };
      };
      const buildCiPlPdfCargoRows = (items) => {
        const rows = [];
        (items || []).forEach((item) => {
          if (isCiPlManifestTab) {
            const descLines = getCiPlPdfMultiFieldLines(item?.details);
            const lineCount = Math.max(descLines.length, 1);
            const valueCell = formatCiPlPdfValue(item.valueUsd) || "-";
            const sharedCells = [
              ciPlPdfSpanCell(formatCiPlPdfText(item.poNumber), lineCount),
              ciPlPdfSpanCell(formatCiPlPdfText(item.supplier), lineCount),
              ciPlPdfSpanCell(formatCiPlPdfBoxes(item.boxesRaw ?? item.boxes), lineCount),
              ciPlPdfSpanCell(formatCiPlPdfNumber(item.kgRaw ?? item.kg), lineCount),
              ciPlPdfSpanCell(formatCiPlPdfLwh(item.lwh), lineCount),
            ];
            for (let i = 0; i < lineCount; i += 1) {
              const descCell = i < descLines.length ? descLines[i] : "-";
              if (i === 0) {
                rows.push([...sharedCells, descCell, ciPlPdfSpanCell(valueCell, lineCount)]);
              } else {
                rows.push([descCell]);
              }
            }
            return;
          }

          const entryRows = getCiplPdfEntryRows(item, isCiPlPerUnitTab);
          const lineCount = Math.max(entryRows.length, 1);
          const sharedCells = [
            ciPlPdfSpanCell(formatCiPlPdfText(item.poNumber), lineCount),
            ciPlPdfSpanCell(formatCiPlPdfBoxes(item.boxesRaw ?? item.boxes), lineCount),
            ciPlPdfSpanCell(formatCiPlPdfNumber(item.kgRaw ?? item.kg), lineCount),
            ciPlPdfSpanCell(formatCiPlPdfLwh(item.lwh), lineCount),
          ];
          entryRows.forEach((entryRow, i) => {
            const descCell = entryRow.description != null && String(entryRow.description).trim() !== ""
              ? String(entryRow.description)
              : "-";
            if (isCiPlPerUnitTab) {
              const trailingCells = [
                formatCiPlPdfText(entryRow.quantity),
                formatCiPlPdfText(entryRow.perUnit),
                formatCiPlPdfValue(entryRow.valueUsd),
              ];
              if (i === 0) {
                rows.push([...sharedCells, descCell, ...trailingCells]);
              } else {
                rows.push([descCell, ...trailingCells]);
              }
            } else if (i === 0) {
              rows.push([
                ...sharedCells,
                descCell,
                formatCiPlPdfValue(entryRow.valueUsd),
              ]);
            } else {
              rows.push([descCell, formatCiPlPdfValue(entryRow.valueUsd)]);
            }
          });
        });
        return rows;
      };
      const ciPlRows = buildCiPlPdfCargoRows(cargoItems);
      const ciPlTotalRow = isCiPlPerUnitTab
        ? [
          "TOTAL",
          formatApiNumericDisplay(stockListTableTotals.boxes),
          formatApiNumericDisplay(stockListTableTotals.weight),
          "",
          ciPlTotalDescriptionLabel,
          formatCiPlValueDisplay(stockListTableTotals.quantityPcs) || "-",
          "",
          formatCiPlTotalValueDisplay(stockListTableTotals.valueUsd),
        ]
        : isCiPlManifestTab
          ? [
            "TOTAL",
            "",
            formatApiNumericDisplay(stockListTableTotals.boxes),
            formatApiNumericDisplay(stockListTableTotals.weight),
            "",
            ciPlTotalDescriptionLabel,
            formatCiPlTotalValueDisplay(stockListTableTotals.valueUsd),
          ]
          : [
            "TOTAL",
            formatApiNumericDisplay(stockListTableTotals.boxes),
            formatApiNumericDisplay(stockListTableTotals.weight),
            "",
            ciPlTotalDescriptionLabel,
            formatCiPlTotalValueDisplay(stockListTableTotals.valueUsd),
          ];
      const ciPlPackedAsRow = isCiPlPerUnitTab
        ? [
          "PACKED AS",
          formatApiNumericDisplay(formData.totalPackedQuantity),
          formatApiNumericDisplay(formData.totalPackedWeight),
          "",
          "",
          "",
          "",
          "",
        ]
        : isCiPlManifestTab
          ? [
            "PACKED AS",
            "",
            formatApiNumericDisplay(formData.totalPackedQuantity),
            formatApiNumericDisplay(formData.totalPackedWeight),
            "",
            "",
            "",
          ]
          : [
            "PACKED AS",
            formatApiNumericDisplay(formData.totalPackedQuantity),
            formatApiNumericDisplay(formData.totalPackedWeight),
            "",
            "",
            "",
          ];
      const ciPlBody = [...ciPlRows, ciPlTotalRow, ciPlPackedAsRow];
      const ciPlTotalRowIndex = ciPlBody.length - 2;
      const ciPlPackedAsRowIndex = ciPlBody.length - 1;

      const docTitle = isCiPlManifestTab
        ? `Shipping Invoice / Cargo Manifest${formData.vessel ? ` - ${formData.vessel}` : ""}`
        : `Invoice / Packing List${formData.vessel ? ` - ${formData.vessel}` : ""}`;
      doc.setFontSize(20);
      doc.text(docTitle, pageWidth / 2, contentTop, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Date: ${pdfDate}`, contentLeft, contentTop + 14);

      const consignLines = String(formData.consignBlock || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      const twoColStartY = contentTop + 26;
      const rightColLeft = contentLeft + leftColWidth + gapBetweenCols;

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

      const summaryRows = [
        selectedIdentifierLabelForPdf,
        ["JOB NO", formData.jobNo || "-"],
        ["DATE", pdfDate],
      ];
      if (isCiPlPerUnitTab) {
        summaryRows.push(["PIC", picLabel || "-"]);
      }

      autoTable(doc, {
        startY: twoColStartY,
        head: [["", ""]],
        body: summaryRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [28, 74, 149], textColor: 255 },
        margin: { left: rightColLeft, right: 24 },
        tableWidth: rightColWidth,
      });
      const summaryTableEndY = doc.lastAutoTable?.finalY || twoColStartY;
      const twoColEndY = Math.max(consignTableEndY, summaryTableEndY);

      doc.setDrawColor(205, 215, 232);
      doc.setLineWidth(0.35);
      const sharedBoxHeight = Math.max(12, twoColEndY - consignTableTopY);
      doc.rect(contentLeft, consignTableTopY, leftColWidth, sharedBoxHeight);
      doc.rect(rightColLeft, consignTableTopY, rightColWidth, sharedBoxHeight);

      const ciPlDescriptionColIndex = isCiPlManifestTab ? 5 : 4;
      const ciPlLwhColIndex = isCiPlManifestTab ? 4 : 3;
      const ciPlBoxColIndex = isCiPlManifestTab ? 2 : 1;
      const ciPlWeightColIndex = isCiPlManifestTab ? 3 : 2;
      const ciPlPoColIndex = 0;
      const ciPlValueColIndex = isCiPlPerUnitTab ? 7 : isCiPlManifestTab ? 6 : 5;
      const ciPlQuantityColIndex = isCiPlPerUnitTab ? 5 : null;
      const ciPlPerUnitColIndex = isCiPlPerUnitTab ? 6 : null;
      const ciPlCenterColIndexes = [
        ciPlPoColIndex,
        ciPlBoxColIndex,
        ciPlWeightColIndex,
        ciPlLwhColIndex,
        ciPlValueColIndex,
        ...(isCiPlPerUnitTab ? [ciPlQuantityColIndex, ciPlPerUnitColIndex] : []),
      ];

      autoTable(doc, {
        startY: twoColEndY + 14,
        head: [isCiPlPerUnitTab
          ? ["PO#", "BOX", "WEIGHT", "LWH", "DESCRIPTION", "QUANTITY / PCS", "PER UNIT", valueInCurrencyLabel]
          : isCiPlManifestTab
            ? ["PO#", "SUPPLIER", "BOX", "WEIGHT", "LWH", "DESCRIPTION", valueInCurrencyLabel]
            : ["PO#", "BOX", "WEIGHT", "LWH", "DESCRIPTION", valueInCurrencyLabel]],
        body: ciPlBody,
        theme: "grid",
        tableWidth: ciPlTableWidth,
        styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: [230, 236, 247], textColor: [33, 51, 91] },
        columnStyles: ciPlColumnStyles,
        margin: {
          left: contentLeft,
          right: pageWidth - contentLeft - ciPlTableWidth,
          bottom: 24,
        },
        didParseCell: (hookData) => {
          if (hookData.column.index === ciPlDescriptionColIndex) {
            hookData.cell.styles.overflow = "linebreak";
            hookData.cell.styles.valign = "top";
          }
          if (ciPlCenterColIndexes.includes(hookData.column.index)) {
            hookData.cell.styles.halign = "center";
            hookData.cell.styles.valign = "middle";
            if (hookData.column.index === ciPlLwhColIndex) {
              hookData.cell.styles.overflow = "linebreak";
            }
          }
          if (hookData.section === "body" && hookData.row.index === ciPlTotalRowIndex) {
            hookData.cell.styles.fillColor = [237, 242, 247];
            hookData.cell.styles.fontStyle = "bold";
          }
          if (hookData.section === "body" && hookData.row.index === ciPlPackedAsRowIndex) {
            hookData.cell.styles.fillColor = [255, 245, 204];
            hookData.cell.styles.fontStyle = "bold";
          }
        },
      });

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
            ...(isCiPlForm
              ? [["CURRENCY", valueInCurrencyLabel.replace(/^VALUE IN /, "") || "-"]]
              : []),
          ];

    autoTable(doc, {
      startY: twoColStartY,
      head: [["", ""]],
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
        "Warehouse",
        "SUPPLIER",
        "PO",
        "DG/UN",
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
        dgUnPdf(item),
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
        "",
        String(totals.boxes ?? 0),
        Number(totals.kg || 0).toFixed(2),
        Number(totals.cbm || 0).toFixed(2),
        Number(formData.totalVw || 0).toFixed(2),
        "",
      ]);
    } else if (isDeliveryConfirmation) {
      cargoHead = [
        "STOKITEM ID",
        "Warehouse",
        "AWB",
        "FROM",
        "SUPLIER",
        "PO NUMBER",
        "DG/UN",
        "BOXES",
        "KG",
        "LWH",
      ];
      cargoRows = (cargoItems || []).map((item) => [
        item.stockItemId || "-",
        item.warehouseId || "-",
        item.awbNumber || formData.shippedBy || "-",
        item.origin || "-",
        item.supplier || "-",
        item.poNumber || "-",
        dgUnPdf(item),
        String(item.boxes ?? "-"),
        item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "-",
        item.lwh || "-",
      ]);
    } else if (isDeliveryForm) {
      cargoHead = [
        "STOKITEM ID",
        "AWB",
        "FROM",
        "Warehouse",
        "SUPLIER",
        "PO NUMBER",
        "DG/UN",
        "BOXES",
        "KG",
        "LWH",
      ];
      cargoRows = (cargoItems || []).map((item) => [
        item.stockItemId || "-",
        item.awbNumber || formData.shippedBy || "-",
        item.origin || "-",
        item.warehouseId || "-",
        item.supplier || "-",
        item.poNumber || "-",
        dgUnPdf(item),
        String(item.boxes ?? "-"),
        item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "-",
        item.lwh || "-",
      ]);
    } else {
      cargoHead = ["PO#", "BOX", "WEIGHT", "DG/UN", "DESCRIPTION", "VALUE IN USD"];
      cargoRows = (cargoItems || []).map((item) => [
        item.poNumber || "-",
        String(item.boxes ?? "-"),
        item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "-",
        dgUnPdf(item),
        formatCiPlDescriptionDisplay(item.details) || "-",
        formatCiPlValueDisplay(item.valueUsd) || "-",
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
        <Tabs
          variant="enclosed"
          colorScheme="orange"
          isLazy
          index={isCiPlArchivedView ? 0 : ciPlTabIndex}
          onChange={isCiPlArchivedView ? undefined : setCiPlTabIndex}
        >
          <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
            <TabList>
              <Tab fontWeight="semibold">Simple</Tab>
              {!isCiPlArchivedView ? <Tab fontWeight="semibold">Per unit</Tab> : null}
              {!isCiPlArchivedView ? (
                <Tab fontWeight="semibold" whiteSpace="nowrap">
                  Shipping invoice / Cargo Manifest
                </Tab>
              ) : null}
            </TabList>
            <HStack spacing={3}>
              {isCiPlArchivedView ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => history.push("/admin/forms/ci-pl/archived")}
                >
                  Back to Archived List
                </Button>
              ) : (
                <>
                  {isCiPlDraftTab ? (
                    <Button
                      leftIcon={<Icon as={MdArchive} />}
                      colorScheme="orange"
                      variant="outline"
                      size="sm"
                      isLoading={isSiFormLoading}
                      onClick={handleArchiveCiPlDraft}
                    >
                      Archive
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isSiFormLoading}
                    onClick={handleResetShippingInstruction}
                  >
                    Reset
                  </Button>
                </>
              )}
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

          {isCiPlArchivedView ? (
            <Text fontSize="sm" color="orange.600" fontWeight="semibold" mb={3}>
              Archived CI PL #{archivedFormId}
              {ciPlFormMeta.state ? ` (${ciPlFormMeta.state})` : ""}
              {ciPlFormMeta.archived_at
                ? ` — archived ${new Date(ciPlFormMeta.archived_at).toLocaleString()}`
                : ""}
              {formData.vessel ? ` — ${formData.vessel}` : ""}
            </Text>
          ) : null}

          <Text fontSize="2xl" fontWeight="bold" mb={6}>
            {isCiPlArchivedView
              ? `ARCHIVED INVOICE / PACKING LIST${formData.vessel ? ` FOR ${formData.vessel}` : ""}`
              : isCiPlManifestTab
                ? `SHIPPING INVOICE / CARGO MANIFEST${formData.vessel ? ` FOR ${formData.vessel}` : ""}`
                : isCiPlPerUnitTab
                  ? `INVOICE / PACKING LIST (PER UNIT)${formData.vessel ? ` FOR ${formData.vessel}` : ""}`
                  : `INVOICE / PACKING LIST${formData.vessel ? ` FOR ${formData.vessel}` : ""}`}
          </Text>

          <Grid templateColumns={`${isDeliveryLike ? "1fr" : "3fr 1fr"}`} gap={4} mb={6}>
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
                      rows={8}
                      placeholder="Write liaison details here..."
                      style={{
                        background: "#cdd0d3b5",
                        borderRadius: "6px",
                        padding: "15px",
                        minHeight: "255px",
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
                          <Text size="sm" fontWeight="semibold" color="white">
                            {formData.jobNo || "—"}
                          </Text>
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
                                      : { si_number_id: Number(v) }
                                  )
                                );
                                if (updated?.id != null) setSiFormId(updated.id);
                                applySiFormResponse(updated, {
                                  lockedSiId: v,
                                  lockedAgentId: formData.selectAgent,
                                });
                              } catch (e) {
                                console.error("Failed to load SI form by SI number:", e);
                                showFormSaveError(toast, e, "Failed to save form");
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
                                })
                              );
                              if (updated?.id != null) setSiFormId(updated.id);
                              applySiFormResponse(updated, {
                                lockedAgentId: formData.selectAgent,
                              });
                            } catch (e) {
                              console.error("Failed to load SI form by SIC number:", e);
                              showFormSaveError(toast, e, "Failed to save form");
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
                                })
                              );
                              if (updated?.id != null) setSiFormId(updated.id);
                              applySiFormResponse(updated, {
                                lockedAgentId: formData.selectAgent,
                              });
                            } catch (e) {
                              console.error("Failed to load SI form by DI number:", e);
                              showFormSaveError(toast, e, "Failed to save form");
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
                                showFormSaveError(toast, e, "Failed to save form");
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
                            <Text size="sm" fontWeight="medium" color="gray.800">
                              {formData.jobNo || "—"}
                            </Text>
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

                    {isCiPlForm && (
                      <FormControl display="contents">
                        <FormLabel
                          htmlFor="currency-ci-pl"
                          fontWeight="bold"
                          textTransform="uppercase"
                          m={0}
                        >
                          CURRENCY:
                        </FormLabel>
                        <SimpleSearchableSelect
                          id="currency-ci-pl"
                          value={formData.currencyId}
                          onChange={(val) => {
                            headerUserEditedRef.current = true;
                            const v = val ?? "";
                            handleInputChange("currencyId", v);
                            handleInputChange(
                              "currencyName",
                              v !== "" ? getOptionNameById(currencyOptions, v) : ""
                            );
                          }}
                          options={currencyOptions}
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
                          placeholder="Select currency..."
                          _placeholder={{ color: "whiteAlpha.800" }}
                          style={{ color: "white" }}
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
                        <DmyDateInput
                          id="date"
                          value={formData.date}
                          onChange={(nextValue) => {
                            headerUserEditedRef.current = true;
                            handleInputChange("date", nextValue);
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
                          {...getDeleteSelectProps("pic", handleDeletedPicOption)}
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
                                  showFormSaveError(toast, e, "Failed to save form");
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
                            {...getDeleteSelectProps("pic", handleDeletedPicOption)}
                          />
                        </FormControl>
                        <FormControl display="contents">
                          <FormLabel htmlFor="date-delivery" fontWeight="bold" textTransform="uppercase" m={0}>
                            DATE :
                          </FormLabel>
                          <DmyDateInput
                            id="date-delivery"
                            value={formData.date}
                            onChange={(nextValue) => {
                              headerUserEditedRef.current = true;
                              handleInputChange("date", nextValue);
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
                          <DmyDateInput
                            id="deadline-delivery"
                            value={formData.deadline}
                            onChange={(nextValue) => {
                              headerUserEditedRef.current = true;
                              handleInputChange("deadline", nextValue);
                            }}
                            size="sm"
                            fontWeight="semibold"
                            variant="unstyled"
                            bg="transparent"
                            color="white"
                          />
                        </FormControl>
                        <FormControl display="contents">
                          <FormLabel htmlFor="location-delivery" fontWeight="bold" textTransform="uppercase" m={0}>
                            LOCATION :
                          </FormLabel>
                          <DeletableOptionCombobox
                            id="location-delivery"
                            value={formData.to}
                            onChange={(nextVal) => {
                              headerUserEditedRef.current = true;
                              handleInputChange("to", nextVal);
                              handleInputChange("toId", getTextOptionIdByValue(toOptions, nextVal));
                              setQTo(nextVal);
                            }}
                            onSearchChange={setQTo}
                            options={toOptions}
                            isLoading={isOptionsLoading || isSiFormLoading}
                            size="sm"
                            fontWeight="semibold"
                            variant="unstyled"
                            bg="transparent"
                            color="white"
                            placeholder="Select or type location..."
                            _placeholder={{ color: "whiteAlpha.800" }}
                            {...getDeleteSelectProps("to", handleDeletedToOption)}
                          />
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
                    : "CARGO TO BE INCLUDED IN THIS INVOICE / PACKING LIST:"}
                </Text>
                <Box overflowX="auto">
                  <Table
                    variant="simple"
                    size="sm"
                    border="1px"
                    borderColor="gray.300"
                    tableLayout={!isDeliveryLike ? "fixed" : undefined}
                    w="100%"
                    minW={!isDeliveryLike ? (isCiPlPerUnitTab ? "1040px" : isCiPlManifestTab ? "980px" : "900px") : undefined}
                  >
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
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">Warehouse</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">AWB</Th>
                          </>
                        )}
                        {isDeliveryLike ? (
                          <>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">
                              FROM
                            </Th>
                            {!isDeliveryConfirmation && <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">Warehouse</Th>}
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">SUPPLIER</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">PO NUMBER</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">BOXES</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">KG</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" textAlign="center">LWH</Th>
                          </>
                        ) : (
                          <>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" w="8%" minW="72px" textAlign="center">PO#</Th>
                            {isCiPlManifestTab && (
                              <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" w="12%" minW="120px">SUPPLIER</Th>
                            )}
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" w="7%" minW="64px" textAlign="center">BOX</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" w="8%" minW="72px" textAlign="center">WEIGHT</Th>
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" w="12%" minW="112px" textAlign="center">LWH</Th>
                            <Th
                              borderRight="1px"
                              borderColor="gray.300"
                              py={2}
                              px={2}
                              fontSize="xs"
                              fontWeight="bold"
                              minW={isCiPlPerUnitTab ? "260px" : "280px"}
                              w={isCiPlPerUnitTab ? "28%" : "42%"}
                            >
                              DESCRIPTION
                            </Th>
                            {isCiPlPerUnitTab && (
                              <>
                                <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" w="11%" minW="100px" textAlign="center">QUANTITY / PCS</Th>
                                <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" w="11%" minW="100px" textAlign="center">PER UNIT</Th>
                              </>
                            )}
                            <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" w="10%" minW="96px" textAlign="center">{valueInCurrencyLabel}</Th>
                          </>
                        )}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {isCiPlEntriesTab
                        ? ciplEntryDisplayRows.map(({ item, itemIndex, entry, entryIndex, rowSpan }) => (
                          <Tr key={`${item.id}-${entry.localKey}`} bg={itemIndex % 2 === 0 ? "white" : "gray.50"}>
                            {entryIndex === 0 && (
                              <>
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center" rowSpan={rowSpan} verticalAlign="middle">{item.poNumber}</Td>
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center" rowSpan={rowSpan} verticalAlign="middle">{formatApiNumericDisplay(item.boxesRaw ?? item.boxes)}</Td>
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center" rowSpan={rowSpan} verticalAlign="middle">{formatApiNumericDisplay(item.kgRaw ?? item.kg)}</Td>
                                <Td
                                  borderRight="1px"
                                  borderColor="gray.300"
                                  py={2}
                                  px={2}
                                  fontSize="xs"
                                  w="12%"
                                  minW="112px"
                                  whiteSpace="pre-line"
                                  lineHeight="1.35"
                                  verticalAlign="middle"
                                  textAlign="center"
                                  rowSpan={rowSpan}
                                >
                                  {formatLwhWithLineBreaks(item.lwh)}
                                </Td>
                              </>
                            )}
                            <Td
                              borderRight="1px"
                              borderColor="gray.300"
                              py={1}
                              px={2}
                              fontSize="xs"
                              bg="#f1f3f5"
                              minW={isCiPlPerUnitTab ? "260px" : "280px"}
                              w={isCiPlPerUnitTab ? "28%" : "42%"}
                              verticalAlign="top"
                            >
                              <VStack align="stretch" spacing={1} w="100%">
                                <HStack align="flex-start" spacing={1}>
                                  <Textarea
                                    {...ciPlInlineFieldStyles}
                                    value={entry.description || ""}
                                    onChange={(e) => updateCargoItemEntry(itemIndex, entry.localKey, "description", e.target.value)}
                                    placeholder="Free text"
                                    rows={ciPlDescriptionTextareaRows(entry.description)}
                                    minH="unset"
                                  />
                                  <IconButton
                                    aria-label="Remove entry"
                                    icon={<Icon as={MdDelete} />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    flexShrink={0}
                                    mt={1}
                                    isDisabled={rowSpan <= 1}
                                    onClick={() => removeCargoItemEntry(itemIndex, entry.localKey)}
                                  />
                                </HStack>
                                {entryIndex === rowSpan - 1 && (
                                  <IconButton
                                    aria-label={isCiPlPerUnitTab ? "Add description row" : "Add description and value row"}
                                    icon={<Icon as={MdAdd} />}
                                    size="xs"
                                    variant="outline"
                                    alignSelf="flex-start"
                                    onClick={() => addCargoItemEntry(itemIndex)}
                                  />
                                )}
                              </VStack>
                            </Td>
                            {isCiPlPerUnitTab && (
                              <>
                                <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5" textAlign="center" verticalAlign="middle">
                                  <Input
                                    {...ciPlValueInputStyles}
                                    value={entry.quantity || ""}
                                    onChange={(e) => updateCargoItemEntry(itemIndex, entry.localKey, "quantity", e.target.value)}
                                    placeholder="Free text"
                                  />
                                </Td>
                                <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5" textAlign="center" verticalAlign="middle">
                                  <Input
                                    {...ciPlValueInputStyles}
                                    value={entry.perUnit || ""}
                                    onChange={(e) => updateCargoItemEntry(itemIndex, entry.localKey, "perUnit", e.target.value)}
                                    placeholder="Free text"
                                  />
                                </Td>
                              </>
                            )}
                            <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5" textAlign="center">
                              {isCiPlPerUnitTab ? (
                                <Text px={2} py={2} fontSize="xs" textAlign="center">
                                  {formatCiPlValueDisplay(getCiplEntryValueUsdForDisplay(entry, true)) || "-"}
                                </Text>
                              ) : (
                                <Input
                                  {...ciPlValueInputStyles}
                                  value={entry.valueUsd || ""}
                                  onChange={(e) => updateCargoItemEntry(itemIndex, entry.localKey, "valueUsd", e.target.value)}
                                  placeholder="Free text"
                                />
                              )}
                            </Td>
                          </Tr>
                        ))
                        : cargoItems.map((item, index) => (
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
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">{item.poNumber}</Td>
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{formatApiNumericDisplay(item.boxesRaw ?? item.boxes)}</Td>
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{formatApiNumericDisplay(item.kgRaw ?? item.kg)}</Td>
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">{item.lwh}</Td>
                              </>
                            ) : (
                              <>
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">{item.poNumber}</Td>
                                {isCiPlManifestTab && (
                                  <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.supplier || ""}</Td>
                                )}
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">{formatApiNumericDisplay(item.boxesRaw ?? item.boxes)}</Td>
                                <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">{formatApiNumericDisplay(item.kgRaw ?? item.kg)}</Td>
                                <Td
                                  borderRight="1px"
                                  borderColor="gray.300"
                                  py={2}
                                  px={2}
                                  fontSize="xs"
                                  w="12%"
                                  minW="112px"
                                  whiteSpace="pre-line"
                                  lineHeight="1.35"
                                  verticalAlign="middle"
                                  textAlign="center"
                                >
                                  {formatLwhWithLineBreaks(item.lwh)}
                                </Td>
                                <Td
                                  borderRight="1px"
                                  borderColor="gray.300"
                                  py={1}
                                  px={2}
                                  fontSize="xs"
                                  bg="#f1f3f5"
                                  minW={isCiPlPerUnitTab ? "260px" : "280px"}
                                  w={isCiPlPerUnitTab ? "28%" : "42%"}
                                  verticalAlign="top"
                                >
                                  {isCiPlManifestTab ? (
                                    <CiPlInlineMultiField
                                      value={item.details}
                                      onChange={(nextValue) => updateCargoItem(index, "details", nextValue)}
                                      placeholder="Free text"
                                      newLineDefault={CI_PL_MANIFEST_DEFAULT_DESCRIPTION}
                                    />
                                  ) : (
                                    <Input
                                      value={item.details || ""}
                                      onChange={(e) => updateCargoItem(index, "details", e.target.value)}
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
                                  )}
                                </Td>
                                {isCiPlPerUnitTab && (
                                  <>
                                    <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5" textAlign="center" verticalAlign="middle">
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
                                        textAlign="center"
                                      />
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5" textAlign="center" verticalAlign="middle">
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
                                        textAlign="center"
                                      />
                                    </Td>
                                  </>
                                )}
                                <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="#f1f3f5" textAlign="center">
                                  {isCiPlPerUnitTab ? (
                                    <Text px={2} py={2} fontSize="xs" textAlign="center">
                                      {getPerUnitLineValueUsd(item) || "-"}
                                    </Text>
                                  ) : isCiPlManifestTab ? (
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
                                      placeholder="Free text"
                                      textAlign="center"
                                    />
                                  ) : (
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
                                      textAlign="center"
                                    />
                                  )}
                                </Td>
                              </>
                            )}
                          </Tr>
                        ))}
                      {!isShippingAdvise && !isDeliveryLike && (
                        <Tr bg="gray.100" fontWeight="bold">
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">
                            TOTAL
                          </Td>
                          {isCiPlManifestTab && (
                            <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" />
                          )}
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">
                            {formatApiNumericDisplay(stockListTableTotals.boxes)}
                          </Td>
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">
                            {formatApiNumericDisplay(stockListTableTotals.weight)}
                          </Td>
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center" />
                          {isCiPlPerUnitTab ? (
                            <>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">
                                {ciPlTotalDescriptionLabel}
                              </Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">
                                {formatCiPlValueDisplay(stockListTableTotals.quantityPcs) || "-"}
                              </Td>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center" />
                            </>
                          ) : (
                            <Td
                              borderRight="1px"
                              borderColor="gray.300"
                              py={2}
                              px={2}
                              fontSize="xs"
                            >
                              {ciPlTotalDescriptionLabel}
                            </Td>
                          )}
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center">
                            {formatCiPlTotalValueDisplay(stockListTableTotals.valueUsd)}
                          </Td>
                        </Tr>
                      )}
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
                      {isCiPlForm && (
                        <Tr bg="gray.50">
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={4} fontSize="xs" fontWeight="bold">
                            PACKED AS:
                          </Td>
                          {isCiPlManifestTab && (
                            <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" />
                          )}
                          <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="orange.100" textAlign="center">
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
                              textAlign="center"
                            />
                          </Td>
                          <Td borderRight="1px" borderColor="gray.300" py={1} px={2} fontSize="xs" bg="orange.100" textAlign="center">
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
                              textAlign="center"
                            />
                          </Td>
                          <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" textAlign="center" />
                          {isCiPlPerUnitTab ? (
                            <>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" />
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" />
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" />
                              <Td py={2} px={2} fontSize="xs" />
                            </>
                          ) : (
                            <>
                              <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" />
                              <Td py={2} px={2} fontSize="xs" />
                            </>
                          )}
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
                            buildSavePayloadWithId(currentId, omitNullPayloadFields({
                              agent_id: v !== "" ? Number(v) : null,
                              agent_cnee_id: null,
                            }))
                          );
                          if (updated?.id != null) setSiFormId(updated.id);
                          applySiFormResponse(updated, { lockedConsigneeId: "" });
                        } catch (e) {
                          console.error("Failed to update SI form by agent:", e);
                          showFormSaveError(toast, e, "Failed to save form");
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
                          showFormSaveError(toast, e, "Failed to save form");
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
            Preview
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
      <Modal isOpen={isArchiveModalOpen} onClose={onArchiveModalClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>CI PL Archived</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text>
                The current form has been archived. A new empty draft is ready for the next entry.
              </Text>
              {archiveResponse?.archivedForm?.id != null ? (
                <Text fontSize="sm">
                  <strong>Archived record:</strong> ID #{archiveResponse.archivedForm.id}
                  {archiveResponse.archivedForm.state ? ` (${archiveResponse.archivedForm.state})` : ""}
                  {archiveResponse.archivedForm.archived_at
                    ? ` — archived at ${new Date(archiveResponse.archivedForm.archived_at).toLocaleString()}`
                    : ""}
                </Text>
              ) : null}
              {archiveResponse?.draftForm?.id != null ? (
                <Text fontSize="sm">
                  <strong>New draft:</strong> ID #{archiveResponse.draftForm.id}
                  {archiveResponse.draftForm.state ? ` (${archiveResponse.draftForm.state})` : ""}
                </Text>
              ) : null}
              <Box
                as="pre"
                p={3}
                bg="gray.50"
                borderRadius="md"
                fontSize="xs"
                overflowX="auto"
                maxH="320px"
                overflowY="auto"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
              >
                {JSON.stringify(archiveResponse?.raw ?? archiveResponse, null, 2)}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="orange" onClick={onArchiveModalClose}>
              Continue with new draft
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
