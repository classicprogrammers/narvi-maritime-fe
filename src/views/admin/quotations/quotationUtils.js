export function m2oId(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") return value.id ?? "";
  return value;
}

export function m2oName(value, fallback = "") {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value.name || value.display_name || fallback;
  return fallback || String(value);
}

export function quotationVesselName(item) {
  return item?.vessel_name || m2oName(item?.vessel_id, "-");
}

export function quotationSoDisplay(item) {
  if (item?.so_number) return item.so_number;
  if (item?.so_id != null && item.so_id !== "") return String(item.so_id);
  const soName = m2oName(item?.sale_order_id, "");
  if (soName) return soName;
  const soId = m2oId(item?.sale_order_id);
  return soId ? String(soId) : "-";
}

export function quotationRateNames(item) {
  const lines = item?.quotation_lines;
  if (Array.isArray(lines) && lines.length > 0) {
    const names = lines
      .map((line) => line.rate_item_name || line.rate_name || m2oName(line.rate_list_id, ""))
      .filter(Boolean);
    if (names.length) return names.join(", ");
  }
  if (item?.rate_name) return item.rate_name;
  if (item?.rate_item_name) return item.rate_item_name;
  return "-";
}

export function intOrUndef(value) {
  if (value === "" || value == null) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export function intOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function strOrNull(value) {
  if (value === false || value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export function numOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function normalizeRemark(value) {
  if (value === false || value == null) return "";
  return String(value);
}

export function apiString(value) {
  if (value === false || value == null) return "";
  return String(value);
}

export function normalizeOptions(list, labelKey = "name") {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (typeof item === "string") return { id: item, name: item };
    return {
      id: item.id ?? item[labelKey] ?? item.name,
      name: item[labelKey] ?? item.name ?? item.display_name ?? String(item.id ?? ""),
      ...item,
    };
  });
}

export function normalizeClientOptions(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (typeof item === "string") {
      return { id: item, name: item, client_code: "", client_address: "" };
    }
    const name = item.name ?? item.client_name ?? String(item.id ?? "");
    const client_code = apiString(item.client_code ?? item.code);
    const client_address = apiString(item.client_address ?? item.address);
    return {
      ...item,
      id: item.id,
      name,
      client_code,
      client_address,
    };
  });
}

export function normalizeLocationOptions(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (typeof item === "string") return { id: item, name: item, location: item };
    const location = item.location ?? item.name ?? "";
    return {
      id: location,
      name: item.name ?? location,
      location,
      ...item,
    };
  });
}

export function normalizeRateItems(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({
    id: item.id,
    name: item.rate_name || item.rate_item_name || item.name || item.rate_id || `Rate ${item.id}`,
    rate_id: item.rate_id ?? "",
    rate_item_name: item.rate_name || item.rate_item_name || item.name || "",
    rate_remark: normalizeRemark(item.rate_remark ?? item.remarks),
  }));
}

export function ensureSelectedOption(options, value, buildOption) {
  if (value == null || value === "") return options;
  if (options.some((opt) => String(opt.id) === String(value))) return options;
  const fallback = buildOption?.(value);
  return fallback ? [fallback, ...options] : options;
}

export function formatClientOption(client) {
  if (!client) return "";
  const name = client.name || client.client_name || "";
  const code = apiString(client.client_code ?? client.code);
  if (name && code) return `${name} (${code})`;
  return name || code || `Client ${client.id}`;
}

export function formatVesselOption(vessel) {
  if (!vessel) return "";
  return vessel.name || vessel.vessel_name || vessel.display_name || `Vessel ${vessel.id}`;
}

export function formatSoOption(so) {
  if (!so) return "";
  return so.name || so.so_number || so.display_name || `SO ${so.id}`;
}

export function formatLocationOption(location) {
  if (!location) return "";
  return location.name || location.location || String(location.id ?? "");
}

