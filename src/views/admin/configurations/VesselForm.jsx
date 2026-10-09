import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdAttachFile,
  MdChevronLeft,
  MdClose,
  MdContentCopy,
  MdDelete,
  MdPrint,
  MdSave,
  MdTableChart,
  MdViewList,
  MdVisibility,
} from "react-icons/md";
import { useHistory, useLocation, useParams } from "react-router-dom";
import vesselsAPI from "../../../api/vessels";
import { refreshMasterData, MASTER_KEYS } from "../../../utils/masterDataCache";
import { useMasterData } from "../../../hooks/useMasterData";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";
import { CellWithAssignMenu } from "../../../components/forms/AssignToRowsBelowMenu";
import {
  VESSEL_TYPE_SELEC_OPTIONS,
  normalizeVesselTypeSelec,
} from "../../../constants/vesselTypeSelectOptions";

const VESSELS_LIST_PATH = "/admin/configurations/vessels";
const CONTROL_HEIGHT = "36px";
const VESSEL_FORM_LAYOUT_STORAGE_KEY = "narvi_vessel_form_layout";

function readStoredVesselFormLayout() {
  try {
    return localStorage.getItem(VESSEL_FORM_LAYOUT_STORAGE_KEY) === "list" ? "list" : "table";
  } catch {
    return "table";
  }
}

function cssQuotedContent(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function getAutoHtmlSize(value, placeholder = "", opts = {}) {
  const { min = 12, max = 80, padding = 2 } = opts || {};
  const valueLen = String(value ?? "").length;
  const placeholderLen = String(placeholder ?? "").length;
  const desired = Math.max(valueLen, placeholderLen) + padding;
  return Math.min(max, Math.max(min, desired));
}

function getAutoCols(value, placeholder = "", opts = {}) {
  const { min = 24, max = 90, padding = 2 } = opts || {};
  const text = String(value ?? "");
  const maxLineLen = text.split(/\r?\n/).reduce((acc, line) => Math.max(acc, line.length), 0);
  const placeholderLen = String(placeholder ?? "").length;
  const desired = Math.max(maxLineLen, placeholderLen) + padding;
  return Math.min(max, Math.max(min, desired));
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "tbn", label: "TBN" },
  { value: "new_building", label: "New Building" },
];

const EDITABLE_FIELDS = [
  "name",
  "client_id",
  "status",
  "imo",
  "vessel_type",
  "vessel_type_selec",
  "procurement_person_id",
  "procurement_email",
  "vessel_email",
  "team",
  "invoice_address",
];

const CLIENT_FIELDS = ["client_id", "client_name", "procurement_person_id", "procurement_person_name", "procurement_email"];
const PROCUREMENT_FIELDS = ["procurement_person_id", "procurement_person_name", "procurement_email"];

let rowKeySeed = 0;
const nextRowKey = () => {
  rowKeySeed += 1;
  return `vessel-row-${Date.now()}-${rowKeySeed}`;
};

const getEmptyRow = () => ({
  key: nextRowKey(),
  vessel_id: null,
  name: "",
  client_id: "",
  client_name: "",
  status: "active",
  imo: "",
  vessel_type: "",
  vessel_type_selec: "",
  procurement_person_id: "",
  procurement_person_name: "",
  procurement_email: "",
  vessel_email: "",
  team: "",
  invoice_address: "",
  attachments: [],
  attachment_to_delete: [],
});

const unwrapVesselResult = (result) =>
  result?.result && typeof result.result === "object" ? result.result : result || {};

const parseBulkIds = (search) => {
  const raw = new URLSearchParams(search).get("ids") || "";
  return raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
};

const toPeopleOptions = (people) =>
  (Array.isArray(people) ? people : [])
    .map((person) => ({
      id: person?.id,
      name: person?.name || `Person ${person?.id}`,
      email: person?.email && person.email !== false ? String(person.email) : "",
    }))
    .filter((person) => person.id);

const normalizeCompare = (value) =>
  value === null || value === undefined || value === false ? "" : String(value).trim();

const toVesselName = (value) =>
  value === null || value === undefined || value === false ? "" : String(value).toUpperCase();

const mapVesselToRow = (vesselInfo) => {
  const client = vesselInfo.client_id && typeof vesselInfo.client_id === "object" ? vesselInfo.client_id : null;
  const person =
    vesselInfo.procurement_person && typeof vesselInfo.procurement_person === "object"
      ? vesselInfo.procurement_person
      : null;
  const personEmail = person?.email && person.email !== false ? String(person.email) : "";
  return {
    ...getEmptyRow(),
    vessel_id: vesselInfo.id,
    name: vesselInfo.name || "",
    client_id: client ? String(client.id || "") : String(vesselInfo.client_id || ""),
    client_name: client?.name || vesselInfo.client_name || "",
    status: vesselInfo.status || "active",
    imo: vesselInfo.imo || "",
    vessel_type: vesselInfo.vessel_type || "",
    vessel_type_selec: normalizeVesselTypeSelec(vesselInfo.vessel_type_selec) || "",
    procurement_person_id: person ? String(person.id || "") : String(vesselInfo.procurement_person_id || ""),
    procurement_person_name: person?.name || "",
    procurement_email:
      personEmail ||
      (vesselInfo.procurement_email && vesselInfo.procurement_email !== false
        ? String(vesselInfo.procurement_email)
        : ""),
    vessel_email: vesselInfo.vessel_email || "",
    team: vesselInfo.team || "",
    invoice_address:
      vesselInfo.invoice_address && vesselInfo.invoice_address !== false
        ? String(vesselInfo.invoice_address)
        : "",
    attachments: Array.isArray(vesselInfo.attachments) ? vesselInfo.attachments : [],
    attachment_to_delete: [],
  };
};

