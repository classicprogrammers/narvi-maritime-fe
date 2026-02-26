import api from './axios';

// Get all shipping orders with pagination and search
export const getShippingOrders = async (params = {}) => {
  try {
    const {
      page = 1,
      page_size = 80,
      // sort_by and sort_order are intentionally not sent to backend;
      // backend will use its own default sorting.
      sort_by = "id",
      sort_order = "desc",
      search = "",
      client_id,
      vessel_id,
      destination_id,
      country_id,
      done,
      so_id,
    } = params;

    const requestParams = {
      page,
      page_size,
    };

    // Include search parameter if provided (only search, not name)
    const trimmedSearch = search ? search.trim() : "";
    if (trimmedSearch) {
      requestParams.search = trimmedSearch;
    }

    if (client_id != null && client_id !== "") {
      requestParams.client_id = client_id;
    }
    if (vessel_id != null && vessel_id !== "") {
      requestParams.vessel_id = vessel_id;
    }
    if (destination_id != null && destination_id !== "") {
      requestParams.destination_id = destination_id;
    }
    if (country_id != null && country_id !== "") {
      requestParams.country_id = country_id;
    }
    if (done) {
      requestParams.done = done;
    }
    // Normalize so_id to only the numeric part (e.g. "SO 123", "so-123" -> "123")
    if (so_id != null && String(so_id).trim() !== "") {
      const rawSoId = String(so_id).trim();
      const digitsMatch = rawSoId.match(/\d+/);
      if (digitsMatch && digitsMatch[0] !== "") {
        requestParams.so_id = digitsMatch[0];
      }
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

// Update shipping order
// `orderData` is expected to already be in the correct shape for the backend.
// Callers (like `buildPayloadFromForm`) can pre-diff and send only changed fields.
export const updateShippingOrder = async (id, orderData, originalData = {}) => {
  try {
    // Ensure numeric IDs are sent as numbers (not route-param strings)
    const normalizedId =
      typeof id === "string" && id.trim() !== "" && !Number.isNaN(Number(id))
        ? Number(id)
        : id;
    // Build payload directly from provided orderData.
    // Always include id; callers decide which fields to send.
    const payload = {
      id: normalizedId,
      ...(orderData || {}),
    };

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
