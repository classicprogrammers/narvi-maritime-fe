import {
  extractClientsFromPayload,
  extractSelectedClient,
  formatClientsHeading,
  formatPortalClientOption,
  getRowClientName,
} from "./portalClients";

describe("portalClients", () => {
  test("formats one name or a joined list", () => {
    expect(
      formatClientsHeading([{ id: 220, name: "Agunsa Europa", client_code: "AGUNSA AGP" }])
    ).toBe("Agunsa Europa");
    expect(
      formatClientsHeading([
        { id: 5138, name: "ACS Freight Services Pte Ltd" },
        { id: 220, name: "Agunsa Europa" },
      ])
    ).toBe("ACS Freight Services Pte Ltd, Agunsa Europa");
    expect(
      formatClientsHeading([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
        { id: 4, name: "D" },
      ])
    ).toBe("4 clients");
  });

  test("reads clients from portal payloads and row objects", () => {
    expect(
      extractClientsFromPayload({
        clients: [{ id: 220, name: "Agunsa Europa", client_code: "AGUNSA AGP" }],
      })
    ).toEqual([{ id: 220, name: "Agunsa Europa", client_code: "AGUNSA AGP" }]);
    expect(getRowClientName({ client: { id: 1, name: "Stock Client" } })).toBe("Stock Client");
    expect(getRowClientName({ client_id: { id: 2, name: "SO Client", client_code: "X" } })).toBe(
      "SO Client"
    );
  });

  test("formats the company selector and reads selected_client", () => {
    expect(
      formatPortalClientOption({
        id: 310,
        name: "Spring Valley Shipping Management Pte Ltd",
        client_code: "SVSM",
      })
    ).toBe("Spring Valley Shipping Management Pte Ltd (SVSM)");
    expect(
      extractSelectedClient({
        clients: [{ id: 262, name: "IMELDA SHIPPING PTE. LTD.", client_code: "IMELDA" }],
        selected_client: {
          id: 310,
          name: "Spring Valley Shipping Management Pte Ltd",
          client_code: "SVSM",
        },
      })
    ).toEqual({
      id: 310,
      name: "Spring Valley Shipping Management Pte Ltd",
      client_code: "SVSM",
    });
    expect(extractSelectedClient({ selected_client: false, clients: [] })).toBeNull();
  });
});
