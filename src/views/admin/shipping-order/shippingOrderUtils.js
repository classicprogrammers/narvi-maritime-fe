/**
 * Shared utilities for shipping order list and edit page.
 */

export function toDateOnly(dateStr) {
  if (!dateStr) return "";
  return String(dateStr).split(" ")[0];
}

/**
 * Normalize backend order data into the shape the form and table expect.
 */
export function normalizeOrder(order) {
  if (!order) return null;
  const rawCreated = order.date_created || order.date_order || order.create_date;
  const createdDateOnly = rawCreated ? String(rawCreated).split(" ")[0] : "";

  return {
    id: order.id,
    so_number: order.so_number || order.name || (order.id ? `SO-${order.id}` : ""),
    date_created: createdDateOnly,
    done:
      typeof order.done === "string"
        ? order.done
        : order.done === true
          ? "active"
          : "active",
    pic_new: order.pic_new || order.pic_id || order.pic || null,
    pic_name: order.pic_name || order.pic || "",
    client: order.client || order.client_name || "",
    client_id: order.client_id || order.partner_id || null,
    vessel_name: order.vessel_name || order.vessel || "",
    vessel_id: order.vessel_id || null,
    destination_type: order.destination_type || "",
    destination: order.destination || order.destination_name || "",
    country_id: order.country_id || null,
    destination_id: order.destination_id || null,
    eta_date: order.eta_date,
    etb: order.etb,
    etd: order.etd,
    next_action: order.next_action ? toDateOnly(String(order.next_action)) : "",
    internal_remark: order.internal_remark,
    client_case_invoice_ref: order.client_case_invoice_ref,
    vsls_agent_dtls: order.vsls_agent_dtls || order.vsls_agent_details || "",
    quotation: order.quotation || order.quotation_name || order.quotation_oc_number || "",
    quotation_id: order.quotation_id && order.quotation_id !== false ? order.quotation_id : null,
    timestamp: order.timestamp || order.so_create_date || order.date_order,
    _raw: order,
  };
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
    if (data.so_number) {
      const originalSoNumber = originalData.so_number || originalData.name;
      if (hasChanged(data.so_number, originalSoNumber)) {
        payload.name = data.so_number;
        payload.so_number = data.so_number;
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
      { key: "client_id", value: data.client_id || null, originalValue: originalData.client_id || null },
      { key: "vessel_id", value: data.vessel_id || null, originalValue: originalData.vessel_id || null },
      { key: "destination_type", value: data.destination_type || null, originalValue: originalData.destination_type || null },
      { key: "destination", value: data.destination || null, originalValue: originalData.destination || null },
      { key: "country_id", value: data.country_id || null, originalValue: originalData.country_id || null },
      { key: "destination_id", value: data.destination_id || null, originalValue: originalData.destination_id || null },
      { key: "done", value: data.done || "active", originalValue: originalData.done || null },
      { key: "pic_new", value: data.pic_new || null, originalValue: originalData.pic_new || null },
      {
        key: "quotation_id",
        value: data.quotation_id === null || data.quotation_id === undefined ? "" : data.quotation_id,
        originalValue: originalData.quotation_id === null || originalData.quotation_id === undefined ? "" : originalData.quotation_id,
      },
      {
        key: "eta_date",
        value: toDateTime(data.eta_date),
        originalValue: normalizeOriginalDateTime(originalData.eta_date),
        compareValue: data.eta_date ? data.eta_date.split(" ")[0] : null,
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
        key: "date_order",
        value: toDateTime(data.date_created || data.date_order),
        originalValue: normalizeOriginalDateTime(originalData.date_order || originalData.date_created),
        compareValue: data.date_created || data.date_order ? (data.date_created || data.date_order).split(" ")[0] : null,
      },
      {
        key: "next_action",
        value: data.next_action ? toDateOnly(data.next_action) : null,
        originalValue: normalizeOriginalDate(originalData.next_action),
        compareValue: data.next_action ? toDateOnly(data.next_action) : null,
      },
      { key: "internal_remark", value: data.internal_remark || null, originalValue: originalData.internal_remark || null },
      { key: "client_case_invoice_ref", value: data.client_case_invoice_ref || null, originalValue: originalData.client_case_invoice_ref || null },
      { key: "vsls_agent_dtls", value: data.vsls_agent_dtls || null, originalValue: originalData.vsls_agent_dtls || null },
    ];

    fields.forEach(({ key, value, originalValue, compareValue }) => {
      const newValueToCompare = compareValue !== undefined ? compareValue : value;
      if (hasChanged(newValueToCompare, originalValue)) {
        if (value !== null && value !== undefined && value !== "" && value !== false) {
          payload[key] = value;
        } else if (key === "quotation_id" && value === "") {
          payload[key] = "";
        }
      }
    });

    return payload;
  }

  if (data.so_number) {
    payload.name = data.so_number;
    payload.so_number = data.so_number;
  }
  if (hasValue(data.client_id)) payload.client_id = data.client_id;
  if (hasValue(data.vessel_id)) payload.vessel_id = data.vessel_id;
  if (hasValue(data.destination_type)) payload.destination_type = data.destination_type;
  if (hasValue(data.destination)) payload.destination = data.destination;
  if (hasValue(data.country_id)) payload.country_id = data.country_id;
  if (hasValue(data.destination_id)) payload.destination_id = data.destination_id;
  if (hasValue(data.done)) payload.done = data.done || "active";
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
  const dateOrder = toDateTime(data.date_created || data.date_order);
  if (hasValue(dateOrder)) payload.date_order = dateOrder;
  if (hasValue(data.next_action)) payload.next_action = toDateOnly(data.next_action);
  if (hasValue(data.internal_remark)) payload.internal_remark = data.internal_remark;
  if (hasValue(data.client_case_invoice_ref)) payload.client_case_invoice_ref = data.client_case_invoice_ref;
  if (hasValue(data.vsls_agent_dtls)) payload.vsls_agent_dtls = data.vsls_agent_dtls;

  return payload;
}
