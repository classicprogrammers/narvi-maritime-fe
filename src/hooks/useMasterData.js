import { useCallback } from 'react';
import {
  getCached,
  refreshMasterData,
  MASTER_KEYS,
} from '../utils/masterDataCache';

/**
 * Returns master data (clients, agents, countries, vessels, suppliers, pics, destinations, currencies) from localStorage cache.
 * Data is filled by preloadAll() after login. Use refresh* when the user edits that module.
 * /api/destinations and /api/currencies are cached so they are not called again and again.
 */
export function useMasterData() {
  const clients = getCached(MASTER_KEYS.CLIENTS) ?? [];
  const agents = getCached(MASTER_KEYS.AGENTS) ?? [];
  const countries = getCached(MASTER_KEYS.COUNTRIES) ?? [];
  const vessels = getCached(MASTER_KEYS.VESSELS) ?? [];
  const suppliers = getCached(MASTER_KEYS.SUPPLIERS) ?? [];
  const pics = getCached(MASTER_KEYS.PICS) ?? [];
  const destinations = getCached(MASTER_KEYS.DESTINATIONS) ?? [];
  const currencies = getCached(MASTER_KEYS.CURRENCIES) ?? [];

  const refreshClients = useCallback(() => refreshMasterData(MASTER_KEYS.CLIENTS), []);
  const refreshAgents = useCallback(() => refreshMasterData(MASTER_KEYS.AGENTS), []);
  const refreshCountries = useCallback(() => refreshMasterData(MASTER_KEYS.COUNTRIES), []);
  const refreshVessels = useCallback(() => refreshMasterData(MASTER_KEYS.VESSELS), []);
  const refreshSuppliers = useCallback(() => refreshMasterData(MASTER_KEYS.SUPPLIERS), []);
  const refreshPics = useCallback(() => refreshMasterData(MASTER_KEYS.PICS), []);
  const refreshDestinations = useCallback(() => refreshMasterData(MASTER_KEYS.DESTINATIONS), []);
  const refreshCurrencies = useCallback(() => refreshMasterData(MASTER_KEYS.CURRENCIES), []);

  return {
    clients,
    agents,
    countries,
    vessels,
    suppliers,
    pics,
    destinations,
    currencies,
    refreshClients,
    refreshAgents,
    refreshCountries,
    refreshVessels,
    refreshSuppliers,
    refreshPics,
    refreshDestinations,
    refreshCurrencies,
  };
}

/**
 * Get a single master data array by key (from cache, no hook re-render when cache updates).
 */
export function getMasterData(key) {
  return getCached(key) ?? [];
}
