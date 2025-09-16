import api from './axios';

// Get all shipping orders
export const getShippingOrders = async () => {
  try {
    const response = await api.get('/api/shipping/orders');
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch shipping orders');
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get shipping order by ID
export const getShippingOrderById = async (id) => {
  try {
    const response = await api.get(`/api/shipping/orders/${id}`);
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch shipping order');
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create new shipping order
export const createShippingOrder = async (orderData) => {
  try {
    const response = await api.post('/api/create/shipping/order', orderData);
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to create shipping order');
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update shipping order - only send changed parameters
export const updateShippingOrder = async (id, orderData, originalData = {}) => {
  try {
    // Helper function to check if a value has actually changed
    const hasChanged = (newValue, oldValue) => {
      // Handle null/undefined cases
      if (newValue === null || newValue === undefined) {
        return oldValue !== null && oldValue !== undefined;
      }
      if (oldValue === null || oldValue === undefined) {
        return newValue !== null && newValue !== undefined;
      }
      // For numbers, compare values
      if (typeof newValue === 'number' && typeof oldValue === 'number') {
        return newValue !== oldValue;
      }
      // For strings, trim and compare
      if (typeof newValue === 'string' && typeof oldValue === 'string') {
        return newValue.trim() !== oldValue.trim();
      }
      // For booleans, direct comparison
      if (typeof newValue === 'boolean' && typeof oldValue === 'boolean') {
        return newValue !== oldValue;
      }
      // For dates, compare ISO strings
      if (newValue instanceof Date && oldValue instanceof Date) {
        return newValue.toISOString() !== oldValue.toISOString();
      }
      // Default comparison
      return newValue !== oldValue;
    };

    // Build payload with only changed fields
    const payload = { id };
    const fieldsToCheck = [
      'name', 'user_id', 'partner_id', 'vessel_id', 'destination_id',
      'quotation_id', 'date_order', 'eta_date', 'est_to_usd', 'est_profit_usd',
      'deadline_info', 'internal_remark', 'client_remark', 'done'
    ];

    fieldsToCheck.forEach(field => {
      if (hasChanged(orderData[field], originalData[field])) {
        payload[field] = orderData[field] !== undefined ? orderData[field] : null;
      }
    });

    // Only proceed if there are actual changes
    if (Object.keys(payload).length === 1) { // Only has 'id'
      console.log("No changes detected, skipping update");
      return { result: { status: 'success', message: 'No changes detected' } };
    }

    const response = await api.post('/api/shipping/order/update', payload);
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to update shipping order');
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete shipping order
export const deleteShippingOrder = async (id) => {
  try {
    const response = await api.post('/api/shipping/order/delete', { id });
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to delete shipping order');
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default {
  getShippingOrders,
  getShippingOrderById,
  createShippingOrder,
  updateShippingOrder,
  deleteShippingOrder,
};
