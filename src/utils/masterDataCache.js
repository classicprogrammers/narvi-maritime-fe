/**
 * Master data cache: clients, agents, countries, vessels, suppliers, pics, destinations, currencies.
 * Fetched once after login and stored in memory (session only). Refreshed when
 * the user makes changes in the respective module.
 * No localStorage - only user and token are persisted.
 */

import { getCustomersForSelect } from '../api/entitySelects';
import { getVesselsForSelect } from '../api/entitySelects';
import { getVendorsApi } from '../api/vendor';
import countriesAPI from '../api/countries';
import { getSuppliers } from '../api/suppliers';
import picAPI from '../api/pic';
import destinationsAPI from '../api/destinations';
import currenciesAPI from '../api/currencies';

export const MASTER_KEYS = {
  CLIENTS: 'clients',
  AGENTS: 'agents',
  COUNTRIES: 'countries',
  VESSELS: 'vessels',
  SUPPLIERS: 'suppliers',
  PICS: 'pics',
  DESTINATIONS: 'destinations',
  CURRENCIES: 'currencies',
};

// In-memory cache (session only, cleared on page refresh)
const memoryCache = {};

/**
 * Get cached data from memory. Returns null if missing or invalid.
 */
export function getCached(key) {
  const cached = memoryCache[key];
  if (!cached) return null;
  return Array.isArray(cached) ? cached : cached?.data ?? null;
}

/**
 * Store data in memory cache.
 */
export function setCached(key, data) {
  const toStore = Array.isArray(data) ? data : (data ?? []);
  memoryCache[key] = toStore;
}

/**
 * Fetch clients (customers) from API and cache.
 */
async function fetchAndCacheClients() {
  try {
    const data = await getCustomersForSelect();
    const list = Array.isArray(data) ? data : data?.customers ?? [];
    setCached(MASTER_KEYS.CLIENTS, list);
    return list;
  } catch (err) {
    console.error('[masterDataCache] fetch clients failed:', err);
    return getCached(MASTER_KEYS.CLIENTS) ?? [];
  }
}

/**
 * Fetch agents (vendors) from API and cache.
 */
async function fetchAndCacheAgents() {
  try {
    const data = await getVendorsApi();
    const list = Array.isArray(data) ? data : data?.agents ?? data?.vendors ?? [];
    setCached(MASTER_KEYS.AGENTS, list);
    return list;
  } catch (err) {
    console.error('[masterDataCache] fetch agents failed:', err);
    return getCached(MASTER_KEYS.AGENTS) ?? [];
  }
}

/**
 * Fetch countries from API and cache.
 */
async function fetchAndCacheCountries() {
  try {
    const data = await countriesAPI.getCountries();
    const list = Array.isArray(data) ? data : data?.countries ?? data?.result?.countries ?? [];
    setCached(MASTER_KEYS.COUNTRIES, list);
    return list;
  } catch (err) {
    console.error('[masterDataCache] fetch countries failed:', err);
    return getCached(MASTER_KEYS.COUNTRIES) ?? [];
  }
}

/**
 * Fetch vessels from API and cache.
 */
async function fetchAndCacheVessels() {
  try {
    const data = await getVesselsForSelect();
    const list = Array.isArray(data) ? data : data?.vessels ?? [];
    setCached(MASTER_KEYS.VESSELS, list);
    return list;
  } catch (err) {
    console.error('[masterDataCache] fetch vessels failed:', err);
    return getCached(MASTER_KEYS.VESSELS) ?? [];
  }
}

/**
 * Fetch suppliers from API and cache.
 */
async function fetchAndCacheSuppliers() {
  try {
    const result = await getSuppliers();
    const list = Array.isArray(result?.suppliers) ? result.suppliers : [];
    setCached(MASTER_KEYS.SUPPLIERS, list);
    return list;
  } catch (err) {
    console.error('[masterDataCache] fetch suppliers failed:', err);
    return getCached(MASTER_KEYS.SUPPLIERS) ?? [];
  }
}

