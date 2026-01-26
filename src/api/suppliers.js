import api from "./axios";

// Fetch list of suppliers with pagination
export async function getSuppliers(params = {}) {
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

  // Include search parameter - many backends use 'name' for searching supplier names
  const trimmedSearch = search ? search.trim() : "";
  if (trimmedSearch) {
    // Try 'name' parameter first (common for supplier name searches)
    requestParams.name = trimmedSearch;
    // Also include 'search' as fallback
    requestParams.search = trimmedSearch;
  }

  const response = await api.get("/api/suppliers", {
    params: requestParams,
  });
  const data = response.data || response;

  // If backend reports an error status, surface that up to caller
  if (data.status === "error") {
    throw new Error(data.message || "Failed to fetch suppliers");
  }

  // Return full response with pagination metadata
  if (data.status === "success") {
    return {
      suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
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

  return {
    suppliers: [],
    count: 0,
    total_count: 0,
    page: 1,
    page_size: page_size,
    total_pages: 0,
    has_next: false,
    has_previous: false,
    sort_by: sort_by,
    sort_order: sort_order,
  };
}

// Create a new supplier
export async function createSupplier(payload) {
  const response = await api.post("/api/supplier/register", payload);
  return response.data || response;
}

// Update supplier
export async function updateSupplier(payload) {
  const response = await api.post("/api/supplier/update", payload);
  return response.data || response;
}

// Delete supplier
export async function deleteSupplier(payload) {
  const response = await api.post("/api/supplier/delete", payload);
  return response.data || response;
}


