import {
  buildClientTariffState,
  defaultClientTariffState,
  readPersistedClientTariffState,
  writePersistedClientTariffState,
} from "./clientTariffState";

describe("clientTariffState", () => {
  beforeEach(() => sessionStorage.clear());

  it("returns null when nothing is stored", () => {
    expect(readPersistedClientTariffState()).toBeNull();
  });

  it("round-trips a saved state", () => {
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

  it("falls back to defaults for invalid data", () => {
    const state = buildClientTariffState({ filters: { client_id: 5, incl_in_tariff: "" }, page: 0, pins: [] });
    expect(state).toEqual(defaultClientTariffState);
  });

  it("returns null for corrupt JSON", () => {
    sessionStorage.setItem("narvi_client_tariff_state", "{nope");
    expect(readPersistedClientTariffState()).toBeNull();
  });
});
