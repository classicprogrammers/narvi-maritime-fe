import {
  buildClientTariffState,
  defaultClientTariffState,
  readPersistedClientTariffState,
  writePersistedClientTariffState,
} from "./clientTariffState";
import {
  buildAgentTariffState,
  defaultAgentTariffState,
  readPersistedAgentTariffState,
  writePersistedAgentTariffState,
} from "./agentTariffState";
import { persistedFiltersKey } from "./persistedFilters";
import { persistScopedAuthOnBoot } from "./authStorage";

describe("tariff filter persistence", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing is stored", () => {
    expect(readPersistedClientTariffState()).toBeNull();
    expect(readPersistedAgentTariffState()).toBeNull();
  });

  it("round-trips client tariff state", () => {
    const state = {
      filters: { client_id: "5", location: "SIN", agent_id: "", incl_in_tariff: "false", shipment_type: "export" },
      pins: { client_id: { id: 5, name: "Acme" } },
      search: "thc",
      page: 3,
      fetchAll: true,
      remarks: "note",
    };
    writePersistedClientTariffState(state);
    expect(readPersistedClientTariffState()).toEqual(state);
  });

  it("round-trips agent tariff state", () => {
    const state = {
      filters: { agent_id: "7", location: "ATH", import_group: "G1", active: "true" },
      pins: { agent_id: { id: 7, name: "AG" } },
      search: "x",
      page: 2,
      fetchAll: false,
    };
    writePersistedAgentTariffState(state);
    expect(readPersistedAgentTariffState()).toEqual(state);
  });

  it("keeps the two screens separate", () => {
    expect(persistedFiltersKey("client-tariffs")).not.toBe(persistedFiltersKey("agent-tariffs"));
  });

  it("keeps numeric client and agent ids (what the select stores), as strings", () => {
    // The select hands back option.id, a number, so the saved JSON holds numbers.
    writePersistedClientTariffState({
      ...defaultClientTariffState,
      filters: { ...defaultClientTariffState.filters, client_id: 12, agent_id: 34 },
    });
    const client = readPersistedClientTariffState();
    expect(client.filters.client_id).toBe("12");
    expect(client.filters.agent_id).toBe("34");

    writePersistedAgentTariffState({
      ...defaultAgentTariffState,
      filters: { ...defaultAgentTariffState.filters, agent_id: 34 },
    });
    expect(readPersistedAgentTariffState().filters.agent_id).toBe("34");
  });

  it("falls back to defaults for invalid data", () => {
    expect(
      buildClientTariffState({ filters: { client_id: {}, agent_id: null, incl_in_tariff: "" }, page: 0, pins: [] })
    ).toEqual(defaultClientTariffState);
    expect(buildAgentTariffState({ filters: { agent_id: [] }, page: -1, pins: [] })).toEqual(defaultAgentTariffState);
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem(persistedFiltersKey("client-tariffs"), "{nope");
    expect(readPersistedClientTariffState()).toBeNull();
  });

  it("survives the boot-time storage wipe", () => {
    writePersistedClientTariffState({ ...defaultClientTariffState, search: "keep me" });
    persistScopedAuthOnBoot();
    expect(readPersistedClientTariffState().search).toBe("keep me");
  });
});
