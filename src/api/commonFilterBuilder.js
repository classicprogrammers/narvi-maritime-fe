const isPresent = (value) =>
  value != null && value !== false && String(value).trim() !== "";

const toCsv = (value) => {
  if (!isPresent(value)) return undefined;
  if (Array.isArray(value)) {
    const list = value
      .map((v) => String(v).trim())
      .filter((v) => v !== "");
    return list.length ? list.join(",") : undefined;
  }
  return String(value).trim();
};

const normalizeStatusList = (value) => {
  const raw = toCsv(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s !== "");
};

const endpointAllowedStatuses = {
  active: ["pending", "stock", "in_transit"],
  completed: ["shipped", "delivered"],
};

const normalizeStatusForEndpoint = (statusCsv, endpointType) => {
  const statuses = normalizeStatusList(statusCsv);
  if (!statuses.length) return undefined;

  const allowed = endpointAllowedStatuses[endpointType];
  if (!allowed) return statuses.join(",");

  const invalid = statuses.filter((s) => !allowed.includes(s));
  if (invalid.length) {
    throw new Error(
      `Invalid status for ${endpointType} jobs: ${invalid.join(", ")}. Allowed: ${allowed.join(", ")}`
    );
  }

  return statuses.join(",");
};

export const buildCommonStockJobFilters = (params = {}, endpointType = "stock") => {
  const requestParams = {};
  const assign = (key, value) => {
    if (isPresent(value)) {
      requestParams[key] = String(value).trim();
    }
  };

  assign("search", params.search);
  assign("date_from", params.date_from);
  assign("date_to", params.date_to);
  assign("min_weight", params.min_weight);
  assign("max_weight", params.max_weight);
  assign("min_value", params.min_value);
  assign("max_value", params.max_value);
  assign("min_days", params.min_days);
  assign("max_days", params.max_days);
  assign("origin", params.origin);
  assign("so_number", params.so_number);
  assign("stock_item_id", params.stock_item_id);
  assign("remarks", params.remarks);
  assign("sort_by", params.sort_by);
  assign("sort_order", params.sort_order);

  const statusCsv = normalizeStatusForEndpoint(
    params.status ?? params.stock_status,
    endpointType
  );
  if (statusCsv) {
    requestParams.status = statusCsv;
    requestParams.stock_status = statusCsv;
  }

  const vesselIds = toCsv(params.vessel_ids ?? params.vessel_id);
  const supplierIds = toCsv(params.supplier_ids ?? params.supplier_id);
  const poIds = toCsv(params.po_ids ?? params.po_id);
  if (vesselIds) {
    requestParams.vessel_ids = vesselIds;
    requestParams.vessel_id = vesselIds;
  }
  if (supplierIds) {
    requestParams.supplier_ids = supplierIds;
    requestParams.supplier_id = supplierIds;
  }
  if (poIds) {
    requestParams.po_ids = poIds;
    requestParams.po_id = poIds;
  }

  return requestParams;
};

