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

// Update shipping order
export const updateShippingOrder = async (id, orderData) => {
  try {
    const response = await api.post('/api/shipping/order/update', {
      id,
      ...orderData
    });
    
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
