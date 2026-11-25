import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdFilterAltOff } from "react-icons/md";
import Card from "components/card/Card";
import DashboardPeriodFilter, {
  DEFAULT_DASHBOARD_PERIOD,
} from "components/ledger/dashboards/DashboardPeriodFilter";
import SearchableSelect from "components/forms/SearchableSelect";
import { useMasterData } from "hooks/useMasterData";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import {
  FIRST_DASHBOARD_FY,
  fyBounds,
  fyLabel,
  fyOptions,
  resolvePeriod,
  validatePeriod,
} from "utils/ledgerDashboardPeriod";
import { clampFilters, isDefaultFilters, resetFilters } from "utils/ledgerDashboardFilters";
import { DashboardMetaContext } from "hooks/useLedgerDashboard";
import { DASHBOARD_TABS, DEFAULT_TAB_KEY } from "./dashboardRegistry";

const STORAGE_KEY = "narvi_ledger_dashboards_state";
const PRESETS = ["current", "previous", "fy", "custom"];
const INTERVALS = ["month", "quarter", "total"];

// fyChoices: the FY list the period select and the region checkboxes offer; default region FYs are all of them.
const defaultState = (fyChoices = fyOptions(FIRST_DASHBOARD_FY)) => ({
  tab: DEFAULT_TAB_KEY,
  period: { ...DEFAULT_DASHBOARD_PERIOD },
  interval: "month",
  clientId: "",
  clientLabel: "",
  regionFys: [...fyChoices],
});

const isTabKey = (key) => DASHBOARD_TABS.some((tab) => tab.key === key);

const isPlausibleFy = (year) => Number.isInteger(year) && year >= 2000 && year <= 2100;

// Corrupt stored values fall back to defaults (B5). A plausible FY is kept even when it is outside the fallback
// range, because available_fy may widen it later; clampFilters checks it against the live range on every render.
function sanitizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const stored = raw.period && typeof raw.period === "object" ? raw.period : {};
  const period = { ...base.period };
  if (PRESETS.includes(stored.preset)) period.preset = stored.preset;
  const fy = Number(stored.fyStartYear);
  if (period.preset === "fy") {
    if (isPlausibleFy(fy)) period.fyStartYear = fy;
    else period.preset = "current";
  }
  if (typeof stored.from === "string") period.from = stored.from;
  if (typeof stored.to === "string") period.to = stored.to;
  const regionFys = Array.isArray(raw.regionFys)
    ? raw.regionFys.map(Number).filter(isPlausibleFy)
    : [];
  return {
    tab: isTabKey(raw.tab) ? raw.tab : base.tab,
    period,
    interval: INTERVALS.includes(raw.interval) ? raw.interval : base.interval,
    clientId: raw.clientId ? String(raw.clientId) : "",
    clientLabel: typeof raw.clientLabel === "string" ? raw.clientLabel : "",
    regionFys: regionFys.length ? regionFys : base.regionFys,
  };
}

function readPersistedState() {
  try {
    const raw =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(STORAGE_KEY)
        : null;
    return sanitizeState(raw ? JSON.parse(raw) : null);
  } catch (error) {
    return defaultState();
  }
}

function writePersistedState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures (private mode / quota).
  }
}

