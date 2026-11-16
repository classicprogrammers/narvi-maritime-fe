import { readPersistedFilters, writePersistedFilters } from "./persistedFilters";

export const CLIENT_TARIFF_SCREEN = "client-tariffs";

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
// Client / agent filters hold the option id, which the select hands back as a number.
const idStr = (value) => (typeof value === "number" || typeof value === "string" ? String(value) : "");

/** Sanitizes anything read from storage into a complete, valid state. */
export function buildClientTariffState(raw = {}) {
  const defaults = defaultClientTariffState;
  const filters = raw?.filters || {};
  return {
    filters: {
      client_id: idStr(filters.client_id),
      location: str(filters.location, defaults.filters.location),
      agent_id: idStr(filters.agent_id),
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

export const readPersistedClientTariffState = () =>
  readPersistedFilters(CLIENT_TARIFF_SCREEN, buildClientTariffState);

export const writePersistedClientTariffState = (state) => writePersistedFilters(CLIENT_TARIFF_SCREEN, state);
