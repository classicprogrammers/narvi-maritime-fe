/**
 * Master data cache: clients, agents, countries, vessels, suppliers.
 * Fetched once after login and stored in localStorage. Refreshed only when
 * the user makes changes in the respective module (Clients, Agents, Countries, Vessels, Suppliers).
 */

import { getCustomersForSelect } from '../api/entitySelects';
import { getVesselsForSelect } from '../api/entitySelects';
import { getVendorsApi } from '../api/vendor';
import countriesAPI from '../api/countries';
import { getSuppliers } from '../api/suppliers';

const STORAGE_PREFIX = 'narvi_master_';

export const MASTER_KEYS = {
  CLIENTS: 'clients',
  AGENTS: 'agents',
  COUNTRIES: 'countries',
  VESSELS: 'vessels',
  SUPPLIERS: 'suppliers',
};

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

/**
 * Get cached data from localStorage. Returns null if missing or invalid.
 */
export function getCached(key) {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed?.data ?? null;
  } catch (_e) {
    return null;
  }
}

/**
 * Store data in localStorage for the given key.
 */
export function setCached(key, data) {
  try {
    const toStore = Array.isArray(data) ? data : (data ?? []);
    localStorage.setItem(storageKey(key), JSON.stringify(toStore));
  } catch (_e) {
    // ignore quota or parse errors
  }
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

const fetchers = {
  [MASTER_KEYS.CLIENTS]: fetchAndCacheClients,
  [MASTER_KEYS.AGENTS]: fetchAndCacheAgents,
  [MASTER_KEYS.COUNTRIES]: fetchAndCacheCountries,
  [MASTER_KEYS.VESSELS]: fetchAndCacheVessels,
  [MASTER_KEYS.SUPPLIERS]: fetchAndCacheSuppliers,
};

/**
 * Preload all master data (clients, agents, countries, vessels, suppliers) and store in localStorage.
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
 * Clear all master data from localStorage (e.g. on logout).
 */
export function clearMasterData() {
  Object.values(MASTER_KEYS).forEach((k) => {
    try {
      localStorage.removeItem(storageKey(k));
    } catch (_e) {}
  });
}
