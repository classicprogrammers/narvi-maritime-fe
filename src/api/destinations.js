import api from "./axios";

const destinationsAPI = {
  // Get all destinations
  getDestinations: async () => {
    try {
      const response = await api.get("/api/destinations");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch destinations:", error);
      throw error;
    }
  },

  // Get destination by ID
  getDestinationById: async (id) => {
    try {
      const response = await api.get(`/api/destinations/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching destination by ID:", error);
      throw error;
    }
  },

  // Create new destination
  createDestination: async (destinationData) => {
    try {
      const response = await api.post("/api/destination/create", {
        name: destinationData.name
      });
      return response.data;
    } catch (error) {
      console.error("Error creating destination:", error);
      throw error;
    }
  },

  // Update destination
  updateDestination: async (id, destinationData) => {
    try {
      const response = await api.post("/api/destination/update", {
        id: id,
        name: destinationData.name
      });
      return response.data;
    } catch (error) {
      console.error("Error updating destination:", error);
      throw error;
    }
  },

  // Delete destination
  deleteDestination: async (id) => {
    try {
      const response = await api.post("/api/destination/delete", { id: id });
      return response.data;
    } catch (error) {
      console.error("Error deleting destination:", error);
      throw error;
    }
  },
};

export default destinationsAPI;
