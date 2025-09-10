import { useState, useCallback } from 'react';
import {
  getUsersForSelect,
  getCustomersForSelect,
  getVesselsForSelect,
  getDestinationsForSelect,
  getQuotationsForSelect,
} from '../api/entitySelects';

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
    console.log('🔍 [USERS] API call triggered with term:', searchTerm, '| Has loaded:', hasLoadedUsers, '| Users count:', users.length);
    
    // If we already have data and it's an empty search, just filter locally
    if (hasLoadedUsers && users.length > 0 && searchTerm.trim() === '') {
      console.log('🚫 [USERS] Skipping API call - data already loaded');
      return;
    }
    
    setIsLoadingUsers(true);
    try {
      const data = await getUsersForSelect(searchTerm);
      console.log('✅ [USERS] API call successful, received:', data.length, 'users');
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

  const searchCustomers = useCallback(async (searchTerm = '') => {
    console.log('🔍 [CUSTOMERS] API call triggered with term:', searchTerm, '| Has loaded:', hasLoadedCustomers, '| Customers count:', customers.length);
    
    // If we already have data and it's an empty search, just filter locally
    if (hasLoadedCustomers && customers.length > 0 && searchTerm.trim() === '') {
      console.log('🚫 [CUSTOMERS] Skipping API call - data already loaded');
      return;
    }
    
    setIsLoadingCustomers(true);
    try {
      const data = await getCustomersForSelect(searchTerm);
      console.log('✅ [CUSTOMERS] API call successful, received:', data.length, 'customers');
      setCustomers(data);
      setHasLoadedCustomers(true);
    } catch (error) {
      console.error('❌ [CUSTOMERS] API call failed:', error);
      setCustomers([]);
      setErrorCustomers(error.response?.data?.result?.message || error.response?.data?.message || error.message);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [hasLoadedCustomers, customers.length]);

  const searchVessels = useCallback(async (searchTerm = '') => {
    console.log('🔍 [VESSELS] API call triggered with term:', searchTerm, '| Has loaded:', hasLoadedVessels, '| Vessels count:', vessels.length);
    
    // If we already have data and it's an empty search, just filter locally
    if (hasLoadedVessels && vessels.length > 0 && searchTerm.trim() === '') {
      console.log('🚫 [VESSELS] Skipping API call - data already loaded');
      return;
    }
    
    setIsLoadingVessels(true);
    try {
      const data = await getVesselsForSelect(searchTerm);
      console.log('✅ [VESSELS] API call successful, received:', data.length, 'vessels');
      setVessels(data);
      setHasLoadedVessels(true);
    } catch (error) {
      console.error('❌ [VESSELS] API call failed:', error);
      setVessels([]);
      setErrorVessels(error.response?.data?.result?.message || error.response?.data?.message || error.message);
    } finally {
      setIsLoadingVessels(false);
    }
  }, [hasLoadedVessels, vessels.length]);

  const searchDestinations = useCallback(async (searchTerm = '') => {
    console.log('🔍 Searching destinations with term:', searchTerm);
    
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
    console.log('🔍 Searching quotations with term:', searchTerm);
    
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
