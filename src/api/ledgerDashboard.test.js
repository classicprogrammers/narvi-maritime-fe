import api from "./axios";
import {
  getDashboardCash,
  getDashboardClientStats,
  getDashboardDestinations,
  getDashboardTurnover,
  getDashboardRegionSales,
  getDashboardClientTurnover,
} from "./ledgerDashboard";
import { dashboardErrorMessage, DASHBOARD_NOT_AVAILABLE_TEXT } from "utils/ledgerDashboardData";

jest.mock("./axios", () => ({ __esModule: true, default: { get: jest.fn() } }));

describe("ledgerDashboard api", () => {
  afterEach(() => jest.clearAllMocks());

  test("cash calls the endpoint with no params and normalises rows", async () => {
    api.get.mockResolvedValue({
      data: {
        status: "success",
        as_of: "2026-11-25",
        agents: {
          total_usd: "120.5",
          overdue_usd: 20,
          rows: [{ agent_id: 1, agent_name: "Agent A", outstanding_usd: "120.5", invoice_count: "2" }],
        },
      },
    });
    const res = await getDashboardCash();
    expect(api.get).toHaveBeenCalledWith("/api/ledger/dashboard/cash", { params: {} });
    expect(res.as_of).toBe("2026-11-25");
    expect(res.agents.total_usd).toBe(120.5);
    expect(res.agents.count).toBe(1);
    expect(res.agents.rows[0]).toEqual({
      agent_id: 1,
      agent_name: "Agent A",
      outstanding_usd: 120.5,
      overdue_usd: 0,
      invoice_count: 2,
      oldest_due_date: null,
    });
    expect(res.clients).toEqual({ total_usd: 0, overdue_usd: 0, count: 0, invoice_count: 0, rows: [] });
  });

  test("cash passes as_of only when given", async () => {
    api.get.mockResolvedValue({ data: { status: "success" } });
    await getDashboardCash({ as_of: " 2026-11-01 " });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/dashboard/cash", { params: { as_of: "2026-11-01" } });
  });

  test("client stats omits empty params and coerces numbers", async () => {
    api.get.mockResolvedValue({
      data: {
        status: "success",
        period: { date_from: "2026-03-01", date_to: "2027-02-28", interval: "month" },
        buckets: [{ key: "2026-03", label: "Mar 2026", date_from: "2026-03-01", date_to: "2026-03-31" }],
        totals: { sale_usd: "100", cost_usd: "60", profit_usd: "40", margin: "0.4" },
        rows: [
          {
            client_id: 7,
            client_name: "ACME",
            sale_usd: "100",
            cost_usd: "60",
            profit_usd: "40",
            margin: null,
            by_bucket: [{ key: "2026-03", sale_usd: "100" }],
          },
        ],
      },
    });
    const res = await getDashboardClientStats({
      date_from: "2026-03-01",
      date_to: "2027-02-28",
      interval: "month",
      client_id: "",
      other: "x",
    });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/dashboard/client-stats", {
      params: { date_from: "2026-03-01", date_to: "2027-02-28", interval: "month" },
    });
    expect(res.totals).toEqual({ sale_usd: 100, cost_usd: 60, profit_usd: 40, margin: 0.4 });
    expect(res.rows[0].margin).toBeNull();
    expect(res.rows[0].by_bucket[0]).toEqual({
      key: "2026-03",
      sale_usd: 100,
      cost_usd: 0,
      profit_usd: 0,
      margin: null,
    });
    expect(res.buckets[0].label).toBe("Mar 2026");
  });

  test("destinations normalises rows and defaults missing arrays", async () => {
    api.get.mockResolvedValue({
      data: {
        status: "success",
        totals: { cost_usd: "5", invoice_count: "2", agent_count: 1 },
        rows: [{ destination: "Piraeus", cost_usd: "5", invoice_count: "2", by_bucket: [{ key: "2026-03", cost_usd: "5" }] }],
      },
    });
    const res = await getDashboardDestinations({ date_from: "2026-03-01", date_to: "2026-03-31", interval: "total" });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/dashboard/destinations", {
      params: { date_from: "2026-03-01", date_to: "2026-03-31", interval: "total" },
    });
    expect(res.buckets).toEqual([]);
    expect(res.totals).toEqual({
      sale_usd: 0,
      cost_usd: 5,
      profit_usd: 0,
      margin: null,
      invoice_count: 2,
      agent_count: 1,
    });
    expect(res.rows[0]).toEqual({
      destination: "Piraeus",
      destination_country: "",
      agent_count: 0,
      invoice_count: 2,
      sale_usd: 0,
      cost_usd: 5,
      profit_usd: 0,
      margin: null,
      by_bucket: [{ key: "2026-03", cost_usd: 5, invoice_count: 0 }],
    });
  });

  test("destinations normalises sale, profit and margin on rows and totals", async () => {
    api.get.mockResolvedValue({
      data: {
        totals: { sale_usd: "100", cost_usd: "60", profit_usd: "-5", margin: "-0.05" },
        rows: [{ destination: "Piraeus", sale_usd: "100", cost_usd: "60", profit_usd: "40", margin: "0.4" }],
      },
    });
    const res = await getDashboardDestinations();
    expect(res.totals).toMatchObject({ sale_usd: 100, cost_usd: 60, profit_usd: -5, margin: -0.05 });
    expect(res.rows[0]).toMatchObject({ sale_usd: 100, cost_usd: 60, profit_usd: 40, margin: 0.4 });
  });

  test("period endpoints expose undated (count + usd numbers) and null when absent", async () => {
    api.get.mockResolvedValue({
      data: { undated: { count: "3", sale_usd: "12.5", cost_usd: null, note: "x" }, totals: {} },
    });
    expect((await getDashboardClientStats()).undated).toEqual({ count: 3, sale_usd: 12.5 });
    expect((await getDashboardDestinations()).undated).toEqual({ count: 3, sale_usd: 12.5 });
    expect((await getDashboardTurnover()).undated).toEqual({ count: 3, sale_usd: 12.5 });
    expect((await getDashboardClientTurnover({ client_id: 1 })).undated).toEqual({ count: 3, sale_usd: 12.5 });
    api.get.mockResolvedValue({ data: { undated: "bad" } });
    expect((await getDashboardTurnover()).undated).toBeNull();
    api.get.mockResolvedValue({ data: {} });
    expect((await getDashboardTurnover()).undated).toBeNull();
  });

  test("available_fy accepts {first,last}, an array or nothing", async () => {
    api.get.mockResolvedValue({ data: { available_fy: { first: "2023", last: 2026 } } });
    expect((await getDashboardTurnover()).available_fy).toEqual({ first: 2023, last: 2026 });
    api.get.mockResolvedValue({ data: { available_fy: [2025, 2023, 2024] } });
    expect((await getDashboardClientStats()).available_fy).toEqual({ first: 2023, last: 2025 });
    api.get.mockResolvedValue({ data: { available_fy: {} } });
    expect((await getDashboardTurnover()).available_fy).toBeNull();
    api.get.mockResolvedValue({ data: {} });
    expect((await getDashboardDestinations()).available_fy).toBeNull();
  });

  test("undated accepts the { sale, cost } shape", async () => {
    api.get.mockResolvedValue({
      data: { undated: { sale: { count: "2", usd: "50" }, cost: { count: 1, usd: 5 } } },
    });
    expect((await getDashboardTurnover()).undated).toEqual({
      count: 3,
      sale: { count: 2, usd: 50 },
      cost: { count: 1, usd: 5 },
    });
    api.get.mockResolvedValue({ data: { undated: { sale: {} } } });
    expect((await getDashboardTurnover()).undated).toEqual({
      count: 0,
      sale: { count: 0, usd: 0 },
      cost: { count: 0, usd: 0 },
    });
  });

  test("available_fy accepts { from, to, fys } and falls back to numeric from/to", async () => {
    api.get.mockResolvedValue({
      data: {
        available_fy: {
          from: "2023-03-01",
          to: "2026-02-28",
          from_label: "2023/24",
          to_label: "2025/26",
          fys: [{ fy: 2024, label: "2024/25" }, { fy: 2023, label: "2023/24" }, { fy: 2025, label: "2025/26" }],
        },
      },
    });
    expect((await getDashboardTurnover()).available_fy).toEqual({ first: 2023, last: 2025 });
    api.get.mockResolvedValue({ data: { available_fy: { from: 2022, to: 2024 } } });
    expect((await getDashboardTurnover()).available_fy).toEqual({ first: 2022, last: 2024 });
    api.get.mockResolvedValue({ data: { available_fy: { from: "2022-03-01", to: "x", fys: [] } } });
    expect((await getDashboardTurnover()).available_fy).toBeNull();
  });

  test("buckets (new name) is exposed as by_bucket on rows, vessels and totals", async () => {
    api.get.mockResolvedValue({
      data: {
        totals: { sale_usd: 10, buckets: [{ key: "2025-Q1", sale_usd: 10 }] },
        rows: [
          { client_id: 1, destination: "X", buckets: [{ key: "2025-Q1", sale_usd: "4", cost_usd: "2", invoice_count: 1 }] },
        ],
        vessels: [{ vessel_id: 2, buckets: [{ key: "2025-Q2", sale_usd: "7", margin: null }] }],
      },
    });
    const stats = await getDashboardClientStats();
    expect(stats.rows[0].by_bucket).toEqual([
      { key: "2025-Q1", sale_usd: 4, cost_usd: 2, profit_usd: 0, margin: null },
    ]);
    expect(stats.totals.by_bucket[0]).toMatchObject({ key: "2025-Q1", sale_usd: 10 });
    expect((await getDashboardDestinations()).rows[0].by_bucket).toEqual([
      { key: "2025-Q1", cost_usd: 2, invoice_count: 1 },
    ]);
    const ct = await getDashboardClientTurnover({ client_id: 1 });
    expect(ct.vessels[0].by_bucket[0]).toMatchObject({ key: "2025-Q2", sale_usd: 7, margin: null });
    expect(ct.totals.by_bucket[0]).toMatchObject({ key: "2025-Q1", sale_usd: 10 });
  });

  test("cash accepts totals blocks and alternative row field names", async () => {
    api.get.mockResolvedValue({
      data: {
        as_of: "2026-11-25",
        agents: {
          totals: { outstanding_usd: "100", overdue_usd: "40", invoice_count: "3" },
          rows: [{ id: 5, name: "Agent B", total_usd: "100", overdue_usd: "40", count: 3 }],
        },
        clients: { totals: { total_usd: 7, count: 1 }, rows: [] },
      },
    });
    const res = await getDashboardCash();
    expect(res.agents).toEqual({
      total_usd: 100,
      overdue_usd: 40,
      count: 1,
      invoice_count: 3,
      rows: [
        { agent_id: 5, agent_name: "Agent B", outstanding_usd: 100, overdue_usd: 40, invoice_count: 3, oldest_due_date: null },
      ],
    });
    expect(res.clients).toEqual({ total_usd: 7, overdue_usd: 0, count: 1, invoice_count: 0, rows: [] });
    api.get.mockResolvedValue({ data: { agents: { totals: null, rows: null } } });
    expect((await getDashboardCash()).agents).toEqual({ total_usd: 0, overdue_usd: 0, count: 0, invoice_count: 0, rows: [] });
  });

  test("region sales builds regions from FY entries with monthly region fields", async () => {
    api.get.mockResolvedValue({
      data: {
        years: [
          {
            fy: 2025,
            months: [
              { key: "2025-03", singapore_usd: "10", greece_usd: "5", unassigned_usd: "1", total_usd: "16" },
              { key: "2025-04", singapore_usd: 2, greece_usd: 0, unassigned_usd: 2, total_usd: 4 },
            ],
          },
          { fy: 2026, label: "2026/27", months: [{ key: "2026-03", singapore_usd: 1, unassigned_usd: 1 }] },
        ],
      },
    });
    const res = await getDashboardRegionSales();
    expect(res.regions.map((r) => r.key)).toEqual(["singapore", "greece"]);
    expect(res.regions[0].years[0]).toEqual({
      fy: 2025,
      label: "2025/26",
      total_usd: 12,
      months: [
        { key: "2025-03", sale_usd: 10 },
        { key: "2025-04", sale_usd: 2 },
      ],
    });
    expect(res.regions[1].years[0].total_usd).toBe(5);
    expect(res.regions[0].years[1].label).toBe("2026/27");
    expect(res.unassigned.total_usd).toBe(4);
  });

  test("region sales reads `fys`, a top-level months list, and never throws on unknown nesting", async () => {
    api.get.mockResolvedValue({
      data: { fys: [{ fy: 2024, months: [{ month: "2024-03", singapore_usd: 3 }] }] },
    });
    expect((await getDashboardRegionSales()).regions[0].years[0].months).toEqual([{ key: "2024-03", sale_usd: 3 }]);
    api.get.mockResolvedValue({ data: { fy: 2024, months: [{ key: "2024-03", greece_usd: 4 }] } });
    expect((await getDashboardRegionSales()).regions[1].years[0].total_usd).toBe(4);
    api.get.mockResolvedValue({ data: { years: [{ fy: 2024, months: [{ foo: 1 }] }, null, "x"] } });
    expect(await getDashboardRegionSales()).toEqual({ regions: [], unassigned: { total_usd: 0 }, available_fy: null });
    api.get.mockResolvedValue({ data: { years: "nope" } });
    expect(await getDashboardRegionSales()).toEqual({ regions: [], unassigned: { total_usd: 0 }, available_fy: null });
  });

  test("cash real response: agent / client names, false due date, agent_count / client_count", async () => {
    api.get.mockResolvedValue({
      data: {
        status: "success",
        as_of: "2026-11-25",
        agents: {
          totals: { outstanding_usd: 5000.5, overdue_usd: 1200, invoice_count: 7, agent_count: 2 },
          rows: [
            { agent_id: 3, agent: "Agent One", outstanding_usd: 4000.5, overdue_usd: 1200, invoice_count: 5, oldest_due_date: "2026-09-01" },
            { agent_id: 4, agent: "Agent Two", outstanding_usd: 1000, overdue_usd: 0, invoice_count: 2, oldest_due_date: false },
          ],
        },
        clients: {
          totals: { outstanding_usd: 90, overdue_usd: 0, invoice_count: 1, client_count: 1 },
          rows: [{ client_id: 9, client: "Client One", outstanding_usd: 90, overdue_usd: 0, invoice_count: 1, oldest_due_date: false }],
        },
      },
    });
    const res = await getDashboardCash();
    expect(res.as_of).toBe("2026-11-25");
    expect(res.agents).toMatchObject({ total_usd: 5000.5, overdue_usd: 1200, count: 2, invoice_count: 7 });
    expect(res.agents.rows[0]).toMatchObject({ agent_id: 3, agent_name: "Agent One", oldest_due_date: "2026-09-01" });
    expect(res.agents.rows[1]).toMatchObject({ agent_name: "Agent Two", oldest_due_date: null });
    expect(res.clients).toMatchObject({ total_usd: 90, count: 1, invoice_count: 1 });
    expect(res.clients.rows[0]).toMatchObject({ client_id: 9, client_name: "Client One", oldest_due_date: null });
  });

  test("client stats real response: top-level period, client name, empty buckets, totals buckets", async () => {
    const empty = { key: "2025-04", sale_usd: 0, cost_usd: 0, profit_usd: 0, margin: null };
    api.get.mockResolvedValue({
      data: {
        status: "success",
        date_from: "2025-03-01",
        date_to: "2025-04-30",
        interval: "month",
        buckets: [
          { key: "2025-03", label: "Mar 2025", date_from: "2025-03-01", date_to: "2025-03-31" },
          { key: "2025-04", label: "Apr 2025", date_from: "2025-04-01", date_to: "2025-04-30" },
        ],
        totals: {
          sale_usd: 100,
          cost_usd: 60,
          profit_usd: 40,
          margin: 0.4,
          buckets: [{ key: "2025-03", sale_usd: 100, cost_usd: 60, profit_usd: 40, margin: 0.4 }, empty],
        },
        rows: [
          {
            client_id: 7,
            client: "ACME",
            sale_usd: 100,
            cost_usd: 60,
            profit_usd: 40,
            margin: 0.4,
            buckets: [{ key: "2025-03", sale_usd: 100, cost_usd: 60, profit_usd: 40, margin: 0.4 }, empty],
          },
        ],
        undated: { sale: { count: 1, usd: 10 }, cost: { count: 0, usd: 0 } },
        available_fy: { from: "2023-03-01", to: "2026-02-28", from_label: "2023/24", to_label: "2025/26", fys: [{ fy: 2023, label: "2023/24" }, { fy: 2025, label: "2025/26" }] },
      },
    });
    const res = await getDashboardClientStats();
    expect(res.period).toEqual({ date_from: "2025-03-01", date_to: "2025-04-30", interval: "month" });
    expect(res.rows[0]).toMatchObject({ client_id: 7, client_name: "ACME" });
    expect(res.rows[0].by_bucket[1]).toEqual(empty);
    expect(res.totals.by_bucket).toHaveLength(2);
    expect(res.undated.count).toBe(1);
    expect(res.available_fy).toEqual({ first: 2023, last: 2025 });
    for (const fn of [getDashboardDestinations, getDashboardTurnover, getDashboardClientTurnover]) {
      expect((await fn({ client_id: 1 })).period).toEqual({ date_from: "2025-03-01", date_to: "2025-04-30", interval: "month" });
    }
  });

  test("destinations and vessels accept alternative name fields", async () => {
    api.get.mockResolvedValue({
      data: {
        rows: [{ destination_name: "Piraeus", country: "Greece", sale_usd: 1 }],
        vessels: [{ vessel_id: 3, vessel: "MV One" }, { name: "MV Two" }],
      },
    });
    const d = (await getDashboardDestinations()).rows[0];
    expect(d).toMatchObject({ destination: "Piraeus", destination_country: "Greece" });
    const v = (await getDashboardClientTurnover({ client_id: 1 })).vessels;
    expect(v[0]).toMatchObject({ vessel_id: 3, vessel_name: "MV One" });
    expect(v[1].vessel_name).toBe("MV Two");
  });

  test("region sales real response: regions as strings, fys with months and totals", async () => {
    api.get.mockResolvedValue({
      data: {
        status: "success",
        regions: ["singapore", "greece"],
        fys: [
          {
            fy: 2025,
            label: "2025/26",
            date_from: "2025-03-01",
            date_to: "2026-02-28",
            months: [
              { key: "2025-03", label: "Mar", singapore_usd: 10, greece_usd: 5, unassigned_usd: 1, total_usd: 16 },
              { key: "2025-04", label: "Apr", singapore_usd: 0, greece_usd: 0, unassigned_usd: 0, total_usd: 0 },
            ],
            totals: { singapore_usd: 12, greece_usd: 6, unassigned_usd: 3, total_usd: 21 },
          },
          {
            fy: 2026,
            label: "2026/27",
            months: [{ key: "2026-03", label: "Mar", singapore_usd: 0, greece_usd: 0, unassigned_usd: 0, total_usd: 0 }],
            totals: { singapore_usd: 0, greece_usd: 0, unassigned_usd: 0, total_usd: 0 },
          },
        ],
        available_fy: { from: "2025-03-01", to: "2027-02-28", fys: [{ fy: 2025, label: "2025/26" }, { fy: 2026, label: "2026/27" }] },
      },
    });
    const res = await getDashboardRegionSales({ fys: [2025, 2026] });
    expect(res.regions.map((r) => r.key)).toEqual(["singapore", "greece"]);
    expect(res.regions[0].years[0]).toEqual({
      fy: 2025,
      label: "2025/26",
      total_usd: 12,
      months: [
        { key: "2025-03", sale_usd: 10 },
        { key: "2025-04", sale_usd: 0 },
      ],
    });
    expect(res.regions[1].years[0].total_usd).toBe(6);
    expect(res.regions[1].years[1].total_usd).toBe(0);
    expect(res.unassigned.total_usd).toBe(3);
    expect(res.available_fy).toEqual({ first: 2025, last: 2026 });
  });

  test("turnover reads the result wrapper and defaults missing arrays", async () => {
    api.get.mockResolvedValue({
      data: { result: { status: "success", totals: { sale_usd: 10 }, series: [{ key: "2026-03", sale_usd: "10" }] } },
    });
    const res = await getDashboardTurnover({ interval: "month" });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/dashboard/turnover", { params: { interval: "month" } });
    expect(res.totals).toEqual({ sale_usd: 10, cost_usd: 0, profit_usd: 0, margin: null });
    expect(res.series[0].sale_usd).toBe(10);
    expect(res.buckets).toEqual([]);
  });

  test("turnover with an empty payload returns safe defaults", async () => {
    api.get.mockResolvedValue({ data: {} });
    const res = await getDashboardTurnover();
    expect(res.series).toEqual([]);
    expect(res.period).toEqual({ date_from: null, date_to: null, interval: null });
  });

  test("region sales sends repeated fy numbers and normalises regions", async () => {
    api.get.mockResolvedValue({
      data: {
        status: "success",
        regions: [
          {
            key: "singapore",
            label: "Singapore",
            years: [{ fy: "2024", label: "2024/25", total_usd: "9", months: [{ key: "2024-03", sale_usd: "9" }] }],
          },
          { key: "greece" },
        ],
        unassigned: { total_usd: "3" },
      },
    });
    const res = await getDashboardRegionSales({ fys: ["2024", 2025, "", null] });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/dashboard/region-sales", { params: { fy: [2024, 2025] } });
    expect(res.regions[0].years[0]).toEqual({
      fy: 2024,
      label: "2024/25",
      total_usd: 9,
      months: [{ key: "2024-03", sale_usd: 9 }],
    });
    expect(res.regions[1]).toEqual({ key: "greece", label: "greece", years: [] });
    expect(res.unassigned.total_usd).toBe(3);
  });

  test("region sales omits fy when none are given", async () => {
    api.get.mockResolvedValue({ data: { status: "success" } });
    const res = await getDashboardRegionSales();
    expect(api.get).toHaveBeenCalledWith("/api/ledger/dashboard/region-sales", { params: {} });
    expect(res).toEqual({ regions: [], unassigned: { total_usd: 0 }, available_fy: null });
  });

  test("region sales returns available_fy for the old region-object shape too", async () => {
    api.get.mockResolvedValue({
      data: { regions: [{ key: "singapore", years: [] }], available_fy: { first: 2023, last: 2026 } },
    });
    expect((await getDashboardRegionSales()).available_fy).toEqual({ first: 2023, last: 2026 });
  });

  test("turnover exposes series from totals.buckets, then totals.by_bucket, then keyed rows", async () => {
    const bucket = { key: "2025-03", sale_usd: 100, cost_usd: 60, profit_usd: 40, margin: 0.4 };
    api.get.mockResolvedValue({ data: { totals: { sale_usd: 100, buckets: [bucket] } } });
    let res = await getDashboardTurnover();
    expect(res.series).toEqual([bucket]);
    expect(res.totals.sale_usd).toBe(100);
    expect(res.totals.by_bucket).toEqual([bucket]);
    api.get.mockResolvedValue({ data: { totals: { by_bucket: [bucket] } } });
    expect((await getDashboardTurnover()).series).toEqual([bucket]);
    api.get.mockResolvedValue({ data: { rows: [bucket, { name: "no key" }] } });
    expect((await getDashboardTurnover()).series).toEqual([bucket]);
    api.get.mockResolvedValue({
      data: { series: [{ ...bucket, sale_usd: 1 }], totals: { buckets: [bucket] } },
    });
    res = await getDashboardTurnover();
    expect(res.series[0].sale_usd).toBe(1);
  });

  test("client turnover sends client_id and keeps a null vessel id", async () => {
    api.get.mockResolvedValue({
      data: {
        status: "success",
        client: { id: 4, name: "ACME" },
        vessels: [{ vessel_id: null, vessel_name: "No vessel", sale_usd: "8", cost_usd: "3", profit_usd: "5", margin: "0.625" }],
      },
    });
    const res = await getDashboardClientTurnover({
      client_id: 4,
      date_from: "2026-03-01",
      date_to: "2027-02-28",
      interval: "quarter",
    });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/dashboard/client-turnover", {
      params: { client_id: 4, date_from: "2026-03-01", date_to: "2027-02-28", interval: "quarter" },
    });
    expect(res.client).toEqual({ id: 4, name: "ACME" });
    expect(res.vessels[0]).toEqual({
      vessel_id: null,
      vessel_name: "No vessel",
      sale_usd: 8,
      cost_usd: 3,
      profit_usd: 5,
      margin: 0.625,
      by_bucket: [],
    });
  });

  test("destinations real response: agent / invoice counts per row and bucket, undated cost", async () => {
    const buckets = [
      { key: "2025-Q1", label: "Q1 2025", date_from: "2025-03-01", date_to: "2025-05-31" },
      { key: "2025-Q2", label: "Q2 2025", date_from: "2025-06-01", date_to: "2025-08-31" },
    ];
    api.get.mockResolvedValue({
      data: {
        status: "success",
        date_from: "2025-03-01",
        date_to: "2025-08-31",
        interval: "quarter",
        buckets,
        totals: {
          sale_usd: 300,
          cost_usd: 200,
          profit_usd: 100,
          margin: 0.3333,
          agent_count: 2,
          invoice_count: 5,
          buckets: [
            { key: "2025-Q1", cost_usd: 120, agent_count: 2, invoice_count: 3 },
            { key: "2025-Q2", cost_usd: 80, agent_count: 1, invoice_count: 2 },
          ],
        },
        rows: [
          {
            destination: "Piraeus",
            agent_count: 2,
            invoice_count: 5,
            sale_usd: 300,
            cost_usd: 200,
            profit_usd: 100,
            margin: 0.3333,
            buckets: [
              { key: "2025-Q1", cost_usd: 120, agent_count: 2, invoice_count: 3 },
              { key: "2025-Q2", cost_usd: 80, agent_count: 1, invoice_count: 2 },
            ],
          },
        ],
        undated: { sale: { count: 0, usd: 0 }, cost: { count: 2, usd: 40 } },
      },
    });
    const res = await getDashboardDestinations({ interval: "quarter" });
    expect(res.period.interval).toBe("quarter");
    expect(res.buckets.map((b) => b.key)).toEqual(["2025-Q1", "2025-Q2"]);
    expect(res.totals).toMatchObject({ sale_usd: 300, cost_usd: 200, profit_usd: 100, margin: 0.3333, agent_count: 2, invoice_count: 5 });
    expect(res.totals.by_bucket).toHaveLength(2);
    expect(res.rows[0]).toMatchObject({
      destination: "Piraeus",
      destination_country: "",
      agent_count: 2,
      invoice_count: 5,
      margin: 0.3333,
    });
    expect(res.rows[0].by_bucket.map((b) => [b.key, b.cost_usd, b.invoice_count])).toEqual([
      ["2025-Q1", 120, 3],
      ["2025-Q2", 80, 2],
    ]);
    expect(res.undated).toEqual({ count: 2, sale: { count: 0, usd: 0 }, cost: { count: 2, usd: 40 } });
  });

  test("client turnover real response: rows (not vessels), vessel_id false -> null, No vessel row with a total bucket", async () => {
    const buckets = [
      { key: "2025-Q1", label: "Q1 2025", date_from: "2025-03-01", date_to: "2025-05-31" },
      { key: "2025-Q2", label: "Q2 2025", date_from: "2025-06-01", date_to: "2025-08-31" },
    ];
    api.get.mockResolvedValue({
      data: {
        status: "success",
        date_from: "2025-03-01",
        date_to: "2025-08-31",
        interval: "quarter",
        client: { id: 4, name: "ACME" },
        buckets,
        totals: {
          sale_usd: 150,
          cost_usd: 90,
          profit_usd: 60,
          margin: 0.4,
          buckets: [
            { key: "2025-Q1", sale_usd: 100, cost_usd: 60, profit_usd: 40, margin: 0.4 },
            { key: "2025-Q2", sale_usd: 0, cost_usd: 0, profit_usd: 0, margin: null },
          ],
        },
        rows: [
          {
            vessel_id: 12,
            vessel: "MV One",
            sale_usd: 100,
            cost_usd: 60,
            profit_usd: 40,
            margin: 0.4,
            buckets: [
              { key: "2025-Q1", sale_usd: 100, cost_usd: 60, profit_usd: 40, margin: 0.4 },
              { key: "2025-Q2", sale_usd: 0, cost_usd: 0, profit_usd: 0, margin: null },
            ],
          },
          {
            vessel_id: false,
            vessel: "No vessel",
            sale_usd: 50,
            cost_usd: 30,
            profit_usd: 20,
            margin: 0.4,
            buckets: [{ key: "total", sale_usd: 50, cost_usd: 30, profit_usd: 20, margin: 0.4 }],
          },
        ],
        undated: { sale: { count: 1, usd: 5 }, cost: { count: 0, usd: 0 } },
      },
    });
    const res = await getDashboardClientTurnover({ client_id: 4, interval: "quarter" });
    expect(res.client).toEqual({ id: 4, name: "ACME" });
    expect(res.vessels).toHaveLength(2);
    expect(res.vessels[0]).toMatchObject({ vessel_id: 12, vessel_name: "MV One", sale_usd: 100 });
    expect(res.vessels[1]).toMatchObject({ vessel_id: null, vessel_name: "No vessel", sale_usd: 50, cost_usd: 30 });
    expect(res.vessels[1].by_bucket).toEqual([
      { key: "total", sale_usd: 50, cost_usd: 30, profit_usd: 20, margin: 0.4 },
    ]);
    expect(res.totals).toMatchObject({ sale_usd: 150, cost_usd: 90, profit_usd: 60, margin: 0.4 });
    expect(res.totals.by_bucket).toHaveLength(2);
    expect(res.undated.sale).toEqual({ count: 1, usd: 5 });
  });

  test("a server error message is thrown", async () => {
    api.get.mockResolvedValue({ data: { status: "error", message: "client_id is required" } });
    await expect(getDashboardClientTurnover({})).rejects.toThrow("client_id is required");
    api.get.mockResolvedValue({ data: { result: { status: "error", message: "Bad range" } } });
    await expect(getDashboardTurnover({})).rejects.toThrow("Bad range");
  });

  test("an HTTP error keeps response.status", async () => {
    const err = Object.assign(new Error("Not Found"), { response: { status: 404 } });
    api.get.mockRejectedValue(err);
    await expect(getDashboardCash()).rejects.toMatchObject({ response: { status: 404 } });
  });

  test("HTTP 400 shows the server message, 404 keeps the not-available text", async () => {
    const bad = Object.assign(new Error("Request failed with status code 400"), {
      response: { status: 400, data: { status: "error", message: "client_id is required" } },
    });
    api.get.mockRejectedValue(bad);
    const caught = await getDashboardClientTurnover({}).catch((e) => e);
    expect(dashboardErrorMessage(caught)).toBe("client_id is required");
    expect(dashboardErrorMessage({ response: { status: 404, data: { message: "x" } } })).toBe(
      DASHBOARD_NOT_AVAILABLE_TEXT
    );
  });
});
