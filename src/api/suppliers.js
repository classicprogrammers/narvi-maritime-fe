import api from "./axios";

export async function getSuppliers(params = {}) {
  const requestParams = {
    page: params.page != null && params.page >= 1 ? params.page : 1,
    page_size: params.page_size === 'all' ? 'all' : ((params.page_size != null && params.page_size > 0) ? params.page_size : 80),
  };
  if (params.search != null && String(params.search).trim() !== "") {
    requestParams.search = String(params.search).trim();
  }
  if (params.sort_by != null && String(params.sort_by).trim() !== "") {
    requestParams.sort_by = String(params.sort_by).trim();
  }
  if (params.sort_order != null && String(params.sort_order).trim() !== "") {
    requestParams.sort_order = String(params.sort_order).trim();
  }

  const response = await api.get("/api/suppliers", { params: requestParams });
  const data = response.data || response;

  if (data.status === "error") {
    throw new Error(data.message || "Failed to fetch suppliers");
  }

  const suppliersList = Array.isArray(data.suppliers) ? data.suppliers : [];
  if (data.status === "success") {
    return {
      suppliers: suppliersList,
      count: data.count ?? suppliersList.length,
      total_count: data.total_count ?? suppliersList.length,
      page: data.page ?? 1,
      page_size: data.page_size ?? 80,
      total_pages: data.total_pages ?? 1,
      has_next: data.has_next ?? false,
      has_previous: data.has_previous ?? false,
      sort_by: data.sort_by ?? requestParams.sort_by ?? "id",
      sort_order: data.sort_order ?? requestParams.sort_order ?? "desc",
    };
  }

  return {
    suppliers: [],
    count: 0,
    total_count: 0,
    page: 1,
    page_size: 80,
    total_pages: 0,
    has_next: false,
    has_previous: false,
    sort_by: requestParams.sort_by ?? "id",
    sort_order: requestParams.sort_order ?? "desc",
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