/**
 * Fetch persons in charge (PICs) from API and cache.
 * /api/person/incharge/list - stored so we do not call again and again.
 */
async function fetchAndCachePics() {
  try {
    const response = await picAPI.getPICs();
    let list = [];
    if (response?.persons && Array.isArray(response.persons)) {
      list = response.persons;
    } else if (response?.result?.persons && Array.isArray(response.result.persons)) {
      list = response.result.persons;
    } else if (Array.isArray(response)) {
      list = response;
    }
    const normalized = list.map((p) => ({ id: p.id, name: p.name || '' }));
    setCached(MASTER_KEYS.PICS, normalized);
    return normalized;
  } catch (err) {
    console.error('[masterDataCache] fetch PICs failed:', err);
    return getCached(MASTER_KEYS.PICS) ?? [];
  }
}

/**
 * Fetch destinations from /api/destinations and cache.
 */
async function fetchAndCacheDestinations() {
  try {
    const response = await destinationsAPI.getDestinations();
    const list = Array.isArray(response?.destinations) ? response.destinations : (response?.result?.destinations ?? []);
    setCached(MASTER_KEYS.DESTINATIONS, list);
    return list;
  } catch (err) {
    console.error('[masterDataCache] fetch destinations failed:', err);
    return getCached(MASTER_KEYS.DESTINATIONS) ?? [];
  }
}

/**
 * Fetch currencies from /api/currencies and cache.
 */
async function fetchAndCacheCurrencies() {
  try {
    const response = await currenciesAPI.getCurrencies();
    const list = Array.isArray(response?.currencies) ? response.currencies : (Array.isArray(response) ? response : []);
    setCached(MASTER_KEYS.CURRENCIES, list);
    return list;
  } catch (err) {
    console.error('[masterDataCache] fetch currencies failed:', err);
    return getCached(MASTER_KEYS.CURRENCIES) ?? [];
  }
}

const fetchers = {
  [MASTER_KEYS.CLIENTS]: fetchAndCacheClients,
  [MASTER_KEYS.AGENTS]: fetchAndCacheAgents,
  [MASTER_KEYS.COUNTRIES]: fetchAndCacheCountries,
  [MASTER_KEYS.VESSELS]: fetchAndCacheVessels,
  [MASTER_KEYS.SUPPLIERS]: fetchAndCacheSuppliers,
  [MASTER_KEYS.PICS]: fetchAndCachePics,
  [MASTER_KEYS.DESTINATIONS]: fetchAndCacheDestinations,
  [MASTER_KEYS.CURRENCIES]: fetchAndCacheCurrencies,
};

/**
 * Preload all master data (clients, agents, countries, vessels, suppliers) and store in memory.
 * Call after login and optionally when admin layout mounts (if cache empty).
 */
export async function preloadAll() {
  const token = localStorage.getItem('token');
  if (!token) return;

  await Promise.all([
    fetchAndCacheClients(),
    fetchAndCacheAgents(),
    fetchAndCacheCountries(),
    fetchAndCacheVessels(),
    fetchAndCacheSuppliers(),
    fetchAndCachePics(),
    fetchAndCacheDestinations(),
    fetchAndCacheCurrencies(),
  ]);
}

/**
 * Refresh a single master data key (refetch from API and update cache).
 * Call this when the user creates/updates/deletes in the respective module.
 * @param {string} key - One of MASTER_KEYS.CLIENTS, MASTER_KEYS.AGENTS, etc.
 */
export async function refreshMasterData(key) {
  const fn = fetchers[key];
  if (!fn) return getCached(key) ?? [];
  return fn();
}

/**
 * Clear all master data from memory (e.g. on logout).
 */
export function clearMasterData() {
  Object.values(MASTER_KEYS).forEach((k) => {
    delete memoryCache[k];
  });
}
