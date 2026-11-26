import {
  buildSoaRows,
  buildSoaTable,
  listSoaCurrencies,
  soaFilenameBase,
  soaGrandTotal,
} from "./soaReport";

const inv = (over = {}) => ({
  id: 1,
  client: "SPRING VALLEY",
  currency_code: "USD",
  date_sales_invoice: "2026-03-10",
  invoice_number: "INV-1",
  client_case_invoice_ref: "REF-1",
  vessel_name: "MV One",
  date_due: "2026-04-09",
  currency_amount: "1000",
  invoice_balance: "400.10",
  ...over,
});

describe("listSoaCurrencies", () => {
  it("returns sorted unique codes", () => {
    expect(
      listSoaCurrencies([inv(), inv({ currency_code: "EUR" }), inv({ currency_code: "USD" }), inv({ currency_code: false })])
    ).toEqual(["EUR", "USD"]);
  });
});

describe("buildSoaRows", () => {
  it("keeps one currency only", () => {
    const rows = buildSoaRows([inv(), inv({ id: 2, currency_code: "EUR" })], { currency: "USD", asOfDate: "2026-12-31" });
    expect(rows.map((r) => r.id)).toEqual([1]);
  });

  it("drops invoices dated after the SOA date, keeps the boundary day", () => {
    const rows = buildSoaRows(
      [inv({ id: 1, date_sales_invoice: "2026-03-10" }), inv({ id: 2, date_sales_invoice: "2026-03-11" })],
      { currency: "USD", asOfDate: "2026-03-10" }
    );
    expect(rows.map((r) => r.id)).toEqual([1]);
  });

  it("drops paid, zero-balance and cancelled invoices", () => {
    const rows = buildSoaRows(
      [
        inv({ id: 1 }),
        inv({ id: 2, invoice_balance: 0 }),
        inv({ id: 3, invoice_balance: false }),
        inv({ id: 4, state: "cancelled" }),
        inv({ id: 5, is_cancelled: true }),
      ],
      { currency: "USD", asOfDate: "2026-12-31" }
    );
    expect(rows.map((r) => r.id)).toEqual([1]);
  });

  it("sorts by client then invoice date and maps many2one names", () => {
    const rows = buildSoaRows(
      [
        inv({ id: 1, client: "", client_id: [9, "ZETA"], date_sales_invoice: "2026-01-02" }),
        inv({ id: 2, client: "ALPHA", date_sales_invoice: "2026-02-01" }),
        inv({ id: 3, client: "ALPHA", date_sales_invoice: "2026-01-01" }),
      ],
      { currency: "USD", asOfDate: "2026-12-31" }
    );
    expect(rows.map((r) => r.id)).toEqual([3, 2, 1]);
    expect(rows[2].client).toBe("ZETA");
  });
});

describe("grand total and table", () => {
  it("sums without float drift", () => {
    const rows = buildSoaRows(
      [inv({ id: 1, invoice_balance: "0.1" }), inv({ id: 2, invoice_balance: "0.2", invoice_number: "INV-2" })],
      { currency: "USD" }
    );
    expect(soaGrandTotal(rows).balance).toBe(0.3);
  });

  it("builds head, body and a grand total row", () => {
    const rows = buildSoaRows([inv()], { currency: "USD" });
    const table = buildSoaTable(rows);
    expect(table.head).toHaveLength(9);
    expect(table.body[0][2]).toBe("10/03/2026");
    expect(table.body[0][8]).toBe("400.10");
    expect(table.totalRow[0]).toBe("Grand Total");
    expect(table.totalRow[8]).toBe("400.10");
  });
});

describe("soaFilenameBase", () => {
  it("joins the parts safely", () => {
    expect(soaFilenameBase({ currency: "USD", asOfDate: "2026-03-31", clientName: "Spring Valley Ltd." })).toBe(
      "SOA-Spring-Valley-Ltd.-USD-2026-03-31"
    );
  });
});
