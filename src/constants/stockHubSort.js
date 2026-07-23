/** UI submenu options under "Sort by VIA HUB" — each maps to a backend combination sort_by key. */
export const STOCK_HUB_SORT_OPTIONS = [
  {
    value: "origin_ap_destination",
    sortBy: "origin_ap_destination",
    sortField: "ap_destination_new",
    label: "ORIGIN + AP DESTINATION",
    description:
      "Only rows with Origin + AP Destination; sorted by AP Destination (A–Z).",
  },
  {
    value: "via_hub",
    sortBy: "via_hub",
    sortField: "via_hub",
    label: "VIA HUB 1",
    description: "Only rows with Via Hub 1; sorted by Via Hub 1 (A–Z).",
  },
  {
    value: "via_hub_ap_destination",
    sortBy: "via_hub_ap_destination",
    sortField: "ap_destination_new",
    label: "VIA HUB 1 + AP DESTINATION",
    description:
      "Only rows with Via Hub 1 + AP Destination; sorted by AP Destination (A–Z).",
  },
  {
    value: "via_hub_via_hub2",
    sortBy: "via_hub_via_hub2",
    sortField: "via_hub2",
    label: "VIA HUB 1 + VIA HUB 2",
    description:
      "Only rows with Via Hub 1 + Via Hub 2; sorted by Via Hub 2 (A–Z).",
  },
  {
    value: "via_hub_via_hub2_ap_destination",
    sortBy: "via_hub_via_hub2_ap_destination",
    sortField: "ap_destination_new",
    label: "VIA HUB 1 + VIA HUB 2 + AP DESTINATION",
    description:
      "Only rows with Via Hub 1 + Via Hub 2 + AP Destination; sorted by AP Destination (A–Z).",
  },
];

export const STOCK_HUB_SORT_VALUES = new Set(
  STOCK_HUB_SORT_OPTIONS.map((option) => option.value)
);

/** Backend sort_by combination keys used by hub submenu options. */
export const STOCK_HUB_API_SORT_VALUES = new Set(
  STOCK_HUB_SORT_OPTIONS.map((option) => option.sortBy)
);

const LEGACY_UI_VALUE_ALIASES = {
  via_hub1_via_hub2: "via_hub_via_hub2",
  via_hub1_via_hub2_ap_destination: "via_hub_via_hub2_ap_destination",
};

export const isStockHubSortOption = (value) =>
  value != null && STOCK_HUB_SORT_VALUES.has(String(value));

export const normalizeStockHubSortOption = (value) => {
  if (value == null) return null;
  const str = String(value);
  if (STOCK_HUB_SORT_VALUES.has(str)) return str;
  return LEGACY_UI_VALUE_ALIASES[str] ?? null;
};

export const getStockHubSortOption = (value) => {
  const normalized = normalizeStockHubSortOption(value);
  if (!normalized) return null;
  return STOCK_HUB_SORT_OPTIONS.find((option) => option.value === normalized) ?? null;
};

/** Backend sort_by param for combination hub sorts. */
export const getStockHubSortApiKey = (value) =>
  getStockHubSortOption(value)?.sortBy ?? null;

/** Winning field used for client-side fallback sorting. */
export const getStockHubSortField = (value) =>
  getStockHubSortOption(value)?.sortField ?? null;

export const getStockHubSortLabel = (value) =>
  getStockHubSortOption(value)?.label ?? "";

export const getStockHubSortDescription = (value) =>
  getStockHubSortOption(value)?.description ?? "";
