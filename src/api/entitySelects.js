import api from './axios';

// Get users for select dropdown
export const getUsersForSelect = async (searchTerm = '') => {
  try {
    const response = await api.get('/api/users');
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch users');
    }
    
    const users = response.data.users || [];
    
    // Filter locally if search term provided
    if (searchTerm.trim()) {
      return users.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return users;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error; // Re-throw to be handled by the hook
  }
};

// Get customers/partners for select dropdown
export const getCustomersForSelect = async (searchTerm = '') => {
  try {
    const response = await api.get('/api/customers');
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch customers');
    }
    
    const customers = response.data.customers || [];
    
    // Filter locally if search term provided
    if (searchTerm.trim()) {
      return customers.filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return customers;
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error; // Re-throw to be handled by the hook
  }
};

// Get vessels for select dropdown
export const getVesselsForSelect = async (searchTerm = '') => {
  try {
    const response = await api.get('/api/vessels');
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch vessels');
    }
    
    const vessels = response.data.vessels || [];
    
    // Filter locally if search term provided
    if (searchTerm.trim()) {
      return vessels.filter(vessel => 
        vessel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vessel.imo_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return vessels;
  } catch (error) {
    console.error('Failed to fetch vessels:', error);
    throw error; // Re-throw to be handled by the hook
  }
};

// Get destinations for select dropdown
export const getDestinationsForSelect = async (searchTerm = '') => {
  try {
    const response = await api.get('/api/destinations');
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch destinations');
    }
    
    const destinations = response.data.destinations || [];
    
    // Filter locally if search term provided
    if (searchTerm.trim()) {
      return destinations.filter(destination => 
        destination.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        destination.country?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return destinations;
  } catch (error) {
    console.error('Failed to fetch destinations:', error);
    throw error; // Re-throw to be handled by the hook
  }
};

// Get quotations for select dropdown
export const getQuotationsForSelect = async (searchTerm = '') => {
  try {
    const response = await api.get('/api/quotations');
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch quotations');
    }
    
    const quotations = response.data.quotations || [];
    
    // Filter locally if search term provided
    if (searchTerm.trim()) {
      return quotations.filter(quotation => 
        quotation.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotation.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return quotations;
  } catch (error) {
    console.error('Failed to fetch quotations:', error);
    throw error; // Re-throw to be handled by the hook
  }
};

export default {
  getUsersForSelect,
  getCustomersForSelect,
  getVesselsForSelect,
  getDestinationsForSelect,
  getQuotationsForSelect,
};
