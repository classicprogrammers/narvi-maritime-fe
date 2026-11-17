import {
  buildTypeSections,
  groupRowsByGroupName,
  exportScopeProblem,
  isIfApplyRow,
  sectionsToSheetRows,
  uniqueCurrencies,
} from "./clientTariffSections";

const rate = (id, charge_category, group_name) => ({ id, charge_category, group_name, name: `Rate ${id}` });
const toBody = (rows) => rows.map((row) => [row.name]);
const head = ["Rate Name"];

describe("clientTariffSections", () => {
  test("If Apply and DOB If Apply are conditional charges", () => {
    expect(isIfApplyRow({ charge_category: "if_apply" })).toBe(true);
    expect(isIfApplyRow({ charge_category: "dob_if_apply" })).toBe(true);
    expect(isIfApplyRow({ charge_category: "standard" })).toBe(false);
    expect(isIfApplyRow({ charge_category: "dob_standard" })).toBe(false);
    expect(isIfApplyRow({})).toBe(false);
    expect(isIfApplyRow(undefined)).toBe(false);
  });

  test("Standard charges first, then one If Apply list, in the order the backend sent", () => {
    const rows = [
      rate(1, "dob_standard"),
      rate(2, "standard"),
      rate(3, "if_apply", "Import via A/F"),
      rate(4, "dob_if_apply", "Import via C/F"),
      rate(5, "if_apply", "Import via A/F"),
      rate(6, "dob_if_apply", false),
    ];
    const sections = buildTypeSections({ rows, head, toBody });
    expect(sections.map((section) => section.title)).toEqual(["Standard charges", "If Apply charges"]);
    expect(sections[0].body).toEqual([["Rate 1"], ["Rate 2"]]);
    expect(sections[1].body).toEqual([
      ["Import via A/F"], ["Rate 3"], ["Rate 5"], ["Import via C/F"], ["Rate 4"], ["Other charges"], ["Rate 6"],
    ]);
    expect(sections[0].head).toBe(head);
    expect(groupRowsByGroupName([]).length).toBe(0);
  });

  test("sections become sheet rows with a title, headings and a blank row", () => {
    const sections = buildTypeSections({ rows: [rate(1, "standard")], head, toBody });
    expect(sectionsToSheetRows(sections)).toEqual([["Standard charges"], head, ["Rate 1"], []]);
  });

  test("a part without rates is left out", () => {
    const only = buildTypeSections({ rows: [rate(1, "standard")], head, toBody });
    expect(only.map((section) => section.title)).toEqual(["Standard charges"]);
    expect(buildTypeSections({ rows: [], head, toBody })).toEqual([]);
  });

  test("lists the different currencies once, from either currency field", () => {
    expect(uniqueCurrencies([{ currency: "SGD" }, { currency: "SGD" }])).toEqual(["SGD"]);
    expect(uniqueCurrencies([{ currency: "SGD" }, { currency_id: { name: "USD" } }, { currency: "" }])).toEqual([
      "SGD",
      "USD",
    ]);
    expect(uniqueCurrencies([{}, { currency: false }])).toEqual([]);
    expect(uniqueCurrencies([])).toEqual([]);
  });
});

describe("exportScopeProblem", () => {
  test("a client tariff export needs one agent and one location", () => {
    expect(exportScopeProblem({ agent_id: "3", location: "RTM" })).toBe("");
    expect(exportScopeProblem({ agent_id: "", location: "RTM" })).toBe("Select an agent to export.");
    expect(exportScopeProblem({ agent_id: "3", location: "" })).toBe("Select a location to export.");
    expect(exportScopeProblem({})).toBe("Select an agent and a location to export.");
  });
});
