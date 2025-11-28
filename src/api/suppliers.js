import api from "./axios";

// Fetch list of suppliers
export async function getSuppliers() {
  const response = await api.get("/api/suppliers");
  const data = response.data || response;

  // If backend reports an error status, surface that up to caller
  if (data.status === "error") {
    throw new Error(data.message || "Failed to fetch suppliers");
  }

  if (data.status === "success" && Array.isArray(data.suppliers)) {
    return data.suppliers;
  }

  return [];
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


