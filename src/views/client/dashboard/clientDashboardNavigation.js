export const CLIENT_DASHBOARD_CARD_ROUTES = {
  active_movements: {
    pathname: "/Client/Stock",
    state: { dashboardFilter: { stockStatus: "in_transit" } },
  },
  open_jobs: {
    pathname: "/Client/Stock",
  },
  stock_alerts: {
    pathname: "/Client/Stock",
    state: { dashboardFilter: { stockStatus: "irregular" } },
  },
  pending_approvals: {
    pathname: "/Client/Stock",
    state: { dashboardFilter: { stockStatus: "on_shipping" } },
  },
};

export function getDashboardCardRoute(cardKey) {
  if (!cardKey) return null;
  return CLIENT_DASHBOARD_CARD_ROUTES[String(cardKey).trim()] ?? null;
}

export function getJobStatusRouteFromPieSlice({ key, label } = {}) {
  const normalizedKey = String(key ?? "").trim().toLowerCase();
  const normalizedLabel = String(label ?? "").trim().toLowerCase();

  if (normalizedKey === "in_transit" || normalizedLabel === "in transit") {
    return {
      pathname: "/Client/Stock",
      state: { dashboardFilter: { stockStatus: "in_transit" } },
    };
  }
  if (normalizedKey === "delivered" || normalizedLabel === "delivered") {
    return {
      pathname: "/Client/Stock",
      state: { dashboardFilter: { stockStatus: "delivered" } },
    };
  }
  if (normalizedKey === "pending" || normalizedLabel === "pending") {
    return {
      pathname: "/Client/Stock",
      state: { dashboardFilter: { stockStatus: "pending" } },
    };
  }

  return {
    pathname: "/Client/Stock",
  };
}

export function clearClientNavigationState() {
  if (window.history?.replaceState) {
    window.history.replaceState({}, document.title);
  }
}
