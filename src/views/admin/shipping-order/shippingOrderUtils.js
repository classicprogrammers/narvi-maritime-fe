/**
 * Shared utilities for shipping order list and edit page.
 */
import { mapExistingAttachmentsFromOrder, mapExistingCiplFilesFromOrder } from "../../../utils/shippingOrderAttachments";

export function toDateOnly(dateStr) {
  if (!dateStr) return "";
  return String(dateStr).split(" ")[0];
}

/** Parse so_id from display value like "SO-3662" or "3662" */
function parseSoIdFromDisplay(val) {
  if (val == null || val === "" || val === false) return null;
  const str = String(val).trim();
  if (!str) return null;
  const match = str.replace(/^SO[- ]?/i, "").trim();
  if (!match) return null;
  const num = Number(match);
  return Number.isNaN(num) ? match : num;
}

/**
 * Normalize backend order data into the shape the form and table expect.
 * API may return pic_new, client_id, vessel_id, country_id as { id, name }.
 */
export function normalizeOrder(order) {
  if (!order) return null;
  const rawCreated = order.date_created || order.date_order || order.create_date;
  const createdDateOnly = rawCreated ? String(rawCreated).split(" ")[0] : "";

  const picVal = order.pic_new || order.pic_id || order.pic;
  const clientVal = order.client_id || order.partner_id;
  const vesselVal = order.vessel_id;
  const countryVal = order.country_id;

  const soIdVal = order.so_id;
  const soDisplay = soIdVal != null && soIdVal !== "" && soIdVal !== false
    ? `SO-${soIdVal}`
    : (order.so_number || (order.id ? `SO-${order.id}` : ""));

  const attachmentList = mapExistingAttachmentsFromOrder(order);
  const ciplFileList = mapExistingCiplFilesFromOrder(order);

  return {
    id: order.id,
    so_id: soIdVal,
    so_number: soDisplay,
    date_created: createdDateOnly,
    done:
      typeof order.done === "string"
        ? order.done
        : order.done === true
          ? "active"
          : "active",
    cancel_text:
      order.cancel_text === false || order.cancel_text == null || order.cancel_text === undefined
        ? ""
        : String(order.cancel_text),
    pic_new: (picVal && typeof picVal === "object" ? picVal.id : picVal) ?? null,
    pic_name: (picVal && typeof picVal === "object" ? picVal.name : null) || order.pic_name || order.pic || "",
    client: (clientVal && typeof clientVal === "object" ? clientVal.name : null) || order.client || order.client_name || "",
    client_id: (clientVal && typeof clientVal === "object" ? clientVal.id : clientVal) ?? null,
    client_code: (clientVal && typeof clientVal === "object" && clientVal.client_code) ? clientVal.client_code : null,
    vessel_name: (vesselVal && typeof vesselVal === "object" ? vesselVal.name : null) || order.vessel_name || order.vessel || "",
    vessel_id: (vesselVal && typeof vesselVal === "object" ? vesselVal.id : vesselVal) ?? null,
    country_id: (countryVal && typeof countryVal === "object" ? countryVal.id : countryVal) ?? null,
    destination_type: order.destination_type || "",
    destination: order.destination || order.destination_name || "",
    destination_id: order.destination_id || null,
    eta_date: order.eta_date,
    etb: order.etb,
    etd: order.etd,
    so_delivery_date: order.so_delivery_date ? toDateOnly(String(order.so_delivery_date)) : "",
    next_action: order.next_action ? toDateOnly(String(order.next_action)) : "",
    internal_remark: order.internal_remark,
    client_case_invoice_ref: order.client_case_invoice_ref,
    vsls_agent_dtls: order.vsls_agent_dtls || order.vsls_agent_details || "",
    quotation: order.quotation || order.quotation_name || order.quotation_oc_number || "",
    quotation_id: order.quotation_id && order.quotation_id !== false ? order.quotation_id : null,
    timestamp: order.timestamp || order.so_create_date || order.date_order,
    /** New uploads only (base64); saved files live in existingAttachments */
    attachments: [],
    existingAttachments: attachmentList,
    attachment_to_delete: [],
    /** CIPL form report PDFs */
    cipl_files: [],
    existingCiplFiles: ciplFileList,
    cipl_files_to_delete: [],
    shipping_package: order.shipping_package || null,
    _raw: order,
  };
}

