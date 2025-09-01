import api from "./axios";

// Locations API
export const locationsAPI = {
  getLocations: async () => {
    try {
      const response = await api.get("/api/locations");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      throw error;
    }
  },
};

export default locationsAPI;
