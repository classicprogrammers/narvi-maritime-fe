import api from "./axios";

// Fetch list of warehouses
export async function getWarehouses() {
  const response = await api.get("/api/warehouse");
  const data = response.data || response;

  // If backend reports an error status, surface that up to caller
  if (data.status === "error") {
    throw new Error(data.message || "Failed to fetch warehouses");
  }

  if (data.status === "success" && Array.isArray(data.warehouses)) {
    return data.warehouses;
  }

  return [];
}

// Create a new warehouse
export async function createWarehouse(payload) {
  const response = await api.post("/api/warehouse/register", payload);
  return response.data || response;
}

// Update warehouse
export async function updateWarehouse(payload) {
  const response = await api.post("/api/warehouse/update", payload);
  return response.data || response;
}

// Delete warehouse
export async function deleteWarehouse(payload) {
  const response = await api.post("/api/warehouse/delete", payload);
  return response.data || response;
}

