import api from "./axios";

// Fetch list of suppliers - use page_size=all to get all records (pagination handled client-side if needed)
export async function getSuppliers(params = {}) {
  const {
    sort_by = "id",
    sort_order = "desc",
    search = "",
  } = params;

  const requestParams = {
    page_size: "all",
    sort_by,
    sort_order,
  };

  // Include search parameter if provided (API uses ?search=)
  const trimmedSearch = search ? search.trim() : "";
  if (trimmedSearch) {
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
  const suppliersList = Array.isArray(data.suppliers) ? data.suppliers : [];
  if (data.status === "success") {
    return {
      suppliers: suppliersList,
      count: data.count ?? suppliersList.length,
      total_count: data.total_count ?? suppliersList.length,
      page: data.page ?? 1,
      page_size: data.page_size ?? "all",
      total_pages: data.total_pages ?? 1,
      has_next: data.has_next ?? false,
      has_previous: data.has_previous ?? false,
      sort_by: data.sort_by ?? sort_by,
      sort_order: data.sort_order ?? sort_order,
    };
  }

  return {
    suppliers: [],
    count: 0,
    total_count: 0,
    page: 1,
    page_size: "all",
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


