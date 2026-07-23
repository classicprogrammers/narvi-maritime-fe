import {
  getStockHubSortApiKey,
  getStockHubSortDescription,
  getStockHubSortLabel,
  isStockHubSortOption,
} from "../constants/stockHubSort";

const SORT_OPTION_LABELS = {
  via_vessel: "Sort: VIA VESSEL",
  status: "Sort: Stock Status",
  via_hub_status: "Sort: VIA HUB + Status",
  via_vessel_status: "Sort: VIA VESSEL + Status",
  via_vessel_via_hub_status: "Sort: VIA VESSEL + VIA HUB + Status",
  none: "Select Sort Option",
};

const CLIENT_SORT_OPTION_LABELS = {
  via_vessel: "Sorting: VIA VESSEL (Alphabetically)",
  status: "Sorting: Stock Status",
  via_hub_status: "Sorting: VIA HUB + Status",
  via_vessel_status: "Sorting: VIA VESSEL + Status",
  via_vessel_via_hub_status: "Sorting: VIA VESSEL + VIA HUB + Status",
  none: "Sorting: No Sort",
};

/** Map UI sortOption to backend sort_by param. */
export const mapStockSortOptionToApiSortBy = (sortOption) => {
  if (!sortOption || sortOption === "none") return undefined;

  const hubApiKey = getStockHubSortApiKey(sortOption);
  if (hubApiKey) return hubApiKey;

  if (sortOption === "via_vessel") return "vessel_name";
  if (sortOption === "status") return "stock_status";
  if (sortOption === "via_hub_status") return "via_hub_status";
  if (sortOption === "via_vessel_status") return "vessel_status";
  if (sortOption === "via_vessel_via_hub_status") return "vessel_via_hub_status";

  return sortOption;
};

export const isApiDrivenStockSortOption = (sortOption) =>
  sortOption != null && sortOption !== "none";

export const getStockSortButtonLabel = (sortOption) => {
  if (!sortOption || sortOption === "none") return SORT_OPTION_LABELS.none;
  if (isStockHubSortOption(sortOption)) {
    return `Sort: ${getStockHubSortLabel(sortOption)}`;
  }
  return SORT_OPTION_LABELS[sortOption] ?? "Select Sort Option";
};

export const getClientStockSortButtonLabel = (sortOption) => {
  if (!sortOption || sortOption === "none") return CLIENT_SORT_OPTION_LABELS.none;
  if (isStockHubSortOption(sortOption)) {
    return `Sorting: ${getStockHubSortLabel(sortOption)}`;
  }
  return CLIENT_SORT_OPTION_LABELS[sortOption] ?? CLIENT_SORT_OPTION_LABELS.none;
};

export const getStockSortDescription = (sortOption) => {
  if (isStockHubSortOption(sortOption)) {
    return getStockHubSortDescription(sortOption);
  }
  if (sortOption === "via_vessel") {
    return "VIA VESSEL (alphabetically by vessel name)";
  }
  if (sortOption === "status") {
    return "Stock Status - Pending → Stock → In Transit → Arrived Destination → On a Shipping Instruction → On a Delivery Instruction";
  }
  if (sortOption === "via_hub_status") {
    return "1st: Effective hub (A–Z, pickup rules: AP Destination → Hub 2 → Hub 1)\n2nd: Stock Status - Pending → Stock → In Transit → Arrived Destination → On a Shipping Instruction → On a Delivery Instruction";
  }
  if (sortOption === "via_vessel_status") {
    return "1st: VIA VESSEL (alphabetically by vessel name)\n2nd: Stock Status - Pending → Stock → In Transit → Arrived Destination → On a Shipping Instruction → On a Delivery Instruction";
  }
  if (sortOption === "via_vessel_via_hub_status") {
    return "1st: VIA VESSEL (alphabetically by vessel name)\n2nd: Effective hub (A–Z, pickup rules: AP Destination → Hub 2 → Hub 1)\n3rd: Stock Status - Pending → Stock → In Transit → Arrived Destination → On a Shipping Instruction → On a Delivery Instruction";
  }
  return "";
};
