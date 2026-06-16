export const CLIENT_DASHBOARD_CARD_ROUTES = {
  active_movements: {
    pathname: "/Client/Stock",
    state: { dashboardFilter: { stockStatus: "in_transit" } },
  },
  open_jobs: {
    pathname: "/Client/Jobs/Ongoing",
    state: { dashboardFilter: { jobStatus: "All" } },
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
  if (normalizedKey === "in_transit") {
    return {
      pathname: "/Client/Jobs/Ongoing",
      state: { dashboardFilter: { jobStatus: "In Transit" } },
    };
  }
  if (normalizedKey === "delivered") {
    return {
      pathname: "/Client/Jobs/Completed",
      state: { dashboardFilter: { jobStatus: "delivered" } },
    };
  }
  if (normalizedKey === "pending") {
    return {
      pathname: "/Client/Jobs/Ongoing",
      state: { dashboardFilter: { jobStatus: "Pending" } },
    };
  }

  const normalizedLabel = String(label ?? "").trim().toLowerCase();
  if (normalizedLabel === "in transit") {
    return {
      pathname: "/Client/Jobs/Ongoing",
      state: { dashboardFilter: { jobStatus: "In Transit" } },
    };
  }
  if (normalizedLabel === "delivered") {
    return {
      pathname: "/Client/Jobs/Completed",
      state: { dashboardFilter: { jobStatus: "delivered" } },
    };
  }
  if (normalizedLabel === "pending") {
    return {
      pathname: "/Client/Jobs/Ongoing",
      state: { dashboardFilter: { jobStatus: "Pending" } },
    };
  }

  return null;
}

export function clearClientNavigationState() {
  if (window.history?.replaceState) {
    window.history.replaceState({}, document.title);
  }
}
