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
  if (item?.so_id != null && item.so_id !== "" && item.so_id !== false) return String(item.so_id);
  if (item?.sale_order_id && typeof item.sale_order_id === "object") {
    const soName = m2oName(item.sale_order_id, "");
    if (soName) return soName;
  }
  const soId = m2oId(item?.sale_order_id);
  if (soId && soId !== false) return String(soId);
  return "-";
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
    buy_rate:
      item.buy_rate != null && item.buy_rate !== false
        ? String(item.buy_rate)
        : item.rate_float != null && item.rate_float !== false
          ? String(item.rate_float)
          : "",
    quantity: item.quantity != null ? String(item.quantity) : "",
    calculation: apiString(item.calculation) || apiString(item.rate_calculation),
    fixed_sales_rate:
      item.fixed_sales_rate != null && item.fixed_sales_rate !== false
        ? String(item.fixed_sales_rate)
        : item.fixed_sale_rate != null && item.fixed_sale_rate !== false
          ? String(item.fixed_sale_rate)
          : "",
    currency_id: m2oId(item.currency_id),
    currency_name: apiString(item.currency) || m2oName(item.currency_id),
  }));
}

export function normalizeVesselOptions(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (typeof item === "string") return { id: item, name: item };
    const id = item.id ?? item.vessel_id;
    const name = item.name ?? item.vessel_name ?? String(id ?? "");
    return {
      ...item,
      id,
      name,
      imo: apiString(item.imo ?? item.imo_number ?? item.vessel_imo),
    };
  });
}

export function normalizeSoOptions(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (typeof item === "string") return { id: item, name: item };
    const name = apiString(item.so_id) || item.name || item.so_number || String(item.id ?? "");
    return {
      ...item,
      id: item.id,
      name,
      so_id: apiString(item.so_id),
    };
  });
}

export function ensureSelectedOption(options, value, buildOption, previousOptions = []) {
  if (value == null || value === "") return options;
  if (options.some((opt) => String(opt.id) === String(value))) return options;
  const fallback = buildOption?.(value);
  if (fallback) return [fallback, ...options];
  const fromPrevious = Array.isArray(previousOptions)
    ? previousOptions.find((opt) => String(opt.id) === String(value))
    : null;
  return fromPrevious ? [fromPrevious, ...options] : options;
}

function usableId(value) {
  return value != null && value !== "" && value !== false;
}