export default function LedgerDashboards() {
  const history = useHistory();
  const location = useLocation();
  const { refreshClients } = useMasterData();

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const inputBg = useColorModeValue("white", "navy.900");
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const tabBg = useColorModeValue("secondaryGray.300", "navy.900");
  const tabSelectedBg = useColorModeValue("brand.500", "brand.400");

  const [state, setState] = useState(readPersistedState);
  // Backend-reported FY range, set by whichever tab response arrives; the constant is the fallback.
  const [availableFy, setAvailableFy] = useState(null);
  const [clients, setClients] = useState(
    () => getCached(MASTER_KEYS.CLIENTS) ?? [],
  );

  // The URL tab wins over the stored one; unknown or missing falls back to the first tab (A3).
  const urlTab = new URLSearchParams(location.search).get("tab");
  // With no ?tab= the stored tab is used from the first render, so the wrong tab never mounts.
  const activeKey = isTabKey(urlTab)
    ? urlTab
    : !urlTab && isTabKey(state.tab)
      ? state.tab
      : DEFAULT_TAB_KEY;
  const activeIndex = DASHBOARD_TABS.findIndex((tab) => tab.key === activeKey);
  const activeTab = DASHBOARD_TABS[activeIndex];

  useEffect(() => {
    writePersistedState({ ...state, tab: activeKey });
  }, [state, activeKey]);

  // Opening the page without ?tab= restores the stored tab.
  useEffect(() => {
    if (
      !new URLSearchParams(location.search).get("tab") &&
      state.tab !== DEFAULT_TAB_KEY
    ) {
      history.replace({
        pathname: location.pathname,
        search: `?tab=${state.tab}`,
      });
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshClients()
      .then((list) => {
        if (!cancelled)
          setClients(
            Array.isArray(list) ? list : (getCached(MASTER_KEYS.CLIENTS) ?? []),
          );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshClients]);

  const handleTabChange = useCallback(
    (index) => {
      const next = DASHBOARD_TABS[index];
      if (!next) return;
      history.replace({
        pathname: location.pathname,
        search: `?tab=${next.key}`,
      });
    },
    [history, location.pathname],
  );

  const handleFilterChange = (next) =>
    setState((prev) => ({
      ...prev,
      period: next.period,
      interval: next.interval,
    }));

  const clientOptions = useMemo(
    () =>
      (Array.isArray(clients) ? clients : []).map((client) => ({
        ...client,
        name: client.name || client.client_code || `Client ${client.id}`,
      })),
    [clients],
  );

  const handleClearFilters = () =>
    setState((prev) => resetFilters(prev, defaultState(fyChoices)));

  const handleClientChange = (value) => {
    const found = clientOptions.find(
      (client) => String(client.id) === String(value),
    );
    setState((prev) => ({
      ...prev,
      clientId: value || "",
      clientLabel: found ? found.name : "",
    }));
  };

  const handleAvailableFy = useCallback(
    (next) =>
      setAvailableFy((prev) =>
        prev && prev.first === next.first && prev.last === next.last
          ? prev
          : next,
      ),
    [],
  );
  // One range for the period select, the region checkboxes, the defaults and resolvePeriod.
  const { firstFy, lastFy } = fyBounds(availableFy);
  const fyChoices = fyOptions(firstFy, new Date(), lastFy);
  // Selections outside the range (e.g. stored before available_fy arrived) are shown and requested as clamped.
  const filters = clampFilters(state, fyChoices);
  const handleRegionFysChange = (values) => {
    const years = values.map(Number).sort((a, b) => a - b);
    setState((prev) => ({ ...prev, regionFys: years }));
  };

  const errors = validatePeriod({
    period: filters.period,
    interval: state.interval,
  });
  const hasPeriodErrors = Object.keys(errors).length > 0;
  const period = resolvePeriod({ period: filters.period }, new Date(), {
    firstFy,
    lastFy,
  });
  const showPeriod = activeTab.filter === "period";
  const filtersAreDefault = isDefaultFilters(filters, defaultState(fyChoices));

  const clientControl = activeTab.needsClient ? (
    <FormControl w={{ base: "100%", md: "auto" }} minW={{ md: "260px" }} maxW={{ md: "360px" }} flex={{ md: "1 1 260px" }}>
      <FormLabel fontSize="sm" fontWeight="600" mb={2} lineHeight={5}>
        Client
      </FormLabel>
      <SearchableSelect
        value={state.clientId}
        onChange={handleClientChange}
        options={clientOptions}
        fallbackDisplay={state.clientLabel}
        placeholder="Select a client"
        size="md"
        h="40px"
        bg={inputBg}
      />
    </FormControl>
  ) : null;

  // mt matches the label height so the button lines up with the controls (not the labels).
  const clearButton = (
    <Box w={{ base: "100%", md: "auto" }} mt={{ base: 0, md: "28px" }} ml={{ md: "auto" }}>
      <Button
        variant="outline"
        size="md"
        h="40px"
        w={{ base: "100%", md: "auto" }}
        leftIcon={<MdFilterAltOff />}
        onClick={handleClearFilters}
        isDisabled={filtersAreDefault}
      >
        Clear filters
      </Button>
    </Box>
  );

  return (
    <Box
      pt={{ base: "130px", md: "80px", xl: "80px" }}
      bg={pageBg}
      minH="100vh"
    >
      <Box px="25px" pb={8}>
        <Box mb={5}>
          <Heading size="lg" mb={1}>
            Dashboards
          </Heading>
          <Text fontSize="sm" color={muted}>
            Cash, client, destination and turnover figures from the Master Ledger, in USD.
          </Text>
        </Box>

        <DashboardMetaContext.Provider value={handleAvailableFy}>
          <Tabs
            variant="unstyled"
            isLazy
            index={activeIndex}
            onChange={handleTabChange}
          >
            <TabList
              overflowX="auto"
              overflowY="hidden"
              gap={1}
              p={1}
              bg={tabBg}
              borderRadius="14px"
              sx={{ scrollbarWidth: "thin" }}
            >
              {DASHBOARD_TABS.map((tab) => (
                <Tab
                  key={tab.key}
                  flex="0 0 auto"
                  whiteSpace="nowrap"
                  px={4}
                  py={2}
                  fontSize="sm"
                  fontWeight="600"
                  color={muted}
                  borderRadius="10px"
                  _selected={{ bg: tabSelectedBg, color: "white", boxShadow: "sm" }}
                  _hover={{ _notSelected: { color: tabSelectedBg } }}
                  _focusVisible={{ boxShadow: "outline" }}
                >
                  {tab.label}
                </Tab>
              ))}
            </TabList>

            <Box mt={5}>
              {showPeriod && (
                <DashboardPeriodFilter
                  value={{ period: filters.period, interval: state.interval }}
                  onChange={handleFilterChange}
                  firstFy={firstFy}
                  lastFy={lastFy}
                  extra={
                    <>
                      {clientControl}
                      {clearButton}
                    </>
                  }
                />
              )}

              {activeTab.filter === "fyMulti" && (
                <Card p={{ base: "16px", md: "20px" }} mb={5}>
                  <Flex gap={4} align="flex-start" wrap="wrap">
                    <Box flex="1 1 260px">
                      <FormLabel fontSize="sm" fontWeight="600" mb={2} lineHeight={5}>
                        Financial years
                      </FormLabel>
                      <CheckboxGroup
                        value={filters.regionFys.map(String)}
                        onChange={handleRegionFysChange}
                      >
                        <Flex gap={4} wrap="wrap" minH="40px" align="center">
                          {fyChoices.map((year) => (
                            <Checkbox key={year} value={String(year)}>
                              FY {fyLabel(year)}
                            </Checkbox>
                          ))}
                        </Flex>
                      </CheckboxGroup>
                    </Box>
                    {clearButton}
                  </Flex>
                </Card>
              )}

              <TabPanels>
                {DASHBOARD_TABS.map((tab) => (
                  <TabPanel key={tab.key} px={0} py={0}>
                    {showPeriod && hasPeriodErrors ? (
                      <Text fontSize="sm" color={muted}>
                        Fix the period above to load this dashboard.
                      </Text>
                    ) : (
                      <tab.Component
                        period={period}
                        interval={state.interval}
                        clientId={state.clientId}
                        clientLabel={state.clientLabel}
                        regionFys={filters.regionFys}
                      />
                    )}
                  </TabPanel>
                ))}
              </TabPanels>
            </Box>
          </Tabs>
        </DashboardMetaContext.Provider>
      </Box>
    </Box>
  );
}
