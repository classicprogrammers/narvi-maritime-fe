import destinationsAPI from './destinations';
import { getCached, MASTER_KEYS } from '../utils/masterDataCache';

// Cache for storing lookup data
const lookupCache = {
    destinations: new Map(),
    vessels: new Map(),
    customers: new Map(),
    users: new Map(),
};

// Get entity name by ID with caching
export const getEntityName = async (entityType, id) => {
    if (!id || id === false) return 'N/A';

    const cache = lookupCache[entityType];
    if (cache && cache.has(id)) {
        return cache.get(id);
    }

    try {
        let name = 'Loading...';

        switch (entityType) {
            case 'destinations':
                // Fetch all destinations and filter
                const destResponse = await destinationsAPI.getDestinations();
                const destination = destResponse.destinations?.find(d => d.id === id);
                name = destination?.name || `Destination ${id}`;
                break;

            case 'vessels': {
                const vesselsList = getCached(MASTER_KEYS.VESSELS) ?? [];
                const vessel = Array.isArray(vesselsList) ? vesselsList.find(v => v.id === id) : null;
                name = vessel?.name || `Vessel ${id}`;
                break;
            }

            case 'customers':
                const customersList = getCached(MASTER_KEYS.CLIENTS) ?? [];
                const customer = Array.isArray(customersList) ? customersList.find(c => c.id === id) : null;
                name = customer?.name || customer?.company_name || `Customer ${id}`;
                break;

            case 'users':
                // For users, try to get from localStorage first
                try {
                    const currentUser = localStorage.getItem('user');
                    if (currentUser) {
                        const userData = JSON.parse(currentUser);
                        if (userData.id === id) {
                            name = userData.name || userData.email || `User ${id}`;
                        } else {
                            name = `User ${id}`;
                        }
                    } else {
                        name = `User ${id}`;
                    }
                } catch (error) {
                    name = `User ${id}`;
                }
                break;

            default:
                name = `${entityType} ${id}`;
        }

        // Cache the result
        if (cache) {
            cache.set(id, name);
        }

        return name;
    } catch (error) {
        console.error(`Error fetching ${entityType} name for ID ${id}:`, error);
        return `${entityType} ${id}`;
    }
};

// Batch fetch function to get multiple names at once
export const getEntityNames = async (entityType, ids) => {
    if (!ids || ids.length === 0) return {};

    const results = {};
    const uncachedIds = [];

    // Check cache first
    const cache = lookupCache[entityType];
    ids.forEach(id => {
        if (cache && cache.has(id)) {
            results[id] = cache.get(id);
        } else {
            uncachedIds.push(id);
        }
    });

    // Fetch uncached items
    if (uncachedIds.length > 0) {
        try {
            let response;

            switch (entityType) {
                case 'destinations':
                    response = await destinationsAPI.getDestinations();
                    response.destinations?.forEach(dest => {
                        if (uncachedIds.includes(dest.id)) {
                            results[dest.id] = dest.name;
                            cache?.set(dest.id, dest.name);
                        }
                    });
                    break;

                case 'vessels': {
                    const vesselsList = getCached(MASTER_KEYS.VESSELS) ?? [];
                    const list = Array.isArray(vesselsList) ? vesselsList : [];
                    list.forEach(vessel => {
                        if (uncachedIds.includes(vessel.id)) {
                            results[vessel.id] = vessel.name || `Vessel ${vessel.id}`;
                            cache?.set(vessel.id, vessel.name || `Vessel ${vessel.id}`);
                        }
                    });
                    break;
                }

                case 'customers': {
                    const customersList = getCached(MASTER_KEYS.CLIENTS) ?? [];
                    const list = Array.isArray(customersList) ? customersList : [];
                    list.forEach(customer => {
                        if (uncachedIds.includes(customer.id)) {
                            const customerName = customer.name || customer.company_name || `Customer ${customer.id}`;
                            results[customer.id] = customerName;
                            cache?.set(customer.id, customerName);
                        }
                    });
                    break;
                }

                default:
                    // Set fallback names for unknown entity types
                    uncachedIds.forEach(id => {
                        results[id] = `${entityType} ${id}`;
                    });
                    break;
            }
        } catch (error) {
            console.error(`Error batch fetching ${entityType}:`, error);
            // Set fallback names for uncached items
            uncachedIds.forEach(id => {
                results[id] = `${entityType} ${id}`;
            });
        }
    }

    return results;
};

const lookupsAPI = {
    getEntityName,
    getEntityNames,
};

export default lookupsAPI;