const rowHasCreateContent = (row) =>
  ["name", "client_id", "imo", "vessel_type", "vessel_type_selec", "procurement_person_id", "vessel_email", "team", "invoice_address"]
    .some((field) => normalizeCompare(row[field]) !== "") ||
  row.status !== "active" ||
  row.attachments.length > 0;

export default function VesselForm() {
  const history = useHistory();
  const location = useLocation();
  const { id: routeVesselId } = useParams();
  const toast = useToast();

  const isBulk = location.pathname.endsWith("/bulk-edit");
  const isEdit = !isBulk && Boolean(routeVesselId);
  const isEditing = isBulk || isEdit;

  const editVesselIds = useMemo(() => {
    if (isBulk) return parseBulkIds(location.search);
    if (isEdit) return [Number(routeVesselId)].filter((id) => Number.isFinite(id) && id > 0);
    return [];
  }, [isBulk, isEdit, location.search, routeVesselId]);

  const [rows, setRows] = useState(() => (isEditing ? [] : [getEmptyRow()]));
  const [baselineById, setBaselineById] = useState({});
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [failedRowKey, setFailedRowKey] = useState(null);
  const [peopleByClient, setPeopleByClient] = useState({});
  const [vesselTypeSelecOptions, setVesselTypeSelecOptions] = useState(VESSEL_TYPE_SELEC_OPTIONS);
  const [previewFile, setPreviewFile] = useState(null);
  const [expandedFileRows, setExpandedFileRows] = useState({});
  const [formLayout, setFormLayout] = useState(readStoredVesselFormLayout);
  const requestedClientsRef = useRef(new Set());

  const textColor = useColorModeValue("gray.700", "white");
  const inputBg = useColorModeValue("gray.100", "gray.800");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cardBg = useColorModeValue("white", "navy.800");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerBg = useColorModeValue("gray.600", "gray.700");
  const headerBorder = useColorModeValue("gray.500", "gray.600");
  const readOnlyBg = useColorModeValue("gray.100", "gray.700");
  const failedRowBg = useColorModeValue("red.50", "red.900");

  const cellProps = {
    borderRight: "1px",
    borderColor: tableBorderColor,
    py: "8px",
    px: "8px",
    verticalAlign: "top",
  };
  const thProps = {
    bg: headerBg,
    color: "white",
    borderRight: "1px",
    borderColor: headerBorder,
    px: "8px",
    py: "12px",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
  };

  const handleFormLayoutChange = useCallback((layout) => {
    setFormLayout(layout);
    try {
      localStorage.setItem(VESSEL_FORM_LAYOUT_STORAGE_KEY, layout);
    } catch {
      // ignore storage errors
    }
  }, []);

  const vesselFormListSx = useMemo(() => {
    const labels = [
      "",
      "#",
      ...(isEditing ? ["ID"] : []),
      "Vessel Name *",
      "Client *",
      "Procurement Person",
      "Procurement Email",
      "Vessel Email",
      "Team",
      "IMO",
      "Vessel Type",
      "Vessel Type (Text)",
      "Status",
      "Invoice Address",
      "Files",
      "Actions",
    ];
    const labelRules = {};
    labels.forEach((label, index) => {
      labelRules[`tbody td:nth-of-type(${index + 1})::before`] = {
        content: cssQuotedContent(label),
        textTransform: "uppercase",
      };
    });
    return {
      display: "block !important",
      minW: "100% !important",
      width: "100%",
      thead: { display: "none !important" },
      tbody: {
        display: "flex !important",
        flexDirection: "column",
        gap: "16px",
        bg: "transparent",
      },
      "tbody tr": {
        display: "grid !important",
        gridTemplateColumns: {
          base: "1fr",
          md: "repeat(2, minmax(0, 1fr))",
          xl: "repeat(3, minmax(0, 1fr))",
        },
        gap: "12px 16px",
        p: "16px",
        bg: cardBg,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: tableBorderColor,
        borderRadius: "12px",
        boxShadow: "sm",
      },
      "tbody td": {
        display: "flex !important",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        minW: "0 !important",
        maxW: "none !important",
        w: "100%",
        border: "0 !important",
        px: "0 !important",
        py: "4px !important",
        "&::before": {
          display: "block",
          mb: "6px",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.04em",
          color: "gray.500",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
        "& input, & textarea, & select, & .chakra-select__wrapper": {
          width: "100% !important",
          maxWidth: "100% !important",
        },
      },
      "tbody td:nth-of-type(1)": {
        gridColumn: "1 / -1 !important",
        order: -1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        pb: "10px !important",
        mb: "4px",
        borderBottomWidth: "1px !important",
        borderBottomStyle: "solid",
        borderBottomColor: tableBorderColor,
      },
      "tbody td:nth-of-type(1)::before": {
        display: "none !important",
      },
      "tbody td:nth-of-type(2)": {
        display: "none !important",
      },
      "tbody td:nth-last-of-type(1)": {
        display: "none !important",
      },
      ...labelRules,
    };
  }, [cardBg, isEditing, tableBorderColor]);

  const { clients } = useMasterData();
  const clientOptions = useMemo(() => {
    const source = Array.isArray(clients) ? clients : [];
    return source.filter((client) => {
      const hasCompanyMarker =
        client?.is_company !== undefined ||
        client?.company_type !== undefined ||
        client?.partner_type !== undefined;
      const isCompany =
        client?.is_company === true ||
        client?.company_type === "company" ||
        client?.partner_type === "company";
      const isTopLevel =
        client?.parent_id == null ||
        client?.parent_id === false ||
        client?.parent_id === 0 ||
        client?.parent_id === "";
      return hasCompanyMarker ? isCompany && isTopLevel : true;
    });
  }, [clients]);

  useEffect(() => {
    let cancelled = false;
    vesselsAPI
      .getVessels({ page: 1, page_size: 1 })
      .then((response) => {
        if (cancelled) return;
        const options = Array.isArray(response?.vessel_type_selec_options)
          ? response.vessel_type_selec_options.filter(
            (option) => option?.value != null && String(option.value).trim() !== ""
          )
          : [];
        if (options.length) setVesselTypeSelecOptions(options);
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, []);

  const ensurePeopleForClient = useCallback(async (clientId) => {
    const key = String(clientId || "");
    if (!key || requestedClientsRef.current.has(key)) return;
    requestedClientsRef.current.add(key);
    try {
      const response = await vesselsAPI.getVessels({ page: 1, page_size: 80, client_id: key });
      const peopleMap = new Map();
      (Array.isArray(response?.vessels) ? response.vessels : []).forEach((vesselItem) => {
        toPeopleOptions(vesselItem?.procurement_people).forEach((person) => {
          if (!peopleMap.has(String(person.id))) peopleMap.set(String(person.id), person);
        });
      });
      setPeopleByClient((prev) => ({ ...prev, [key]: Array.from(peopleMap.values()) }));
    } catch (_error) {
      requestedClientsRef.current.delete(key);
    }
  }, []);

  useEffect(() => {
    if (!isEditing) return undefined;
    if (!editVesselIds.length) {
      setIsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled(editVesselIds.map((id) => vesselsAPI.getVessel(id)))
      .then((results) => {
        if (cancelled) return;
        const loadedRows = [];
        const seededPeople = {};
        const failedIds = [];
        results.forEach((result, index) => {
          const vesselData = result.status === "fulfilled" ? result.value : null;
          const vesselInfo =
            vesselData?.vessel || vesselData?.result?.vessel || vesselData?.result || vesselData;
          if (!vesselInfo?.id) {
            failedIds.push(editVesselIds[index]);
            return;
          }
          const row = mapVesselToRow(vesselInfo);
          loadedRows.push(row);
          const people = toPeopleOptions(vesselInfo.procurement_people);
          if (row.client_id && people.length && !seededPeople[row.client_id]) {
            seededPeople[row.client_id] = people;
          }
        });
        Object.keys(seededPeople).forEach((clientId) => requestedClientsRef.current.add(clientId));
        setPeopleByClient((prev) => ({ ...prev, ...seededPeople }));
        setBaselineById(
          loadedRows.reduce((acc, row) => ({ ...acc, [row.vessel_id]: row }), {})
        );
        setRows(loadedRows);
        if (failedIds.length) {
          toast({
            title: "Some vessels could not be loaded",
            description: `Vessel ID(s): ${failedIds.join(", ")}`,
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editVesselIds, isEditing, toast]);

  const getPeopleOptions = (row) => {
    const options = peopleByClient[String(row.client_id || "")] || [];
    if (
      row.procurement_person_id &&
      !options.some((person) => String(person.id) === String(row.procurement_person_id))
    ) {
      return [
        {
          id: row.procurement_person_id,
          name: row.procurement_person_name || `Person ${row.procurement_person_id}`,
          email: row.procurement_email || "",
        },
        ...options,
      ];
    }
    return options;
  };

  const updateRow = (rowIndex, patch) => {
    setFailedRowKey(null);
    setRows((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, ...patch } : row)));
  };

  const handleInputChange = (rowIndex, field, value) => {
    if (field === "client_id") {
      const client = clientOptions.find((option) => String(option.id) === String(value));
      updateRow(rowIndex, {
        client_id: value ? String(value) : "",
        client_name: client?.name || client?.company_name || "",
        procurement_person_id: "",
        procurement_person_name: "",
        procurement_email: "",
      });
      if (value) ensurePeopleForClient(value);
      return;
    }
    if (field === "procurement_person_id") {
      const person = getPeopleOptions(rows[rowIndex]).find((p) => String(p.id) === String(value));
      updateRow(rowIndex, {
        procurement_person_id: value || "",
        procurement_person_name: person?.name || "",
        procurement_email: person?.email || "",
      });
      return;
    }
    const isNewVessel = !rows[rowIndex]?.vessel_id;
    updateRow(rowIndex, {
      [field]: field === "name" && isNewVessel ? toVesselName(value) : value,
    });
  };

  const copyValueToRowsBelow = (rowIndex, fields, copyToAll = false) => {
    const fieldList = Array.isArray(fields) ? fields : [fields];
    setFailedRowKey(null);
    setRows((prev) => {
      const newRows = [...prev];
      const sourceValues = {};
      fieldList.forEach((field) => {
        sourceValues[field] = newRows[rowIndex][field];
      });
      const applyCopy = (targetIndex) => {
        newRows[targetIndex] = { ...newRows[targetIndex], ...sourceValues };
      };
      if (copyToAll) {
        for (let i = rowIndex + 1; i < newRows.length; i++) applyCopy(i);
      } else if (rowIndex + 1 < newRows.length) {
        applyCopy(rowIndex + 1);
      }
      return newRows;
    });
  };

  const assignCell = (rowIndex, fields, children) => (
    <CellWithAssignMenu
      rowIndex={rowIndex}
      fields={fields}
      onCopy={copyValueToRowsBelow}
      totalRows={rows.length}
    >
      {children}
    </CellWithAssignMenu>
  );

  const handleAddRow = () => {
    setRows((prev) => [...prev, getEmptyRow()]);
  };

  const handleCopyRow = (rowIndex) => {
    setRows((prev) => {
      const source = prev[rowIndex];
      const copy = {
        ...source,
        key: nextRowKey(),
        vessel_id: null,
        name: toVesselName(source.name),
        attachments: source.attachments
          .filter((attachment) => !attachment.id)
          .map((attachment) => ({ ...attachment })),
        attachment_to_delete: [],
      };
      const newRows = [...prev];
      newRows.splice(rowIndex + 1, 0, copy);
      return newRows;
    });
  };

  const handleRemoveRow = (rowIndex) => {
    if (rows.length <= 1) {
      toast({
        title: "Warning",
        description: "At least one row is required",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setRows((prev) => prev.filter((_, index) => index !== rowIndex));
  };

  const getRowChanges = useCallback(
    (row) => {
      const baseline = baselineById[row.vessel_id];
      if (!baseline) return null;
      const changes = {};
      EDITABLE_FIELDS.forEach((field) => {
        if (normalizeCompare(row[field]) !== normalizeCompare(baseline[field])) {
          changes[field] = row[field];
        }
      });
      if (changes.procurement_person_id !== undefined) {
        changes.procurement_email = row.procurement_email;
      }
      const newAttachments = row.attachments.filter((attachment) => !attachment.id);
      if (newAttachments.length) changes.attachments = newAttachments;
      if (row.attachment_to_delete.length) changes.attachment_to_delete = row.attachment_to_delete;
      return Object.keys(changes).length ? changes : null;
    },
    [baselineById]
  );

  const isDirty = useMemo(
    () =>
      isEditing
        ? rows.some((row) => (row.vessel_id ? getRowChanges(row) : rowHasCreateContent(row)))
        : rows.some(rowHasCreateContent),
    [getRowChanges, isEditing, rows]
  );

  const getRowErrors = (row) => {
    const errors = {};
    if (!normalizeCompare(row.name)) errors.name = "Vessel name";
    if (!row.vessel_id && !row.client_id) errors.client_id = "Client";
    return errors;
  };

  const goBackToList = (refresh = false) => {
    if (refresh) refreshMasterData(MASTER_KEYS.VESSELS).catch(() => { });
    history.push(VESSELS_LIST_PATH);
  };

  const handleBack = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Leave this page and lose them?")) return;
    goBackToList();
  };

  const handleDiscard = () => {
    if (isEditing) {
      handleBack();
      return;
    }
    if (isDirty && !window.confirm("Clear all rows?")) return;
    setShowErrors(false);
    setFailedRowKey(null);
    setRows([getEmptyRow()]);
  };

  const reportSaveError = (data, submittedRows) => {
    const failedRow =
      (data?.vessel_id != null &&
        submittedRows.find((row) => String(row.vessel_id) === String(data.vessel_id))) ||
      (Number.isInteger(data?.index) ? submittedRows[data.index] : null);
    const rowLabel = failedRow
      ? `Row ${rows.indexOf(failedRow) + 1}${failedRow.name ? ` (${failedRow.name})` : ""}: `
      : "";
    if (failedRow) setFailedRowKey(failedRow.key);
    toast({
      title: "Nothing was saved",
      description: `${rowLabel}${data?.message || "Failed to save vessels"}`,
      status: "error",
      duration: 7000,
      isClosable: true,
    });
  };

  const handleSave = async () => {
    setShowErrors(true);
    const invalidIndex = rows.findIndex((row) => Object.keys(getRowErrors(row)).length > 0);
    if (invalidIndex !== -1) {
      const missing = Object.values(getRowErrors(rows[invalidIndex])).join(" and ");
      toast({
        title: "Missing required fields",
        description: `Row ${invalidIndex + 1}: ${missing} is required.`,
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setFailedRowKey(null);
    const submittedRows = [];
    setIsSaving(true);
    try {
      let response;
      if (isEditing) {
        const items = [];
        const createRows = [];
        rows.forEach((row) => {
          if (row.vessel_id) {
            const changes = getRowChanges(row);
            if (!changes) return;
            items.push({ vessel_id: row.vessel_id, ...changes });
            submittedRows.push(row);
            return;
          }
          if (rowHasCreateContent(row) || normalizeCompare(row.name)) {
            createRows.push(row);
            submittedRows.push(row);
          }
        });
        if (!items.length && !createRows.length) {
          toast({
            title: "No changes to save",
            status: "info",
            duration: 2500,
            isClosable: true,
          });
          return;
        }
        if (items.length) {
          response = await vesselsAPI.bulkUpdateVesselItems(items);
          const updateData = unwrapVesselResult(response?.result);
          if (updateData.status === "error") {
            reportSaveError(updateData, submittedRows);
            return;
          }
        }
        if (createRows.length) {
          response = await vesselsAPI.bulkCreateVessels(createRows);
        }
      } else {
        submittedRows.push(...rows);
        response = await vesselsAPI.bulkCreateVessels(rows);
      }

      const data = unwrapVesselResult(response?.result);
      if (data.status === "error") {
        reportSaveError(data, submittedRows);
        return;
      }
      toast({
        title: isEditing ? "Vessels updated" : "Vessels created",
        description: data.message || `${submittedRows.length} vessel(s) have been saved.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      goBackToList(true);
    } catch (error) {
      const data = unwrapVesselResult(error?.response?.data);
      reportSaveError({ ...data, message: data?.message || error?.message }, submittedRows);
    } finally {
      setIsSaving(false);
    }
  };

  const handleView = (file) => {
    let fileUrl = null;
    if (file instanceof File || file instanceof Blob) {
      fileUrl = URL.createObjectURL(file);
    } else if (file.url) {
      fileUrl = file.url;
    } else if (file.datas) {
      fileUrl = `data:${file.mimetype || "application/octet-stream"};base64,${file.datas}`;
    } else if (file.path) {
      fileUrl = file.path;
    }
    const fileType =
      file.mimetype || file.type || file.filename?.split(".").pop() || "application/octet-stream";
    if (fileUrl) setPreviewFile({ ...file, fileUrl, fileType });
  };

  const handleFileUpload = (rowIndex, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const filePromises = files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result || "";
            const base64data =
              typeof result === "string" && result.includes(",") ? result.split(",")[1] : "";
            resolve({ filename: file.name, datas: base64data, mimetype: file.type });
          };
          reader.readAsDataURL(file);
        })
    );
    Promise.all(filePromises).then((attachments) => {
      setRows((prev) =>
        prev.map((row, index) =>
          index === rowIndex ? { ...row, attachments: [...row.attachments, ...attachments] } : row
        )
      );
    });
  };

  const handleRemoveAttachment = (rowIndex, attachmentIndex) => {
    setRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row;
        const attachment = row.attachments[attachmentIndex];
        return {
          ...row,
          attachments: row.attachments.filter((_, i) => i !== attachmentIndex),
          attachment_to_delete: attachment?.id
            ? [...row.attachment_to_delete, attachment.id]
            : row.attachment_to_delete,
        };
      })
    );
  };

  const title = isBulk
    ? `Bulk Edit Vessels (${rows.length})`
    : isEdit
      ? "Edit Vessel"
      : "Create New Vessel";
  const saveLabel = isBulk
    ? `Update All (${rows.length} vessels)`
    : isEdit
      ? "Update Vessel"
      : `Save ${rows.length} Vessel(s)`;

  if (isLoading) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
        <Flex justify="center" align="center" h="200px">
          <VStack spacing="4">
            <Spinner size="xl" color="#1c4a95" />
            <Text>Loading vessel{editVesselIds.length > 1 ? "s" : ""}...</Text>
          </VStack>
        </Flex>
      </Box>
    );
  }

  if (isEditing && !rows.length) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="25px">
        <Text mb={4}>No vessels to edit.</Text>
        <Button leftIcon={<Icon as={MdChevronLeft} />} onClick={() => goBackToList()}>
          Back to vessels
        </Button>
      </Box>
    );
  }

  const controlSize = {
    size: "sm",
    fontSize: "sm",
    borderRadius: "md",
    w: "auto",
    sx: { height: CONTROL_HEIGHT, minHeight: CONTROL_HEIGHT },
  };
  const inputProps = { ...controlSize, bg: inputBg, color: inputText, borderColor };
  const readOnlyProps = { ...controlSize, isReadOnly: true, bg: readOnlyBg, color: inputText, borderColor };
  const autoSelectSx = (label, placeholder = "", opts = { min: 16, max: 50 }) => ({
    height: CONTROL_HEIGHT,
    minHeight: CONTROL_HEIGHT,
    width: "auto",
    minWidth: `${getAutoHtmlSize(label, placeholder, opts)}ch`,
  });

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative">
      <Flex
        bg={cardBg}
        px={{ base: "4", md: "6" }}
        py="3"
        align="center"
        gap="3"
        borderBottom="1px"
        borderColor={borderColor}
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr auto 1fr" }}
      >
        <HStack spacing="4">
          <IconButton
            icon={<Icon as={MdChevronLeft} />}
            size="sm"
            variant="ghost"
            aria-label="Back"
            onClick={handleBack}
          />
          <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
            {title}
          </Text>
        </HStack>

        <HStack spacing="2" justifySelf="center">
          <Button
            size="sm"
            leftIcon={<Icon as={MdTableChart} />}
            onClick={() => handleFormLayoutChange("table")}
            colorScheme={formLayout === "table" ? "blue" : "gray"}
            variant={formLayout === "table" ? "solid" : "outline"}
            aria-pressed={formLayout === "table"}
          >
            Table view
          </Button>
          <Button
            size="sm"
            leftIcon={<Icon as={MdViewList} />}
            onClick={() => handleFormLayoutChange("list")}
            colorScheme={formLayout === "list" ? "blue" : "gray"}
            variant={formLayout === "list" ? "solid" : "outline"}
            aria-pressed={formLayout === "list"}
          >
            Form view
          </Button>
        </HStack>

        <HStack spacing="3" flexWrap="wrap" justify="flex-end">
          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="blue"
            size="sm"
            onClick={handleAddRow}
          >
            Add Row
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscard}
          >
            Discard
          </Button>
          <Button
            leftIcon={<Icon as={MdSave} />}
            colorScheme={isEdit || isBulk ? "green" : "blue"}
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            loadingText={isEdit || isBulk ? "Updating..." : "Creating..."}
          >
            {saveLabel}
          </Button>
        </HStack>
      </Flex>

      <Box
        bg={formLayout === "list" ? "transparent" : cardBg}
        p={{ base: "4", md: "6" }}
        overflowX={formLayout === "table" ? "auto" : "hidden"}
      >
        {rows.length > 1 && (
          <Text fontSize="sm" color="gray.500" mb={3}>
            Use the ⋮ button next to a value to copy it to the row below or to all rows below.
            If any row fails, nothing is saved.
          </Text>
        )}
        <Card
          w="100%"
          p="0"
          overflow={formLayout === "table" ? "hidden" : "visible"}
          bg={formLayout === "list" ? "transparent" : undefined}
          boxShadow={formLayout === "list" ? "none" : undefined}
        >
          <Box
            maxH="70vh"
            overflowY="auto"
            overflowX={formLayout === "table" ? "auto" : "hidden"}
            px={formLayout === "list" ? { base: "1", md: "2" } : undefined}
            py={formLayout === "list" ? "1" : undefined}
          >
            <Table
              variant={formLayout === "table" ? "striped" : "simple"}
              size="sm"
              colorScheme="gray"
              minW={formLayout === "table" ? "2600px" : "100%"}
              sx={formLayout === "list" ? vesselFormListSx : undefined}
            >
              <Thead position="sticky" top={0} zIndex={2}>
                <Tr>
                  <Th {...thProps} minW="50px">#</Th>
                  {isEditing && <Th {...thProps} minW="80px">ID</Th>}
                  <Th {...thProps} minW="220px">Vessel Name *</Th>
                  <Th {...thProps} minW="260px">Client *</Th>
                  <Th {...thProps} minW="220px">Procurement Person</Th>
                  <Th {...thProps} minW="200px">Procurement Email</Th>
                  <Th {...thProps} minW="200px">Vessel Email</Th>
                  <Th {...thProps} minW="170px">Team</Th>
                  <Th {...thProps} minW="140px">IMO</Th>
                  <Th {...thProps} minW="200px">Vessel Type</Th>
                  <Th {...thProps} minW="200px">Vessel Type (Text)</Th>
                  <Th {...thProps} minW="170px">Status</Th>
                  <Th {...thProps} minW="260px">Invoice Address</Th>
                  <Th {...thProps} minW="220px">Files</Th>
                  <Th {...thProps} minW="100px" borderRight="none">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, rowIndex) => {
                  const rowErrors = showErrors ? getRowErrors(row) : {};
                  const peopleOptions = getPeopleOptions(row);
                  const isFailed = failedRowKey === row.key;
                  const failedCell = isFailed ? { bg: failedRowBg } : {};
                  return (
                    <Tr key={row.key}>
                      {formLayout === "list" && (
                        <Td>
                          <Flex
                            w="100%"
                            align="center"
                            justify="space-between"
                            gap="3"
                            flexWrap="wrap"
                          >
                            <Text fontSize="sm" fontWeight="700" color={textColor}>
                              {`Item ${rowIndex + 1}${rows.length > 1 ? ` of ${rows.length}` : ""}`}
                              {row.name ? ` · ${row.name}` : row.vessel_id ? ` · ${row.vessel_id}` : ""}
                            </Text>
                            <HStack spacing="2">
                              <IconButton
                                icon={<Icon as={MdContentCopy} />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                onClick={() => handleCopyRow(rowIndex)}
                                aria-label="Copy row"
                                title="Copy/Repeat row"
                              />
                              <IconButton
                                icon={<Icon as={isEditing ? MdClose : MdDelete} />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => handleRemoveRow(rowIndex)}
                                aria-label={isEditing ? "Remove from this edit" : "Delete row"}
                                title={isEditing ? "Remove from this edit (the vessel is not deleted)" : "Delete row"}
                                isDisabled={rows.length === 1}
                              />
                            </HStack>
                          </Flex>
                        </Td>
                      )}
                      <Td {...cellProps} {...failedCell}>
                        <Text fontSize="sm" color="gray.500">{rowIndex + 1}</Text>
                      </Td>
                      {isEditing && (
                        <Td {...cellProps} {...failedCell}>
                          <Input
                            {...readOnlyProps}
                            value={row.vessel_id || ""}
                            htmlSize={getAutoHtmlSize(row.vessel_id, "", { min: 8, max: 16 })}
                            title={row.vessel_id ? String(row.vessel_id) : undefined}
                          />
                        </Td>
                      )}
                      <Td {...cellProps} {...failedCell}>
                        <Input
                          {...inputProps}
                          value={row.name}
                          onChange={(e) => handleInputChange(rowIndex, "name", e.target.value)}
                          placeholder={row.vessel_id ? "Vessel name" : "VESSEL NAME"}
                          textTransform={row.vessel_id ? undefined : "uppercase"}
                          isInvalid={Boolean(rowErrors.name)}
                          htmlSize={getAutoHtmlSize(row.name, "Vessel name", { min: 16, max: 50 })}
                          title={row.name ? String(row.name) : undefined}
                        />
                      </Td>
                      <Td {...cellProps} {...failedCell} overflow="visible" position="relative">
                        {assignCell(rowIndex, CLIENT_FIELDS,
                          <Box
                            borderRadius="md"
                            border={rowErrors.client_id ? "1px solid" : "none"}
                            borderColor="red.400"
                          >
                            <SimpleSearchableSelect
                              value={row.client_id}
                              onChange={(value) => handleInputChange(rowIndex, "client_id", value)}
                              options={clientOptions}
                              placeholder="Select client"
                              displayKey="name"
                              valueKey="id"
                              formatOption={(c) => c.name || c.company_name || `Client ${c.id}`}
                              fallbackDisplay={row.client_name}
                              autoWidth
                              autoWidthMin={18}
                              autoWidthMax={50}
                              {...inputProps}
                            />
                          </Box>
                        )}
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        {assignCell(rowIndex, PROCUREMENT_FIELDS,
                          (() => {
                            const personPlaceholder = row.client_id ? "Select person" : "Select client first";
                            const personLabel =
                              peopleOptions.find((person) => String(person.id) === String(row.procurement_person_id))?.name
                              || personPlaceholder;
                            return (
                          <Select
                            {...inputProps}
                            value={row.procurement_person_id}
                            onChange={(e) => handleInputChange(rowIndex, "procurement_person_id", e.target.value)}
                            placeholder={personPlaceholder}
                            isDisabled={!row.client_id}
                            sx={autoSelectSx(personLabel, personPlaceholder, { min: 16, max: 50 })}
                            title={personLabel}
                          >
                            {peopleOptions.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.name}
                              </option>
                            ))}
                          </Select>
                            );
                          })()
                        )}
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        <Input
                          {...readOnlyProps}
                          value={row.procurement_email}
                          placeholder="Auto-filled"
                          htmlSize={getAutoHtmlSize(row.procurement_email, "Auto-filled", { min: 18, max: 50 })}
                          title={row.procurement_email ? String(row.procurement_email) : undefined}
                        />
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        {assignCell(rowIndex, "vessel_email",
                          <Input
                            {...inputProps}
                            value={row.vessel_email}
                            onChange={(e) => handleInputChange(rowIndex, "vessel_email", e.target.value)}
                            placeholder="Vessel email"
                            htmlSize={getAutoHtmlSize(row.vessel_email, "Vessel email", { min: 18, max: 50 })}
                            title={row.vessel_email ? String(row.vessel_email) : undefined}
                          />
                        )}
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        {assignCell(rowIndex, "team",
                          <Input
                            {...inputProps}
                            value={row.team}
                            onChange={(e) => handleInputChange(rowIndex, "team", e.target.value)}
                            placeholder="Team"
                            htmlSize={getAutoHtmlSize(row.team, "Team", { min: 12, max: 40 })}
                            title={row.team ? String(row.team) : undefined}
                          />
                        )}
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        <Input
                          {...inputProps}
                          value={row.imo}
                          onChange={(e) => handleInputChange(rowIndex, "imo", e.target.value)}
                          placeholder="IMO number"
                          htmlSize={getAutoHtmlSize(row.imo, "IMO number", { min: 12, max: 24 })}
                          title={row.imo ? String(row.imo) : undefined}
                        />
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        {assignCell(rowIndex, "vessel_type_selec",
                          (() => {
                            const typePlaceholder = "Select vessel type";
                            const typeLabel =
                              vesselTypeSelecOptions.find((option) => String(option.value) === String(row.vessel_type_selec))?.label
                              || typePlaceholder;
                            return (
                          <Select
                            {...inputProps}
                            value={row.vessel_type_selec}
                            onChange={(e) => handleInputChange(rowIndex, "vessel_type_selec", e.target.value)}
                            sx={autoSelectSx(typeLabel, typePlaceholder, { min: 16, max: 40 })}
                            title={typeLabel}
                          >
                            <option value="">Select vessel type</option>
                            {vesselTypeSelecOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                            );
                          })()
                        )}
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        {assignCell(rowIndex, "vessel_type",
                          <Input
                            {...inputProps}
                            value={row.vessel_type}
                            onChange={(e) => handleInputChange(rowIndex, "vessel_type", e.target.value)}
                            placeholder="Additional type text"
                            htmlSize={getAutoHtmlSize(row.vessel_type, "Additional type text", { min: 16, max: 50 })}
                            title={row.vessel_type ? String(row.vessel_type) : undefined}
                          />
                        )}
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        {assignCell(rowIndex, "status",
                          (() => {
                            const statusLabel =
                              STATUS_OPTIONS.find((option) => option.value === row.status)?.label || row.status || "Status";
                            return (
                          <Select
                            {...inputProps}
                            value={row.status}
                            onChange={(e) => handleInputChange(rowIndex, "status", e.target.value)}
                            sx={autoSelectSx(statusLabel, "Status", { min: 12, max: 24 })}
                            title={statusLabel}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                            );
                          })()
                        )}
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        {assignCell(rowIndex, "invoice_address",
                          <Textarea
                            size="sm"
                            fontSize="sm"
                            borderRadius="md"
                            bg={inputBg}
                            color={inputText}
                            borderColor={borderColor}
                            value={row.invoice_address}
                            onChange={(e) => handleInputChange(rowIndex, "invoice_address", e.target.value)}
                            placeholder="Invoice address"
                            rows={1}
                            py="7px"
                            resize="vertical"
                            w="auto"
                            cols={getAutoCols(row.invoice_address, "Invoice address", { min: 24, max: 90 })}
                            title={row.invoice_address ? String(row.invoice_address) : undefined}
                          />
                        )}
                      </Td>
                      <Td {...cellProps} {...failedCell}>
                        <VStack spacing={2} align="stretch">
                          <input
                            type="file"
                            multiple
                            accept="application/pdf,image/*"
                            id={`vessel-file-${row.key}`}
                            style={{ display: "none" }}
                            onChange={(e) => handleFileUpload(rowIndex, e)}
                          />
                          <label htmlFor={`vessel-file-${row.key}`}>
                            <Button
                              as="span"
                              size="xs"
                              variant="outline"
                              colorScheme="blue"
                              leftIcon={<Icon as={MdAttachFile} />}
                              cursor="pointer"
                              w="100%"
                            >
                              Upload Files
                            </Button>
                          </label>
                          {(expandedFileRows[row.key] ? row.attachments : row.attachments.slice(0, 1)).map((file, attachmentIndex) => (
                            <Flex
                              key={file.id || `${file.filename}-${attachmentIndex}`}
                              align="center"
                              justify="space-between"
                              fontSize="xs"
                              gap={1}
                            >
                              <Text isTruncated flex={1} title={file.filename}>
                                {file.filename}
                              </Text>
                              <IconButton
                                aria-label="View attachment"
                                icon={<MdVisibility />}
                                size="xs"
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => handleView(file)}
                              />
                              <IconButton
                                aria-label="Remove attachment"
                                icon={<MdClose />}
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleRemoveAttachment(rowIndex, attachmentIndex)}
                              />
                            </Flex>
                          ))}
                          {row.attachments.length > 1 && (
                            <Button
                              size="xs"
                              variant="link"
                              colorScheme="blue"
                              fontWeight="normal"
                              alignSelf="flex-start"
                              onClick={() =>
                                setExpandedFileRows((prev) => ({ ...prev, [row.key]: !prev[row.key] }))
                              }
                            >
                              {expandedFileRows[row.key]
                                ? "Show less"
                                : `View more (${row.attachments.length - 1})`}
                            </Button>
                          )}
                        </VStack>
                      </Td>
                      <Td {...cellProps} {...failedCell} borderRight="none">
                        <HStack spacing="2">
                          <IconButton
                            icon={<Icon as={MdContentCopy} />}
                            size="sm"
                            colorScheme="green"
                            variant="ghost"
                            onClick={() => handleCopyRow(rowIndex)}
                            aria-label="Copy row"
                            title="Copy/Repeat row"
                          />
                          <IconButton
                            icon={<Icon as={isEditing ? MdClose : MdDelete} />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => handleRemoveRow(rowIndex)}
                            aria-label={isEditing ? "Remove from this edit" : "Delete row"}
                            title={isEditing ? "Remove from this edit (the vessel is not deleted)" : "Delete row"}
                            isDisabled={rows.length === 1}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Card>
      </Box>

      <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} size="full">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent maxW="65vw" maxH="65vh" m="auto" bg="white">
          <ModalHeader bg="gray.100" borderBottom="1px" borderColor="gray.200">
            <Flex justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="600">
                {previewFile?.filename || "File Preview"}
              </Text>
              <Button
                size="sm"
                mr={8}
                leftIcon={<Icon as={MdPrint} />}
                onClick={() => {
                  const printWindow = window.open();
                  if (!printWindow || !previewFile?.fileUrl) return;
                  const body = previewFile.fileType?.startsWith("image/")
                    ? `<img src="${previewFile.fileUrl}" alt="${previewFile.filename}" />`
                    : previewFile.fileType === "application/pdf"
                      ? `<iframe src="${previewFile.fileUrl}" style="width: 100%; height: 100vh; border: none;"></iframe>`
                      : `<p>Preview not available. <a href="${previewFile.fileUrl}" download>Download file</a></p>`;
                  printWindow.document.write(
                    `<html><head><title>${previewFile.filename}</title><style>@page{size:A4;margin:0}body{margin:0;padding:0}img,iframe{width:100%;height:100vh;object-fit:contain}</style></head><body>${body}</body></html>`
                  );
                  printWindow.document.close();
                  setTimeout(() => printWindow.print(), 250);
                }}
              >
                Print
              </Button>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} bg="gray.50" display="flex" justifyContent="center" alignItems="center" minH="calc(100vh - 120px)">
            {previewFile &&
              (previewFile.fileType?.startsWith("image/") ? (
                <Box w="100%" h="100%" display="flex" justifyContent="center" alignItems="center" p={4}>
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.filename}
                    style={{ maxWidth: "100%", maxHeight: "calc(100vh - 120px)", objectFit: "contain", borderRadius: "8px" }}
                  />
                </Box>
              ) : previewFile.fileType === "application/pdf" ? (
                <Box w="100%" h="calc(100vh - 120px)" bg="gray.100">
                  <iframe
                    src={previewFile.fileUrl}
                    title={previewFile.filename}
                    style={{ width: "100%", height: "100%", border: "none" }}
                  />
                </Box>
              ) : (
                <VStack p={8} spacing={4}>
                  <Text>File preview not available for this file type.</Text>
                  <Button as="a" href={previewFile.fileUrl} download={previewFile.filename} colorScheme="blue">
                    Download File
                  </Button>
                </VStack>
              ))}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
