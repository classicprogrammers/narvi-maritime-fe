import { useState, useEffect, useCallback } from 'react';
import { getEntityName, getEntityNames } from '../api/lookups';

export const useLookups = () => {
  const [lookupData, setLookupData] = useState({
    destinations: {},
    vessels: {},
    customers: {},
    users: {},
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get a single entity name
  const getEntityNameById = useCallback(async (entityType, id) => {
    if (!id || id === false) return 'N/A';
    
    try {
      const name = await getEntityName(entityType, id);
      setLookupData(prev => ({
        ...prev,
        [entityType]: {
          ...prev[entityType],
          [id]: name
        }
      }));
      return name;
    } catch (error) {
      console.error(`Error getting ${entityType} name:`, error);
      return `${entityType} ${id}`;
    }
  }, []);

  // Get multiple entity names
  const getEntityNamesByIds = useCallback(async (entityType, ids) => {
    if (!ids || ids.length === 0) return {};
    
    try {
      const names = await getEntityNames(entityType, ids);
      setLookupData(prev => ({
        ...prev,
        [entityType]: {
          ...prev[entityType],
          ...names
        }
      }));
      return names;
    } catch (error) {
      console.error(`Error getting ${entityType} names:`, error);
      return {};
    }
  }, []);

  // Get cached name or return loading state
  const getCachedName = useCallback((entityType, id) => {
    if (!id || id === false) return 'N/A';
    return lookupData[entityType]?.[id] || 'Loading...';
  }, [lookupData]);

  return {
    lookupData,
    isLoading,
    getEntityNameById,
    getEntityNamesByIds,
    getCachedName,
  };
};