/** Saved + pending files for list/tooltips (edit form uses existingAttachments + attachments separately). */
export function getOrderAttachmentsForDisplay(order) {
  if (!order) return [];
  if (Array.isArray(order.existingAttachments) && order.existingAttachments.length > 0) {
    return order.existingAttachments;
  }
  if (Array.isArray(order.attachments) && order.attachments.length > 0) {
    return order.attachments;
  }
  return mapExistingAttachmentsFromOrder(order._raw || order);
}

/**
 * Build API payload from form data (create or update).
 * @param {Object} data - form data
 * @param {boolean} isUpdate - true for update (only changed fields)
 * @param {Object} originalData - original order for comparison when isUpdate
 */
export function buildPayloadFromForm(data, isUpdate = false, originalData = {}) {
  const toNumber = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const num = Number(v);
    return Number.isNaN(num) ? null : num;
  };

  const toDateTime = (dateStr) => {
    if (!dateStr) return null;
    return `${dateStr} 00:00:00`;
  };

  const hasChanged = (newValue, oldValue) => {
    const normalize = (val) => {
      if (val === null || val === undefined || val === "" || val === false) return null;
      if (typeof val === "string") return val.trim();
      return val;
    };
    const normalizedNew = normalize(newValue);
    const normalizedOld = normalize(oldValue);
    if (normalizedNew === null && normalizedOld === null) return false;
    if (normalizedNew === null || normalizedOld === null) return normalizedNew !== normalizedOld;
    if (typeof normalizedNew === "string" && typeof normalizedOld === "string")
      return normalizedNew !== normalizedOld;
    if (typeof normalizedNew === "number" && typeof normalizedOld === "number")
      return normalizedNew !== normalizedOld;
    return normalizedNew !== normalizedOld;
  };

  const hasValue = (value) => {
    if (value === null || value === undefined || value === "") return false;
    if (value === false) return false;
    return true;
  };

  const payload = {};

  if (isUpdate) {
    if (data.so_id != null || data.so_number) {
      const newSoId = data.so_id != null ? data.so_id : parseSoIdFromDisplay(data.so_number);
      const origSoId = originalData.so_id != null ? originalData.so_id : parseSoIdFromDisplay(originalData.so_number);
      if (hasChanged(newSoId, origSoId)) {
        payload.so_id = newSoId;
      }
    }

    const normalizeOriginalDate = (dateValue) => {
      if (!dateValue) return null;
      if (typeof dateValue === "string") return dateValue.split(" ")[0];
      return dateValue;
    };
    const normalizeOriginalDateTime = (dateValue) => {
      if (!dateValue) return null;
      if (typeof dateValue === "string") return dateValue.split(" ")[0];
      return dateValue;
    };

    const fields = [
      { key: "client_id", value: data.client_id || false, originalValue: originalData.client_id || null },
      { key: "vessel_id", value: data.vessel_id || false, originalValue: originalData.vessel_id || null },
      {
        key: "destination_type",
        value: data.destination_type || false,
        originalValue: originalData.destination_type || null,
      },
      {
        key: "destination",
        value: data.destination ? data.destination : false,
        originalValue: originalData.destination || null,
        compareValue: data.destination ? String(data.destination).trim() : null,
      },
      { key: "country_id", value: data.country_id || false, originalValue: originalData.country_id || null },
      {
        key: "destination_id",
        value: data.destination_id || false,
        originalValue: originalData.destination_id || null,
      },
      { key: "done", value: data.done || "active", originalValue: originalData.done || null },
      {
        key: "cancel_text",
        value:
          data.cancel_text === false || data.cancel_text == null
            ? ""
            : String(data.cancel_text),
        originalValue:
          originalData.cancel_text === false || originalData.cancel_text == null
            ? ""
            : String(originalData.cancel_text),
        compareValue:
          data.cancel_text === false || data.cancel_text == null
            ? ""
            : String(data.cancel_text).trim(),
      },
      { key: "pic_new", value: data.pic_new || false, originalValue: originalData.pic_new || null },
      {
        key: "quotation_id",
        value: data.quotation_id === null || data.quotation_id === undefined || data.quotation_id === "" || data.quotation_id === false
          ? ""
          : data.quotation_id,
        originalValue:
          originalData.quotation_id === null ||
          originalData.quotation_id === undefined ||
          originalData.quotation_id === false
            ? ""
            : originalData.quotation_id,
      },
      {
        key: "eta_date",
        value:
          data.eta_date && data.eta_date !== false
            ? toDateTime(String(data.eta_date).split(" ")[0])
            : false,
        originalValue: normalizeOriginalDateTime(originalData.eta_date),
        compareValue:
          data.eta_date && data.eta_date !== false
            ? String(data.eta_date).split(" ")[0]
            : null,
      },
      {
        key: "etb",
        value: data.etb && data.etb !== false ? toDateOnly(data.etb) : false,
        originalValue: normalizeOriginalDate(originalData.etb),
        compareValue: data.etb && data.etb !== false ? toDateOnly(data.etb) : null,
      },
      {
        key: "etd",
        value: data.etd && data.etd !== false ? toDateOnly(data.etd) : false,
        originalValue: normalizeOriginalDate(originalData.etd),
        compareValue: data.etd && data.etd !== false ? toDateOnly(data.etd) : null,
      },
      {
        key: "so_delivery_date",
        value: data.so_delivery_date && data.so_delivery_date !== false
          ? toDateOnly(data.so_delivery_date)
          : false,
        originalValue: normalizeOriginalDate(originalData.so_delivery_date),
        compareValue: data.so_delivery_date && data.so_delivery_date !== false
          ? toDateOnly(data.so_delivery_date)
          : null,
      },
      {
        key: "date_order",
        value:
          data.date_created || data.date_order
            ? toDateTime(data.date_created || data.date_order)
            : false,
        originalValue: normalizeOriginalDateTime(originalData.date_order || originalData.date_created),
        compareValue: data.date_created || data.date_order
          ? String(data.date_created || data.date_order).split(" ")[0]
          : null,
      },
      {
        key: "next_action",
        value: data.next_action && data.next_action !== false
          ? toDateOnly(data.next_action)
          : false,
        originalValue: normalizeOriginalDate(originalData.next_action),
        compareValue: data.next_action && data.next_action !== false
          ? toDateOnly(data.next_action)
          : null,
      },
      {
        key: "internal_remark",
        value: data.internal_remark ? data.internal_remark : false,
        originalValue: originalData.internal_remark || null,
        compareValue: data.internal_remark ? String(data.internal_remark).trim() : null,
      },
      {
        key: "client_case_invoice_ref",
        value: data.client_case_invoice_ref ? data.client_case_invoice_ref : false,
        originalValue: originalData.client_case_invoice_ref || null,
        compareValue: data.client_case_invoice_ref
          ? String(data.client_case_invoice_ref).trim()
          : null,
      },
      {
        key: "vsls_agent_dtls",
        value: data.vsls_agent_dtls ? data.vsls_agent_dtls : false,
        originalValue: originalData.vsls_agent_dtls || null,
        compareValue: data.vsls_agent_dtls ? String(data.vsls_agent_dtls).trim() : null,
      },
    ];

    fields.forEach(({ key, value, originalValue, compareValue }) => {
      const newValueToCompare = compareValue !== undefined ? compareValue : value;
      if (!hasChanged(newValueToCompare, originalValue)) return;

      const isEmpty =
        value === null || value === undefined || value === "" || value === false;

      if (!isEmpty) {
        payload[key] = value;
        return;
      }

      // Cleared fields must still be sent so the backend updates/clears them
      if (key === "quotation_id" || key === "cancel_text") {
        payload[key] = "";
      } else if (key === "done") {
        payload[key] = "active";
      } else {
        payload[key] = false;
      }
    });

    return payload;
  }

  if (data.so_id != null || data.so_number) {
    const soId = data.so_id != null ? data.so_id : parseSoIdFromDisplay(data.so_number);
    if (soId != null) payload.so_id = soId;
  }
  if (hasValue(data.client_id)) payload.client_id = data.client_id;
  if (hasValue(data.vessel_id)) payload.vessel_id = data.vessel_id;
  if (hasValue(data.destination_type)) payload.destination_type = data.destination_type;
  if (hasValue(data.destination)) payload.destination = data.destination;
  if (hasValue(data.country_id)) payload.country_id = data.country_id;
  if (hasValue(data.destination_id)) payload.destination_id = data.destination_id;
  if (hasValue(data.done)) payload.done = data.done || "active";
  // Always include cancel_text (API expects "" when empty)
  payload.cancel_text =
    data.cancel_text === false || data.cancel_text == null
      ? ""
      : String(data.cancel_text);
  if (hasValue(data.pic_new)) payload.pic_new = data.pic_new;
  if (data.quotation_id !== null && data.quotation_id !== undefined) {
    payload.quotation_id = data.quotation_id;
  }
  const etaDate = toDateTime(data.eta_date);
  if (hasValue(etaDate)) payload.eta_date = etaDate;
  const etbDate = data.etb && data.etb !== false ? toDateOnly(data.etb) : false;
  if (hasValue(etbDate)) payload.etb = etbDate;
  const etdDate = data.etd && data.etd !== false ? toDateOnly(data.etd) : false;
  if (hasValue(etdDate)) payload.etd = etdDate;
  if (hasValue(data.so_delivery_date)) payload.so_delivery_date = toDateOnly(data.so_delivery_date);
  const dateOrder = toDateTime(data.date_created || data.date_order);
  if (hasValue(dateOrder)) payload.date_order = dateOrder;
  if (hasValue(data.next_action)) payload.next_action = toDateOnly(data.next_action);
  if (hasValue(data.internal_remark)) payload.internal_remark = data.internal_remark;
  if (hasValue(data.client_case_invoice_ref)) payload.client_case_invoice_ref = data.client_case_invoice_ref;
  if (hasValue(data.vsls_agent_dtls)) payload.vsls_agent_dtls = data.vsls_agent_dtls;

  return payload;
}

