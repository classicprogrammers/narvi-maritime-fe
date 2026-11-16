import { readPersistedFilters, writePersistedFilters } from "./persistedFilters";

export const AGENT_TARIFF_SCREEN = "agent-tariffs";

export const defaultAgentTariffState = {
  filters: { agent_id: "", location: "", import_group: "", active: "" },
  // Selected dropdown options, kept so their labels show before the option lists reload.
  pins: {},
  search: "",
  page: 1,
  fetchAll: false,
};

const str = (value, fallback) => (typeof value === "string" ? value : fallback);
// The agent filter holds the option id, which the select hands back as a number.
const idStr = (value) => (typeof value === "number" || typeof value === "string" ? String(value) : "");

/** Sanitizes anything read from storage into a complete, valid state. */
export function buildAgentTariffState(raw = {}) {
  const defaults = defaultAgentTariffState.filters;
  const filters = raw?.filters || {};
  return {
    filters: {
      agent_id: idStr(filters.agent_id),
      location: str(filters.location, defaults.location),
      import_group: str(filters.import_group, defaults.import_group),
      active: str(filters.active, defaults.active),
    },
    pins: raw?.pins && typeof raw.pins === "object" && !Array.isArray(raw.pins) ? raw.pins : {},
    search: str(raw?.search, ""),
    page: Number.isInteger(raw?.page) && raw.page >= 1 ? raw.page : 1,
    fetchAll: Boolean(raw?.fetchAll),
  };
}

export const readPersistedAgentTariffState = () => readPersistedFilters(AGENT_TARIFF_SCREEN, buildAgentTariffState);

export const writePersistedAgentTariffState = (state) => writePersistedFilters(AGENT_TARIFF_SCREEN, state);
