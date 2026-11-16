export const CLIENT_TARIFF_STORAGE_KEY = "narvi_client_tariff_state";

export const defaultClientTariffState = {
  filters: { client_id: "", location: "", agent_id: "", incl_in_tariff: "true", shipment_type: "" },
  // Selected dropdown options, kept so their labels show before the option lists reload.
  pins: {},
  search: "",
  page: 1,
  fetchAll: false,
  remarks: "",
};

const str = (value, fallback) => (typeof value === "string" ? value : fallback);

/** Sanitizes anything read from storage into a complete, valid state. */
export function buildClientTariffState(raw = {}) {
  const defaults = defaultClientTariffState;
  const filters = raw?.filters || {};
  return {
    filters: {
      client_id: str(filters.client_id, defaults.filters.client_id),
      location: str(filters.location, defaults.filters.location),
      agent_id: str(filters.agent_id, defaults.filters.agent_id),
      incl_in_tariff: str(filters.incl_in_tariff, defaults.filters.incl_in_tariff) || "true",
      shipment_type: str(filters.shipment_type, defaults.filters.shipment_type),
    },
    pins: raw?.pins && typeof raw.pins === "object" && !Array.isArray(raw.pins) ? raw.pins : {},
    search: str(raw?.search, ""),
    page: Number.isInteger(raw?.page) && raw.page >= 1 ? raw.page : 1,
    fetchAll: Boolean(raw?.fetchAll),
    remarks: str(raw?.remarks, ""),
  };
}

export function readPersistedClientTariffState() {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(CLIENT_TARIFF_STORAGE_KEY) : null;
    return raw ? buildClientTariffState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writePersistedClientTariffState(state) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(CLIENT_TARIFF_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}
