import {
  getCached,
  refreshMasterData,
  MASTER_KEYS,
} from '../utils/masterDataCache';

/**
 * Returns master data (clients, agents, countries, vessels, suppliers) from localStorage cache.
 * Data is filled by preloadAll() after login. Use refresh* when the user edits that module.
 * Reads from cache on every render so navigating to the page shows latest cached data.
 */
export function useMasterData() {
  const clients = getCached(MASTER_KEYS.CLIENTS) ?? [];
  const agents = getCached(MASTER_KEYS.AGENTS) ?? [];
  const countries = getCached(MASTER_KEYS.COUNTRIES) ?? [];
  const vessels = getCached(MASTER_KEYS.VESSELS) ?? [];
  const suppliers = getCached(MASTER_KEYS.SUPPLIERS) ?? [];

  const refreshClients = () => refreshMasterData(MASTER_KEYS.CLIENTS);
  const refreshAgents = () => refreshMasterData(MASTER_KEYS.AGENTS);
  const refreshCountries = () => refreshMasterData(MASTER_KEYS.COUNTRIES);
  const refreshVessels = () => refreshMasterData(MASTER_KEYS.VESSELS);
  const refreshSuppliers = () => refreshMasterData(MASTER_KEYS.SUPPLIERS);

  return {
    clients,
    agents,
    countries,
    vessels,
    suppliers,
    refreshClients,
    refreshAgents,
    refreshCountries,
    refreshVessels,
    refreshSuppliers,
  };
}

/**
 * Get a single master data array by key (from cache, no hook re-render when cache updates).
 */
export function getMasterData(key) {
  return getCached(key) ?? [];
}