export function formatRateItemOption(item) {
  if (!item) return "";
  if (item.rate_id) return item.rate_id;
  return item.name || `Rate ${item.id}`;
}

export function fieldWidthCh(value, placeholder = "") {
  const text = String(value ?? "").length > 0 ? String(value) : String(placeholder ?? "");
  return `${Math.max(text.length, 1)}ch`;
}

export function fieldHtmlSize(value, placeholder = "") {
  const text = String(value ?? "").length > 0 ? String(value) : String(placeholder ?? "");
  return Math.max(text.length, 1);
}

export function getLineDisplayLabels(line, formatters = {}) {
  const {
    formatLocation = (o) => o?.name || o?.location || "",
    formatAgent = (o) => o?.name || "",
    formatRateItem = (o) => o?.rate_id || o?.name || "",
  } = formatters;

  const locationOpt = line.locationOptions?.find((o) => String(o.id) === String(line.location));
  const agentOpt = line.agentOptions?.find((o) => String(o.id) === String(line.agent_id));
  const rateOpt = line.rateItemOptions?.find((o) => String(o.id) === String(line.rate_list_id));

  return {
    location: locationOpt ? formatLocation(locationOpt) : line.location || "",
    agent: agentOpt ? formatAgent(agentOpt) : "",
    rateItem: rateOpt ? formatRateItem(rateOpt) : line.rate_id || "",
  };
}

export function formatAgentOption(agent) {
  if (!agent) return "";
  const code = agent.name || "";
  const company = agent.company_name || "";
  if (code && company) return `${code} — ${company}`;
  return code || company || `Agent ${agent.id}`;
}

export function emptyHeader() {
  return {
    client_id: "",
    vessel_id: "",
    sale_order_id: "",
    validity_date: "",
    currency_id: "",
    usd_roe: "1",
    general_mu: "",
    caf: "",
  };
}

export const QUOTATION_LINE_STATUS_OPTIONS = [
  { id: "quote_current", name: "Quote Current" },
  { id: "quote_pending", name: "Quote Pending" },
  { id: "order", name: "Order" },
  { id: "toinvoice", name: "toinvoice" },
  { id: "hold", name: "Hold" },
  { id: "declined", name: "Declined" },
  { id: "archive", name: "Archive" },
];

export function normalizeStatusOptions(list) {
  if (!Array.isArray(list) || list.length === 0) return QUOTATION_LINE_STATUS_OPTIONS;
  return list.map((item) => {
    if (typeof item === "string") {
      const fallback = QUOTATION_LINE_STATUS_OPTIONS.find((opt) => opt.id === item);
      return { id: item, name: fallback?.name ?? item };
    }
    const id = item.value ?? item.id ?? item.status ?? "";
    const name = item.label ?? item.name ?? item.status_label ?? id;
    return { id, name };
  });
}

