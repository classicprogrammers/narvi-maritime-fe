import CashTab from "./tabs/CashTab";
import ClientStatsTab from "./tabs/ClientStatsTab";
import DestinationsTab from "./tabs/DestinationsTab";
import TurnoverTab from "./tabs/TurnoverTab";
import RegionSalesTab from "./tabs/RegionSalesTab";
import ClientTurnoverTab from "./tabs/ClientTurnoverTab";

// One entry per dashboard tab, in display order. `filter`: "none" | "period" | "fyMulti".
// Every Component receives { period: { date_from, date_to, label }, interval, clientId, clientLabel, regionFys }.
export const DASHBOARD_TABS = [
  { key: "cash", label: "Cash", filter: "none", needsClient: false, Component: CashTab },
  { key: "client-stats", label: "Client Stats", filter: "period", needsClient: false, Component: ClientStatsTab },
  { key: "destinations", label: "Destinations", filter: "period", needsClient: false, Component: DestinationsTab },
  { key: "turnover", label: "Turnover", filter: "period", needsClient: false, Component: TurnoverTab },
  { key: "regions", label: "Singapore / Greece", filter: "fyMulti", needsClient: false, Component: RegionSalesTab },
  {
    key: "client-turnover",
    label: "Client Turnover",
    filter: "period",
    needsClient: true,
    Component: ClientTurnoverTab,
  },
];

export const DEFAULT_TAB_KEY = DASHBOARD_TABS[0].key;