/** Coerce M2O / id field to a string id (or ""). */
export function resolveRelationId(value) {
  if (value == null || value === "" || value === false) return "";
  if (typeof value === "object" && value.id != null && value.id !== false) {
    return String(value.id);
  }
  return String(value);
}

/** Filter cached vessels to those linked to the given client. */
export function getVesselsForClient(vessels = [], clientId) {
  const normalizedClientId = resolveRelationId(clientId);
  if (!normalizedClientId) return [];
  return (Array.isArray(vessels) ? vessels : []).filter(
    (vessel) => resolveRelationId(vessel.client_id) === normalizedClientId
  );
}

/** Keep the currently selected vessel visible when editing, even if not yet in the fetched list. */
export function mergeSelectedVesselOption(vesselList = [], selectedVesselId, allVessels = [], formData = {}) {
  const options = Array.isArray(vesselList) ? [...vesselList] : [];
  const selectedId = resolveRelationId(selectedVesselId);
  if (!selectedId) return options;
  if (options.some((vessel) => String(vessel.id) === selectedId)) return options;

  const fromCache = (Array.isArray(allVessels) ? allVessels : []).find(
    (vessel) => String(vessel.id) === selectedId
  );
  if (fromCache) return [...options, fromCache];

  const fallbackName = formData.vessel_name || formData.vessel || "";
  if (fallbackName) {
    return [...options, { id: Number(selectedId) || selectedId, name: String(fallbackName) }];
  }
  return options;
}
