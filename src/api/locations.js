import api from "./axios";

const locationsAPI = {
  // Get all locations
  getLocations: async () => {
    try {
      const response = await api.get("/api/locations");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      throw error;
    }
  },

  // Get location by ID
  getLocationById: async (id) => {
    try {
      const response = await api.get(`/api/locations/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching location by ID:", error);
      throw error;
    }
  },

  // Create new location
  createLocation: async (locationData) => {
    try {
      const response = await api.post("/api/location/create", locationData);
      return response.data;
    } catch (error) {
      console.error("Error creating location:", error);
      throw error;
    }
  },

  // Update location
  updateLocation: async (id, locationData) => {
    try {
      const response = await api.post("/api/location/update", { location_id: id, ...locationData });
      return response.data;
    } catch (error) {
      console.error("Error updating location:", error);
      throw error;
    }
  },

  // Delete location
  deleteLocation: async (id) => {
    try {
      const response = await api.post("/api/location/delete", { location_id: id });
      return response.data;
    } catch (error) {
      console.error("Error deleting location:", error);
      throw error;
    }
  },
};

export default locationsAPI;
