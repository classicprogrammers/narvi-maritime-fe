import { useState, useCallback } from 'react';
import {
  getUsersForSelect,
  getDestinationsForSelect,
  getQuotationsForSelect,
} from '../api/entitySelects';
import { getCached, MASTER_KEYS } from '../utils/masterDataCache';

export const useEntitySelects = () => {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [quotations, setQuotations] = useState([]);

  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingVessels, setIsLoadingVessels] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  const [errorUsers, setErrorUsers] = useState(null);
  const [errorCustomers, setErrorCustomers] = useState(null);
  const [errorVessels, setErrorVessels] = useState(null);
  const [errorDestinations, setErrorDestinations] = useState(null);
  const [errorQuotations, setErrorQuotations] = useState(null);

  // Track if data has been loaded to prevent repeated API calls
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);
  const [hasLoadedCustomers, setHasLoadedCustomers] = useState(false);
  const [hasLoadedVessels, setHasLoadedVessels] = useState(false);
  const [hasLoadedDestinations, setHasLoadedDestinations] = useState(false);
  const [hasLoadedQuotations, setHasLoadedQuotations] = useState(false);

  const searchUsers = useCallback(async (searchTerm = '') => {
    
    // If we already have data and it's an empty search, just filter locally
    if (hasLoadedUsers && users.length > 0 && searchTerm.trim() === '') {
      return;
    }
    
    setIsLoadingUsers(true);
    try {
      const data = await getUsersForSelect(searchTerm);
      setUsers(data);
      setHasLoadedUsers(true);
    } catch (error) {
      console.error('❌ [USERS] API call failed:', error);
      setUsers([]);
      setErrorUsers(error.response?.data?.result?.message || error.response?.data?.message || error.message);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [hasLoadedUsers, users.length]);

  const searchCustomers = useCallback((searchTerm = '') => {
    const cached = getCached(MASTER_KEYS.CLIENTS) ?? [];
    const list = Array.isArray(cached) ? cached : [];
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const filtered = list.filter(customer =>
        (customer.name || '').toLowerCase().includes(term) ||
        (customer.company_name || '').toLowerCase().includes(term) ||
        (customer.client_code || '').toLowerCase().includes(term)
      );
      setCustomers(filtered);
    } else {
      setCustomers(list);
    }
    setHasLoadedCustomers(true);
    setErrorCustomers(null);
  }, []);

  const searchVessels = useCallback((searchTerm = '') => {
    const cached = getCached(MASTER_KEYS.VESSELS) ?? [];
    const list = Array.isArray(cached) ? cached : [];
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const filtered = list.filter(vessel =>
        (vessel.name || '').toLowerCase().includes(term) ||
        (vessel.imo_number || vessel.imo || '').toLowerCase().includes(term)
      );
      setVessels(filtered);
    } else {
      setVessels(list);
    }
    setHasLoadedVessels(true);
    setErrorVessels(null);
  }, []);

  const searchDestinations = useCallback(async (searchTerm = '') => {
    
    // If we already have data and it's an empty search, just filter locally
    if (hasLoadedDestinations && destinations.length > 0 && searchTerm.trim() === '') {
      return;
    }
    
    setIsLoadingDestinations(true);
    try {
      const data = await getDestinationsForSelect(searchTerm);
      setDestinations(data);
      setHasLoadedDestinations(true);
    } catch (error) {
      console.error('Error searching destinations:', error);
      setDestinations([]);
      setErrorDestinations(error.response?.data?.result?.message || error.response?.data?.message || error.message);
    } finally {
      setIsLoadingDestinations(false);
    }
  }, [hasLoadedDestinations, destinations.length]);

  const searchQuotations = useCallback(async (searchTerm = '') => {
    
    // If we already have data and it's an empty search, just filter locally
    if (hasLoadedQuotations && quotations.length > 0 && searchTerm.trim() === '') {
      return;
    }
    
    setIsLoadingQuotations(true);
    try {
      const data = await getQuotationsForSelect(searchTerm);
      setQuotations(data);
      setHasLoadedQuotations(true);
    } catch (error) {
      console.error('Error searching quotations:', error);
      setQuotations([]);
      setErrorQuotations(error.response?.data?.result?.message || error.response?.data?.message || error.message);
    } finally {
      setIsLoadingQuotations(false);
    }
  }, [hasLoadedQuotations, quotations.length]);

  return {
    // Data
    users,
    customers,
    vessels,
    destinations,
    quotations,
    
    // Loading states
    isLoadingUsers,
    isLoadingCustomers,
    isLoadingVessels,
    isLoadingDestinations,
    isLoadingQuotations,
    
    // Error states
    errorUsers,
    errorCustomers,
    errorVessels,
    errorDestinations,
    errorQuotations,
    
    // Search functions
    searchUsers,
    searchCustomers,
    searchVessels,
    searchDestinations,
    searchQuotations,
  };
};
