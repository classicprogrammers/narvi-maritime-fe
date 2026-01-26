import api from './axios';

// Get all shipping orders with pagination and search
export const getShippingOrders = async (params = {}) => {
  try {
    const {
      page = 1,
      page_size = 80,
      sort_by = "id",
      sort_order = "desc",
      search = "",
    } = params;

    const requestParams = {
      page,
      page_size,
      sort_by,
      sort_order,
    };

    // Include search parameter if provided
    const trimmedSearch = search ? search.trim() : "";
    if (trimmedSearch) {
      requestParams.search = trimmedSearch;
      requestParams.name = trimmedSearch;
    }

    const response = await api.get('/api/shipping/orders', {
      params: requestParams,
    });
    
    const data = response.data || response;
    
    // Check if response has error status (JSON-RPC format)
    if (data.result && data.result.status === 'error') {
      throw new Error(data.result.message || 'Failed to fetch shipping orders');
    }
    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch shipping orders");
    }

    // Return full response with pagination metadata
    if (data.status === "success") {
      return {
        orders: Array.isArray(data.orders) ? data.orders : [],
        count: data.count || 0,
        total_count: data.total_count || 0,
        page: data.page || page,
        page_size: data.page_size || page_size,
        total_pages: data.total_pages || 0,
        has_next: data.has_next || false,
        has_previous: data.has_previous || false,
        sort_by: data.sort_by || sort_by,
        sort_order: data.sort_order || sort_order,
      };
    }

    // Fallback for non-standard response format
    const orders = Array.isArray(data)
      ? data
      : Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data?.result)
          ? data.result
          : Array.isArray(data?.data)
            ? data.data
            : [];

    return {
      orders: orders,
      count: orders.length,
      total_count: orders.length,
      page: page,
      page_size: page_size,
      total_pages: 1,
      has_next: false,
      has_previous: false,
      sort_by: sort_by,
      sort_order: sort_order,
    };
  } catch (error) {
    throw error;
  }
};

// Get shipping order by ID
export const getShippingOrderById = async (id) => {
  try {
    // Backend expects POST /api/shipping/order with { id }
    const response = await api.post('/api/shipping/order', { id });
    
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

// Update shipping order - only send changed parameters (matching backend spec)
export const updateShippingOrder = async (id, orderData, originalData = {}) => {
  try {
    // Helper function to normalize values for comparison
    const normalize = (val) => {
      if (val === null || val === undefined || val === "" || val === false) return null;
      if (typeof val === 'string') {
        // For date strings, extract just the date part (YYYY-MM-DD) for comparison
        if (val.includes(' ')) {
          return val.split(' ')[0];
        }
        return val.trim();
      }
      return val;
    };

    // Helper function to check if a value has actually changed
    const hasChanged = (newValue, oldValue) => {
      const normalizedNew = normalize(newValue);
      const normalizedOld = normalize(oldValue);

      // Both are null/empty - no change
      if (normalizedNew === null && normalizedOld === null) return false;

      // One is null, other is not - changed
      if (normalizedNew === null || normalizedOld === null) {
        return normalizedNew !== normalizedOld;
      }

      // For strings, compare normalized values
      if (typeof normalizedNew === 'string' && typeof normalizedOld === 'string') {
        return normalizedNew !== normalizedOld;
      }

      // For numbers, compare values
      if (typeof normalizedNew === 'number' && typeof normalizedOld === 'number') {
        return normalizedNew !== normalizedOld;
      }

      // For booleans, direct comparison
      if (typeof normalizedNew === 'boolean' && typeof normalizedOld === 'boolean') {
        return normalizedNew !== normalizedOld;
      }

      // Default comparison
      return normalizedNew !== normalizedOld;
    };

    // Build payload with only changed fields (backend fields)
    const payload = { id };
    const fieldsToCheck = [
      'done',
      'pic_new',
      'client_id',
      'vessel_id',
      'destination_id', // legacy field
      'destination_type', // new destination structure
      'destination', // new destination structure
      'country_id', // new destination structure
      'quotation_id',
      'eta_date',
      'etb',
      'etd',
      'date_order',
      'next_action',
      'est_to_usd',
      'est_profit_usd',
      'internal_remark',
      'vsls_agent_dtls',
      'client_case_invoice_ref',
    ];

    fieldsToCheck.forEach(field => {
      if (hasChanged(orderData[field], originalData[field])) {
        // Only include the field if it has a non-null value
        // Don't include null, undefined, empty string, or false (for dates)
        const value = orderData[field];
        if (value !== null && value !== undefined && value !== "" && value !== false) {
          payload[field] = value;
        }
        // Special handling for quotation_id - empty string is valid
        else if (field === 'quotation_id' && value === "") {
          payload[field] = "";
        }
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

//eslint-disable-next-line
export default {
  getShippingOrders,
  getShippingOrderById,
  createShippingOrder,
  updateShippingOrder,
  deleteShippingOrder,
};