export function formatQuotationNumber(value, fallback = "—") {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercentDisplay(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && value.includes("%")) return value;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${n.toFixed(1)}%`;
}

export function emptyLine() {
  return {
    id: null,
    is_client_specific: false,
    location: "",
    agent_id: "",
    rate_list_id: "",
    rate_id: "",
    rate_item_name: "",
    rate_remark: "",
    quantity: "1",
    cost_actual: "0",
    roe: "",
    mu_percent: "",
    amended_value: "",
    group_free_text: "",
    status: "quote_current",
    currency_override_id: "",
    free_text: "",
    remark: "",
    calculation: "",
    fixed_sales_rate: "",
    computed_currency_id: "",
    computed_currency_name: "",
    cost_sum: "",
    cost_usd: "",
    mu_amount: "",
    qt_rate: "",
    rate_to_client: "",
    effective_mu_percent: "",
    locationOptions: [],
    agentOptions: [],
    rateItemOptions: [],
    statusOptions: [],
    currencyOptions: [],
    agent_required: false,
    rate_type_filter: "",
    agent_name: "",
    rate_list_name: "",
  };
}

export function lineFromApi(line) {
  return {
    ...emptyLine(),
    id: line.id ?? null,
    is_client_specific: Boolean(line.is_client_specific),
    location: apiString(line.location),
    agent_id: m2oId(line.agent_id),
    agent_name: apiString(line.agent) || m2oName(line.agent_id),
    rate_list_id: m2oId(line.rate_list_id),
    rate_list_name: m2oName(line.rate_list_id),
    rate_id: apiString(line.rate_id),
    rate_item_name: apiString(line.rate_item_name),
    rate_remark: normalizeRemark(line.rate_remark),
    quantity: line.quantity != null ? String(line.quantity) : "1",
    cost_actual: line.cost_actual != null ? String(line.cost_actual) : "0",
    roe: line.roe != null ? String(line.roe) : "",
    mu_percent: line.mu_percent != null ? String(line.mu_percent) : "",
    amended_value: line.amended_value != null ? String(line.amended_value) : "",
    group_free_text: apiString(line.group_free_text),
    status: apiString(line.status) || "quote_current",
    currency_override_id: m2oId(line.currency_override_id),
    free_text: apiString(line.free_text),
    remark: apiString(line.remark),
    calculation: apiString(line.calculation),
    fixed_sales_rate: line.fixed_sales_rate != null ? String(line.fixed_sales_rate) : "",
    computed_currency_id: m2oId(line.currency_id),
    computed_currency_name: m2oName(line.currency_id),
    cost_sum: line.cost_sum != null ? String(line.cost_sum) : "",
    cost_usd: line.cost_usd != null ? String(line.cost_usd) : "",
    mu_amount: line.mu_amount != null ? String(line.mu_amount) : "",
    qt_rate: line.qt_rate != null ? String(line.qt_rate) : "",
    rate_to_client: line.rate_to_client != null ? String(line.rate_to_client) : "",
    effective_mu_percent:
      line.effective_mu_percent != null ? String(line.effective_mu_percent) : "",
  };
}

export function mergeLineFromApi(currentLine, apiLine) {
  const fromApi = lineFromApi(apiLine);
  return {
    ...currentLine,
    ...fromApi,
    locationOptions: currentLine.locationOptions,
    agentOptions: currentLine.agentOptions,
    rateItemOptions: currentLine.rateItemOptions,
    statusOptions: currentLine.statusOptions?.length
      ? currentLine.statusOptions
      : fromApi.statusOptions,
    currencyOptions: currentLine.currencyOptions?.length
      ? currentLine.currencyOptions
      : fromApi.currencyOptions,
  };
}

export function buildLineSavePayload(line) {
  const row = {
    is_client_specific: Boolean(line.is_client_specific),
    location: strOrNull(line.location),
    rate_list_id: intOrNull(line.rate_list_id),
    quantity: numOrNull(line.quantity),
    cost_actual: numOrNull(line.cost_actual),
    roe: numOrNull(line.roe),
    mu_percent: numOrNull(line.mu_percent),
    amended_value: numOrNull(line.amended_value),
    group_free_text: strOrNull(line.group_free_text),
    status: strOrNull(line.status) || "quote_current",
    free_text: strOrNull(line.free_text),
    remark: strOrNull(line.remark),
    currency_override_id: intOrNull(line.currency_override_id),
  };
  if (line.id) row.id = line.id;
  if (line.is_client_specific) {
    row.agent_id = intOrNull(line.agent_id);
  }
  return row;
}

export function headerFromApi(q) {
  return {
    client_id: m2oId(q.client_id),
    vessel_id: m2oId(q.vessel_id),
    sale_order_id: m2oId(q.sale_order_id),
    validity_date: apiString(q.validity_date),
    currency_id: m2oId(q.currency_id),
    usd_roe: q.usd_roe != null ? String(q.usd_roe) : "1",
    general_mu: q.general_mu != null ? String(q.general_mu) : "",
    caf: q.caf != null ? String(q.caf) : "",
  };
}