export function normalizeQuotationOptions(result) {
  const payload = result?.result && typeof result.result === "object" ? result.result : result || {};
  return {
    clients: normalizeClientOptions(payload.client_options).filter((item) => usableId(item.id)),
    vessels: normalizeVesselOptions(payload.vessel_options).filter((item) => usableId(item.id)),
    saleOrders: normalizeSoOptions(payload.so_options).filter((item) => usableId(item.id)),
  };
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
  if (so.so_id) return String(so.so_id);
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

export function resolveLineStatus(status) {
  const value = apiString(status).trim();
  return value || "quote_current";
}

export function resolveLineStatusOptions(options, selectedStatus = "quote_current") {
  const status = resolveLineStatus(selectedStatus);
  const normalized = normalizeStatusOptions(options);
  return ensureSelectedOption(
    normalized,
    status,
    (id) => {
      const known = QUOTATION_LINE_STATUS_OPTIONS.find((opt) => String(opt.id) === String(id));
      return known || { id, name: String(id) };
    },
    QUOTATION_LINE_STATUS_OPTIONS
  );
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

export function formatLineDisplayValue(value, fallback = "—") {
  if (value === false || value == null || value === "") return fallback;
  return String(value);
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
    buy_rate: "",
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
    vendor_required_for_rate_item: false,
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
    buy_rate:
      line.buy_rate != null && line.buy_rate !== false
        ? String(line.buy_rate)
        : line.rate_float != null && line.rate_float !== false
          ? String(line.rate_float)
          : "",
    quantity: line.quantity != null ? String(line.quantity) : "1",
    cost_actual: line.cost_actual != null ? String(line.cost_actual) : "0",
    roe: line.roe != null ? String(line.roe) : "",
    mu_percent: line.mu_percent != null ? String(line.mu_percent) : "",
    amended_value: line.amended_value != null ? String(line.amended_value) : "",
    group_free_text: apiString(line.group_free_text),
    status: resolveLineStatus(line.status),
    currency_override_id: m2oId(line.currency_override_id),
    free_text: apiString(line.free_text),
    remark: apiString(line.remark),
    calculation: apiString(line.calculation) || apiString(line.rate_calculation),
    fixed_sales_rate:
      line.fixed_sales_rate != null && line.fixed_sales_rate !== false
        ? String(line.fixed_sales_rate)
        : line.fixed_sale_rate != null && line.fixed_sale_rate !== false
          ? String(line.fixed_sale_rate)
          : "",
    computed_currency_id: m2oId(line.currency_id),
    computed_currency_name: apiString(line.currency) || m2oName(line.currency_id),
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

export function reconcileQuotationLines(currentLines, savedLines) {
  if (!Array.isArray(savedLines) || savedLines.length === 0) {
    return Array.isArray(currentLines) ? currentLines : [];
  }
  if (!Array.isArray(currentLines) || currentLines.length === 0) {
    return savedLines.map((apiLine) => lineFromApi(apiLine));
  }

  const matchedApiIds = new Set();

  const reconciled = currentLines.map((line, index) => {
    if (line.id) {
      const apiLine = savedLines.find((sl) => String(sl.id) === String(line.id));
      if (apiLine) {
        matchedApiIds.add(String(apiLine.id));
        return mergeLineFromApi(line, apiLine);
      }
    }

    const apiLineByIndex = savedLines[index];
    if (apiLineByIndex && !matchedApiIds.has(String(apiLineByIndex.id))) {
      matchedApiIds.add(String(apiLineByIndex.id));
      return mergeLineFromApi(line, apiLineByIndex);
    }

    const unmatched = savedLines.find((sl) => !matchedApiIds.has(String(sl.id)));
    if (unmatched) {
      matchedApiIds.add(String(unmatched.id));
      return mergeLineFromApi(line, unmatched);
    }

    return line;
  });

  savedLines.forEach((apiLine) => {
    if (!matchedApiIds.has(String(apiLine.id))) {
      matchedApiIds.add(String(apiLine.id));
      reconciled.push(mergeLineFromApi(emptyLine(), apiLine));
    }
  });

  return reconciled;
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
  const agentId = intOrNull(line.agent_id);
  if (agentId != null) {
    row.agent_id = agentId;
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

export function mergeHeaderFromApi(current, q) {
  const next = { ...(current || emptyHeader()) };
  if (q.client_id != null) next.client_id = m2oId(q.client_id);
  if (q.vessel_id != null) next.vessel_id = m2oId(q.vessel_id);
  if (q.sale_order_id != null) next.sale_order_id = m2oId(q.sale_order_id);
  if (q.validity_date != null) next.validity_date = apiString(q.validity_date);
  if (q.currency_id != null) next.currency_id = m2oId(q.currency_id);
  if (q.usd_roe != null) next.usd_roe = String(q.usd_roe);
  if (q.general_mu != null) next.general_mu = String(q.general_mu);
  if (q.caf != null) next.caf = String(q.caf);
  return next;
}

export const QUOTATION_STATE_TABS = [
  { id: "", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "accepted", label: "Accepted" },
  { id: "ready_for_invoice", label: "Ready for Invoice" },
  { id: "archived", label: "Archived" },
];

const QUOTATION_STATE_LABELS = {
  draft: "Draft",
  accepted: "Accepted",
  ready_for_invoice: "Ready for Invoice",
  archived: "Archived",
};

export function quotationStateLabel(item) {
  if (!item) return "—";
  if (item.state_label) return item.state_label;
  return QUOTATION_STATE_LABELS[item.state] || item.state || "—";
}

export function quotationStateColor(state) {
  switch (state) {
    case "accepted":
      return "green";
    case "ready_for_invoice":
      return "blue";
    case "archived":
      return "orange";
    default:
      return "gray";
  }
}

export function quotationReference(item) {
  if (item?.name) return String(item.name);
  if (item?.reference) return String(item.reference);
  if (item?.id != null) return `QT-${String(item.id).padStart(4, "0")}`;
  return "—";
}

export function quotationGrandTotal(item) {
  const value = item?.totals?.grand_total_usd ?? item?.grand_total_usd ?? item?.grand_total ?? null;
  if (value == null || value === false || value === "") return null;
  return value;
}

export function formatUsd(value) {
  if (value == null || value === false || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `USD ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAmountWithCurrencies(amount, currencies) {
  const formatted = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const unique = [...new Set((currencies || []).filter(Boolean))];
  if (unique.length === 1) return `${unique[0]} ${formatted}`;
  if (unique.length > 1) return `${formatted} (mixed currencies)`;
  return formatted;
}

export const CHARGE_SECTIONS = [
  { key: "standard", label: "Standard Charges", collapsible: false },
  { key: "if_apply", label: "If Apply Charges", collapsible: false },
  { key: "dob_standard", label: "DOB Standard", collapsible: true },
  { key: "dob_if_apply", label: "DOB If Apply", collapsible: true },
];

export const RATE_TYPE_OPTIONS = [
  { id: "general", label: "General" },
  { id: "client_specific", label: "Client Specific" },
];

export function rateTypeLabel(value) {
  return RATE_TYPE_OPTIONS.find((opt) => opt.id === value)?.label || value || "—";
}

export function isStandardCategory(category) {
  return category === "standard" || category === "dob_standard";
}

export function rateAmount(rate) {
  const n = Number(rate?.rate_float ?? rate?.buy_rate ?? 0);
  return Number.isFinite(n) ? n : 0;
}

let scenarioSeq = 0;

export function createEmptyScenario() {
  scenarioSeq += 1;
  return {
    key: `scenario-${Date.now()}-${scenarioSeq}`,
    origin: "",
    agent_id: "",
    rate_type: "",
    name: "",
    agentRateTypes: [],
    sections: [],
    selectedByRateId: {},
    ratesSignature: "",
    ratesLoading: false,
    ratesError: "",
  };
}

export function normalizeBuildOrigins(result) {
  const source = Array.isArray(result?.origins)
    ? result.origins
    : Array.isArray(result?.data?.origins)
      ? result.data.origins
      : [];
  return source
    .map((item) => ({
      origin: item?.origin ? String(item.origin) : "",
      rate_types: Array.isArray(item?.rate_types) ? item.rate_types : [],
      agents: Array.isArray(item?.agents) ? item.agents : [],
    }))
    .filter((item) => item.origin);
}

export function findOrigin(origins, originName) {
  return (origins || []).find((item) => item.origin === originName) || null;
}

export function rateTypesForSelection(origin, agent) {
  const fromAgent = Array.isArray(agent?.rate_types) ? agent.rate_types : [];
  if (fromAgent.length) return fromAgent;
  return Array.isArray(origin?.rate_types) ? origin.rate_types : [];
}

export function sectionsFromRatesResponse(sections) {
  const list = Array.isArray(sections) ? sections : [];
  const byKey = Object.fromEntries(list.filter((section) => section?.key).map((section) => [section.key, section]));
  return CHARGE_SECTIONS.map((meta) => {
    const found = byKey[meta.key] || {};
    const rates = Array.isArray(found.rates) ? [...found.rates] : [];
    rates.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    return {
      key: meta.key,
      label: found.label || meta.label,
      collapsible: meta.collapsible,
      rates,
    };
  });
}

export function detailSections(sections) {
  const list = Array.isArray(sections) ? sections : null;
  const source = sections && typeof sections === "object" && !Array.isArray(sections) ? sections : {};
  return CHARGE_SECTIONS.map((meta) => {
    const found = list ? list.find((section) => section.key === meta.key) || {} : source[meta.key] || {};
    const lines = Array.isArray(found.lines) ? [...found.lines] : [];
    lines.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    return {
      key: meta.key,
      label: found.label || meta.label,
      collapsible: meta.collapsible,
      lines,
    };
  });
}

export function initialRateSelection(sections) {
  const selected = {};
  (sections || []).forEach((section) => {
    (section.rates || []).forEach((rate) => {
      const category = rate.charge_category || section.key;
      selected[String(rate.id)] = category === "standard";
    });
  });
  return selected;
}

export function previewScenarioTotals(scenario) {
  const selected = scenario?.selectedByRateId || {};
  let standard = 0;
  let selectedTotal = 0;
  const standardCurrencies = [];
  const selectedCurrencies = [];
  (scenario?.sections || []).forEach((section) => {
    (section.rates || []).forEach((rate) => {
      if (!selected[String(rate.id)]) return;
      const amount = rateAmount(rate);
      selectedTotal += amount;
      if (rate.currency) selectedCurrencies.push(rate.currency);
      const category = rate.charge_category || section.key;
      if (isStandardCategory(category)) {
        standard += amount;
        if (rate.currency) standardCurrencies.push(rate.currency);
      }
    });
  });
  return { standard, selectedTotal, standardCurrencies, selectedCurrencies };
}

export function previewQuotationTotals(scenarios) {
  return (scenarios || []).reduce(
    (acc, scenario) => {
      const totals = previewScenarioTotals(scenario);
      acc.standard += totals.standard;
      acc.selectedTotal += totals.selectedTotal;
      acc.standardCurrencies.push(...totals.standardCurrencies);
      acc.selectedCurrencies.push(...totals.selectedCurrencies);
      return acc;
    },
    { standard: 0, selectedTotal: 0, standardCurrencies: [], selectedCurrencies: [] }
  );
}

export function scenarioHasSelection(scenario) {
  return Object.values(scenario?.selectedByRateId || {}).some(Boolean);
}

export function selectedRateCount(scenario) {
  return Object.values(scenario?.selectedByRateId || {}).filter(Boolean).length;
}

export function selectedRatesPayload(scenario) {
  const rows = [];
  (scenario?.sections || []).forEach((section) => {
    (section.rates || []).forEach((rate) => {
      if (rate?.id == null) return;
      rows.push({
        rate_list_id: Number(rate.id),
        selected: Boolean(scenario.selectedByRateId?.[String(rate.id)]),
      });
    });
  });
  return rows;
}

export function scenarioAgentName(scenario) {
  const agent = scenario?.agent_id;
  if (agent && typeof agent === "object") return formatAgentOption(agent) || agent.name || "—";
  if (scenario?.agent_name) return scenario.agent_name;
  if (agent) return `Agent ${agent}`;
  return "—";
}

export function lineDisplayName(line) {
  return (
    apiString(line?.rate_name) ||
    apiString(line?.rate_item_name) ||
    apiString(line?.name) ||
    apiString(line?.rate_id) ||
    `Line ${line?.id ?? ""}`
  );
}

export function isLineSelected(line) {
  return !(line?.selected === false || line?.selected === 0 || line?.selected === "false");
}

export function lineToDraft(line) {
  const text = (value) => (value != null && value !== false ? String(value) : "");
  return {
    selected: isLineSelected(line),
    quantity: text(line?.quantity),
    buy_rate: text(line?.buy_rate),
    cost_actual: text(line?.cost_actual),
    roe: text(line?.roe),
    mu_percent: text(line?.mu_percent),
    amended_value: text(line?.amended_value),
    free_text: apiString(line?.free_text),
    remark: apiString(line?.remark),
  };
}

export function draftToLinePayload(id, draft) {
  return {
    id: Number(id),
    selected: Boolean(draft.selected),
    quantity: numOrNull(draft.quantity),
    buy_rate: numOrNull(draft.buy_rate),
    cost_actual: numOrNull(draft.cost_actual),
    roe: numOrNull(draft.roe),
    mu_percent: numOrNull(draft.mu_percent),
    amended_value: numOrNull(draft.amended_value),
    free_text: draft.free_text ?? "",
    remark: draft.remark ?? "",
  };
}

export function draftsFromQuotation(quotation) {
  const drafts = {};
  (quotation?.scenarios || []).forEach((scenario) => {
    detailSections(scenario.sections).forEach((section) => {
      section.lines.forEach((line) => {
        if (line?.id == null) return;
        drafts[String(line.id)] = lineToDraft(line);
      });
    });
  });
  return drafts;
}

export function namesFromQuotation(quotation) {
  const names = {};
  (quotation?.scenarios || []).forEach((scenario) => {
    if (scenario?.id == null) return;
    names[String(scenario.id)] = apiString(scenario.name);
  });
  return names;
}

export function extractCreatedQuotationId(result) {
  if (!result || typeof result !== "object") return null;
  return result.id || result.quotation_id || result.quotation?.id || result.data?.id || null;
}

export function extractRevisionId(result) {
  if (!result || typeof result !== "object") return null;
  const sourceId = result.source_quotation_id;
  const dataId = result.data && !Array.isArray(result.data) ? result.data.id : null;
  const candidates = [result.revision_id, result.quotation?.id, dataId];
  return candidates.find((value) => value != null && value !== false && String(value) !== String(sourceId || "")) ?? null;
}

export function extractCopyText(result) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  return result.copy_text || result.text || "";
}

export function normalizeVersions(result) {
  const raw = Array.isArray(result)
    ? result
    : result?.versions || result?.data || result?.revisions || [];
  if (!Array.isArray(raw)) return [];
  return [...raw].sort((a, b) => (Number(a.revision_no) || 0) - (Number(b.revision_no) || 0));
}

export function quotationClientId(quotation) {
  const id = m2oId(quotation?.client_id);
  return id && id !== false ? id : "";
}

export function quotationVesselId(quotation) {
  const id = m2oId(quotation?.vessel_id);
  return id && id !== false ? id : "";
}
